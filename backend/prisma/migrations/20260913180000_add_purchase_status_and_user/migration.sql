-- CreateEnum
CREATE TYPE "PurchaseStatus" AS ENUM ('PENDING', 'APPROVED', 'RECEIVED', 'CANCELLED');

-- AlterTable
ALTER TABLE "Purchase" ADD COLUMN "status" "PurchaseStatus" NOT NULL DEFAULT 'PENDING';
ALTER TABLE "Purchase" ADD COLUMN "userId" TEXT;

-- CreateIndex
CREATE INDEX "Purchase_userId_idx" ON "Purchase"("userId");
CREATE INDEX "Purchase_status_idx" ON "Purchase"("status");

-- AddForeignKey
ALTER TABLE "Purchase" ADD CONSTRAINT "Purchase_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
