-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "productTypeId" TEXT;

-- AlterTable
ALTER TABLE "Section" ADD COLUMN     "sectionFunctionId" TEXT;

-- CreateTable
CREATE TABLE "SectionFunction" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "branchId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SectionFunction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductType" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "branchId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductTypeAllowedFunction" (
    "productTypeId" TEXT NOT NULL,
    "sectionFunctionId" TEXT NOT NULL,

    CONSTRAINT "ProductTypeAllowedFunction_pkey" PRIMARY KEY ("productTypeId","sectionFunctionId")
);

-- CreateIndex
CREATE UNIQUE INDEX "SectionFunction_branchId_name_key" ON "SectionFunction"("branchId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "ProductType_branchId_name_key" ON "ProductType"("branchId", "name");

-- AddForeignKey
ALTER TABLE "Section" ADD CONSTRAINT "Section_sectionFunctionId_fkey" FOREIGN KEY ("sectionFunctionId") REFERENCES "SectionFunction"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SectionFunction" ADD CONSTRAINT "SectionFunction_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductType" ADD CONSTRAINT "ProductType_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductTypeAllowedFunction" ADD CONSTRAINT "ProductTypeAllowedFunction_productTypeId_fkey" FOREIGN KEY ("productTypeId") REFERENCES "ProductType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductTypeAllowedFunction" ADD CONSTRAINT "ProductTypeAllowedFunction_sectionFunctionId_fkey" FOREIGN KEY ("sectionFunctionId") REFERENCES "SectionFunction"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_productTypeId_fkey" FOREIGN KEY ("productTypeId") REFERENCES "ProductType"("id") ON DELETE SET NULL ON UPDATE CASCADE;
