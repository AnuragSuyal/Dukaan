-- CreateTable
CREATE TABLE "DeliveryStop" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "dispatchId" TEXT NOT NULL,
    "demandSignalId" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "expectedValuePaise" INTEGER NOT NULL DEFAULT 0,
    "arrivedAt" DATETIME,
    "completedAt" DATETIME,
    "paymentMethod" TEXT,
    "currentOrderCollectedPaise" INTEGER NOT NULL DEFAULT 0,
    "outstandingCollectedPaise" INTEGER NOT NULL DEFAULT 0,
    "creditExtendedPaise" INTEGER NOT NULL DEFAULT 0,
    "returnedCrates" INTEGER NOT NULL DEFAULT 0,
    "damagedItemsCollected" INTEGER NOT NULL DEFAULT 0,
    "shopkeeperName" TEXT,
    "confirmationCode" TEXT NOT NULL,
    "driverNote" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "DeliveryStop_dispatchId_fkey" FOREIGN KEY ("dispatchId") REFERENCES "Dispatch" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "DeliveryStop_demandSignalId_fkey" FOREIGN KEY ("demandSignalId") REFERENCES "DemandSignal" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "DeliveryStop_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DeliveryStopItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "deliveryStopId" TEXT NOT NULL,
    "demandSignalItemId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "orderedQuantity" INTEGER NOT NULL,
    "deliveredQuantity" INTEGER NOT NULL DEFAULT 0,
    "missingQuantity" INTEGER NOT NULL DEFAULT 0,
    "damagedQuantity" INTEGER NOT NULL DEFAULT 0,
    "returnedQuantity" INTEGER NOT NULL DEFAULT 0,
    "unitPricePaise" INTEGER NOT NULL,
    CONSTRAINT "DeliveryStopItem_deliveryStopId_fkey" FOREIGN KEY ("deliveryStopId") REFERENCES "DeliveryStop" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "DeliveryStopItem_demandSignalItemId_fkey" FOREIGN KEY ("demandSignalItemId") REFERENCES "DemandSignalItem" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "DeliveryStopItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "DeliveryStop_dispatchId_sequence_idx" ON "DeliveryStop"("dispatchId", "sequence");

-- CreateIndex
CREATE INDEX "DeliveryStop_shopId_idx" ON "DeliveryStop"("shopId");

-- CreateIndex
CREATE INDEX "DeliveryStop_status_idx" ON "DeliveryStop"("status");

-- CreateIndex
CREATE UNIQUE INDEX "DeliveryStop_dispatchId_demandSignalId_key" ON "DeliveryStop"("dispatchId", "demandSignalId");

-- CreateIndex
CREATE INDEX "DeliveryStopItem_productId_idx" ON "DeliveryStopItem"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "DeliveryStopItem_deliveryStopId_demandSignalItemId_key" ON "DeliveryStopItem"("deliveryStopId", "demandSignalItemId");
