import bcrypt from "bcrypt";
import {
  AllocationStatus,
  AssetCondition,
  AssetStatus,
  AuditResult,
  BookingStatus,
  MaintenancePriority,
  MaintenanceStatus,
  PrismaClient,
  Role,
  TransferStatus
} from "@prisma/client";

const prisma = new PrismaClient();

const password = "password123";

async function resetDatabase() {
  await prisma.department.updateMany({ data: { managerId: null, parentDepartmentId: null } });
  await prisma.user.updateMany({ data: { departmentId: null } });
  await prisma.notification.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.auditRecord.deleteMany();
  await prisma.maintenanceTicket.deleteMany();
  await prisma.booking.deleteMany();
  await prisma.transfer.deleteMany();
  await prisma.allocation.deleteMany();
  await prisma.asset.deleteMany();
  await prisma.category.deleteMany();
  await prisma.department.deleteMany();
  await prisma.user.deleteMany();
}

async function main() {
  await resetDatabase();

  const passwordHash = await bcrypt.hash(password, 10);

  const [it, finance, operations] = await Promise.all([
    prisma.department.create({ data: { name: "Information Technology", code: "IT" } }),
    prisma.department.create({ data: { name: "Finance", code: "FIN" } }),
    prisma.department.create({ data: { name: "Operations", code: "OPS" } })
  ]);

  const admin = await prisma.user.create({
    data: {
      name: "Admin User",
      email: "admin@assetflow.local",
      passwordHash,
      role: Role.ADMIN,
      departmentId: it.id
    }
  });

  const manager = await prisma.user.create({
    data: {
      name: "IT Manager",
      email: "manager@assetflow.local",
      passwordHash,
      role: Role.MANAGER,
      departmentId: it.id
    }
  });

  const employee = await prisma.user.create({
    data: {
      name: "Employee User",
      email: "employee@assetflow.local",
      passwordHash,
      role: Role.EMPLOYEE,
      departmentId: it.id
    }
  });

  const auditor = await prisma.user.create({
    data: {
      name: "Audit User",
      email: "auditor@assetflow.local",
      passwordHash,
      role: Role.AUDITOR,
      departmentId: finance.id
    }
  });

  await prisma.department.update({ where: { id: it.id }, data: { managerId: manager.id } });

  const [laptop, monitor, projector, vehicle, furniture] = await Promise.all([
    prisma.category.create({ data: { name: "Laptop", code: "LAP", description: "Portable computers" } }),
    prisma.category.create({ data: { name: "Monitor", code: "MON", description: "Displays and screens" } }),
    prisma.category.create({ data: { name: "Projector", code: "PROJ", description: "Bookable presentation devices" } }),
    prisma.category.create({ data: { name: "Vehicle", code: "VEH", description: "Shared organization vehicles" } }),
    prisma.category.create({ data: { name: "Furniture", code: "FUR", description: "Office furniture" } })
  ]);

  const dellLaptop = await prisma.asset.create({
    data: {
      assetCode: "LAP-001",
      serialNumber: "SN-LAP-001",
      name: "Dell Latitude 5440",
      categoryId: laptop.id,
      departmentId: it.id,
      createdById: admin.id,
      updatedById: admin.id,
      status: AssetStatus.ALLOCATED,
      condition: AssetCondition.GOOD,
      location: "IT Floor - Desk 12",
      purchaseValue: 95000,
      purchaseDate: new Date("2025-04-10")
    }
  });

  const macbook = await prisma.asset.create({
    data: {
      assetCode: "LAP-002",
      serialNumber: "SN-LAP-002",
      name: "MacBook Air M3",
      categoryId: laptop.id,
      departmentId: it.id,
      createdById: admin.id,
      updatedById: admin.id,
      status: AssetStatus.AVAILABLE,
      condition: AssetCondition.NEW,
      location: "IT Store"
    }
  });

  const projectorAsset = await prisma.asset.create({
    data: {
      assetCode: "PROJ-001",
      serialNumber: "SN-PROJ-001",
      name: "Epson Conference Projector",
      categoryId: projector.id,
      departmentId: operations.id,
      createdById: admin.id,
      updatedById: admin.id,
      status: AssetStatus.AVAILABLE,
      condition: AssetCondition.GOOD,
      location: "Conference Room A",
      isBookable: true
    }
  });

  const vehicleAsset = await prisma.asset.create({
    data: {
      assetCode: "VEH-001",
      serialNumber: "SN-VEH-001",
      name: "Office Shuttle",
      categoryId: vehicle.id,
      departmentId: operations.id,
      createdById: admin.id,
      updatedById: admin.id,
      status: AssetStatus.AVAILABLE,
      condition: AssetCondition.GOOD,
      location: "Parking Bay 4",
      isBookable: true
    }
  });

  const monitorAsset = await prisma.asset.create({
    data: {
      assetCode: "MON-001",
      serialNumber: "SN-MON-001",
      name: "Dell 27 Inch Monitor",
      categoryId: monitor.id,
      departmentId: finance.id,
      createdById: admin.id,
      updatedById: admin.id,
      status: AssetStatus.MAINTENANCE,
      condition: AssetCondition.FAIR,
      location: "Finance Bay"
    }
  });

  await prisma.asset.create({
    data: {
      assetCode: "FUR-001",
      serialNumber: "SN-FUR-001",
      name: "Ergonomic Chair",
      categoryId: furniture.id,
      departmentId: operations.id,
      createdById: admin.id,
      updatedById: admin.id,
      status: AssetStatus.AVAILABLE,
      condition: AssetCondition.GOOD,
      location: "Storage Room"
    }
  });

  const allocation = await prisma.allocation.create({
    data: {
      assetId: dellLaptop.id,
      userId: employee.id,
      assignedById: manager.id,
      status: AllocationStatus.ACTIVE,
      notes: "Seed allocation for demo."
    }
  });

  await prisma.transfer.create({
    data: {
      assetId: dellLaptop.id,
      requestedById: employee.id,
      fromUserId: employee.id,
      toDepartmentId: finance.id,
      status: TransferStatus.PENDING,
      reason: "Finance team needs this laptop for month-end work."
    }
  });

  await prisma.booking.create({
    data: {
      assetId: projectorAsset.id,
      requestedById: employee.id,
      approvedById: manager.id,
      startTime: new Date("2026-07-12T10:00:00.000Z"),
      endTime: new Date("2026-07-12T11:00:00.000Z"),
      status: BookingStatus.APPROVED,
      purpose: "Hackathon demo presentation"
    }
  });

  await prisma.booking.create({
    data: {
      assetId: vehicleAsset.id,
      requestedById: employee.id,
      startTime: new Date("2026-07-12T12:00:00.000Z"),
      endTime: new Date("2026-07-12T13:00:00.000Z"),
      status: BookingStatus.REQUESTED,
      purpose: "Client visit"
    }
  });

  const maintenance = await prisma.maintenanceTicket.create({
    data: {
      assetId: monitorAsset.id,
      reportedById: employee.id,
      assignedToId: manager.id,
      priority: MaintenancePriority.HIGH,
      status: MaintenanceStatus.IN_PROGRESS,
      issueSummary: "Display flickering",
      issueDescription: "Monitor flickers every few minutes."
    }
  });

  await prisma.auditRecord.create({
    data: {
      assetId: dellLaptop.id,
      auditorId: auditor.id,
      result: AuditResult.VERIFIED,
      remarks: "Asset found with assigned employee."
    }
  });

  await prisma.notification.createMany({
    data: [
      {
        userId: employee.id,
        type: "ASSET_ALLOCATED",
        title: "Asset allocated",
        message: "Dell Latitude 5440 has been allocated to you.",
        relatedEntityType: "Allocation",
        relatedEntityId: allocation.id
      },
      {
        userId: manager.id,
        type: "MAINTENANCE_ASSIGNED",
        title: "Maintenance assigned",
        message: "Display flickering ticket is assigned to you.",
        relatedEntityType: "MaintenanceTicket",
        relatedEntityId: maintenance.id
      }
    ]
  });

  await prisma.auditLog.createMany({
    data: [
      {
        actorId: admin.id,
        entityType: "Seed",
        entityId: admin.id,
        action: "database_seeded",
        metadata: { demo: true }
      },
      {
        actorId: manager.id,
        entityType: "Asset",
        entityId: dellLaptop.id,
        action: "allocated",
        metadata: { allocationId: allocation.id }
      }
    ]
  });

  console.log("Seed complete.");
  console.table([
    { role: "ADMIN", email: admin.email, password },
    { role: "MANAGER", email: manager.email, password },
    { role: "EMPLOYEE", email: employee.email, password },
    { role: "AUDITOR", email: auditor.email, password }
  ]);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
