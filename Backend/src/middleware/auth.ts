import type { NextFunction, Request, Response } from "express";
import { RecordStatus } from "@prisma/client";
import { prisma } from "../config/prisma.js";
import { unauthorized } from "../utils/httpError.js";
import { verifyToken } from "../utils/jwt.js";

export const authenticate = async (req: Request, _res: Response, next: NextFunction) => {
  try {
    const header = req.headers.authorization;
    if (!header?.startsWith("Bearer ")) {
      throw unauthorized();
    }

    const token = header.slice("Bearer ".length);
    const payload = verifyToken(token);
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { id: true, name: true, email: true, role: true, departmentId: true, status: true }
    });

    if (!user || user.status !== RecordStatus.ACTIVE) {
      throw unauthorized("Invalid or inactive user.");
    }

    req.user = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      departmentId: user.departmentId
    };

    next();
  } catch (error) {
    next(error);
  }
};
