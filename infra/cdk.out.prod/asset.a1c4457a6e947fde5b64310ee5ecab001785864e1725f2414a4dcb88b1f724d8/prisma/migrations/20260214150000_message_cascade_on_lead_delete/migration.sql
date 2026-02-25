-- DropForeignKey
ALTER TABLE "Message" DROP CONSTRAINT IF EXISTS "Message_leadId_fkey";

-- AddForeignKey with Cascade
ALTER TABLE "Message" ADD CONSTRAINT "Message_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;
