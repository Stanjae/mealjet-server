import express, { Application } from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import rateLimit from "express-rate-limit";
import { env } from "@shared/config/env.js";
import { errorHandler } from "@shared/middleware/error.middleware.js";
import { logger } from "@shared/utils/logger.js";

// ── Route imports ──────────────────────────────────────────────
import authRoutes from "@modules/auth/auth.routes.js";
import vendorRoutes from "@modules/vendor/vendor.routes.js";
import menuCategoryRoutes from "@modules/menu-category/menuCategory.routes.js";
import menuRoutes from "@modules/menus/menu.routes.js";
import orderRoutes from "@modules/orders/order.routes.js";
import paymentRoutes from "@modules/payments/payment.routes.js";
// import userRoutes         from '@modules/users/user.routes';
// import restaurantRoutes   from '@modules/restaurants/restaurant.routes';
// import menuRoutes         from '@modules/menus/menu.routes';

// import deliveryRoutes     from '@modules/delivery/delivery.routes';
// import paymentRoutes      from '@modules/payments/payment.routes';
// import adminRoutes        from '@modules/admin/admin.routes';

export function createApp(): Application {
  const app = express();

  app.set("trust proxy", 1);

  // ── Security ─────────────────────────────────────────────────
  app.use(helmet());
  app.use(
    cors({
      origin: [env.CLIENT_URL, 'http://localhost:5173'],
      credentials: true, // Allow cookies (refresh token)
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization"],
    }),
  );

  // ── Global rate limiting ──────────────────────────────────────
  app.use(
    rateLimit({
      windowMs: 1 * 60 * 1000, // 15 minutes
      max: 200,
      standardHeaders: true,
      legacyHeaders: false,
      message: { success: false, message: "Too many requests, slow down." },
    }),
  );

  // ── Parsers ──────────────────────────────────────────────────
  // Stripe webhook needs raw body — register BEFORE json parser
  app.use((req, _res, next) => {
    console.log('Original URL:', req.originalUrl);
  if (req.originalUrl === '/api/payments/webhook/paystack') {
    return next();
  }
  express.json({ limit: '10mb' })(req, _res, next);
});
  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser());

  if (env.NODE_ENV !== "test") {
    app.use(
      morgan("dev", {
        stream: { write: (msg) => logger.http(msg.trim()) },
      }),
    );
  }

  // ── Health check ─────────────────────────────────────────────
  app.get("/health", (_req, res) => {
    res.json({ status: "OK", timestamp: new Date().toISOString() });
  });

  // ── API Routes ────────────────────────────────────────────────
  app.use("/api/auth", authRoutes);
  app.use("/api/vendor", vendorRoutes);
  app.use("/api/menu", menuRoutes);
  app.use("/api/orders", orderRoutes);
  app.use("/api/payments", paymentRoutes);
  // app.use('/api/users',         userRoutes);
  // app.use('/api/restaurants',   restaurantRoutes);
  // app.use('/api/menus',         menuRoutes);
  // app.use('/api/delivery',      deliveryRoutes);

  // app.use('/api/admin',         adminRoutes);
  app.use("/api/menu-category", menuCategoryRoutes);

  // ── 404 handler ──────────────────────────────────────────────
  app.use((_req, res) => {
    res.status(404).json({ success: false, message: "Route not found" });
  });

  // ── Global error handler (MUST be last) ──────────────────────
  app.use(errorHandler);

  return app;
}
