-- Add FORWARDING to EmailFolder enum
ALTER TYPE "EmailFolder" ADD VALUE IF NOT EXISTS 'FORWARDING';

-- Add OTHER to EmailProvider enum
ALTER TYPE "EmailProvider" ADD VALUE IF NOT EXISTS 'OTHER';
