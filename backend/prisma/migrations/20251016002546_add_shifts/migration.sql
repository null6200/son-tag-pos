-- CreateTable
CREATE TABLE "Shift" (
    "id" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "sectionId" TEXT,
    "openedById" TEXT NOT NULL,
    "closedById" TEXT,
    "openedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closedAt" TIMESTAMP(3),
    "openingCash" DECIMAL(12,2) NOT NULL,
    "closingCash" DECIMAL(12,2),
    "expectedCash" DECIMAL(12,2) NOT NULL,
    "difference" DECIMAL(12,2),
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Shift_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Shift_branchId_idx" ON "Shift"("branchId");

-- CreateIndex
CREATE INDEX "Shift_openedAt_idx" ON "Shift"("openedAt");
