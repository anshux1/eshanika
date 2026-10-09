-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "feeAmount" DECIMAL(12,2) NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "ShippingZone" ADD COLUMN     "states" TEXT[] DEFAULT ARRAY[]::TEXT[];
