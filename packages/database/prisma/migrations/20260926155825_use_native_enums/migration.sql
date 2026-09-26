-- Replace text columns guarded by CHECK constraints with native PostgreSQL enums.
-- Columns are converted in place, so existing rows keep their values.

-- CreateEnum
CREATE TYPE "AdminAuditOutcome" AS ENUM ('success', 'failure');

-- CreateEnum
CREATE TYPE "AdminMembershipStatus" AS ENUM ('active', 'suspended');

-- CreateEnum
CREATE TYPE "AdminRole" AS ENUM ('owner', 'editor', 'support');

-- CreateEnum
CREATE TYPE "AttributeDisplayType" AS ENUM ('select', 'swatch');

-- CreateEnum
CREATE TYPE "AttributeStatus" AS ENUM ('active', 'archived');

-- CreateEnum
CREATE TYPE "BackorderPolicy" AS ENUM ('no', 'notify', 'allow');

-- CreateEnum
CREATE TYPE "CartStatus" AS ENUM ('active', 'converted', 'abandoned');

-- CreateEnum
CREATE TYPE "CategoryStatus" AS ENUM ('active', 'archived');

-- CreateEnum
CREATE TYPE "ContentEntryKind" AS ENUM ('page', 'footer');

-- CreateEnum
CREATE TYPE "ContentEntryStatus" AS ENUM ('draft', 'published', 'private', 'archived');

-- CreateEnum
CREATE TYPE "DiscountKind" AS ENUM ('fixed', 'percentage');

-- CreateEnum
CREATE TYPE "FulfillmentEventSource" AS ENUM ('carrier', 'admin', 'system');

-- CreateEnum
CREATE TYPE "FulfillmentStatus" AS ENUM ('pending', 'packed', 'shipped', 'out_for_delivery', 'delivered', 'failed', 'returned');

-- CreateEnum
CREATE TYPE "InventoryMovementReason" AS ENUM ('initial_stock', 'restock', 'sale', 'return', 'cancellation', 'adjustment', 'damage');

-- CreateEnum
CREATE TYPE "InventoryReservationStatus" AS ENUM ('reserved', 'released', 'consumed', 'expired');

-- CreateEnum
CREATE TYPE "MediaAssetStatus" AS ENUM ('active', 'archived');

-- CreateEnum
CREATE TYPE "MediaRole" AS ENUM ('primary', 'gallery');

-- CreateEnum
CREATE TYPE "OrderAddressType" AS ENUM ('billing', 'shipping');

-- CreateEnum
CREATE TYPE "OrderFulfillmentStatus" AS ENUM ('unfulfilled', 'processing', 'partially_shipped', 'shipped', 'out_for_delivery', 'delivered', 'returned');

-- CreateEnum
CREATE TYPE "OrderPaymentStatus" AS ENUM ('pending', 'authorized', 'paid', 'failed', 'partially_refunded', 'refunded');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('created', 'confirmed', 'processing', 'shipped', 'out_for_delivery', 'delivered', 'cancelled', 'returned');

-- CreateEnum
CREATE TYPE "OrderStatusHistorySource" AS ENUM ('admin', 'system', 'carrier');

-- CreateEnum
CREATE TYPE "PaymentEventProcessingStatus" AS ENUM ('pending', 'processed', 'failed', 'ignored');

-- CreateEnum
CREATE TYPE "PaymentOrderLifecycleStatus" AS ENUM ('pending', 'created', 'attempted', 'paid', 'expired', 'cancelled');

-- CreateEnum
CREATE TYPE "ProductStatus" AS ENUM ('draft', 'active', 'archived');

-- CreateEnum
CREATE TYPE "ProductTaxStatus" AS ENUM ('taxable', 'shipping', 'none');

-- CreateEnum
CREATE TYPE "ProductType" AS ENUM ('simple', 'variable');

-- CreateEnum
CREATE TYPE "RefundSpeedProcessed" AS ENUM ('normal', 'instant');

-- CreateEnum
CREATE TYPE "RefundSpeedRequested" AS ENUM ('normal', 'optimum');

-- CreateEnum
CREATE TYPE "RefundStatus" AS ENUM ('pending', 'processed', 'failed');

-- CreateEnum
CREATE TYPE "ReturnStatus" AS ENUM ('requested', 'approved', 'rejected', 'received', 'completed', 'cancelled');

-- CreateEnum
CREATE TYPE "ShippingMethodKind" AS ENUM ('flat_rate', 'free_shipping');

-- CreateEnum
CREATE TYPE "ShippingRequirement" AS ENUM ('none', 'minimum_subtotal', 'coupon');

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('admin', 'customer');

