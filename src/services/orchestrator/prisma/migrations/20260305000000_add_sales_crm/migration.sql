-- CreateEnum
DO $$ BEGIN CREATE TYPE "SalesStage" AS ENUM ('NEW_LEAD','DEMO_SCHEDULED','DEMO_DONE','PROPOSAL_SENT','NEGOTIATION','WON','LOST'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- CreateEnum
DO $$ BEGIN CREATE TYPE "SalesActivityType" AS ENUM ('NOTE','EMAIL_SENT','CALL','DEMO','PROPOSAL','STAGE_CHANGE','MEETING','FILE_UPLOAD','TASK_DONE'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- CreateTable SalesProspect
CREATE TABLE IF NOT EXISTS "SalesProspect" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "name" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "phone" TEXT,
  "jobTitle" TEXT,
  "company" TEXT,
  "companySize" TEXT,
  "companyUrl" TEXT,
  "stage" "SalesStage" NOT NULL DEFAULT 'NEW_LEAD',
  "dealValue" DECIMAL,
  "expectedCloseDate" TIMESTAMP(3),
  "documents" JSONB,
  "sourceBookingId" TEXT,
  "assignedToEmail" TEXT,
  "meetLink" TEXT,
  "meetRoomCode" TEXT,
  "lastActivityAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SalesProspect_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "SalesProspect_stage_createdAt_idx" ON "SalesProspect"("stage","createdAt");
CREATE INDEX IF NOT EXISTS "SalesProspect_email_idx" ON "SalesProspect"("email");

-- CreateTable SalesActivity
CREATE TABLE IF NOT EXISTS "SalesActivity" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "prospectId" TEXT NOT NULL,
  "type" "SalesActivityType" NOT NULL,
  "content" TEXT NOT NULL,
  "createdBy" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SalesActivity_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "SalesActivity_prospectId_fkey" FOREIGN KEY ("prospectId") REFERENCES "SalesProspect"("id") ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS "SalesActivity_prospectId_createdAt_idx" ON "SalesActivity"("prospectId","createdAt");

-- CreateTable SalesTask
CREATE TABLE IF NOT EXISTS "SalesTask" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "prospectId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "dueDate" TIMESTAMP(3),
  "done" BOOLEAN NOT NULL DEFAULT false,
  "doneAt" TIMESTAMP(3),
  "assignedTo" TEXT,
  "createdBy" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SalesTask_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "SalesTask_prospectId_fkey" FOREIGN KEY ("prospectId") REFERENCES "SalesProspect"("id") ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS "SalesTask_prospectId_done_idx" ON "SalesTask"("prospectId","done");
CREATE INDEX IF NOT EXISTS "SalesTask_dueDate_done_idx" ON "SalesTask"("dueDate","done");
