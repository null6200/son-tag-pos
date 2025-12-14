/*
  Warnings:

  - You are about to drop the column `finalized` on the `Draft` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Branch" ADD COLUMN     "nextReceiptSeq" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Draft" DROP COLUMN "finalized";

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "receiptNo" TEXT;