-- CreateEnum
CREATE TYPE "VariantStatus" AS ENUM ('active', 'archived');

-- CreateEnum
CREATE TYPE "VariantStockStatus" AS ENUM ('in_stock', 'out_of_stock');

-- AdminAuditLog.actorAdminRole
ALTER TABLE "AdminAuditLog" DROP CONSTRAINT "AdminAuditLog_actorAdminRole_check_3ff1fcd1";
ALTER TABLE "AdminAuditLog" ALTER COLUMN "actorAdminRole" TYPE "AdminRole" USING ("actorAdminRole"::"AdminRole");

-- AdminAuditLog.outcome
ALTER TABLE "AdminAuditLog" DROP CONSTRAINT "AdminAuditLog_outcome_check_899cdfc3";
ALTER TABLE "AdminAuditLog" ALTER COLUMN "outcome" DROP DEFAULT;
ALTER TABLE "AdminAuditLog" ALTER COLUMN "outcome" TYPE "AdminAuditOutcome" USING ("outcome"::"AdminAuditOutcome");
ALTER TABLE "AdminAuditLog" ALTER COLUMN "outcome" SET DEFAULT 'success';

-- AdminInvitation.role
ALTER TABLE "AdminInvitation" DROP CONSTRAINT "AdminInvitation_role_check_b788aa13";
ALTER TABLE "AdminInvitation" ALTER COLUMN "role" TYPE "AdminRole" USING ("role"::"AdminRole");

-- AdminMembership.role
ALTER TABLE "AdminMembership" DROP CONSTRAINT "AdminMembership_role_check_b788aa13";
ALTER TABLE "AdminMembership" ALTER COLUMN "role" DROP DEFAULT;
ALTER TABLE "AdminMembership" ALTER COLUMN "role" TYPE "AdminRole" USING ("role"::"AdminRole");
ALTER TABLE "AdminMembership" ALTER COLUMN "role" SET DEFAULT 'editor';

-- AdminMembership.status
ALTER TABLE "AdminMembership" DROP CONSTRAINT "AdminMembership_status_check_697c26d8";
ALTER TABLE "AdminMembership" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "AdminMembership" ALTER COLUMN "status" TYPE "AdminMembershipStatus" USING ("status"::"AdminMembershipStatus");
ALTER TABLE "AdminMembership" ALTER COLUMN "status" SET DEFAULT 'active';

-- Attribute.displayType
ALTER TABLE "Attribute" DROP CONSTRAINT "Attribute_displayType_check_32c38d8a";
ALTER TABLE "Attribute" ALTER COLUMN "displayType" DROP DEFAULT;
ALTER TABLE "Attribute" ALTER COLUMN "displayType" TYPE "AttributeDisplayType" USING ("displayType"::"AttributeDisplayType");
ALTER TABLE "Attribute" ALTER COLUMN "displayType" SET DEFAULT 'select';

-- Attribute.status
ALTER TABLE "Attribute" DROP CONSTRAINT "Attribute_status_check_28420b15";
ALTER TABLE "Attribute" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Attribute" ALTER COLUMN "status" TYPE "AttributeStatus" USING ("status"::"AttributeStatus");
ALTER TABLE "Attribute" ALTER COLUMN "status" SET DEFAULT 'active';

-- AttributeOption.status
ALTER TABLE "AttributeOption" DROP CONSTRAINT "AttributeOption_status_check_28420b15";
ALTER TABLE "AttributeOption" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "AttributeOption" ALTER COLUMN "status" TYPE "AttributeStatus" USING ("status"::"AttributeStatus");
ALTER TABLE "AttributeOption" ALTER COLUMN "status" SET DEFAULT 'active';

-- Cart.status
ALTER TABLE "Cart" DROP CONSTRAINT "Cart_status_check_04930e50";
ALTER TABLE "Cart" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Cart" ALTER COLUMN "status" TYPE "CartStatus" USING ("status"::"CartStatus");
ALTER TABLE "Cart" ALTER COLUMN "status" SET DEFAULT 'active';

-- Category.status
ALTER TABLE "Category" DROP CONSTRAINT "Category_status_check_28420b15";
ALTER TABLE "Category" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Category" ALTER COLUMN "status" TYPE "CategoryStatus" USING ("status"::"CategoryStatus");
ALTER TABLE "Category" ALTER COLUMN "status" SET DEFAULT 'active';

-- ContentEntry.kind
ALTER TABLE "ContentEntry" DROP CONSTRAINT "ContentEntry_kind_check_e3683e46";
ALTER TABLE "ContentEntry" ALTER COLUMN "kind" DROP DEFAULT;
ALTER TABLE "ContentEntry" ALTER COLUMN "kind" TYPE "ContentEntryKind" USING ("kind"::"ContentEntryKind");
ALTER TABLE "ContentEntry" ALTER COLUMN "kind" SET DEFAULT 'page';

-- ContentEntry.status
ALTER TABLE "ContentEntry" DROP CONSTRAINT "ContentEntry_status_check_03e90df4";
ALTER TABLE "ContentEntry" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "ContentEntry" ALTER COLUMN "status" TYPE "ContentEntryStatus" USING ("status"::"ContentEntryStatus");
ALTER TABLE "ContentEntry" ALTER COLUMN "status" SET DEFAULT 'draft';

-- Coupon.kind
ALTER TABLE "Coupon" DROP CONSTRAINT "Coupon_kind_check_5f2374ad";
ALTER TABLE "Coupon" ALTER COLUMN "kind" TYPE "DiscountKind" USING ("kind"::"DiscountKind");

-- Fulfillment.status
ALTER TABLE "Fulfillment" DROP CONSTRAINT "Fulfillment_status_check_aa310e17";
ALTER TABLE "Fulfillment" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Fulfillment" ALTER COLUMN "status" TYPE "FulfillmentStatus" USING ("status"::"FulfillmentStatus");
ALTER TABLE "Fulfillment" ALTER COLUMN "status" SET DEFAULT 'pending';

-- FulfillmentEvent.source
ALTER TABLE "FulfillmentEvent" DROP CONSTRAINT "FulfillmentEvent_source_check_02b7f620";
ALTER TABLE "FulfillmentEvent" ALTER COLUMN "source" DROP DEFAULT;
ALTER TABLE "FulfillmentEvent" ALTER COLUMN "source" TYPE "FulfillmentEventSource" USING ("source"::"FulfillmentEventSource");
ALTER TABLE "FulfillmentEvent" ALTER COLUMN "source" SET DEFAULT 'carrier';

-- FulfillmentEvent.status
ALTER TABLE "FulfillmentEvent" DROP CONSTRAINT "FulfillmentEvent_status_check_aa310e17";
ALTER TABLE "FulfillmentEvent" ALTER COLUMN "status" TYPE "FulfillmentStatus" USING ("status"::"FulfillmentStatus");

-- InventoryMovement.reason
ALTER TABLE "InventoryMovement" DROP CONSTRAINT "InventoryMovement_reason_check_51954fe8";
ALTER TABLE "InventoryMovement" ALTER COLUMN "reason" TYPE "InventoryMovementReason" USING ("reason"::"InventoryMovementReason");

-- InventoryReservation.status
ALTER TABLE "InventoryReservation" DROP CONSTRAINT "InventoryReservation_status_check_f22ba6f8";
ALTER TABLE "InventoryReservation" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "InventoryReservation" ALTER COLUMN "status" TYPE "InventoryReservationStatus" USING ("status"::"InventoryReservationStatus");
ALTER TABLE "InventoryReservation" ALTER COLUMN "status" SET DEFAULT 'reserved';

-- MediaAsset.status
ALTER TABLE "MediaAsset" DROP CONSTRAINT "MediaAsset_status_check_28420b15";
ALTER TABLE "MediaAsset" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "MediaAsset" ALTER COLUMN "status" TYPE "MediaAssetStatus" USING ("status"::"MediaAssetStatus");
ALTER TABLE "MediaAsset" ALTER COLUMN "status" SET DEFAULT 'active';

-- Order.fulfillmentStatus
ALTER TABLE "Order" DROP CONSTRAINT "Order_fulfillmentStatus_check_58f44685";
ALTER TABLE "Order" ALTER COLUMN "fulfillmentStatus" DROP DEFAULT;
ALTER TABLE "Order" ALTER COLUMN "fulfillmentStatus" TYPE "OrderFulfillmentStatus" USING ("fulfillmentStatus"::"OrderFulfillmentStatus");
ALTER TABLE "Order" ALTER COLUMN "fulfillmentStatus" SET DEFAULT 'unfulfilled';

-- Order.paymentStatus
ALTER TABLE "Order" DROP CONSTRAINT "Order_paymentStatus_check_00dd983a";
ALTER TABLE "Order" ALTER COLUMN "paymentStatus" DROP DEFAULT;
ALTER TABLE "Order" ALTER COLUMN "paymentStatus" TYPE "OrderPaymentStatus" USING ("paymentStatus"::"OrderPaymentStatus");
ALTER TABLE "Order" ALTER COLUMN "paymentStatus" SET DEFAULT 'pending';

