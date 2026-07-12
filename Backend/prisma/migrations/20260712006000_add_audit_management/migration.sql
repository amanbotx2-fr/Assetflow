ALTER TYPE "AuditResult" ADD VALUE IF NOT EXISTS 'RETIRED';
ALTER TYPE "AuditResult" ADD VALUE IF NOT EXISTS 'UNREACHABLE';

CREATE TYPE "AuditStatus" AS ENUM ('PLANNED', 'ACTIVE', 'IN_PROGRESS', 'COMPLETED', 'CLOSED');

CREATE TYPE "AuditDiscrepancyType" AS ENUM (
  'MISSING_ASSET',
  'DAMAGED_ASSET',
  'WRONG_LOCATION',
  'UNEXPECTED_ALLOCATION',
  'UNEXPECTED_DEPARTMENT',
  'UNKNOWN_ASSET_CONDITION'
);

CREATE TABLE "audits" (
  "id" UUID NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "department_id" UUID,
  "created_by_id" UUID NOT NULL,
  "assigned_auditor_id" UUID,
  "status" "AuditStatus" NOT NULL DEFAULT 'PLANNED',
  "planned_start" TIMESTAMP(3),
  "planned_end" TIMESTAMP(3),
  "started_at" TIMESTAMP(3),
  "completed_at" TIMESTAMP(3),
  "closed_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "audits_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "audit_records"
  ALTER COLUMN "auditor_id" DROP NOT NULL,
  ALTER COLUMN "result" DROP NOT NULL,
  ADD COLUMN "audit_id" UUID,
  ADD COLUMN "expected_location" TEXT,
  ADD COLUMN "expected_department_id" UUID,
  ADD COLUMN "expected_condition" "AssetCondition",
  ADD COLUMN "expected_allocation_user_id" UUID,
  ADD COLUMN "location_verified" TEXT,
  ADD COLUMN "department_verified_id" UUID,
  ADD COLUMN "condition_verified" "AssetCondition",
  ADD COLUMN "allocation_user_verified_id" UUID,
  ADD COLUMN "verified_at" TIMESTAMP(3);

CREATE TABLE "audit_discrepancies" (
  "id" UUID NOT NULL,
  "audit_id" UUID NOT NULL,
  "audit_record_id" UUID,
  "asset_id" UUID NOT NULL,
  "type" "AuditDiscrepancyType" NOT NULL,
  "message" TEXT NOT NULL,
  "severity" TEXT NOT NULL DEFAULT 'warning',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "audit_discrepancies_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "audits_status_idx" ON "audits"("status");
CREATE INDEX "audits_department_id_idx" ON "audits"("department_id");
CREATE INDEX "audits_created_by_id_idx" ON "audits"("created_by_id");
CREATE INDEX "audits_assigned_auditor_id_idx" ON "audits"("assigned_auditor_id");
CREATE INDEX "audit_records_audit_id_idx" ON "audit_records"("audit_id");
CREATE UNIQUE INDEX "audit_records_audit_id_asset_id_key" ON "audit_records"("audit_id", "asset_id");
CREATE INDEX "audit_discrepancies_audit_id_type_idx" ON "audit_discrepancies"("audit_id", "type");
CREATE INDEX "audit_discrepancies_audit_record_id_idx" ON "audit_discrepancies"("audit_record_id");
CREATE INDEX "audit_discrepancies_asset_id_idx" ON "audit_discrepancies"("asset_id");

ALTER TABLE "audits" ADD CONSTRAINT "audits_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "audits" ADD CONSTRAINT "audits_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "audits" ADD CONSTRAINT "audits_assigned_auditor_id_fkey" FOREIGN KEY ("assigned_auditor_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "audit_records" ADD CONSTRAINT "audit_records_audit_id_fkey" FOREIGN KEY ("audit_id") REFERENCES "audits"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "audit_records" ADD CONSTRAINT "audit_records_expected_department_id_fkey" FOREIGN KEY ("expected_department_id") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "audit_records" ADD CONSTRAINT "audit_records_department_verified_id_fkey" FOREIGN KEY ("department_verified_id") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "audit_discrepancies" ADD CONSTRAINT "audit_discrepancies_audit_id_fkey" FOREIGN KEY ("audit_id") REFERENCES "audits"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "audit_discrepancies" ADD CONSTRAINT "audit_discrepancies_audit_record_id_fkey" FOREIGN KEY ("audit_record_id") REFERENCES "audit_records"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "audit_discrepancies" ADD CONSTRAINT "audit_discrepancies_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "assets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
