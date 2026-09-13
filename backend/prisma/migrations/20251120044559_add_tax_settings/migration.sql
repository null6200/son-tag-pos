-- AlterTable
ALTER TABLE "Setting" ADD COLUMN     "enableInlineTax" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "tax1Name" TEXT,
ADD COLUMN     "tax1Number" DECIMAL(5,2),
ADD COLUMN     "tax2Name" TEXT,
ADD COLUMN     "tax2Number" DECIMAL(5,2);
