import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { randomInt } from "node:crypto";
import { PrismaClient } from "../src/generated/prisma/client";

const adapter = new PrismaBetterSqlite3({
  url: process.env.DATABASE_URL ?? "file:./prisma/dev.db",
});

const prisma = new PrismaClient({ adapter });

function createConfirmationCode(): string {
  return randomInt(100000, 1000000).toString();
}

async function main(): Promise<void> {
  const dispatches = await prisma.dispatch.findMany({
    where: {
      status: {
        in: ["FINALIZED", "DISPATCHED", "COMPLETED"],
      },
    },
  });

  for (const dispatch of dispatches) {
    const signals = await prisma.demandSignal.findMany({
      where: {
        routeId: dispatch.routeId,
        targetDate: dispatch.targetDate,
        status: {
          in: ["CONFIRMED", "MODIFIED"],
        },
      },
      include: {
        shop: true,
        items: true,
      },
    });

    signals.sort(
      (first, second) =>
        (first.shop.preferredWindow ?? "").localeCompare(
          second.shop.preferredWindow ?? "",
        ) ||
        first.shop.name.localeCompare(second.shop.name),
    );

    for (const [index, signal] of signals.entries()) {
      const expectedValuePaise = signal.items.reduce(
        (total, item) =>
          total +
          item.unitPricePaise *
            (item.confirmedQuantity ?? item.suggestedQuantity),
        0,
      );

      const existing = await prisma.deliveryStop.findUnique({
        where: {
          dispatchId_demandSignalId: {
            dispatchId: dispatch.id,
            demandSignalId: signal.id,
          },
        },
      });

      if (existing) {
        continue;
      }

      await prisma.deliveryStop.create({
        data: {
          dispatchId: dispatch.id,
          demandSignalId: signal.id,
          shopId: signal.shopId,
          sequence: index + 1,
          expectedValuePaise,
          confirmationCode: createConfirmationCode(),
          items: {
            create: signal.items.map((item) => ({
              demandSignalItemId: item.id,
              productId: item.productId,
              orderedQuantity:
                item.confirmedQuantity ?? item.suggestedQuantity,
              unitPricePaise: item.unitPricePaise,
            })),
          },
        },
      });
    }
  }

  console.log("Delivery-stop backfill completed.");

  console.table({
    dispatches: await prisma.dispatch.count(),
    deliveryStops: await prisma.deliveryStop.count(),
    deliveryStopItems: await prisma.deliveryStopItem.count(),
    pendingStops: await prisma.deliveryStop.count({
      where: {
        status: "PENDING",
      },
    }),
  });
}

main()
  .catch((error: unknown) => {
    console.error("Delivery-stop backfill failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });