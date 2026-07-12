ALTER TABLE "assets" ADD COLUMN "serial_number" TEXT;
ALTER TABLE "assets" ADD COLUMN "created_by_id" UUID;
ALTER TABLE "assets" ADD COLUMN "updated_by_id" UUID;

CREATE UNIQUE INDEX "assets_serial_number_key" ON "assets"("serial_number");
CREATE INDEX "assets_serial_number_idx" ON "assets"("serial_number");
CREATE INDEX "assets_created_by_id_idx" ON "assets"("created_by_id");
CREATE INDEX "assets_updated_by_id_idx" ON "assets"("updated_by_id");

ALTER TABLE "assets" ADD CONSTRAINT "assets_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "assets" ADD CONSTRAINT "assets_updated_by_id_fkey" FOREIGN KEY ("updated_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
