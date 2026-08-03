-- CreateTable
CREATE TABLE "Vehicle" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "distributorId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "registrationNumber" TEXT,
    "maxWeightGrams" INTEGER NOT NULL,
    "maxLoadPoints" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Vehicle_distributorId_fkey" FOREIGN KEY ("distributorId") REFERENCES "Distributor" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Staff" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "distributorId" TEXT NOT NULL,
    "employeeCode" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "role" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Staff_distributorId_fkey" FOREIGN KEY ("distributorId") REFERENCES "Distributor" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Dispatch" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "distributorId" TEXT NOT NULL,
    "routeId" TEXT NOT NULL,
    "vehicleId" TEXT,
    "driverId" TEXT,
    "salesmanId" TEXT,
    "targetDate" DATETIME NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "confirmedValuePaise" INTEGER NOT NULL DEFAULT 0,
    "plannedWeightGrams" INTEGER NOT NULL DEFAULT 0,
    "plannedLoadPoints" INTEGER NOT NULL DEFAULT 0,
    "finalizedAt" DATETIME,
    "dispatchedAt" DATETIME,
    "completedAt" DATETIME,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Dispatch_distributorId_fkey" FOREIGN KEY ("distributorId") REFERENCES "Distributor" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Dispatch_routeId_fkey" FOREIGN KEY ("routeId") REFERENCES "Route" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Dispatch_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Dispatch_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "Staff" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Dispatch_salesmanId_fkey" FOREIGN KEY ("salesmanId") REFERENCES "Staff" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DispatchItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "dispatchId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "confirmedQuantity" INTEGER NOT NULL,
    "reserveQuantity" INTEGER NOT NULL,
    "plannedQuantity" INTEGER NOT NULL,
    "unitWeightGrams" INTEGER NOT NULL,
    "unitLoadPoints" INTEGER NOT NULL,
    "plannedWeightGrams" INTEGER NOT NULL,
    "plannedLoadPoints" INTEGER NOT NULL,
    "confirmedValuePaise" INTEGER NOT NULL,
    CONSTRAINT "DispatchItem_dispatchId_fkey" FOREIGN KEY ("dispatchId") REFERENCES "Dispatch" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "DispatchItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Product" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "distributorId" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "brand" TEXT,
    "category" TEXT,
    "packSize" TEXT,
    "unit" TEXT NOT NULL,
    "unitPricePaise" INTEGER NOT NULL,
    "unitWeightGrams" INTEGER NOT NULL DEFAULT 0,
    "unitLoadPoints" INTEGER NOT NULL DEFAULT 1,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Product_distributorId_fkey" FOREIGN KEY ("distributorId") REFERENCES "Distributor" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Product" ("brand", "category", "createdAt", "distributorId", "id", "isActive", "name", "packSize", "sku", "unit", "unitPricePaise", "updatedAt") SELECT "brand", "category", "createdAt", "distributorId", "id", "isActive", "name", "packSize", "sku", "unit", "unitPricePaise", "updatedAt" FROM "Product";
DROP TABLE "Product";
ALTER TABLE "new_Product" RENAME TO "Product";
CREATE INDEX "Product_distributorId_isActive_idx" ON "Product"("distributorId", "isActive");
CREATE INDEX "Product_name_idx" ON "Product"("name");
CREATE UNIQUE INDEX "Product_distributorId_sku_key" ON "Product"("distributorId", "sku");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "Vehicle_distributorId_status_idx" ON "Vehicle"("distributorId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Vehicle_distributorId_code_key" ON "Vehicle"("distributorId", "code");

-- CreateIndex
CREATE INDEX "Staff_distributorId_role_isActive_idx" ON "Staff"("distributorId", "role", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "Staff_distributorId_employeeCode_key" ON "Staff"("distributorId", "employeeCode");

-- CreateIndex
CREATE INDEX "Dispatch_distributorId_targetDate_idx" ON "Dispatch"("distributorId", "targetDate");

-- CreateIndex
CREATE INDEX "Dispatch_vehicleId_targetDate_idx" ON "Dispatch"("vehicleId", "targetDate");

-- CreateIndex
CREATE INDEX "Dispatch_status_idx" ON "Dispatch"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Dispatch_routeId_targetDate_key" ON "Dispatch"("routeId", "targetDate");

-- CreateIndex
CREATE INDEX "DispatchItem_productId_idx" ON "DispatchItem"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "DispatchItem_dispatchId_productId_key" ON "DispatchItem"("dispatchId", "productId");
