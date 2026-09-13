-- AlterTable: Supplier gains the contact fields its forms already collect
ALTER TABLE "Supplier" ADD COLUMN "businessName" TEXT;
ALTER TABLE "Supplier" ADD COLUMN "contactPerson" TEXT;
ALTER TABLE "Supplier" ADD COLUMN "email" TEXT;
ALTER TABLE "Supplier" ADD COLUMN "phone" TEXT;
ALTER TABLE "Supplier" ADD COLUMN "address" TEXT;
ALTER TABLE "Supplier" ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable: Customer gains businessName (collected by the shared Contacts form)
ALTER TABLE "Customer" ADD COLUMN "businessName" TEXT;
