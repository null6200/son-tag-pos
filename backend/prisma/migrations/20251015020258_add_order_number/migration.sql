/*
  Warnings:

  - A unique constraint covering the columns `[branchId,orderNumber]` on the table `Order` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `orderNumber` to the `Order` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Branch" ADD COLUMN     "nextOrderSeq" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "orderNumber" INTEGER NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Order_branchId_orderNumber_key" ON "Order"("branchId", "orderNumber");
