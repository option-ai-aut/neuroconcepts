-- CreateEnum BugReportStatus
DO $$ BEGIN
  CREATE TYPE "BugReportStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED', 'WONT_FIX');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- CreateEnum BugReportPriority
DO $$ BEGIN
  CREATE TYPE "BugReportPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- CreateEnum PendingActionType
DO $$ BEGIN
  CREATE TYPE "PendingActionType" AS ENUM ('ASSIGN_PROPERTY', 'CONFIRM_SEND', 'SELECT_TEMPLATE', 'CLARIFY_REQUEST', 'REVIEW_EXPOSE', 'SCHEDULE_VIEWING', 'OTHER');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- CreateEnum PendingActionStatus
DO $$ BEGIN
  CREATE TYPE "PendingActionStatus" AS ENUM ('PENDING', 'RESOLVED', 'EXPIRED', 'ESCALATED', 'AUTO_RESOLVED');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- CreateEnum NotificationType
DO $$ BEGIN
  CREATE TYPE "NotificationType" AS ENUM ('JARVIS_QUESTION', 'NEW_LEAD', 'LEAD_RESPONSE', 'REMINDER', 'ESCALATION', 'SYSTEM');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- CreateEnum EmailFolder
DO $$ BEGIN
  CREATE TYPE "EmailFolder" AS ENUM ('INBOX', 'SENT', 'DRAFT', 'TRASH', 'SPAM', 'ARCHIVE');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- CreateEnum EmailProvider
DO $$ BEGIN
  CREATE TYPE "EmailProvider" AS ENUM ('SES', 'GMAIL', 'OUTLOOK');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- CreateTable UserSettings
CREATE TABLE IF NOT EXISTS "UserSettings" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "viewingHoursEnabled" BOOLEAN NOT NULL DEFAULT false,
    "viewingHoursStart" TEXT,
    "viewingHoursEnd" TEXT,
    "viewingDays" JSONB,
    "viewingDuration" INTEGER NOT NULL DEFAULT 30,
    "viewingBuffer" INTEGER NOT NULL DEFAULT 15,
    "emailNotifications" BOOLEAN NOT NULL DEFAULT true,
    "emailSignature" TEXT,
    "emailSignatureName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "UserSettings_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "UserSettings_userId_key" ON "UserSettings"("userId");
ALTER TABLE "UserSettings" DROP CONSTRAINT IF EXISTS "UserSettings_userId_fkey";
ALTER TABLE "UserSettings" ADD CONSTRAINT "UserSettings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CreateTable PropertyAssignment
CREATE TABLE IF NOT EXISTS "PropertyAssignment" (
    "id" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PropertyAssignment_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "PropertyAssignment_propertyId_userId_key" ON "PropertyAssignment"("propertyId", "userId");
CREATE INDEX IF NOT EXISTS "PropertyAssignment_propertyId_idx" ON "PropertyAssignment"("propertyId");
CREATE INDEX IF NOT EXISTS "PropertyAssignment_userId_idx" ON "PropertyAssignment"("userId");
ALTER TABLE "PropertyAssignment" DROP CONSTRAINT IF EXISTS "PropertyAssignment_propertyId_fkey";
ALTER TABLE "PropertyAssignment" ADD CONSTRAINT "PropertyAssignment_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PropertyAssignment" DROP CONSTRAINT IF EXISTS "PropertyAssignment_userId_fkey";
ALTER TABLE "PropertyAssignment" ADD CONSTRAINT "PropertyAssignment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable JarvisPendingAction
CREATE TABLE IF NOT EXISTS "JarvisPendingAction" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "leadId" TEXT,
    "propertyId" TEXT,
    "type" "PendingActionType" NOT NULL,
    "question" TEXT NOT NULL,
    "context" JSONB,
    "options" JSONB,
    "allowCustom" BOOLEAN NOT NULL DEFAULT true,
    "status" "PendingActionStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reminderSentAt" TIMESTAMP(3),
    "escalatedAt" TIMESTAMP(3),
    "resolvedAt" TIMESTAMP(3),
    "resolution" TEXT,
    "scheduledReminderId" TEXT,
    "scheduledEscalationId" TEXT,
    CONSTRAINT "JarvisPendingAction_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "JarvisPendingAction_tenantId_userId_status_idx" ON "JarvisPendingAction"("tenantId", "userId", "status");
ALTER TABLE "JarvisPendingAction" DROP CONSTRAINT IF EXISTS "JarvisPendingAction_userId_fkey";
ALTER TABLE "JarvisPendingAction" ADD CONSTRAINT "JarvisPendingAction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CreateTable Notification
CREATE TABLE IF NOT EXISTS "Notification" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "metadata" JSONB,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "Notification_tenantId_userId_read_idx" ON "Notification"("tenantId", "userId", "read");
CREATE INDEX IF NOT EXISTS "Notification_userId_createdAt_idx" ON "Notification"("userId", "createdAt");
ALTER TABLE "Notification" DROP CONSTRAINT IF EXISTS "Notification_userId_fkey";
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CreateTable Email
CREATE TABLE IF NOT EXISTS "Email" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "messageId" TEXT,
    "threadId" TEXT,
    "inReplyTo" TEXT,
    "from" TEXT NOT NULL,
    "fromName" TEXT,
    "to" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "cc" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "bcc" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "subject" TEXT NOT NULL,
    "bodyHtml" TEXT,
    "bodyText" TEXT,
    "folder" "EmailFolder" NOT NULL DEFAULT 'INBOX',
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "isStarred" BOOLEAN NOT NULL DEFAULT false,
    "hasAttachments" BOOLEAN NOT NULL DEFAULT false,
    "attachments" JSONB,
    "leadId" TEXT,
    "provider" "EmailProvider",
    "providerData" JSONB,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Email_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "Email_tenantId_folder_idx" ON "Email"("tenantId", "folder");
CREATE INDEX IF NOT EXISTS "Email_tenantId_receivedAt_idx" ON "Email"("tenantId", "receivedAt");
CREATE INDEX IF NOT EXISTS "Email_leadId_idx" ON "Email"("leadId");

-- CreateTable BugReport
CREATE TABLE IF NOT EXISTS "BugReport" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "userEmail" TEXT NOT NULL,
    "userName" TEXT,
    "tenantName" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "page" TEXT,
    "screenshotUrl" TEXT,
    "consoleLogs" TEXT,
    "status" "BugReportStatus" NOT NULL DEFAULT 'OPEN',
    "priority" "BugReportPriority" NOT NULL DEFAULT 'MEDIUM',
    "adminNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "BugReport_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "BugReport_status_createdAt_idx" ON "BugReport"("status", "createdAt");
CREATE INDEX IF NOT EXISTS "BugReport_tenantId_idx" ON "BugReport"("tenantId");
