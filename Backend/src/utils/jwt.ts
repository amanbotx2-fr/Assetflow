import jwt from "jsonwebtoken";
import type { StringValue } from "ms";
import { env } from "../config/env.js";

export interface JwtPayload {
  userId: string;
}

export const signToken = (payload: JwtPayload) => {
  return jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN as StringValue
  });
};

export const verifyToken = (token: string) => {
  const payload = jwt.verify(token, env.JWT_SECRET);

  if (
    typeof payload !== "object" ||
    payload === null ||
    typeof payload.userId !== "string" ||
    payload.userId.trim().length === 0
  ) {
    throw new jwt.JsonWebTokenError("Invalid token payload.");
  }

  return { userId: payload.userId };
};
