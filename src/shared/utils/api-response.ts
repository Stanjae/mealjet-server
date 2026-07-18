import { Response } from "express";
import { StatusCodes } from "http-status-codes";

interface ApiResponseBody<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
  meta?: PaginationMeta;
  errors?: string[] | { field: string; message: string }[];
}

interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export class ApiResponse {
  static success<T>(
    res: Response,
    data: T,
    message = "Success",
    statusCode = StatusCodes.OK,
  ) {
    const body: ApiResponseBody<T> = { success: true, message, data };
    return res.status(statusCode).json(body);
  }

  static created<T>(res: Response, data: T, message = "Created") {
    return ApiResponse.success(res, data, message, StatusCodes.CREATED);
  }

  static paginated<T>(
    res: Response,
    data: T[],
    meta: PaginationMeta,
    message = "Success",
  ) {
    const body: ApiResponseBody<T[]> = { success: true, message, data, meta };
    return res.status(StatusCodes.OK).json(body);
  }

  static error(
    res: Response,
    message: string,
    statusCode = StatusCodes.BAD_REQUEST,
    errors?: string[] | { field: string; message: string }[],
  ) {
    const body: ApiResponseBody = { success: false, message, errors };
    return res.status(statusCode).json(body);
  }

  static notFound(res: Response, message = "Resource not found") {
    return ApiResponse.error(res, message, StatusCodes.NOT_FOUND);
  }

  static unauthorized(res: Response, message = "Unauthorised") {
    return ApiResponse.error(res, message, StatusCodes.UNAUTHORIZED);
  }

  static forbidden(res: Response, message = "Forbidden") {
    return ApiResponse.error(res, message, StatusCodes.FORBIDDEN);
  }
}
