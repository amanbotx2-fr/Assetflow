import { Role } from "@prisma/client";

export const adminOnly = [Role.ADMIN];
export const adminManager = [Role.ADMIN, Role.MANAGER];
export const adminManagerEmployee = [Role.ADMIN, Role.MANAGER, Role.EMPLOYEE];
export const adminAuditor = [Role.ADMIN, Role.AUDITOR];
export const adminManagerAuditor = [Role.ADMIN, Role.MANAGER, Role.AUDITOR];
export const allRoles = [Role.ADMIN, Role.MANAGER, Role.EMPLOYEE, Role.AUDITOR];
