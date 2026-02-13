-- Add missing columns that exist in Prisma schema but not in database

-- User.lastSeenAt (presence tracking)
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "lastSeenAt" TIMESTAMP(3);

-- Property.heatingType
ALTER TABLE "Property" ADD COLUMN IF NOT EXISTS "heatingType" TEXT;
