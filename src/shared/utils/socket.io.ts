import { Request } from "express";

export const emitToUser = (
  req: Request,
  userId: string,
  event: string,
  data: unknown,
) => {
  const io = req.app.locals.io;
  const connectedUsers: Map<string, string> = req.app.locals.connectedUsers;

  const socketId = connectedUsers?.get(userId.toString());
  if (socketId && io) {
    io.to(socketId).emit(event, data);
  }
};
