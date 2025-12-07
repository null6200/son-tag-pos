-- Add autoSelectLoggedInAsServiceStaff flag to Setting table
ALTER TABLE "Setting" ADD COLUMN IF NOT EXISTS "autoSelectLoggedInAsServiceStaff" BOOLEAN NOT NULL DEFAULT FALSE;
