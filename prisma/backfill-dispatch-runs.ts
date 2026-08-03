import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "../src/generated/prisma/client";

const adapter = new PrismaBetterSqlite3({
  url: process.env.DATABASE_URL ?? "file:./prisma/dev.db",
});

const prisma = new PrismaClient({ adapter });

type RunStatus =
  | "DRAFT"
  | "LOADING"
  | "FINALIZED"
  | "DISPATCHED"
  | "COMPLETED"
  | "CANCELLED";

function runStatusFromDispatch(status: string): RunStatus {
  switch (status) {
    case "LOADING":
      return "LOADING";
    case "FINALIZED":
      return "FINALIZED";
    case "DISPATCHED":
      return "DISPATCHED";
    case "COMPLETED":
      return "COMPLETED";
    case "CANCELLED":
      return "CANCELLED";
    default:
      return "DRAFT";
  }
}

async function main(): Promise<void> {
  const dispatches = await prisma.dispatch.findMany({
    where: {
      status: {
        in: ["FINALIZED", "DISPATCHED", "COMPLETED"],
      },
    },
    include: {
      route: {
        select: {
          code: true,
          name: true,
        },
      },
      runs: {
        select: {
          id: true,
        },
      },
      items: true,
      stops: {
        include: {
          items: {
            include: {
              product: {
                select: {
                  unitWeightGrams: true,
                  unitLoadPoints: true,
                },
              },
            },
          },
        },
        orderBy: {
          sequence: "asc",
        },
      },
    },
    orderBy: {
      targetDate: "asc",
    },
  });

  let runsCreated = 0;
  let runItemsCreated = 0;
  let assignmentsCreated = 0;
  let deliveryStopsLinked = 0;
  let skippedDraftDispatches = 0;

  for (const dispatch of dispatches) {
    if (dispatch.runs.length > 0) {
      continue;
    }

    await prisma.$transaction(async (transaction) => {
      const run = await transaction.dispatchRun.create({
        data: {
          dispatchId: dispatch.id,
          runNumber: 1,
          vehicleId: dispatch.vehicleId,
          driverId: dispatch.driverId,
          salesmanId: dispatch.salesmanId,
          status: runStatusFromDispatch(dispatch.status),
          expectedValuePaise: dispatch.confirmedValuePaise,
          plannedWeightGrams: dispatch.plannedWeightGrams,
          plannedLoadPoints: dispatch.plannedLoadPoints,
          finalizedAt: dispatch.finalizedAt,
          dispatchedAt: dispatch.dispatchedAt,
          completedAt: dispatch.completedAt,
          notes: dispatch.notes,
        },
      });

      runsCreated += 1;

      if (dispatch.items.length > 0) {
        await transaction.dispatchRunItem.createMany({
          data: dispatch.items.map((item) => ({
            dispatchRunId: run.id,
            productId: item.productId,
            confirmedQuantity: item.confirmedQuantity,
            reserveQuantity: item.reserveQuantity,
            plannedQuantity: item.plannedQuantity,
            unitWeightGrams: item.unitWeightGrams,
            unitLoadPoints: item.unitLoadPoints,
            plannedWeightGrams: item.plannedWeightGrams,
            plannedLoadPoints: item.plannedLoadPoints,
            confirmedValuePaise: item.confirmedValuePaise,
          })),
        });

        runItemsCreated += dispatch.items.length;
      }

      for (const stop of dispatch.stops) {
        const stopCapacity = stop.items.reduce(
          (totals, item) => ({
            weightGrams:
              totals.weightGrams +
              item.orderedQuantity *
                item.product.unitWeightGrams,

            loadPoints:
              totals.loadPoints +
              item.orderedQuantity *
                item.product.unitLoadPoints,
          }),
          {
            weightGrams: 0,
            loadPoints: 0,
          },
        );

        await transaction.dispatchRunShop.create({
          data: {
            dispatchRunId: run.id,
            demandSignalId: stop.demandSignalId,
            shopId: stop.shopId,
            sequence: stop.sequence,
            expectedValuePaise: stop.expectedValuePaise,
            plannedWeightGrams: stopCapacity.weightGrams,
            plannedLoadPoints: stopCapacity.loadPoints,
          },
        });

        assignmentsCreated += 1;

        await transaction.deliveryStop.update({
          where: {
            id: stop.id,
          },
          data: {
            dispatchRunId: run.id,
          },
        });

        deliveryStopsLinked += 1;
      }

      console.log(
        `Backfilled ${dispatch.route.code} ${dispatch.route.name}: ` +
          `${dispatch.stops.length} stops into Run 1.`,
      );
    });
  }

  skippedDraftDispatches = await prisma.dispatch.count({
    where: {
      status: {
        in: ["DRAFT", "LOADING"],
      },
      runs: {
        none: {},
      },
    },
  });

  const [
    totalRuns,
    totalRunItems,
    totalAssignments,
    linkedStops,
  ] = await Promise.all([
    prisma.dispatchRun.count(),
    prisma.dispatchRunItem.count(),
    prisma.dispatchRunShop.count(),
    prisma.deliveryStop.count({
      where: {
        dispatchRunId: {
          not: null,
        },
      },
    }),
  ]);

  console.log("\nDispatch-run backfill completed.");

  console.table({
    runsCreated,
    runItemsCreated,
    assignmentsCreated,
    deliveryStopsLinked,
    draftDispatchesLeftWithoutRuns:
      skippedDraftDispatches,
    totalRuns,
    totalRunItems,
    totalAssignments,
    linkedStops,
  });
}

main()
  .catch((error: unknown) => {
    console.error("\nDispatch-run backfill failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });