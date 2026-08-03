-- CreateTable
CREATE TABLE "Distributor" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "city" TEXT,
    "state" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Product" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "distributorId" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "brand" TEXT,
    "category" TEXT,
    "packSize" TEXT,
    "unit" TEXT NOT NULL,
    "unitPricePaise" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Product_distributorId_fkey" FOREIGN KEY ("distributorId") REFERENCES "Distributor" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Route" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "distributorId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "deliveryDays" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Route_distributorId_fkey" FOREIGN KEY ("distributorId") REFERENCES "Distributor" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Shop" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "distributorId" TEXT NOT NULL,
    "routeId" TEXT,
    "name" TEXT NOT NULL,
    "ownerName" TEXT,
    "phone" TEXT NOT NULL,
    "address" TEXT,
    "locality" TEXT,
    "latitude" REAL,
    "longitude" REAL,
    "preferredWindow" TEXT,
    "creditLimitPaise" INTEGER NOT NULL DEFAULT 0,
    "outstandingPaise" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Shop_distributorId_fkey" FOREIGN KEY ("distributorId") REFERENCES "Distributor" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Shop_routeId_fkey" FOREIGN KEY ("routeId") REFERENCES "Route" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Order" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "distributorId" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "routeId" TEXT,
    "invoiceNumber" TEXT,
    "source" TEXT NOT NULL DEFAULT 'HISTORICAL',
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "orderDate" DATETIME NOT NULL,
    "deliveryDate" DATETIME,
    "confirmedAt" DATETIME,
    "dispatchedAt" DATETIME,
    "deliveredAt" DATETIME,
    "totalPaise" INTEGER NOT NULL DEFAULT 0,
    "paymentMethod" TEXT,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Order_distributorId_fkey" FOREIGN KEY ("distributorId") REFERENCES "Distributor" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Order_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Order_routeId_fkey" FOREIGN KEY ("routeId") REFERENCES "Route" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "OrderItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "orderId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitPricePaise" INTEGER NOT NULL,
    "lineTotalPaise" INTEGER NOT NULL,
    CONSTRAINT "OrderItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "OrderItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DemandSignal" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "distributorId" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "routeId" TEXT,
    "targetDate" DATETIME NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "averageConfidence" INTEGER NOT NULL,
    "totalSuggestedPaise" INTEGER NOT NULL DEFAULT 0,
    "confirmationToken" TEXT NOT NULL,
    "sentAt" DATETIME,
    "confirmedAt" DATETIME,
    "expiresAt" DATETIME,
    "merchantNote" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "DemandSignal_distributorId_fkey" FOREIGN KEY ("distributorId") REFERENCES "Distributor" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "DemandSignal_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "DemandSignal_routeId_fkey" FOREIGN KEY ("routeId") REFERENCES "Route" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DemandSignalItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "demandSignalId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "suggestedQuantity" INTEGER NOT NULL,
    "confirmedQuantity" INTEGER,
    "confidence" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "unitPricePaise" INTEGER NOT NULL,
    "suggestedTotalPaise" INTEGER NOT NULL,
    CONSTRAINT "DemandSignalItem_demandSignalId_fkey" FOREIGN KEY ("demandSignalId") REFERENCES "DemandSignal" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "DemandSignalItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "Product_distributorId_isActive_idx" ON "Product"("distributorId", "isActive");

-- CreateIndex
CREATE INDEX "Product_name_idx" ON "Product"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Product_distributorId_sku_key" ON "Product"("distributorId", "sku");

-- CreateIndex
CREATE INDEX "Route_distributorId_status_idx" ON "Route"("distributorId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Route_distributorId_code_key" ON "Route"("distributorId", "code");

-- CreateIndex
CREATE INDEX "Shop_distributorId_status_idx" ON "Shop"("distributorId", "status");

-- CreateIndex
CREATE INDEX "Shop_routeId_idx" ON "Shop"("routeId");

-- CreateIndex
CREATE UNIQUE INDEX "Shop_distributorId_phone_key" ON "Shop"("distributorId", "phone");

-- CreateIndex
CREATE INDEX "Order_distributorId_orderDate_idx" ON "Order"("distributorId", "orderDate");

-- CreateIndex
CREATE INDEX "Order_shopId_orderDate_idx" ON "Order"("shopId", "orderDate");

-- CreateIndex
CREATE INDEX "Order_routeId_deliveryDate_idx" ON "Order"("routeId", "deliveryDate");

-- CreateIndex
CREATE INDEX "Order_status_idx" ON "Order"("status");

-- CreateIndex
CREATE INDEX "OrderItem_productId_idx" ON "OrderItem"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "OrderItem_orderId_productId_key" ON "OrderItem"("orderId", "productId");

-- CreateIndex
CREATE UNIQUE INDEX "DemandSignal_confirmationToken_key" ON "DemandSignal"("confirmationToken");

-- CreateIndex
CREATE INDEX "DemandSignal_distributorId_targetDate_idx" ON "DemandSignal"("distributorId", "targetDate");

-- CreateIndex
CREATE INDEX "DemandSignal_shopId_targetDate_idx" ON "DemandSignal"("shopId", "targetDate");

-- CreateIndex
CREATE INDEX "DemandSignal_routeId_targetDate_idx" ON "DemandSignal"("routeId", "targetDate");

-- CreateIndex
CREATE INDEX "DemandSignal_status_idx" ON "DemandSignal"("status");

-- CreateIndex
CREATE INDEX "DemandSignalItem_productId_idx" ON "DemandSignalItem"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "DemandSignalItem_demandSignalId_productId_key" ON "DemandSignalItem"("demandSignalId", "productId");
