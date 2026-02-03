-- AlterTable: Add detailed address fields to Property
ALTER TABLE "Property" ADD COLUMN IF NOT EXISTS "street" TEXT;
ALTER TABLE "Property" ADD COLUMN IF NOT EXISTS "houseNumber" TEXT;
ALTER TABLE "Property" ADD COLUMN IF NOT EXISTS "apartmentNumber" TEXT;
ALTER TABLE "Property" ADD COLUMN IF NOT EXISTS "staircase" TEXT;
ALTER TABLE "Property" ADD COLUMN IF NOT EXISTS "block" TEXT;
ALTER TABLE "Property" ADD COLUMN IF NOT EXISTS "state" TEXT;
