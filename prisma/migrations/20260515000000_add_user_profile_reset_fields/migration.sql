-- Add phone, passwordResetToken, passwordResetExpires to User model
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "phone" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "passwordResetToken" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "passwordResetExpires" TIMESTAMP(3);
