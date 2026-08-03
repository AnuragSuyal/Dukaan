-- CreateTable
CREATE TABLE "DispatchReconciliation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "dispatchId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "expectedCashPaise" INTEGER NOT NULL DEFAULT 0,
    "declaredCashPaise" INTEGER NOT NULL DEFAULT 0,
    "cashVariancePaise" INTEGER NOT NULL DEFAULT 0,
    "expectedUpiPaise" INTEGER NOT NULL DEFAULT 0,
    "verifiedUpiPaise" INTEGER NOT NULL DEFAULT 0,
    "upiVariancePaise" INTEGER NOT NULL DEFAULT 0,
    "expectedBankPaise" INTEGER NOT NULL DEFAULT 0,
    "verifiedBankPaise" INTEGER NOT NULL DEFAULT 0,
    "bankVariancePaise" INTEGER NOT NULL DEFAULT 0,
    "expectedMixedPaise" INTEGER NOT NULL DEFAULT 0,
    "declaredMixedPaise" INTEGER NOT NULL DEFAULT 0,
    "mixedVariancePaise" INTEGER NOT NULL DEFAULT 0,
    "totalDeliveredValuePaise" INTEGER NOT NULL DEFAULT 0,
    "totalCreditPaise" INTEGER NOT NULL DEFAULT 0,
    "totalOutstandingCollectedPaise" INTEGER NOT NULL DEFAULT 0,
    "totalMissingUnits" INTEGER NOT NULL DEFAULT 0,
    "totalDamagedUnits" INTEGER NOT NULL DEFAULT 0,
    "totalReturnedFromShopsUnits" INTEGER NOT NULL DEFAULT 0,
    "note" TEXT,
    "finalizedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "DispatchReconciliation_dispatchId_fkey" FOREIGN KEY ("dispatchId") REFERENCES "Dispatch" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DispatchReconciliationItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "reconciliationId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "loadedQuantity" INTEGER NOT NULL,
    "deliveredQuantity" INTEGER NOT NULL,
    "missingQuantity" INTEGER NOT NULL DEFAULT 0,
    "damagedQuantity" INTEGER NOT NULL DEFAULT 0,
    "returnedFromShopsQuantity" INTEGER NOT NULL DEFAULT 0,
    "expectedReturnQuantity" INTEGER NOT NULL,
    "actualReturnQuantity" INTEGER NOT NULL DEFAULT 0,
    "varianceQuantity" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "DispatchReconciliationItem_reconciliationId_fkey" FOREIGN KEY ("reconciliationId") REFERENCES "DispatchReconciliation" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "DispatchReconciliationItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "DispatchReconciliation_dispatchId_key" ON "DispatchReconciliation"("dispatchId");

-- CreateIndex
CREATE INDEX "DispatchReconciliationItem_productId_idx" ON "DispatchReconciliationItem"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "DispatchReconciliationItem_reconciliationId_productId_key" ON "DispatchReconciliationItem"("reconciliationId", "productId");
