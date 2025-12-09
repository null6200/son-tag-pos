-- AlterTable: Add idempotencyKey to Payment for preventing duplicate payments
ALTER TABLE "Payment" ADD COLUMN "idempotencyKey" TEXT;

-- CreateIndex: Unique constraint on idempotencyKey (allows NULL values)
CREATE UNIQUE INDEX "Payment_idempotencyKey_key" ON "Payment"("idempotencyKey");
