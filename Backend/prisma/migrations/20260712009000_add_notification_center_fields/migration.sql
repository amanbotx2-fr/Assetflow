ALTER TABLE "notifications"
ADD COLUMN "category" TEXT NOT NULL DEFAULT 'SYSTEM',
ADD COLUMN "priority" TEXT NOT NULL DEFAULT 'INFO',
ADD COLUMN "read_at" TIMESTAMP(3);

UPDATE "notifications"
SET "category" = CASE
  WHEN "type" LIKE 'BOOKING%' THEN 'BOOKING'
  WHEN "type" LIKE 'TRANSFER%' OR "type" = 'ASSET_TRANSFERRED' THEN 'TRANSFER'
  WHEN "type" IN ('ASSET_ALLOCATED', 'ASSET_RETURNED') THEN 'ALLOCATION'
  WHEN "type" LIKE 'MAINTENANCE%' THEN 'MAINTENANCE'
  WHEN "type" LIKE 'AUDIT%' THEN 'AUDIT'
  WHEN "type" LIKE 'ASSET%' THEN 'ASSET'
  WHEN "type" LIKE '%APPROVAL%' THEN 'APPROVAL'
  ELSE 'SYSTEM'
END,
"priority" = CASE
  WHEN "type" IN ('AUDIT_ASSET_MISSING', 'AUDIT_ASSET_DAMAGED', 'CRITICAL_MAINTENANCE', 'SYSTEM_ALERT') THEN 'CRITICAL'
  WHEN "type" LIKE '%REJECTED' OR "type" LIKE '%APPROVAL_REQUIRED' OR "type" = 'BOOKING_APPROVAL_REQUIRED' THEN 'HIGH'
  WHEN "type" LIKE '%APPROVED' OR "type" LIKE '%ASSIGNED' OR "type" LIKE '%STARTED' OR "type" LIKE '%RESOLVED' THEN 'MEDIUM'
  ELSE 'INFO'
END,
"read_at" = CASE WHEN "is_read" = true THEN "updated_at" ELSE NULL END;

CREATE INDEX "notifications_category_created_at_idx" ON "notifications"("category", "created_at");
CREATE INDEX "notifications_priority_created_at_idx" ON "notifications"("priority", "created_at");
