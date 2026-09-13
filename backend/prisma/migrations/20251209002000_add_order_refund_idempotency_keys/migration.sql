-- AlterTable: Add idempotencyKey to Order for preventing duplicate order creation
ALTER TABLE "Order" ADD COLUMN "idempotencyKey" TEXT;

-- CreateIndex: Unique constraint on Order.idempotencyKey (allows NULL values)
CREATE UNIQUE INDEX "Order_idempotencyKey_key" ON "Order"("idempotencyKey");

-- AlterTable: Add idempotencyKey to SalesReturn for preventing duplicate refunds
ALTER TABLE "SalesReturn" ADD COLUMN "idempotencyKey" TEXT;

-- CreateIndex: Unique constraint on SalesReturn.idempotencyKey (allows NULL values)
CREATE UNIQUE INDEX "SalesReturn_idempotencyKey_key" ON "SalesReturn"("idempotencyKey");
