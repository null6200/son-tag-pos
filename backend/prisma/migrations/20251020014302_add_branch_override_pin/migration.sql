-- AlterTable
ALTER TABLE "Branch" ADD COLUMN     "overridePinGraceSeconds" INTEGER NOT NULL DEFAULT 5,
ADD COLUMN     "overridePinHash" TEXT;
