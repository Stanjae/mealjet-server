import { StatusCodes } from 'http-status-codes';
export class ApiResponse {
    static success(res, data, message = 'Success', statusCode = StatusCodes.OK) {
        const body = { success: true, message, data };
        return res.status(statusCode).json(body);
    }
    static created(res, data, message = 'Created') {
        return ApiResponse.success(res, data, message, StatusCodes.CREATED);
    }
    static paginated(res, data, meta, message = 'Success') {
        const body = { success: true, message, data, meta };
        return res.status(StatusCodes.OK).json(body);
    }
    static error(res, message, statusCode = StatusCodes.BAD_REQUEST, errors) {
        const body = { success: false, message, errors };
        return res.status(statusCode).json(body);
    }
    static notFound(res, message = 'Resource not found') {
        return ApiResponse.error(res, message, StatusCodes.NOT_FOUND);
    }
    static unauthorized(res, message = 'Unauthorised') {
        return ApiResponse.error(res, message, StatusCodes.UNAUTHORIZED);
    }
    static forbidden(res, message = 'Forbidden') {
        return ApiResponse.error(res, message, StatusCodes.FORBIDDEN);
    }
}