-- Order.status
ALTER TABLE "Order" DROP CONSTRAINT "Order_status_check_e4b164a0";
ALTER TABLE "Order" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Order" ALTER COLUMN "status" TYPE "OrderStatus" USING ("status"::"OrderStatus");
ALTER TABLE "Order" ALTER COLUMN "status" SET DEFAULT 'created';

-- OrderAddress.addressType
ALTER TABLE "OrderAddress" DROP CONSTRAINT "OrderAddress_addressType_check_51cdeafb";
ALTER TABLE "OrderAddress" ALTER COLUMN "addressType" TYPE "OrderAddressType" USING ("addressType"::"OrderAddressType");

-- OrderStatusHistory.fromStatus
ALTER TABLE "OrderStatusHistory" DROP CONSTRAINT "OrderStatusHistory_fromStatus_check_cb118d45";
ALTER TABLE "OrderStatusHistory" ALTER COLUMN "fromStatus" TYPE "OrderStatus" USING ("fromStatus"::"OrderStatus");

-- OrderStatusHistory.source
ALTER TABLE "OrderStatusHistory" DROP CONSTRAINT "OrderStatusHistory_source_check_04d68c19";
ALTER TABLE "OrderStatusHistory" ALTER COLUMN "source" DROP DEFAULT;
ALTER TABLE "OrderStatusHistory" ALTER COLUMN "source" TYPE "OrderStatusHistorySource" USING ("source"::"OrderStatusHistorySource");
ALTER TABLE "OrderStatusHistory" ALTER COLUMN "source" SET DEFAULT 'system';

-- OrderStatusHistory.toStatus
ALTER TABLE "OrderStatusHistory" DROP CONSTRAINT "OrderStatusHistory_toStatus_check_14fe1073";
ALTER TABLE "OrderStatusHistory" ALTER COLUMN "toStatus" TYPE "OrderStatus" USING ("toStatus"::"OrderStatus");

-- PaymentEvent.processingStatus
ALTER TABLE "PaymentEvent" DROP CONSTRAINT "PaymentEvent_processingStatus_check_7392a4d7";
ALTER TABLE "PaymentEvent" ALTER COLUMN "processingStatus" DROP DEFAULT;
ALTER TABLE "PaymentEvent" ALTER COLUMN "processingStatus" TYPE "PaymentEventProcessingStatus" USING ("processingStatus"::"PaymentEventProcessingStatus");
ALTER TABLE "PaymentEvent" ALTER COLUMN "processingStatus" SET DEFAULT 'pending';

-- PaymentOrder.status
ALTER TABLE "PaymentOrder" DROP CONSTRAINT "PaymentOrder_status_check_d50637e8";
ALTER TABLE "PaymentOrder" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "PaymentOrder" ALTER COLUMN "status" TYPE "PaymentOrderLifecycleStatus" USING ("status"::"PaymentOrderLifecycleStatus");
ALTER TABLE "PaymentOrder" ALTER COLUMN "status" SET DEFAULT 'pending';

-- Product.productType
ALTER TABLE "Product" DROP CONSTRAINT "Product_productType_check_28cac4c0";
ALTER TABLE "Product" ALTER COLUMN "productType" DROP DEFAULT;
ALTER TABLE "Product" ALTER COLUMN "productType" TYPE "ProductType" USING ("productType"::"ProductType");
ALTER TABLE "Product" ALTER COLUMN "productType" SET DEFAULT 'simple';

-- Product.status
ALTER TABLE "Product" DROP CONSTRAINT "Product_status_check_ee326507";
ALTER TABLE "Product" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Product" ALTER COLUMN "status" TYPE "ProductStatus" USING ("status"::"ProductStatus");
ALTER TABLE "Product" ALTER COLUMN "status" SET DEFAULT 'draft';

-- Product.taxStatus
ALTER TABLE "Product" DROP CONSTRAINT "Product_taxStatus_check_80556900";
ALTER TABLE "Product" ALTER COLUMN "taxStatus" DROP DEFAULT;
ALTER TABLE "Product" ALTER COLUMN "taxStatus" TYPE "ProductTaxStatus" USING ("taxStatus"::"ProductTaxStatus");
ALTER TABLE "Product" ALTER COLUMN "taxStatus" SET DEFAULT 'taxable';

-- ProductMedia.role
ALTER TABLE "ProductMedia" DROP CONSTRAINT "ProductMedia_role_check_7bba494f";
ALTER TABLE "ProductMedia" ALTER COLUMN "role" DROP DEFAULT;
ALTER TABLE "ProductMedia" ALTER COLUMN "role" TYPE "MediaRole" USING ("role"::"MediaRole");
ALTER TABLE "ProductMedia" ALTER COLUMN "role" SET DEFAULT 'gallery';

