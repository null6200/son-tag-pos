-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "sectionId" TEXT;

-- CreateTable
CREATE TABLE "SectionInventory" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "sectionId" TEXT NOT NULL,
    "qtyOnHand" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SectionInventory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SectionInventory_productId_sectionId_key" ON "SectionInventory"("productId", "sectionId");

-- CreateIndex
CREATE INDEX "Order_sectionId_idx" ON "Order"("sectionId");

-- AddForeignKey
ALTER TABLE "SectionInventory" ADD CONSTRAINT "SectionInventory_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SectionInventory" ADD CONSTRAINT "SectionInventory_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "Section"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "Section"("id") ON DELETE SET NULL ON UPDATE CASCADE;
