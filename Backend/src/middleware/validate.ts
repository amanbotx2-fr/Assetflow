import type { NextFunction, Request, Response } from "express";
import type { ZodSchema } from "zod";
import { badRequest } from "../utils/httpError.js";

interface ValidationSchemas {
  body?: ZodSchema;
  query?: ZodSchema;
  params?: ZodSchema;
}

export const validate =
  (schemas: ValidationSchemas) =>
  (req: Request, _res: Response, next: NextFunction) => {
    const results = {
      body: schemas.body?.safeParse(req.body),
      query: schemas.query?.safeParse(req.query),
      params: schemas.params?.safeParse(req.params)
    };

    for (const [key, result] of Object.entries(results)) {
      if (result && !result.success) {
        return next(badRequest(`Invalid ${key}.`, result.error.flatten()));
      }
    }

    if (results.body?.success) req.body = results.body.data;
    if (results.query?.success) req.query = results.query.data;
    if (results.params?.success) req.params = results.params.data;

    return next();
  };
