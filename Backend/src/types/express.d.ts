import type { Role } from "@prisma/client";

declare global {
  namespace Express {
    interface User {
      id: string;
      name: string;
      email: string;
      role: Role;
      departmentId: string | null;
    }

    interface Request {
      user?: User;
    }
  }
}

export {};
