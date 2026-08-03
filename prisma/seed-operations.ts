import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "../src/generated/prisma/client";

const adapter = new PrismaBetterSqlite3({
  url: process.env.DATABASE_URL ?? "file:./prisma/dev.db",
});

const prisma = new PrismaClient({ adapter });

const productSpecifications = [
  {
    sku: "COKE-750-CRATE",
    unitWeightGrams: 15000,
    unitLoadPoints: 8,
  },
  {
    sku: "WATER-1L-CASE",
    unitWeightGrams: 13000,
    unitLoadPoints: 7,
  },
  {
    sku: "CHIPS-10-CARTON",
    unitWeightGrams: 4000,
    unitLoadPoints: 5,
  },
  {
    sku: "BISCUIT-CARTON",
    unitWeightGrams: 7000,
    unitLoadPoints: 5,
  },
  {
    sku: "JUICE-200-CASE",
    unitWeightGrams: 6000,
    unitLoadPoints: 5,
  },
  {
    sku: "NOODLES-CARTON",
    unitWeightGrams: 8000,
    unitLoadPoints: 5,
  },
  {
    sku: "CUPS-250-BOX",
    unitWeightGrams: 6000,
    unitLoadPoints: 8,
  },
  {
    sku: "TISSUE-CARTON",
    unitWeightGrams: 5000,
    unitLoadPoints: 7,
  },
] as const;

const vehicles = [
  {
    code: "VAN-01",
    name: "Primary Route Van",
    registrationNumber: "UK08-DS-1001",
    maxWeightGrams: 750000,
    maxLoadPoints: 380,
  },
  {
    code: "VAN-02",
    name: "Secondary Route Van",
    registrationNumber: "UK08-DS-1002",
    maxWeightGrams: 700000,
    maxLoadPoints: 340,
  },
  {
    code: "VAN-03",
    name: "Compact Delivery Vehicle",
    registrationNumber: "UK08-DS-1003",
    maxWeightGrams: 500000,
    maxLoadPoints: 260,
  },
] as const;

const staffMembers = [
  {
    employeeCode: "DRV-001",
    name: "Arjun Rawat",
    phone: "+919200001001",
    role: "DRIVER" as const,
  },
  {
    employeeCode: "DRV-002",
    name: "Sandeep Kumar",
    phone: "+919200001002",
    role: "DRIVER" as const,
  },
  {
    employeeCode: "SAL-001",
    name: "Rohit Verma",
    phone: "+919200002001",
    role: "SALESMAN" as const,
  },
  {
    employeeCode: "SAL-002",
    name: "Naveen Joshi",
    phone: "+919200002002",
    role: "SALESMAN" as const,
  },
  {
    employeeCode: "WH-001",
    name: "Deepak Negi",
    phone: "+919200003001",
    role: "WAREHOUSE" as const,
  },
] as const;

async function main(): Promise<void> {
  const distributor = await prisma.distributor.findFirst({
    orderBy: {
      createdAt: "asc",
    },
  });

  if (!distributor) {
    throw new Error("No distributor exists. Run the main seed first.");
  }

  for (const specification of productSpecifications) {
    await prisma.product.update({
      where: {
        distributorId_sku: {
          distributorId: distributor.id,
          sku: specification.sku,
        },
      },
      data: {
        unitWeightGrams: specification.unitWeightGrams,
        unitLoadPoints: specification.unitLoadPoints,
      },
    });
  }

  for (const vehicle of vehicles) {
    await prisma.vehicle.upsert({
      where: {
        distributorId_code: {
          distributorId: distributor.id,
          code: vehicle.code,
        },
      },
      update: vehicle,
      create: {
        distributorId: distributor.id,
        ...vehicle,
      },
    });
  }

  for (const staff of staffMembers) {
    await prisma.staff.upsert({
      where: {
        distributorId_employeeCode: {
          distributorId: distributor.id,
          employeeCode: staff.employeeCode,
        },
      },
      update: staff,
      create: {
        distributorId: distributor.id,
        ...staff,
      },
    });
  }

  console.log("Operational capacity data seeded successfully.");

  console.table({
    productsWithCapacity: await prisma.product.count({
      where: {
        unitWeightGrams: {
          gt: 0,
        },
      },
    }),
    vehicles: await prisma.vehicle.count(),
    drivers: await prisma.staff.count({
      where: {
        role: "DRIVER",
      },
    }),
    salesmen: await prisma.staff.count({
      where: {
        role: "SALESMAN",
      },
    }),
    warehouseStaff: await prisma.staff.count({
      where: {
        role: "WAREHOUSE",
      },
    }),
    existingSignalsPreserved: await prisma.demandSignal.count(),
  });
}

main()
  .catch((error: unknown) => {
    console.error("Operational seed failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });