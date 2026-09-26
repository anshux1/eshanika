/*
  Warnings:

  - You are about to drop the column `sourcePostId` on the `CheckoutFeeRule` table. All the data in the column will be lost.
  - You are about to drop the column `sourceLayout` on the `ContentEntry` table. All the data in the column will be lost.
  - You are about to drop the column `sourcePostId` on the `ContentEntry` table. All the data in the column will be lost.
  - You are about to drop the column `sourceTermId` on the `NavigationMenu` table. All the data in the column will be lost.
  - You are about to drop the column `sourcePostId` on the `NavigationMenuItem` table. All the data in the column will be lost.
  - You are about to drop the column `sourceOrderId` on the `Order` table. All the data in the column will be lost.
  - You are about to drop the column `sourceOrderItemId` on the `OrderFee` table. All the data in the column will be lost.
  - You are about to drop the column `sourceTermId` on the `ProductTag` table. All the data in the column will be lost.
  - You are about to drop the column `sourceInstanceId` on the `ShippingMethod` table. All the data in the column will be lost.
  - You are about to drop the column `sourceZoneId` on the `ShippingZone` table. All the data in the column will be lost.
  - You are about to drop the `ImportRecord` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ImportRun` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "ImportRecord" DROP CONSTRAINT "ImportRecord_importRunId_fkey";

-- DropIndex
DROP INDEX "CheckoutFeeRule_sourcePostId_key";

-- DropIndex
DROP INDEX "ContentEntry_sourcePostId_key";

-- DropIndex
DROP INDEX "NavigationMenu_sourceTermId_key";

-- DropIndex
DROP INDEX "NavigationMenuItem_sourcePostId_key";

-- DropIndex
DROP INDEX "OrderFee_sourceOrderItemId_key";

-- DropIndex
DROP INDEX "ProductTag_sourceTermId_key";

-- DropIndex
DROP INDEX "ShippingMethod_sourceInstanceId_key";

-- DropIndex
DROP INDEX "ShippingZone_sourceZoneId_key";

-- AlterTable
ALTER TABLE "CheckoutFeeRule" DROP COLUMN "sourcePostId";

-- AlterTable
ALTER TABLE "ContentEntry" DROP COLUMN "sourceLayout",
DROP COLUMN "sourcePostId";

-- AlterTable
ALTER TABLE "NavigationMenu" DROP COLUMN "sourceTermId";

-- AlterTable
ALTER TABLE "NavigationMenuItem" DROP COLUMN "sourcePostId";

-- AlterTable
ALTER TABLE "Order" DROP COLUMN "sourceOrderId";

-- AlterTable
ALTER TABLE "OrderFee" DROP COLUMN "sourceOrderItemId";

-- AlterTable
ALTER TABLE "ProductTag" DROP COLUMN "sourceTermId";

-- AlterTable
ALTER TABLE "ShippingMethod" DROP COLUMN "sourceInstanceId";

-- AlterTable
ALTER TABLE "ShippingZone" DROP COLUMN "sourceZoneId";

-- DropTable
DROP TABLE "ImportRecord";

-- DropTable
DROP TABLE "ImportRun";

-- AddForeignKey
ALTER TABLE "ProductAttributeOption" ADD CONSTRAINT "ProductAttributeOption_attributeId_fkey" FOREIGN KEY ("attributeId") REFERENCES "Attribute"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "VariantAttributeOption" ADD CONSTRAINT "VariantAttributeOption_attributeOptionId_fkey" FOREIGN KEY ("attributeOptionId") REFERENCES "AttributeOption"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "ReturnItem" ADD CONSTRAINT "ReturnItem_returnRequestId_fkey" FOREIGN KEY ("returnRequestId") REFERENCES "ReturnRequest"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "ReturnItem" ADD CONSTRAINT "ReturnItem_orderItemId_fkey" FOREIGN KEY ("orderItemId") REFERENCES "OrderItem"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
