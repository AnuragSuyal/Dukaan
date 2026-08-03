import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "../src/generated/prisma/client";

const adapter = new PrismaBetterSqlite3({
  url: process.env.DATABASE_URL ?? "file:./prisma/dev.db",
});

const prisma = new PrismaClient({ adapter });

const productDefinitions = [
  {
    sku: "COKE-750-CRATE",
    name: "Coca-Cola 750 ml",
    brand: "Coca-Cola",
    category: "Beverages",
    packSize: "12 bottles",
    unit: "crate",
    unitPricePaise: 96000,
  },
  {
    sku: "WATER-1L-CASE",
    name: "Packaged Water 1 litre",
    brand: "AquaPure",
    category: "Beverages",
    packSize: "12 bottles",
    unit: "case",
    unitPricePaise: 24000,
  },
  {
    sku: "CHIPS-10-CARTON",
    name: "Assorted Chips ₹10",
    brand: "FreshBite",
    category: "Snacks",
    packSize: "120 packets",
    unit: "carton",
    unitPricePaise: 108000,
  },
  {
    sku: "BISCUIT-CARTON",
    name: "Assorted Biscuits",
    brand: "DailyChoice",
    category: "Biscuits",
    packSize: "96 packets",
    unit: "carton",
    unitPricePaise: 84000,
  },
  {
    sku: "JUICE-200-CASE",
    name: "Fruit Juice 200 ml",
    brand: "FruitDrop",
    category: "Beverages",
    packSize: "24 packs",
    unit: "case",
    unitPricePaise: 72000,
  },
  {
    sku: "NOODLES-CARTON",
    name: "Instant Noodles",
    brand: "QuickMeal",
    category: "Packaged Food",
    packSize: "96 packets",
    unit: "carton",
    unitPricePaise: 115000,
  },
  {
    sku: "CUPS-250-BOX",
    name: "Disposable Cups 250 ml",
    brand: "ServeEasy",
    category: "Packaging",
    packSize: "500 cups",
    unit: "box",
    unitPricePaise: 58000,
  },
  {
    sku: "TISSUE-CARTON",
    name: "Table Tissue Packs",
    brand: "SoftServe",
    category: "Supplies",
    packSize: "48 packs",
    unit: "carton",
    unitPricePaise: 64000,
  },
] as const;

const routeDefinitions = [
  {
    code: "R04",
    name: "Route 04 — Jwalapur",
    deliveryDays: "MON,WED,FRI",
  },
  {
    code: "R07",
    name: "Route 07 — Kankhal",
    deliveryDays: "TUE,THU,SAT",
  },
  {
    code: "R11",
    name: "Route 11 — Ranipur",
    deliveryDays: "MON,THU,SAT",
  },
  {
    code: "R15",
    name: "Route 15 — Haridwar Central",
    deliveryDays: "TUE,WED,FRI",
  },
] as const;

const featuredShops = [
  {
    name: "Sharma General Store",
    ownerName: "Rakesh Sharma",
    locality: "Jwalapur",
    preferredWindow: "10:00–11:00",
  },
  {
    name: "Krishna Fast Food",
    ownerName: "Mohit Verma",
    locality: "Jwalapur",
    preferredWindow: "Before 12:00",
  },
  {
    name: "Gupta Provision Store",
    ownerName: "Amit Gupta",
    locality: "Jwalapur",
    preferredWindow: "11:30–13:00",
  },
  {
    name: "Ganga Bakery",
    ownerName: "Nitin Arora",
    locality: "Kankhal",
    preferredWindow: "09:30–10:30",
  },
  {
    name: "Haridwar Juice Corner",
    ownerName: "Wasim Khan",
    locality: "Kankhal",
    preferredWindow: "After 13:00",
  },
] as const;

const genericShopTypes = [
  "General Store",
  "Provision Store",
  "Fast Food",
  "Bakery",
  "Refreshment Corner",
  "Mini Mart",
  "Tea Stall",
  "Dairy",
] as const;

const localities = [
  "Jwalapur",
  "Kankhal",
  "Ranipur",
  "Haridwar Central",
] as const;

function daysAgo(days: number): Date {
  const date = new Date();
  date.setHours(12, 0, 0, 0);
  date.setDate(date.getDate() - days);
  return date;
}

function tomorrow(): Date {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  date.setHours(9, 0, 0, 0);
  return date;
}

async function resetDatabase(): Promise<void> {
  await prisma.demandSignalItem.deleteMany();
  await prisma.demandSignal.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.shop.deleteMany();
  await prisma.route.deleteMany();
  await prisma.product.deleteMany();
  await prisma.distributor.deleteMany();
}

