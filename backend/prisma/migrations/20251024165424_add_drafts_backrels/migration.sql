-- CreateTable
CREATE TABLE "Draft" (
    "id" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "sectionId" TEXT,
    "tableId" TEXT,
    "name" TEXT NOT NULL,
    "serviceType" TEXT NOT NULL,
    "waiterId" TEXT,
    "customerName" TEXT,
    "customerPhone" TEXT,
    "cart" JSONB NOT NULL,
    "subtotal" DECIMAL(12,2) NOT NULL,
    "discount" DECIMAL(12,2) NOT NULL,
    "tax" DECIMAL(12,2) NOT NULL,
    "total" DECIMAL(12,2) NOT NULL,
    "status" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Draft_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Draft_branchId_idx" ON "Draft"("branchId");

-- CreateIndex
CREATE INDEX "Draft_sectionId_idx" ON "Draft"("sectionId");

-- CreateIndex
CREATE INDEX "Draft_tableId_idx" ON "Draft"("tableId");

-- AddForeignKey
ALTER TABLE "Draft" ADD CONSTRAINT "Draft_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Draft" ADD CONSTRAINT "Draft_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "Section"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Draft" ADD CONSTRAINT "Draft_tableId_fkey" FOREIGN KEY ("tableId") REFERENCES "Table"("id") ON DELETE SET NULL ON UPDATE CASCADE;
