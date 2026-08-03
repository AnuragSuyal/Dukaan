import { randomInt } from "node:crypto";
import { prisma } from "@/lib/prisma";

const confirmedStatuses = ["CONFIRMED", "MODIFIED"] as const;

function createConfirmationCode(): string {
  return randomInt(100000, 1000000).toString();
}

export async function ensureDeliveryStopsForDispatch(
  dispatchId: string,
): Promise<number> {
  const dispatch = await prisma.dispatch.findUnique({
    where: {
      id: dispatchId,
    },
    select: {
      id: true,
      routeId: true,
      targetDate: true,
    },
  });

  if (!dispatch) {
    throw new Error("Dispatch not found.");
  }

  const signals = await prisma.demandSignal.findMany({
    where: {
      routeId: dispatch.routeId,
      targetDate: dispatch.targetDate,
      status: {
        in: [...confirmedStatuses],
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

  await prisma.$transaction(async (transaction) => {
    for (const [index, signal] of signals.entries()) {
      const expectedValuePaise = signal.items.reduce(
        (total, item) =>
          total +
          item.unitPricePaise *
            (item.confirmedQuantity ?? item.suggestedQuantity),
        0,
      );

      const existing = await transaction.deliveryStop.findUnique({
        where: {
          dispatchId_demandSignalId: {
            dispatchId,
            demandSignalId: signal.id,
          },
        },
      });

      if (existing) {
        await transaction.deliveryStop.update({
          where: {
            id: existing.id,
          },
          data: {
            sequence: index + 1,
            expectedValuePaise,
          },
        });

        continue;
      }

      await transaction.deliveryStop.create({
        data: {
          dispatchId,
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
  });

  return signals.length;
}