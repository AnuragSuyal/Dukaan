-- CreateTable
CREATE TABLE "DispatchRun" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "dispatchId" TEXT NOT NULL,
    "runNumber" INTEGER NOT NULL,
    "vehicleId" TEXT,
    "driverId" TEXT,
    "salesmanId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "expectedValuePaise" INTEGER NOT NULL DEFAULT 0,
    "plannedWeightGrams" INTEGER NOT NULL DEFAULT 0,
    "plannedLoadPoints" INTEGER NOT NULL DEFAULT 0,
    "finalizedAt" DATETIME,
    "dispatchedAt" DATETIME,
    "completedAt" DATETIME,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "DispatchRun_dispatchId_fkey" FOREIGN KEY ("dispatchId") REFERENCES "Dispatch" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "DispatchRun_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "DispatchRun_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "Staff" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "DispatchRun_salesmanId_fkey" FOREIGN KEY ("salesmanId") REFERENCES "Staff" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DispatchRunItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "dispatchRunId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "confirmedQuantity" INTEGER NOT NULL,
    "reserveQuantity" INTEGER NOT NULL DEFAULT 0,
    "plannedQuantity" INTEGER NOT NULL,
    "unitWeightGrams" INTEGER NOT NULL,
    "unitLoadPoints" INTEGER NOT NULL,
    "plannedWeightGrams" INTEGER NOT NULL,
    "plannedLoadPoints" INTEGER NOT NULL,
    "confirmedValuePaise" INTEGER NOT NULL,
    CONSTRAINT "DispatchRunItem_dispatchRunId_fkey" FOREIGN KEY ("dispatchRunId") REFERENCES "DispatchRun" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "DispatchRunItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DispatchRunShop" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "dispatchRunId" TEXT NOT NULL,
    "demandSignalId" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL,
    "expectedValuePaise" INTEGER NOT NULL,
    "plannedWeightGrams" INTEGER NOT NULL,
    "plannedLoadPoints" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DispatchRunShop_dispatchRunId_fkey" FOREIGN KEY ("dispatchRunId") REFERENCES "DispatchRun" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "DispatchRunShop_demandSignalId_fkey" FOREIGN KEY ("demandSignalId") REFERENCES "DemandSignal" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "DispatchRunShop_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_DeliveryStop" (
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
    "dispatchRunId" TEXT,
    CONSTRAINT "DeliveryStop_dispatchId_fkey" FOREIGN KEY ("dispatchId") REFERENCES "Dispatch" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "DeliveryStop_demandSignalId_fkey" FOREIGN KEY ("demandSignalId") REFERENCES "DemandSignal" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "DeliveryStop_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "DeliveryStop_dispatchRunId_fkey" FOREIGN KEY ("dispatchRunId") REFERENCES "DispatchRun" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_DeliveryStop" ("arrivedAt", "completedAt", "confirmationCode", "createdAt", "creditExtendedPaise", "currentOrderCollectedPaise", "damagedItemsCollected", "demandSignalId", "dispatchId", "driverNote", "expectedValuePaise", "id", "outstandingCollectedPaise", "paymentMethod", "returnedCrates", "sequence", "shopId", "shopkeeperName", "status", "updatedAt") SELECT "arrivedAt", "completedAt", "confirmationCode", "createdAt", "creditExtendedPaise", "currentOrderCollectedPaise", "damagedItemsCollected", "demandSignalId", "dispatchId", "driverNote", "expectedValuePaise", "id", "outstandingCollectedPaise", "paymentMethod", "returnedCrates", "sequence", "shopId", "shopkeeperName", "status", "updatedAt" FROM "DeliveryStop";
DROP TABLE "DeliveryStop";
ALTER TABLE "new_DeliveryStop" RENAME TO "DeliveryStop";
CREATE INDEX "DeliveryStop_dispatchId_sequence_idx" ON "DeliveryStop"("dispatchId", "sequence");
CREATE INDEX "DeliveryStop_shopId_idx" ON "DeliveryStop"("shopId");
CREATE INDEX "DeliveryStop_status_idx" ON "DeliveryStop"("status");
CREATE INDEX "DeliveryStop_dispatchRunId_idx" ON "DeliveryStop"("dispatchRunId");
CREATE UNIQUE INDEX "DeliveryStop_dispatchId_demandSignalId_key" ON "DeliveryStop"("dispatchId", "demandSignalId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "DispatchRun_vehicleId_status_idx" ON "DispatchRun"("vehicleId", "status");

-- CreateIndex
CREATE INDEX "DispatchRun_driverId_status_idx" ON "DispatchRun"("driverId", "status");

-- CreateIndex
CREATE INDEX "DispatchRun_salesmanId_status_idx" ON "DispatchRun"("salesmanId", "status");

-- CreateIndex
CREATE INDEX "DispatchRun_status_idx" ON "DispatchRun"("status");

-- CreateIndex
CREATE UNIQUE INDEX "DispatchRun_dispatchId_runNumber_key" ON "DispatchRun"("dispatchId", "runNumber");

-- CreateIndex
CREATE INDEX "DispatchRunItem_productId_idx" ON "DispatchRunItem"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "DispatchRunItem_dispatchRunId_productId_key" ON "DispatchRunItem"("dispatchRunId", "productId");

-- CreateIndex
CREATE UNIQUE INDEX "DispatchRunShop_demandSignalId_key" ON "DispatchRunShop"("demandSignalId");

-- CreateIndex
CREATE INDEX "DispatchRunShop_shopId_idx" ON "DispatchRunShop"("shopId");

-- CreateIndex
CREATE UNIQUE INDEX "DispatchRunShop_dispatchRunId_sequence_key" ON "DispatchRunShop"("dispatchRunId", "sequence");
