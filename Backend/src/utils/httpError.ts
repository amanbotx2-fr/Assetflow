export class HttpError extends Error {
  statusCode: number;
  code: string;
  details?: unknown;

  constructor(statusCode: number, code: string, message: string, details?: unknown) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

export const badRequest = (message: string, details?: unknown) =>
  new HttpError(400, "VALIDATION_ERROR", message, details);

export const unauthorized = (message = "Authentication required.") =>
  new HttpError(401, "UNAUTHORIZED", message);

export const forbidden = (message = "You do not have permission to perform this action.") =>
  new HttpError(403, "FORBIDDEN", message);

export const notFound = (message = "Resource not found.") =>
  new HttpError(404, "NOT_FOUND", message);

export const conflict = (message: string, details?: unknown) =>
  new HttpError(409, "CONFLICT", message, details);
