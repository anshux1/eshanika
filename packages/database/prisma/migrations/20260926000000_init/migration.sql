-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "UserAddress" (
    "id" UUID NOT NULL,
    "userId" TEXT NOT NULL,
    "label" TEXT,
    "recipientName" TEXT NOT NULL,
    "phone" TEXT,
    "addressLine1" TEXT NOT NULL,
    "addressLine2" TEXT,
    "landmark" TEXT,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "postalCode" TEXT NOT NULL,
    "countryCode" TEXT NOT NULL DEFAULT 'IN',
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "UserAddress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdminAuditLog" (
    "id" UUID NOT NULL,
    "actorUserId" TEXT,
    "actorAdminRole" TEXT,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "outcome" TEXT NOT NULL DEFAULT 'success',
    "reason" TEXT,
    "beforeData" JSONB,
    "afterData" JSONB,
    "metadata" JSONB,
    "requestId" TEXT,
    "sessionId" TEXT,
    "ipAddress" INET,
    "userAgent" TEXT,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdminInvitation" (
    "id" UUID NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "phoneNumber" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "invitedByUserId" TEXT NOT NULL,
    "acceptedByUserId" TEXT,
    "expiresAt" TIMESTAMPTZ(6) NOT NULL,
    "acceptedAt" TIMESTAMPTZ(6),
    "revokedAt" TIMESTAMPTZ(6),
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminInvitation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdminMembership" (
    "userId" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'editor',
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "AdminMembership_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "Attribute" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "displayType" TEXT NOT NULL DEFAULT 'select',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "Attribute_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AttributeOption" (
    "id" UUID NOT NULL,
    "attributeId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "swatchValue" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "AttributeOption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuthRateBucket" (
    "key" TEXT NOT NULL,
    "count" INTEGER NOT NULL,
    "expiresAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "AuthRateBucket_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "AuthEvent" (
    "id" UUID NOT NULL,
    "action" TEXT NOT NULL,
    "requestId" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuthEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "image" TEXT,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,
    "phoneNumber" TEXT,
    "phoneNumberVerified" BOOLEAN,
    "role" TEXT NOT NULL DEFAULT 'customer',

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "expiresAt" TIMESTAMPTZ(6) NOT NULL,
    "token" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "userId" TEXT NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "idToken" TEXT,
    "accessTokenExpiresAt" TIMESTAMPTZ(6),
    "refreshTokenExpiresAt" TIMESTAMPTZ(6),
    "scope" TEXT,
    "password" TEXT,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Verification" (
    "id" TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "expiresAt" TIMESTAMPTZ(6) NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "Verification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Cart" (
    "id" UUID NOT NULL,
    "userId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "convertedOrderId" UUID,
    "expiresAt" TIMESTAMPTZ(6) NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "Cart_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CartItem" (
    "id" UUID NOT NULL,
    "cartId" UUID NOT NULL,
    "variantId" UUID NOT NULL,
    "quantity" INTEGER NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "CartItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CategoryProduct" (
    "categoryId" UUID NOT NULL,
    "productId" UUID NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "CategoryProduct_pkey" PRIMARY KEY ("categoryId","productId")
);

-- CreateTable
CREATE TABLE "Category" (
    "id" UUID NOT NULL,
    "parentId" UUID,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContentEntry" (
    "id" UUID NOT NULL,
    "sourcePostId" TEXT,
    "title" TEXT NOT NULL,
    "kind" TEXT NOT NULL DEFAULT 'page',
    "placement" TEXT,
    "slug" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "bodyHtml" TEXT NOT NULL DEFAULT '',
    "sourceLayout" JSONB,
    "publishedAt" TIMESTAMPTZ(6),
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "ContentEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NavigationMenu" (
    "id" UUID NOT NULL,
    "sourceTermId" TEXT,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "location" TEXT,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "NavigationMenu_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NavigationMenuItem" (
    "id" UUID NOT NULL,
    "sourcePostId" TEXT,
    "menuId" UUID NOT NULL,
    "categoryId" UUID,
    "contentEntryId" UUID,
    "url" TEXT,
    "label" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "NavigationMenuItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Coupon" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "value" DECIMAL(12,2) NOT NULL,
    "minimumSubtotal" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "maximumDiscount" DECIMAL(12,2),
    "usageLimit" INTEGER,
    "perUserLimit" INTEGER NOT NULL DEFAULT 1,
    "startsAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMPTZ(6),
    "archivedAt" TIMESTAMPTZ(6),
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "Coupon_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CouponRedemption" (
    "id" UUID NOT NULL,
    "couponId" UUID NOT NULL,
    "orderId" UUID NOT NULL,
    "userId" TEXT NOT NULL,
    "discountAmount" DECIMAL(12,2) NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CouponRedemption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CheckoutFeeRule" (
    "id" UUID NOT NULL,
    "sourcePostId" TEXT,
    "name" TEXT NOT NULL,
    "paymentMethod" TEXT NOT NULL DEFAULT 'cod',
    "amount" DECIMAL(12,2) NOT NULL,
    "currencyCode" TEXT NOT NULL DEFAULT 'INR',
    "taxable" BOOLEAN NOT NULL DEFAULT false,
    "optional" BOOLEAN NOT NULL DEFAULT false,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "CheckoutFeeRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderFee" (
    "id" UUID NOT NULL,
    "orderId" UUID NOT NULL,
    "sourceOrderItemId" TEXT,
    "name" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "taxAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "currencyCode" TEXT NOT NULL DEFAULT 'INR',
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrderFee_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Fulfillment" (
    "id" UUID NOT NULL,
    "orderId" UUID NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "carrier" TEXT,
    "trackingNumber" TEXT,
    "trackingUrl" TEXT,
    "estimatedDeliveryAt" TIMESTAMPTZ(6),
    "shippedAt" TIMESTAMPTZ(6),
    "deliveredAt" TIMESTAMPTZ(6),
    "failureReason" TEXT,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "Fulfillment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FulfillmentItem" (
    "orderId" UUID NOT NULL,
    "fulfillmentId" UUID NOT NULL,
    "orderItemId" UUID NOT NULL,
    "quantity" INTEGER NOT NULL,

    CONSTRAINT "FulfillmentItem_pkey" PRIMARY KEY ("fulfillmentId","orderItemId")
);

-- CreateTable
CREATE TABLE "FulfillmentEvent" (
    "id" UUID NOT NULL,
    "fulfillmentId" UUID NOT NULL,
    "status" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'carrier',
    "provider" TEXT,
    "providerStatus" TEXT,
    "description" TEXT,
    "location" TEXT,
    "externalEventId" TEXT,
    "rawPayload" JSONB,
    "occurredAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdByUserId" TEXT,

    CONSTRAINT "FulfillmentEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ImportRun" (
    "id" UUID NOT NULL,
    "sourceSystem" TEXT NOT NULL,
    "sourceRunId" TEXT,
    "entityType" TEXT NOT NULL,
    "sourceFileName" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "startedAt" TIMESTAMPTZ(6),
    "completedAt" TIMESTAMPTZ(6),
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "ImportRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ImportRecord" (
    "id" UUID NOT NULL,
    "importRunId" UUID,
    "sourceSystem" TEXT NOT NULL,
    "sourceTable" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "sourceImportKey" TEXT,
    "targetTable" TEXT,
    "targetId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "ImportRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventoryLevel" (
    "id" UUID NOT NULL,
    "variantId" UUID NOT NULL,
    "quantityOnHand" INTEGER NOT NULL DEFAULT 0,
    "quantityReserved" INTEGER NOT NULL DEFAULT 0,
    "reorderPoint" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "InventoryLevel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventoryMovement" (
    "id" UUID NOT NULL,
    "variantId" UUID NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "quantityDelta" INTEGER NOT NULL,
    "quantityAfter" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "referenceType" TEXT,
    "referenceId" TEXT,
    "note" TEXT,
    "actorUserId" TEXT,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InventoryMovement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MediaAsset" (
    "id" UUID NOT NULL,
    "storageKey" TEXT NOT NULL,
    "originalFileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "fileSizeBytes" BIGINT NOT NULL,
    "width" INTEGER,
    "height" INTEGER,
    "altText" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "MediaAsset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductMedia" (
    "productId" UUID NOT NULL,
    "mediaAssetId" UUID NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'gallery',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "ProductMedia_pkey" PRIMARY KEY ("productId","mediaAssetId")
);

-- CreateTable
CREATE TABLE "Order" (
    "id" UUID NOT NULL,
    "orderNumber" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'created',
    "paymentStatus" TEXT NOT NULL DEFAULT 'pending',
    "fulfillmentStatus" TEXT NOT NULL DEFAULT 'unfulfilled',
    "currencyCode" TEXT NOT NULL DEFAULT 'INR',
    "subtotalAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "discountAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "taxAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "shippingAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "totalAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "billingEmail" TEXT NOT NULL,
    "customerNote" TEXT,
    "sourceOrderId" TEXT,
    "placedAt" TIMESTAMPTZ(6),
    "paidAt" TIMESTAMPTZ(6),
    "completedAt" TIMESTAMPTZ(6),
    "cancelledAt" TIMESTAMPTZ(6),
    "cancelledReason" TEXT,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderItem" (
    "id" UUID NOT NULL,
    "orderId" UUID NOT NULL,
    "productId" UUID,
    "variantId" UUID,
    "productNameSnapshot" TEXT NOT NULL,
    "variantNameSnapshot" TEXT NOT NULL,
    "skuSnapshot" TEXT NOT NULL,
    "variantOptionsSnapshot" JSONB,
    "quantity" INTEGER NOT NULL,
    "unitPrice" DECIMAL(12,2) NOT NULL,
    "discountAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "taxAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "shippingAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "totalAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrderItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderAddress" (
    "id" UUID NOT NULL,
    "orderId" UUID NOT NULL,
    "addressType" TEXT NOT NULL,
    "recipientName" TEXT NOT NULL,
    "phone" TEXT,
    "addressLine1" TEXT NOT NULL,
    "addressLine2" TEXT,
    "landmark" TEXT,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "postalCode" TEXT NOT NULL,
    "countryCode" TEXT NOT NULL DEFAULT 'IN',
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrderAddress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderStatusHistory" (
    "id" UUID NOT NULL,
    "orderId" UUID NOT NULL,
    "fromStatus" TEXT,
    "toStatus" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'system',
    "provider" TEXT,
    "changedByUserId" TEXT,
    "note" TEXT,
    "metadata" JSONB,
    "externalEventId" TEXT,
    "occurredAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrderStatusHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderNote" (
    "id" UUID NOT NULL,
    "orderId" UUID NOT NULL,
    "authorUserId" TEXT,
    "note" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrderNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OutboxEvent" (
    "id" UUID NOT NULL,
    "eventType" TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "attemptCount" INTEGER NOT NULL DEFAULT 0,
    "availableAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "leaseToken" UUID,
    "leasedUntil" TIMESTAMPTZ(6),
    "publishedAt" TIMESTAMPTZ(6),
    "lastError" TEXT,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OutboxEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentOrder" (
    "id" UUID NOT NULL,
    "orderId" UUID NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'razorpay',
    "idempotencyKey" TEXT NOT NULL,
    "providerOrderId" TEXT,
    "receipt" TEXT NOT NULL,
    "amountMinor" BIGINT NOT NULL,
    "currencyCode" TEXT NOT NULL DEFAULT 'INR',
    "status" TEXT NOT NULL DEFAULT 'pending',
    "providerStatus" TEXT,
    "providerAmountPaidMinor" BIGINT,
    "providerAmountDueMinor" BIGINT,
    "providerAttempts" INTEGER NOT NULL DEFAULT 0,
    "providerCreatedAt" TIMESTAMPTZ(6),
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "PaymentOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" UUID NOT NULL,
    "paymentOrderId" UUID NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'razorpay',
    "providerPaymentId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "amountMinor" BIGINT NOT NULL,
    "currencyCode" TEXT NOT NULL,
    "paymentMethod" TEXT,
    "amountRefundedMinor" BIGINT NOT NULL DEFAULT 0,
    "refundStatus" TEXT,
    "feeMinor" BIGINT,
    "taxMinor" BIGINT,
    "errorCode" TEXT,
    "errorDescription" TEXT,
    "errorReason" TEXT,
    "errorSource" TEXT,
    "errorStep" TEXT,
    "capturedAt" TIMESTAMPTZ(6),
    "providerCreatedAt" TIMESTAMPTZ(6),
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentEvent" (
    "id" UUID NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'razorpay',
    "providerEventId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "paymentOrderId" UUID,
    "paymentId" UUID,
    "providerOrderId" TEXT,
    "providerPaymentId" TEXT,
    "payload" JSONB NOT NULL,
    "processingStatus" TEXT NOT NULL DEFAULT 'pending',
    "processingError" TEXT,
    "attemptCount" INTEGER NOT NULL DEFAULT 0,
    "providerOccurredAt" TIMESTAMPTZ(6),
    "receivedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMPTZ(6),
    "nextAttemptAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PaymentEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Refund" (
    "id" UUID NOT NULL,
    "paymentId" UUID NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'razorpay',
    "providerRefundId" TEXT,
    "idempotencyKey" TEXT NOT NULL,
    "amountMinor" BIGINT NOT NULL,
    "currencyCode" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "speedRequested" TEXT NOT NULL DEFAULT 'normal',
    "speedProcessed" TEXT,
    "providerReceipt" TEXT,
    "acquirerReference" TEXT,
    "reason" TEXT,
    "failureReason" TEXT,
    "requestedByUserId" TEXT,
    "requestedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "providerCreatedAt" TIMESTAMPTZ(6),
    "processedAt" TIMESTAMPTZ(6),
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "Refund_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductAttribute" (
    "productId" UUID NOT NULL,
    "attributeId" UUID NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "useForVariants" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "ProductAttribute_pkey" PRIMARY KEY ("productId","attributeId")
);

-- CreateTable
CREATE TABLE "ProductAttributeOption" (
    "productId" UUID NOT NULL,
    "attributeId" UUID NOT NULL,
    "attributeOptionId" UUID NOT NULL,

    CONSTRAINT "ProductAttributeOption_pkey" PRIMARY KEY ("productId","attributeOptionId")
);

-- CreateTable
CREATE TABLE "VariantAttributeOption" (
    "productId" UUID NOT NULL,
    "variantId" UUID NOT NULL,
    "attributeId" UUID NOT NULL,
    "attributeOptionId" UUID NOT NULL,

    CONSTRAINT "VariantAttributeOption_pkey" PRIMARY KEY ("variantId","attributeId")
);

-- CreateTable
CREATE TABLE "ProductTag" (
    "id" UUID NOT NULL,
    "sourceTermId" TEXT,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "ProductTag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductTagLink" (
    "productId" UUID NOT NULL,
    "tagId" UUID NOT NULL,

    CONSTRAINT "ProductTagLink_pkey" PRIMARY KEY ("productId","tagId")
);

-- CreateTable
CREATE TABLE "Product" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "shortDescription" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "productType" TEXT NOT NULL DEFAULT 'simple',
    "taxStatus" TEXT NOT NULL DEFAULT 'taxable',
    "taxClass" TEXT,
    "publishedAt" TIMESTAMPTZ(6),
    "archivedAt" TIMESTAMPTZ(6),
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductVariant" (
    "id" UUID NOT NULL,
    "productId" UUID NOT NULL,
    "name" TEXT NOT NULL DEFAULT 'Default',
    "sku" TEXT NOT NULL,
    "regularPrice" DECIMAL(12,2) NOT NULL,
    "salePrice" DECIMAL(12,2),
    "currencyCode" TEXT NOT NULL DEFAULT 'INR',
    "saleStartsAt" TIMESTAMPTZ(6),
    "saleEndsAt" TIMESTAMPTZ(6),
    "stockStatus" TEXT NOT NULL DEFAULT 'in_stock',
    "manageStock" BOOLEAN NOT NULL DEFAULT false,
    "backorderPolicy" TEXT NOT NULL DEFAULT 'no',
    "weight" DECIMAL(10,3),
    "length" DECIMAL(10,3),
    "width" DECIMAL(10,3),
    "height" DECIMAL(10,3),
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,
    "archivedAt" TIMESTAMPTZ(6),

    CONSTRAINT "ProductVariant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventoryReservation" (
    "id" UUID NOT NULL,
    "orderId" UUID NOT NULL,
    "orderItemId" UUID NOT NULL,
    "variantId" UUID NOT NULL,
    "quantity" INTEGER NOT NULL,
    "quantityConsumed" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'reserved',
    "expiresAt" TIMESTAMPTZ(6),
    "releasedAt" TIMESTAMPTZ(6),
    "consumedAt" TIMESTAMPTZ(6),
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "InventoryReservation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReturnRequest" (
    "id" UUID NOT NULL,
    "orderId" UUID NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'requested',
    "reason" TEXT NOT NULL,
    "requestedByUserId" TEXT,
    "idempotencyKey" TEXT NOT NULL,
    "receivedAt" TIMESTAMPTZ(6),
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "ReturnRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReturnItem" (
    "id" UUID NOT NULL,
    "orderId" UUID NOT NULL,
    "returnRequestId" UUID NOT NULL,
    "orderItemId" UUID NOT NULL,
    "quantity" INTEGER NOT NULL,
    "restockedQuantity" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ReturnItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShippingZone" (
    "id" UUID NOT NULL,
    "sourceZoneId" TEXT,
    "name" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "ShippingZone_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShippingMethod" (
    "id" UUID NOT NULL,
    "zoneId" UUID NOT NULL,
    "sourceInstanceId" TEXT,
    "kind" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "currencyCode" TEXT NOT NULL DEFAULT 'INR',
    "cost" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "requirement" TEXT NOT NULL DEFAULT 'none',
    "minimumSubtotal" DECIMAL(12,2),
    "ignoreDiscounts" BOOLEAN NOT NULL DEFAULT false,
    "taxable" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "ShippingMethod_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CouponShippingBenefit" (
    "couponId" UUID NOT NULL,
    "freeShipping" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "CouponShippingBenefit_pkey" PRIMARY KEY ("couponId")
);

-- CreateIndex
CREATE INDEX "UserAddress_userId_idx_a489d58a" ON "UserAddress"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "AdminInvitation_tokenHash_key" ON "AdminInvitation"("tokenHash");

-- CreateIndex
CREATE UNIQUE INDEX "Attribute_slug_key" ON "Attribute"("slug");

-- CreateIndex
CREATE INDEX "AttributeOption_attributeId_idx_58ec5fae" ON "AttributeOption"("attributeId");

-- CreateIndex
CREATE UNIQUE INDEX "AttributeOption_attributeId_slug_key" ON "AttributeOption"("attributeId", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_phoneNumber_key" ON "User"("phoneNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Session_token_key" ON "Session"("token");

-- CreateIndex
CREATE INDEX "Session_userId_idx_a489d58a" ON "Session"("userId");

-- CreateIndex
CREATE INDEX "Account_userId_idx_a489d58a" ON "Account"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Account_providerId_accountId_key" ON "Account"("providerId", "accountId");

-- CreateIndex
CREATE UNIQUE INDEX "Cart_convertedOrderId_key" ON "Cart"("convertedOrderId");

-- CreateIndex
CREATE INDEX "Cart_userId_idx_a489d58a" ON "Cart"("userId");

-- CreateIndex
CREATE INDEX "CartItem_cartId_idx_79939295" ON "CartItem"("cartId");

-- CreateIndex
CREATE INDEX "CartItem_variantId_idx_e16bb45d" ON "CartItem"("variantId");

-- CreateIndex
CREATE UNIQUE INDEX "CartItem_cartId_variantId_key" ON "CartItem"("cartId", "variantId");

-- CreateIndex
CREATE INDEX "CategoryProduct_categoryId_idx_15c304f2" ON "CategoryProduct"("categoryId");

-- CreateIndex
CREATE INDEX "CategoryProduct_productId_idx_5858600a" ON "CategoryProduct"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "Category_slug_key" ON "Category"("slug");

-- CreateIndex
CREATE INDEX "Category_parentId_idx_6a68f597" ON "Category"("parentId");

-- CreateIndex
CREATE UNIQUE INDEX "ContentEntry_sourcePostId_key" ON "ContentEntry"("sourcePostId");

-- CreateIndex
CREATE UNIQUE INDEX "ContentEntry_placement_key" ON "ContentEntry"("placement");

-- CreateIndex
CREATE UNIQUE INDEX "ContentEntry_slug_key" ON "ContentEntry"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "NavigationMenu_sourceTermId_key" ON "NavigationMenu"("sourceTermId");

-- CreateIndex
CREATE UNIQUE INDEX "NavigationMenu_slug_key" ON "NavigationMenu"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "NavigationMenu_location_key" ON "NavigationMenu"("location");

-- CreateIndex
CREATE UNIQUE INDEX "NavigationMenuItem_sourcePostId_key" ON "NavigationMenuItem"("sourcePostId");

-- CreateIndex
CREATE INDEX "NavigationMenuItem_categoryId_idx_15c304f2" ON "NavigationMenuItem"("categoryId");

-- CreateIndex
CREATE INDEX "NavigationMenuItem_contentEntryId_idx_b2a3fabd" ON "NavigationMenuItem"("contentEntryId");

-- CreateIndex
CREATE INDEX "NavigationMenuItem_menuId_idx_261f575e" ON "NavigationMenuItem"("menuId");

-- CreateIndex
CREATE UNIQUE INDEX "Coupon_code_key" ON "Coupon"("code");

-- CreateIndex
CREATE UNIQUE INDEX "CouponRedemption_orderId_key" ON "CouponRedemption"("orderId");

-- CreateIndex
CREATE INDEX "CouponRedemption_couponId_idx_a9dd19dc" ON "CouponRedemption"("couponId");

-- CreateIndex
CREATE INDEX "CouponRedemption_userId_idx_a489d58a" ON "CouponRedemption"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "CheckoutFeeRule_sourcePostId_key" ON "CheckoutFeeRule"("sourcePostId");

-- CreateIndex
CREATE UNIQUE INDEX "OrderFee_sourceOrderItemId_key" ON "OrderFee"("sourceOrderItemId");

-- CreateIndex
CREATE INDEX "OrderFee_orderId_idx_d284871b" ON "OrderFee"("orderId");

-- CreateIndex
CREATE INDEX "Fulfillment_orderId_idx_d284871b" ON "Fulfillment"("orderId");

-- CreateIndex
CREATE INDEX "FulfillmentItem_fulfillmentId_idx_b6c1e5d8" ON "FulfillmentItem"("fulfillmentId");

-- CreateIndex
CREATE INDEX "FulfillmentItem_orderItemId_idx_99e2d9f7" ON "FulfillmentItem"("orderItemId");

-- CreateIndex
CREATE INDEX "FulfillmentEvent_createdByUserId_idx_93e8a540" ON "FulfillmentEvent"("createdByUserId");

-- CreateIndex
CREATE INDEX "FulfillmentEvent_fulfillmentId_idx_b6c1e5d8" ON "FulfillmentEvent"("fulfillmentId");

-- CreateIndex
CREATE UNIQUE INDEX "ImportRun_sourceSystem_sourceRunId_key" ON "ImportRun"("sourceSystem", "sourceRunId");

-- CreateIndex
CREATE INDEX "ImportRecord_importRunId_idx_99a94f3f" ON "ImportRecord"("importRunId");

-- CreateIndex
CREATE UNIQUE INDEX "ImportRecord_sourceSystem_sourceTable_sourceId_key" ON "ImportRecord"("sourceSystem", "sourceTable", "sourceId");

-- CreateIndex
CREATE UNIQUE INDEX "InventoryLevel_variantId_key" ON "InventoryLevel"("variantId");

-- CreateIndex
CREATE UNIQUE INDEX "InventoryMovement_idempotencyKey_key" ON "InventoryMovement"("idempotencyKey");

-- CreateIndex
CREATE INDEX "InventoryMovement_actorUserId_idx_96dac96c" ON "InventoryMovement"("actorUserId");

-- CreateIndex
CREATE INDEX "InventoryMovement_variantId_idx_e16bb45d" ON "InventoryMovement"("variantId");

-- CreateIndex
CREATE UNIQUE INDEX "MediaAsset_storageKey_key" ON "MediaAsset"("storageKey");

-- CreateIndex
CREATE INDEX "ProductMedia_mediaAssetId_idx_523c8890" ON "ProductMedia"("mediaAssetId");

-- CreateIndex
CREATE INDEX "ProductMedia_productId_idx_5858600a" ON "ProductMedia"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "Order_orderNumber_key" ON "Order"("orderNumber");

-- CreateIndex
CREATE INDEX "Order_userId_idx_a489d58a" ON "Order"("userId");

-- CreateIndex
CREATE INDEX "OrderItem_orderId_idx_d284871b" ON "OrderItem"("orderId");

-- CreateIndex
CREATE INDEX "OrderItem_productId_idx_5858600a" ON "OrderItem"("productId");

-- CreateIndex
CREATE INDEX "OrderItem_variantId_idx_e16bb45d" ON "OrderItem"("variantId");

-- CreateIndex
CREATE INDEX "OrderAddress_orderId_idx_d284871b" ON "OrderAddress"("orderId");

-- CreateIndex
CREATE UNIQUE INDEX "OrderAddress_orderId_addressType_key" ON "OrderAddress"("orderId", "addressType");

-- CreateIndex
CREATE INDEX "OrderStatusHistory_changedByUserId_idx_a776e8b0" ON "OrderStatusHistory"("changedByUserId");

-- CreateIndex
CREATE INDEX "OrderStatusHistory_orderId_idx_d284871b" ON "OrderStatusHistory"("orderId");

-- CreateIndex
CREATE INDEX "OrderNote_authorUserId_idx_d1814ea0" ON "OrderNote"("authorUserId");

-- CreateIndex
CREATE INDEX "OrderNote_orderId_idx_d284871b" ON "OrderNote"("orderId");

-- CreateIndex
CREATE UNIQUE INDEX "OutboxEvent_idempotencyKey_key" ON "OutboxEvent"("idempotencyKey");

-- CreateIndex
CREATE INDEX "PaymentOrder_orderId_idx_d284871b" ON "PaymentOrder"("orderId");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentOrder_provider_idempotencyKey_key" ON "PaymentOrder"("provider", "idempotencyKey");

-- CreateIndex
CREATE INDEX "Payment_paymentOrderId_idx_8a364cd5" ON "Payment"("paymentOrderId");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_provider_providerPaymentId_key" ON "Payment"("provider", "providerPaymentId");

-- CreateIndex
CREATE INDEX "PaymentEvent_paymentId_idx_b2fe9a10" ON "PaymentEvent"("paymentId");

-- CreateIndex
CREATE INDEX "PaymentEvent_paymentOrderId_idx_8a364cd5" ON "PaymentEvent"("paymentOrderId");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentEvent_provider_providerEventId_key" ON "PaymentEvent"("provider", "providerEventId");

-- CreateIndex
CREATE INDEX "Refund_paymentId_idx_b2fe9a10" ON "Refund"("paymentId");

-- CreateIndex
CREATE INDEX "Refund_requestedByUserId_idx_85281b2d" ON "Refund"("requestedByUserId");

-- CreateIndex
CREATE UNIQUE INDEX "Refund_provider_idempotencyKey_key" ON "Refund"("provider", "idempotencyKey");

-- CreateIndex
CREATE INDEX "ProductAttribute_attributeId_idx_58ec5fae" ON "ProductAttribute"("attributeId");

-- CreateIndex
CREATE INDEX "ProductAttribute_productId_idx_5858600a" ON "ProductAttribute"("productId");

-- CreateIndex
CREATE INDEX "ProductAttributeOption_attributeOptionId_idx_bae26406" ON "ProductAttributeOption"("attributeOptionId");

-- CreateIndex
CREATE INDEX "ProductAttributeOption_productId_idx_5858600a" ON "ProductAttributeOption"("productId");

-- CreateIndex
CREATE INDEX "VariantAttributeOption_variantId_idx_e16bb45d" ON "VariantAttributeOption"("variantId");

-- CreateIndex
CREATE UNIQUE INDEX "ProductTag_sourceTermId_key" ON "ProductTag"("sourceTermId");

-- CreateIndex
CREATE UNIQUE INDEX "ProductTag_slug_key" ON "ProductTag"("slug");

-- CreateIndex
CREATE INDEX "ProductTagLink_productId_idx_5858600a" ON "ProductTagLink"("productId");

-- CreateIndex
CREATE INDEX "ProductTagLink_tagId_idx_86854244" ON "ProductTagLink"("tagId");

-- CreateIndex
CREATE UNIQUE INDEX "Product_slug_key" ON "Product"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "ProductVariant_sku_key" ON "ProductVariant"("sku");

-- CreateIndex
CREATE INDEX "ProductVariant_productId_idx_5858600a" ON "ProductVariant"("productId");

-- CreateIndex
CREATE INDEX "InventoryReservation_orderId_idx_d284871b" ON "InventoryReservation"("orderId");

-- CreateIndex
CREATE INDEX "InventoryReservation_orderItemId_idx_99e2d9f7" ON "InventoryReservation"("orderItemId");

-- CreateIndex
CREATE INDEX "InventoryReservation_variantId_idx_e16bb45d" ON "InventoryReservation"("variantId");

-- CreateIndex
CREATE UNIQUE INDEX "ReturnRequest_idempotencyKey_key" ON "ReturnRequest"("idempotencyKey");

-- CreateIndex
CREATE INDEX "ReturnRequest_orderId_idx_d284871b" ON "ReturnRequest"("orderId");

-- CreateIndex
CREATE INDEX "ReturnRequest_requestedByUserId_idx_85281b2d" ON "ReturnRequest"("requestedByUserId");

-- CreateIndex
CREATE UNIQUE INDEX "ReturnItem_returnRequestId_orderItemId_key" ON "ReturnItem"("returnRequestId", "orderItemId");

-- CreateIndex
CREATE UNIQUE INDEX "ShippingZone_sourceZoneId_key" ON "ShippingZone"("sourceZoneId");

-- CreateIndex
CREATE UNIQUE INDEX "ShippingMethod_sourceInstanceId_key" ON "ShippingMethod"("sourceInstanceId");

-- CreateIndex
CREATE INDEX "ShippingMethod_zoneId_idx_1b631e86" ON "ShippingMethod"("zoneId");

-- AddForeignKey
ALTER TABLE "UserAddress" ADD CONSTRAINT "UserAddress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "AdminMembership" ADD CONSTRAINT "AdminMembership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "AttributeOption" ADD CONSTRAINT "AttributeOption_attributeId_fkey" FOREIGN KEY ("attributeId") REFERENCES "Attribute"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Cart" ADD CONSTRAINT "Cart_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Cart" ADD CONSTRAINT "Cart_convertedOrderId_fkey" FOREIGN KEY ("convertedOrderId") REFERENCES "Order"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "CartItem" ADD CONSTRAINT "CartItem_cartId_fkey" FOREIGN KEY ("cartId") REFERENCES "Cart"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "CartItem" ADD CONSTRAINT "CartItem_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "ProductVariant"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "CategoryProduct" ADD CONSTRAINT "CategoryProduct_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "CategoryProduct" ADD CONSTRAINT "CategoryProduct_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Category" ADD CONSTRAINT "Category_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Category"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "NavigationMenuItem" ADD CONSTRAINT "NavigationMenuItem_menuId_fkey" FOREIGN KEY ("menuId") REFERENCES "NavigationMenu"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "NavigationMenuItem" ADD CONSTRAINT "NavigationMenuItem_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "NavigationMenuItem" ADD CONSTRAINT "NavigationMenuItem_contentEntryId_fkey" FOREIGN KEY ("contentEntryId") REFERENCES "ContentEntry"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "CouponRedemption" ADD CONSTRAINT "CouponRedemption_couponId_fkey" FOREIGN KEY ("couponId") REFERENCES "Coupon"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "CouponRedemption" ADD CONSTRAINT "CouponRedemption_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "CouponRedemption" ADD CONSTRAINT "CouponRedemption_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "OrderFee" ADD CONSTRAINT "OrderFee_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Fulfillment" ADD CONSTRAINT "Fulfillment_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "FulfillmentItem" ADD CONSTRAINT "FulfillmentItem_fulfillmentId_fkey" FOREIGN KEY ("fulfillmentId") REFERENCES "Fulfillment"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "FulfillmentItem" ADD CONSTRAINT "FulfillmentItem_orderItemId_fkey" FOREIGN KEY ("orderItemId") REFERENCES "OrderItem"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "FulfillmentEvent" ADD CONSTRAINT "FulfillmentEvent_fulfillmentId_fkey" FOREIGN KEY ("fulfillmentId") REFERENCES "Fulfillment"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "FulfillmentEvent" ADD CONSTRAINT "FulfillmentEvent_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "ImportRecord" ADD CONSTRAINT "ImportRecord_importRunId_fkey" FOREIGN KEY ("importRunId") REFERENCES "ImportRun"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "InventoryLevel" ADD CONSTRAINT "InventoryLevel_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "ProductVariant"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "InventoryMovement" ADD CONSTRAINT "InventoryMovement_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "ProductVariant"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "InventoryMovement" ADD CONSTRAINT "InventoryMovement_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "ProductMedia" ADD CONSTRAINT "ProductMedia_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "ProductMedia" ADD CONSTRAINT "ProductMedia_mediaAssetId_fkey" FOREIGN KEY ("mediaAssetId") REFERENCES "MediaAsset"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "ProductVariant"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "OrderAddress" ADD CONSTRAINT "OrderAddress_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "OrderStatusHistory" ADD CONSTRAINT "OrderStatusHistory_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "OrderStatusHistory" ADD CONSTRAINT "OrderStatusHistory_changedByUserId_fkey" FOREIGN KEY ("changedByUserId") REFERENCES "User"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "OrderNote" ADD CONSTRAINT "OrderNote_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "OrderNote" ADD CONSTRAINT "OrderNote_authorUserId_fkey" FOREIGN KEY ("authorUserId") REFERENCES "User"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "PaymentOrder" ADD CONSTRAINT "PaymentOrder_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_paymentOrderId_fkey" FOREIGN KEY ("paymentOrderId") REFERENCES "PaymentOrder"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "PaymentEvent" ADD CONSTRAINT "PaymentEvent_paymentOrderId_fkey" FOREIGN KEY ("paymentOrderId") REFERENCES "PaymentOrder"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "PaymentEvent" ADD CONSTRAINT "PaymentEvent_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Refund" ADD CONSTRAINT "Refund_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Refund" ADD CONSTRAINT "Refund_requestedByUserId_fkey" FOREIGN KEY ("requestedByUserId") REFERENCES "User"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "ProductAttribute" ADD CONSTRAINT "ProductAttribute_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "ProductAttribute" ADD CONSTRAINT "ProductAttribute_attributeId_fkey" FOREIGN KEY ("attributeId") REFERENCES "Attribute"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "ProductAttributeOption" ADD CONSTRAINT "ProductAttributeOption_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "ProductAttributeOption" ADD CONSTRAINT "ProductAttributeOption_attributeOptionId_fkey" FOREIGN KEY ("attributeOptionId") REFERENCES "AttributeOption"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "VariantAttributeOption" ADD CONSTRAINT "VariantAttributeOption_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "ProductVariant"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "ProductTagLink" ADD CONSTRAINT "ProductTagLink_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "ProductTagLink" ADD CONSTRAINT "ProductTagLink_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "ProductTag"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "ProductVariant" ADD CONSTRAINT "ProductVariant_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "InventoryReservation" ADD CONSTRAINT "InventoryReservation_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "InventoryReservation" ADD CONSTRAINT "InventoryReservation_orderItemId_fkey" FOREIGN KEY ("orderItemId") REFERENCES "OrderItem"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "InventoryReservation" ADD CONSTRAINT "InventoryReservation_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "ProductVariant"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "ReturnRequest" ADD CONSTRAINT "ReturnRequest_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "ReturnRequest" ADD CONSTRAINT "ReturnRequest_requestedByUserId_fkey" FOREIGN KEY ("requestedByUserId") REFERENCES "User"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "ShippingMethod" ADD CONSTRAINT "ShippingMethod_zoneId_fkey" FOREIGN KEY ("zoneId") REFERENCES "ShippingZone"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "CouponShippingBenefit" ADD CONSTRAINT "CouponShippingBenefit_couponId_fkey" FOREIGN KEY ("couponId") REFERENCES "Coupon"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- These CHECK constraints preserve Prisma 8 contract value sets, which Prisma 7 cannot declare in schema.prisma.
ALTER TABLE "AdminAuditLog" ADD CONSTRAINT "AdminAuditLog_actorAdminRole_check_3ff1fcd1" CHECK ("actorAdminRole" IN ('owner', 'editor', 'support'));
ALTER TABLE "AdminAuditLog" ADD CONSTRAINT "AdminAuditLog_outcome_check_899cdfc3" CHECK ("outcome" IN ('success', 'failure'));
ALTER TABLE "AdminInvitation" ADD CONSTRAINT "AdminInvitation_role_check_b788aa13" CHECK ("role" IN ('owner', 'editor', 'support'));
ALTER TABLE "AdminMembership" ADD CONSTRAINT "AdminMembership_role_check_b788aa13" CHECK ("role" IN ('owner', 'editor', 'support'));
ALTER TABLE "AdminMembership" ADD CONSTRAINT "AdminMembership_status_check_697c26d8" CHECK ("status" IN ('active', 'suspended'));
ALTER TABLE "Attribute" ADD CONSTRAINT "Attribute_displayType_check_32c38d8a" CHECK ("displayType" IN ('select', 'swatch'));
ALTER TABLE "Attribute" ADD CONSTRAINT "Attribute_status_check_28420b15" CHECK ("status" IN ('active', 'archived'));
ALTER TABLE "AttributeOption" ADD CONSTRAINT "AttributeOption_status_check_28420b15" CHECK ("status" IN ('active', 'archived'));
ALTER TABLE "Cart" ADD CONSTRAINT "Cart_status_check_04930e50" CHECK ("status" IN ('active', 'converted', 'abandoned'));
ALTER TABLE "Category" ADD CONSTRAINT "Category_status_check_28420b15" CHECK ("status" IN ('active', 'archived'));
ALTER TABLE "ContentEntry" ADD CONSTRAINT "ContentEntry_kind_check_e3683e46" CHECK ("kind" IN ('page', 'footer'));
ALTER TABLE "ContentEntry" ADD CONSTRAINT "ContentEntry_status_check_03e90df4" CHECK ("status" IN ('draft', 'published', 'private', 'archived'));
ALTER TABLE "Coupon" ADD CONSTRAINT "Coupon_kind_check_5f2374ad" CHECK ("kind" IN ('fixed', 'percentage'));
ALTER TABLE "Fulfillment" ADD CONSTRAINT "Fulfillment_status_check_aa310e17" CHECK ("status" IN ('pending', 'packed', 'shipped', 'out_for_delivery', 'delivered', 'failed', 'returned'));
ALTER TABLE "FulfillmentEvent" ADD CONSTRAINT "FulfillmentEvent_source_check_02b7f620" CHECK ("source" IN ('carrier', 'admin', 'system'));
ALTER TABLE "FulfillmentEvent" ADD CONSTRAINT "FulfillmentEvent_status_check_aa310e17" CHECK ("status" IN ('pending', 'packed', 'shipped', 'out_for_delivery', 'delivered', 'failed', 'returned'));
ALTER TABLE "ImportRecord" ADD CONSTRAINT "ImportRecord_status_check_d07a354e" CHECK ("status" IN ('pending', 'imported', 'failed'));
ALTER TABLE "ImportRun" ADD CONSTRAINT "ImportRun_status_check_99149439" CHECK ("status" IN ('pending', 'running', 'completed', 'failed'));
ALTER TABLE "InventoryMovement" ADD CONSTRAINT "InventoryMovement_reason_check_51954fe8" CHECK ("reason" IN ('initial_stock', 'restock', 'sale', 'return', 'cancellation', 'adjustment', 'damage'));
ALTER TABLE "InventoryReservation" ADD CONSTRAINT "InventoryReservation_status_check_f22ba6f8" CHECK ("status" IN ('reserved', 'released', 'consumed', 'expired'));
ALTER TABLE "MediaAsset" ADD CONSTRAINT "MediaAsset_status_check_28420b15" CHECK ("status" IN ('active', 'archived'));
ALTER TABLE "Order" ADD CONSTRAINT "Order_fulfillmentStatus_check_58f44685" CHECK ("fulfillmentStatus" IN ('unfulfilled', 'processing', 'partially_shipped', 'shipped', 'out_for_delivery', 'delivered', 'returned'));
ALTER TABLE "Order" ADD CONSTRAINT "Order_paymentStatus_check_00dd983a" CHECK ("paymentStatus" IN ('pending', 'authorized', 'paid', 'failed', 'partially_refunded', 'refunded'));
ALTER TABLE "Order" ADD CONSTRAINT "Order_status_check_e4b164a0" CHECK ("status" IN ('created', 'confirmed', 'processing', 'shipped', 'out_for_delivery', 'delivered', 'cancelled', 'returned'));
ALTER TABLE "OrderAddress" ADD CONSTRAINT "OrderAddress_addressType_check_51cdeafb" CHECK ("addressType" IN ('billing', 'shipping'));
ALTER TABLE "OrderStatusHistory" ADD CONSTRAINT "OrderStatusHistory_fromStatus_check_cb118d45" CHECK ("fromStatus" IN ('created', 'confirmed', 'processing', 'shipped', 'out_for_delivery', 'delivered', 'cancelled', 'returned'));
ALTER TABLE "OrderStatusHistory" ADD CONSTRAINT "OrderStatusHistory_source_check_04d68c19" CHECK ("source" IN ('admin', 'system', 'carrier'));
ALTER TABLE "OrderStatusHistory" ADD CONSTRAINT "OrderStatusHistory_toStatus_check_14fe1073" CHECK ("toStatus" IN ('created', 'confirmed', 'processing', 'shipped', 'out_for_delivery', 'delivered', 'cancelled', 'returned'));
ALTER TABLE "PaymentEvent" ADD CONSTRAINT "PaymentEvent_processingStatus_check_7392a4d7" CHECK ("processingStatus" IN ('pending', 'processed', 'failed', 'ignored'));
ALTER TABLE "PaymentOrder" ADD CONSTRAINT "PaymentOrder_status_check_d50637e8" CHECK ("status" IN ('pending', 'created', 'attempted', 'paid', 'expired', 'cancelled'));
ALTER TABLE "Product" ADD CONSTRAINT "Product_productType_check_28cac4c0" CHECK ("productType" IN ('simple', 'variable'));
ALTER TABLE "Product" ADD CONSTRAINT "Product_status_check_ee326507" CHECK ("status" IN ('draft', 'active', 'archived'));
ALTER TABLE "Product" ADD CONSTRAINT "Product_taxStatus_check_80556900" CHECK ("taxStatus" IN ('taxable', 'shipping', 'none'));
ALTER TABLE "ProductMedia" ADD CONSTRAINT "ProductMedia_role_check_7bba494f" CHECK ("role" IN ('primary', 'gallery'));
ALTER TABLE "ProductVariant" ADD CONSTRAINT "ProductVariant_backorderPolicy_check_50425893" CHECK ("backorderPolicy" IN ('no', 'notify', 'allow'));
ALTER TABLE "ProductVariant" ADD CONSTRAINT "ProductVariant_status_check_28420b15" CHECK ("status" IN ('active', 'archived'));
ALTER TABLE "ProductVariant" ADD CONSTRAINT "ProductVariant_stockStatus_check_567007ec" CHECK ("stockStatus" IN ('in_stock', 'out_of_stock'));
ALTER TABLE "Refund" ADD CONSTRAINT "Refund_speedProcessed_check_1c59a424" CHECK ("speedProcessed" IN ('normal', 'instant'));
ALTER TABLE "Refund" ADD CONSTRAINT "Refund_speedRequested_check_b0aa8513" CHECK ("speedRequested" IN ('normal', 'optimum'));
ALTER TABLE "Refund" ADD CONSTRAINT "Refund_status_check_29e2c2cd" CHECK ("status" IN ('pending', 'processed', 'failed'));
ALTER TABLE "ReturnRequest" ADD CONSTRAINT "ReturnRequest_status_check_fd5e81f4" CHECK ("status" IN ('requested', 'approved', 'rejected', 'received', 'completed', 'cancelled'));
ALTER TABLE "ShippingMethod" ADD CONSTRAINT "ShippingMethod_kind_check_71e379f0" CHECK ("kind" IN ('flat_rate', 'free_shipping'));
ALTER TABLE "ShippingMethod" ADD CONSTRAINT "ShippingMethod_requirement_check_0a4f3146" CHECK ("requirement" IN ('none', 'minimum_subtotal', 'coupon'));
ALTER TABLE "User" ADD CONSTRAINT "User_role_check_be4d6d23" CHECK ("role" IN ('admin', 'customer'));
