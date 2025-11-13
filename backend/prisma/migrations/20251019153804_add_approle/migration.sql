-- AlterTable
ALTER TABLE "User" ADD COLUMN     "appRoleId" TEXT;

-- CreateTable
CREATE TABLE "AppRole" (
    "id" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "permissions" TEXT[],
    "archived" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AppRole_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AppRole_branchId_name_key" ON "AppRole"("branchId", "name");

-- AddForeignKey
ALTER TABLE "AppRole" ADD CONSTRAINT "AppRole_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_appRoleId_fkey" FOREIGN KEY ("appRoleId") REFERENCES "AppRole"("id") ON DELETE SET NULL ON UPDATE CASCADE;
