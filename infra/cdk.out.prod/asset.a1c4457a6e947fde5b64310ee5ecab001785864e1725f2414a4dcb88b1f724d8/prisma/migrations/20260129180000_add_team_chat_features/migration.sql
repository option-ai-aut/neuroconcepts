-- Add new enum ChannelRole
DO $$ BEGIN
  CREATE TYPE "ChannelRole" AS ENUM ('ADMIN', 'MEMBER');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Add new columns to Channel
ALTER TABLE "Channel" ADD COLUMN IF NOT EXISTS "description" TEXT;
ALTER TABLE "Channel" ADD COLUMN IF NOT EXISTS "isDefault" BOOLEAN NOT NULL DEFAULT false;

-- Add index on Channel
CREATE INDEX IF NOT EXISTS "Channel_tenantId_idx" ON "Channel"("tenantId");

-- Add role to ChannelMember
ALTER TABLE "ChannelMember" ADD COLUMN IF NOT EXISTS "role" "ChannelRole" NOT NULL DEFAULT 'MEMBER';

-- Add cascade delete to ChannelMember
ALTER TABLE "ChannelMember" DROP CONSTRAINT IF EXISTS "ChannelMember_channelId_fkey";
ALTER TABLE "ChannelMember" ADD CONSTRAINT "ChannelMember_channelId_fkey" FOREIGN KEY ("channelId") REFERENCES "Channel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Add new columns to ChannelMessage
ALTER TABLE "ChannelMessage" ADD COLUMN IF NOT EXISTS "isJarvis" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "ChannelMessage" ADD COLUMN IF NOT EXISTS "mentions" JSONB;
ALTER TABLE "ChannelMessage" ADD COLUMN IF NOT EXISTS "editedAt" TIMESTAMP(3);

-- Add cascade delete to ChannelMessage
ALTER TABLE "ChannelMessage" DROP CONSTRAINT IF EXISTS "ChannelMessage_channelId_fkey";
ALTER TABLE "ChannelMessage" ADD CONSTRAINT "ChannelMessage_channelId_fkey" FOREIGN KEY ("channelId") REFERENCES "Channel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Add index on ChannelMessage
CREATE INDEX IF NOT EXISTS "ChannelMessage_channelId_createdAt_idx" ON "ChannelMessage"("channelId", "createdAt");
