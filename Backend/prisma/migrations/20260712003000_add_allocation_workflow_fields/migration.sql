ALTER TABLE "allocations" ADD COLUMN "source_transfer_id" UUID;
ALTER TABLE "allocations" ADD COLUMN "return_condition" "AssetCondition";
ALTER TABLE "allocations" ADD COLUMN "return_reason" TEXT;

CREATE UNIQUE INDEX "allocations_source_transfer_id_key" ON "allocations"("source_transfer_id");
CREATE UNIQUE INDEX "allocations_one_active_asset_idx" ON "allocations"("asset_id") WHERE "status" = 'ACTIVE';
CREATE INDEX "allocations_assigned_at_idx" ON "allocations"("assigned_at");
CREATE INDEX "allocations_returned_at_idx" ON "allocations"("returned_at");

ALTER TABLE "allocations" ADD CONSTRAINT "allocations_source_transfer_id_fkey" FOREIGN KEY ("source_transfer_id") REFERENCES "transfers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