async function main(): Promise<void> {
  await resetDatabase();

  const distributor = await prisma.distributor.create({
    data: {
      name: "Haridwar Distribution Co.",
      phone: "+919876500001",
      city: "Haridwar",
      state: "Uttarakhand",
    },
  });

  const products = [];

  for (const definition of productDefinitions) {
    products.push(
      await prisma.product.create({
        data: {
          distributorId: distributor.id,
          ...definition,
        },
      }),
    );
  }

  const routes = [];

  for (const definition of routeDefinitions) {
    routes.push(
      await prisma.route.create({
        data: {
          distributorId: distributor.id,
          ...definition,
        },
      }),
    );
  }

  const shops = [];

  for (let index = 0; index < 47; index += 1) {
    const featured = featuredShops[index];
    const locality = featured?.locality ?? localities[index % localities.length];
    const route = routes[index % routes.length];

    const shop = await prisma.shop.create({
      data: {
        distributorId: distributor.id,
        routeId: route.id,
        name:
          featured?.name ??
          `${["Shiv", "Ganga", "Krishna", "Maa", "New"][index % 5]} ${
            genericShopTypes[index % genericShopTypes.length]
          } ${index + 1}`,
        ownerName: featured?.ownerName ?? `Pilot Merchant ${index + 1}`,
        phone: `+91910000${String(index + 1).padStart(4, "0")}`,
        address: `Shop ${index + 1}, ${locality}, Haridwar`,
        locality,
        preferredWindow:
          featured?.preferredWindow ??
          (index % 2 === 0 ? "10:00–12:00" : "12:00–14:00"),
        creditLimitPaise: 1500000 + (index % 5) * 500000,
        outstandingPaise: (index % 7) * 125000,
      },
    });

    shops.push(shop);
  }

  /*
   * Three historical orders per shop provide enough initial purchase history
   * for the first rule-based demand engine.
   */
  for (let shopIndex = 0; shopIndex < shops.length; shopIndex += 1) {
    const shop = shops[shopIndex];
    const route = routes[shopIndex % routes.length];

    for (const age of [18, 11, 5]) {
      const selectedProducts = [
        products[shopIndex % products.length],
        products[(shopIndex + 2) % products.length],
        products[(shopIndex + 5) % products.length],
      ];

      const quantities = selectedProducts.map(
        (_, productIndex) => 1 + ((shopIndex + productIndex + age) % 4),
      );

      const totalPaise = selectedProducts.reduce(
        (sum, product, productIndex) =>
          sum + product.unitPricePaise * quantities[productIndex],
        0,
      );

      await prisma.order.create({
        data: {
          distributorId: distributor.id,
          shopId: shop.id,
          routeId: route.id,
          invoiceNumber: `HIST-${shopIndex + 1}-${age}`,
          source: "HISTORICAL",
          status: "DELIVERED",
          orderDate: daysAgo(age),
          deliveryDate: daysAgo(age),
          deliveredAt: daysAgo(age),
          totalPaise,
          paymentMethod:
            shopIndex % 3 === 0
              ? "CREDIT"
              : shopIndex % 3 === 1
                ? "UPI"
                : "CASH",
          items: {
            create: selectedProducts.map((product, productIndex) => ({
              productId: product.id,
              quantity: quantities[productIndex],
              unitPricePaise: product.unitPricePaise,
              lineTotalPaise:
                product.unitPricePaise * quantities[productIndex],
            })),
          },
        },
      });
    }
  }

  const targetDate = tomorrow();

  for (let shopIndex = 0; shopIndex < shops.length; shopIndex += 1) {
    const shop = shops[shopIndex];
    const route = routes[shopIndex % routes.length];

    const selectedProducts = [
      products[shopIndex % products.length],
      products[(shopIndex + 2) % products.length],
      products[(shopIndex + 5) % products.length],
    ];

    const suggestedQuantities = selectedProducts.map(
      (_, productIndex) => 1 + ((shopIndex + productIndex) % 4),
    );

    const confidenceValues = selectedProducts.map(
      (_, productIndex) => 68 + ((shopIndex * 7 + productIndex * 9) % 29),
    );

    const totalSuggestedPaise = selectedProducts.reduce(
      (sum, product, productIndex) =>
        sum + product.unitPricePaise * suggestedQuantities[productIndex],
      0,
    );

    const averageConfidence = Math.round(
      confidenceValues.reduce((sum, value) => sum + value, 0) /
        confidenceValues.length,
    );

    const status =
      shopIndex < 24
        ? "CONFIRMED"
        : shopIndex < 31
          ? "MODIFIED"
          : shopIndex < 39
            ? "SENT"
            : shopIndex < 43
              ? "NO_RESPONSE"
              : "DRAFT";

    await prisma.demandSignal.create({
      data: {
        distributorId: distributor.id,
        shopId: shop.id,
        routeId: route.id,
        targetDate,
        status,
        averageConfidence,
        totalSuggestedPaise,
        sentAt: status === "DRAFT" ? null : new Date(),
        confirmedAt:
          status === "CONFIRMED" || status === "MODIFIED"
            ? new Date()
            : null,
        expiresAt: new Date(targetDate.getTime() + 12 * 60 * 60 * 1000),
        items: {
          create: selectedProducts.map((product, productIndex) => {
            const suggestedQuantity = suggestedQuantities[productIndex];
            const modified =
              status === "MODIFIED" && productIndex === 0
                ? Math.max(1, suggestedQuantity - 1)
                : suggestedQuantity;

            return {
              productId: product.id,
              suggestedQuantity,
              confirmedQuantity:
                status === "CONFIRMED" || status === "MODIFIED"
                  ? modified
                  : null,
              confidence: confidenceValues[productIndex],
              reason:
                productIndex === 0
                  ? "Purchase cycle indicates replenishment is due"
                  : productIndex === 1
                    ? "Quantity based on the last three completed orders"
                    : "Frequently purchased with this shop's primary products",
              unitPricePaise: product.unitPricePaise,
              suggestedTotalPaise:
                product.unitPricePaise * suggestedQuantity,
            };
          }),
        },
      },
    });
  }

  const counts = {
    distributors: await prisma.distributor.count(),
    products: await prisma.product.count(),
    routes: await prisma.route.count(),
    shops: await prisma.shop.count(),
    historicalOrders: await prisma.order.count(),
    demandSignals: await prisma.demandSignal.count(),
    confirmedSignals: await prisma.demandSignal.count({
      where: {
        status: {
          in: ["CONFIRMED", "MODIFIED"],
        },
      },
    }),
  };

  console.log("DukaanSignal pilot database seeded successfully.");
  console.table(counts);
}

main()
  .catch((error: unknown) => {
    console.error("Database seed failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });