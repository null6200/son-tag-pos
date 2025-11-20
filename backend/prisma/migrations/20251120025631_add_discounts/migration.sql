-- CreateTable
CREATE TABLE "Discount" (
    "id" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Discount_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Discount_branchId_idx" ON "Discount"("branchId");

-- CreateIndex
CREATE UNIQUE INDEX "Discount_branchId_name_key" ON "Discount"("branchId", "name");

-- AddForeignKey
ALTER TABLE "Discount" ADD CONSTRAINT "Discount_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
