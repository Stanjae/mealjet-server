import { Request, Response, NextFunction } from "express";
import { StatusCodes } from "http-status-codes";
import { logger } from "@shared/utils/logger";
import { env } from "@shared/config/env.js";

export class AppError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public isOperational = true,
  ) {
    super(message);
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

export function errorHandler(
  err: Error | AppError,
  req: Request,
  res: Response,
  _next: NextFunction,
): void {
  const statusCode =
    "statusCode" in err ? err.statusCode : StatusCodes.INTERNAL_SERVER_ERROR;
  const message = err.message || "Internal Server Error";

  logger.error({
    message: err.message,
    statusCode,
    path: req.path,
    method: req.method,
    stack: env.NODE_ENV !== "production" ? err.stack : undefined,
  });

  res.status(statusCode).json({
    success: false,
    message,
    ...(env.NODE_ENV !== "production" && { stack: err.stack }),
  });
}

// Wrap async route handlers to avoid try/catch in every controller
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<void>,
) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
