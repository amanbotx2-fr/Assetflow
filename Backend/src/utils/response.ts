import type { Response } from "express";

export const sendSuccess = (
  res: Response,
  data: unknown,
  message = "Operation completed successfully.",
  statusCode = 200
) => {
  return res.status(statusCode).json({
    success: true,
    data,
    message
  });
};

export const sendCreated = (res: Response, data: unknown, message = "Resource created successfully.") =>
  sendSuccess(res, data, message, 201);
