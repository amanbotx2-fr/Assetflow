import { RecordStatus, Role } from "@prisma/client";
import { prisma } from "../config/prisma.js";

export const getOrganizationOverview = async (actor: Express.User) => {
  const emptyDepartmentId = "00000000-0000-0000-0000-000000000000";
  const managerDepartmentWhere = actor.role === Role.MANAGER ? { id: actor.departmentId ?? emptyDepartmentId } : {};
  const managerUserWhere = actor.role === Role.MANAGER ? { departmentId: actor.departmentId ?? emptyDepartmentId } : {};

  const [
    totalDepartments,
    activeDepartments,
    inactiveDepartments,
    departmentsWithParent,
    departmentsWithoutHead,
    totalCategories,
    activeCategories,
    inactiveCategories,
    categoriesWithDescription,
    totalEmployees,
    activeEmployees,
    inactiveEmployees,
    adminUsers,
    managerUsers,
    employeeUsers,
    auditorUsers
  ] = await Promise.all([
    prisma.department.count({ where: managerDepartmentWhere }),
    prisma.department.count({ where: { ...managerDepartmentWhere, status: RecordStatus.ACTIVE } }),
    prisma.department.count({ where: { ...managerDepartmentWhere, status: RecordStatus.INACTIVE } }),
    prisma.department.count({ where: { ...managerDepartmentWhere, parentDepartmentId: { not: null } } }),
    prisma.department.count({ where: { ...managerDepartmentWhere, managerId: null } }),
    prisma.category.count(),
    prisma.category.count({ where: { status: RecordStatus.ACTIVE } }),
    prisma.category.count({ where: { status: RecordStatus.INACTIVE } }),
    prisma.category.count({ where: { description: { not: null } } }),
    prisma.user.count({ where: managerUserWhere }),
    prisma.user.count({ where: { ...managerUserWhere, status: RecordStatus.ACTIVE } }),
    prisma.user.count({ where: { ...managerUserWhere, status: RecordStatus.INACTIVE } }),
    prisma.user.count({ where: { ...managerUserWhere, role: Role.ADMIN } }),
    prisma.user.count({ where: { ...managerUserWhere, role: Role.MANAGER } }),
    prisma.user.count({ where: { ...managerUserWhere, role: Role.EMPLOYEE } }),
    prisma.user.count({ where: { ...managerUserWhere, role: Role.AUDITOR } })
  ]);

  return {
    departments: {
      total: totalDepartments,
      active: activeDepartments,
      inactive: inactiveDepartments,
      withParent: departmentsWithParent,
      withoutHead: departmentsWithoutHead
    },
    categories: {
      total: totalCategories,
      active: activeCategories,
      inactive: inactiveCategories,
      withDescription: categoriesWithDescription
    },
    employees: {
      total: totalEmployees,
      active: activeEmployees,
      inactive: inactiveEmployees,
      byRole: {
        admin: adminUsers,
        manager: managerUsers,
        employee: employeeUsers,
        auditor: auditorUsers
      }
    }
  };
};
