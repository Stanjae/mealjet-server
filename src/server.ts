import { createServer } from "http";
import { Server as SocketServer } from "socket.io";
import { createApp } from "./app.js";
import {
  connectDatabase,
  disconnectDatabase,
} from "@shared/config/database.js";
import { redis } from "@shared/config/redis.js";
import { env } from "@shared/config/env.js";
import { logger } from "@shared/utils/logger.js";
import {
  startEmailWorker,
  stopEmailWorker,
} from "@shared/workers/email.worker.js";

async function main() {
  // 1. Connect to MongoDB
  await connectDatabase();

  // 2. Connect Redis (optional - app will work without it)
  redis.connect().catch((err) => {
    logger.warn(
      "Redis connection failed, continuing without Redis:",
      err.message,
    );
  });

  // 2b. Start BullMQ workers
  startEmailWorker();

  // 3. Create Express app
  const app = createApp();
  const httpServer = createServer(app);

  // 4. Attach Socket.io
  const io = new SocketServer(httpServer, {
    cors: {
      origin: env.CLIENT_URL,
      credentials: true,
    },
    transports: ["polling", "websocket"],
  });

  const connectedUsers = new Map<string, string>(); // userId → socketId

  // Basic Socket.io connection handler
  // Full event handlers will be in src/shared/sockets/
  io.on("connection", (socket) => {
    logger.debug(`Socket connected: ${socket.id}`);

    // Client must emit 'register' with their userId immediately after connecting
    socket.on("register", (userId: string) => {
      connectedUsers.set(userId, socket.id);
      logger.debug(`User registered: ${userId} → ${socket.id}`);
    });

    socket.on("join:order", (orderId: string) => {
      socket.join(`order:${orderId}`);
    });

    socket.on("join:restaurant", (restaurantId: string) => {
      socket.join(`restaurant:${restaurantId}`);
    });

    // Clean up when user disconnects
    socket.on("disconnect", () => {
      for (const [userId, socketId] of connectedUsers.entries()) {
        if (socketId === socket.id) {
          connectedUsers.delete(userId);
          logger.debug(`User unregistered: ${userId}`);
          break;
        }
      }
      logger.debug(`Socket disconnected: ${socket.id}`);
    });
  });

  // Make io available globally via app locals
  app.locals.io = io;
  app.locals.connectedUsers = connectedUsers;

  // 5. Start listening
  httpServer.listen(env.PORT, () => {
    logger.info(
      `Server running on http://localhost:${env.PORT} [${env.NODE_ENV}]`,
    );
  });

  // 6. Graceful shutdown
  const shutdown = async (signal: string) => {
    logger.warn(`Received ${signal} — shutting down gracefully...`);
    httpServer.close(async () => {
      await stopEmailWorker();
      await disconnectDatabase();
      await redis.quit();
      logger.info("Graceful shutdown complete");
      process.exit(0);
    });
    // Force exit after 10 seconds
    setTimeout(() => process.exit(1), 10000);
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("unhandledRejection", (reason) => {
    logger.error("Unhandled rejection:", reason);
    shutdown("unhandledRejection");
  });
}

main().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
