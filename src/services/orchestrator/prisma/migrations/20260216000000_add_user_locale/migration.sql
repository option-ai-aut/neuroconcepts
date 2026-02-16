-- AlterTable: Add locale column to UserSettings for per-seat language preference
ALTER TABLE "UserSettings" ADD COLUMN IF NOT EXISTS "locale" TEXT NOT NULL DEFAULT 'de';