-- ProductVariant.backorderPolicy
ALTER TABLE "ProductVariant" DROP CONSTRAINT "ProductVariant_backorderPolicy_check_50425893";
ALTER TABLE "ProductVariant" ALTER COLUMN "backorderPolicy" DROP DEFAULT;
ALTER TABLE "ProductVariant" ALTER COLUMN "backorderPolicy" TYPE "BackorderPolicy" USING ("backorderPolicy"::"BackorderPolicy");
ALTER TABLE "ProductVariant" ALTER COLUMN "backorderPolicy" SET DEFAULT 'no';

-- ProductVariant.status
ALTER TABLE "ProductVariant" DROP CONSTRAINT "ProductVariant_status_check_28420b15";
ALTER TABLE "ProductVariant" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "ProductVariant" ALTER COLUMN "status" TYPE "VariantStatus" USING ("status"::"VariantStatus");
ALTER TABLE "ProductVariant" ALTER COLUMN "status" SET DEFAULT 'active';

-- ProductVariant.stockStatus
ALTER TABLE "ProductVariant" DROP CONSTRAINT "ProductVariant_stockStatus_check_567007ec";
ALTER TABLE "ProductVariant" ALTER COLUMN "stockStatus" DROP DEFAULT;
ALTER TABLE "ProductVariant" ALTER COLUMN "stockStatus" TYPE "VariantStockStatus" USING ("stockStatus"::"VariantStockStatus");
ALTER TABLE "ProductVariant" ALTER COLUMN "stockStatus" SET DEFAULT 'in_stock';

-- Refund.speedProcessed
ALTER TABLE "Refund" DROP CONSTRAINT "Refund_speedProcessed_check_1c59a424";
ALTER TABLE "Refund" ALTER COLUMN "speedProcessed" TYPE "RefundSpeedProcessed" USING ("speedProcessed"::"RefundSpeedProcessed");

-- Refund.speedRequested
ALTER TABLE "Refund" DROP CONSTRAINT "Refund_speedRequested_check_b0aa8513";
ALTER TABLE "Refund" ALTER COLUMN "speedRequested" DROP DEFAULT;
ALTER TABLE "Refund" ALTER COLUMN "speedRequested" TYPE "RefundSpeedRequested" USING ("speedRequested"::"RefundSpeedRequested");
ALTER TABLE "Refund" ALTER COLUMN "speedRequested" SET DEFAULT 'normal';

-- Refund.status
ALTER TABLE "Refund" DROP CONSTRAINT "Refund_status_check_29e2c2cd";
ALTER TABLE "Refund" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Refund" ALTER COLUMN "status" TYPE "RefundStatus" USING ("status"::"RefundStatus");
ALTER TABLE "Refund" ALTER COLUMN "status" SET DEFAULT 'pending';

-- ReturnRequest.status
ALTER TABLE "ReturnRequest" DROP CONSTRAINT "ReturnRequest_status_check_fd5e81f4";
ALTER TABLE "ReturnRequest" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "ReturnRequest" ALTER COLUMN "status" TYPE "ReturnStatus" USING ("status"::"ReturnStatus");
ALTER TABLE "ReturnRequest" ALTER COLUMN "status" SET DEFAULT 'requested';

-- ShippingMethod.kind
ALTER TABLE "ShippingMethod" DROP CONSTRAINT "ShippingMethod_kind_check_71e379f0";
ALTER TABLE "ShippingMethod" ALTER COLUMN "kind" TYPE "ShippingMethodKind" USING ("kind"::"ShippingMethodKind");

-- ShippingMethod.requirement
ALTER TABLE "ShippingMethod" DROP CONSTRAINT "ShippingMethod_requirement_check_0a4f3146";
ALTER TABLE "ShippingMethod" ALTER COLUMN "requirement" DROP DEFAULT;
ALTER TABLE "ShippingMethod" ALTER COLUMN "requirement" TYPE "ShippingRequirement" USING ("requirement"::"ShippingRequirement");
ALTER TABLE "ShippingMethod" ALTER COLUMN "requirement" SET DEFAULT 'none';

-- User.role
ALTER TABLE "User" DROP CONSTRAINT "User_role_check_be4d6d23";
ALTER TABLE "User" ALTER COLUMN "role" DROP DEFAULT;
ALTER TABLE "User" ALTER COLUMN "role" TYPE "UserRole" USING ("role"::"UserRole");
ALTER TABLE "User" ALTER COLUMN "role" SET DEFAULT 'customer';
