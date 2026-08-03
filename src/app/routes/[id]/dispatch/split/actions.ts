"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { buildDispatchSplitPreview } from "@/lib/dispatch-split";
import { prisma } from "@/lib/prisma";

function requiredText(
  formData: FormData,
  field: string,
): string {
  const value = formData.get(field);

  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`${field} is required.`);
  }

  return value.trim();
}

function goToSplit(
  routeId: string,
  type: "success" | "error",
  message: string,
): never {
  redirect(
    `/routes/${routeId}/dispatch/split?${type}=${encodeURIComponent(
      message,
    )}`,
  );
}

function goToRuns(
  routeId: string,
  type: "success" | "error",
  message: string,
): never {
  redirect(
    `/routes/${routeId}/dispatch/runs?${type}=${encodeURIComponent(
      message,
    )}`,
  );
}

export async function persistSplitPlan(
  formData: FormData,
): Promise<void> {
  const routeId = requiredText(formData, "routeId");
  const dispatchId = requiredText(formData, "dispatchId");

  const preview =
    await buildDispatchSplitPreview(routeId);

  if (
    !preview ||
    preview.dispatch.id !== dispatchId
  ) {
    goToSplit(
      routeId,
      "error",
      "The current dispatch could not be found.",
    );
  }

  if (preview.dispatch.currentStatus !== "DRAFT") {
    goToSplit(
      routeId,
      "error",
      "Vehicle runs can only be generated while the dispatch is in draft status.",
    );
  }

  if (preview.recommendedRuns.length === 0) {
    goToSplit(
      routeId,
      "error",
      "No safe vehicle-run allocation is available.",
    );
  }

  if (preview.unassignableShops.length > 0) {
    goToSplit(
      routeId,
      "error",
      "At least one shop order exceeds every active vehicle.",
    );
  }

  const existingRunCount =
    await prisma.dispatchRun.count({
      where: {
        dispatchId,
      },
    });

  if (existingRunCount > 0) {
    goToRuns(
      routeId,
      "success",
      "Persistent vehicle runs already exist for this dispatch.",
    );
  }

  const signalIds =
    preview.recommendedRuns.flatMap((run) =>
      run.shops.map((shop) => shop.signalId),
    );

  const signals =
    await prisma.demandSignal.findMany({
      where: {
        id: {
          in: signalIds,
        },
        routeId,
        targetDate: preview.dispatch.targetDate,
        status: {
          in: ["CONFIRMED", "MODIFIED"],
        },
      },
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
    });

  const signalsById = new Map(
    signals.map((signal) => [
      signal.id,
      signal,
    ]),
  );

  if (signalsById.size !== signalIds.length) {
    goToSplit(
      routeId,
      "error",
      "Confirmed demand changed after the split preview was generated. Refresh the manifest and preview again.",
    );
  }

  const preparedRuns =
    preview.recommendedRuns.map((previewRun) => {
      const productMap = new Map<
        string,
        {
          productId: string;
          confirmedQuantity: number;
          unitWeightGrams: number;
          unitLoadPoints: number;
          plannedWeightGrams: number;
          plannedLoadPoints: number;
          confirmedValuePaise: number;
        }
      >();

      const shopAssignments =
        previewRun.shops.map((previewShop, index) => {
          const signal =
            signalsById.get(previewShop.signalId);

          if (!signal) {
            throw new Error(
              `Demand signal ${previewShop.signalId} was not found.`,
            );
          }

          let expectedValuePaise = 0;
          let plannedWeightGrams = 0;
          let plannedLoadPoints = 0;

          for (const item of signal.items) {
            const quantity =
              item.confirmedQuantity ??
              item.suggestedQuantity;

            const itemValuePaise =
              quantity * item.unitPricePaise;

            const itemWeightGrams =
              quantity *
              item.product.unitWeightGrams;

            const itemLoadPoints =
              quantity *
              item.product.unitLoadPoints;

            expectedValuePaise += itemValuePaise;
            plannedWeightGrams += itemWeightGrams;
            plannedLoadPoints += itemLoadPoints;

            const existing =
              productMap.get(item.productId);

            if (existing) {
              existing.confirmedQuantity += quantity;
              existing.plannedWeightGrams +=
                itemWeightGrams;
              existing.plannedLoadPoints +=
                itemLoadPoints;
              existing.confirmedValuePaise +=
                itemValuePaise;
            } else {
              productMap.set(item.productId, {
                productId: item.productId,
                confirmedQuantity: quantity,
                unitWeightGrams:
                  item.product.unitWeightGrams,
                unitLoadPoints:
                  item.product.unitLoadPoints,
                plannedWeightGrams:
                  itemWeightGrams,
                plannedLoadPoints:
                  itemLoadPoints,
                confirmedValuePaise:
                  itemValuePaise,
              });
            }
          }

          return {
            demandSignalId: signal.id,
            shopId: signal.shopId,
            sequence: index + 1,
            expectedValuePaise,
            plannedWeightGrams,
            plannedLoadPoints,
          };
        });

      const productItems = [
        ...productMap.values(),
      ];

      const totals = productItems.reduce(
        (result, item) => ({
          expectedValuePaise:
            result.expectedValuePaise +
            item.confirmedValuePaise,

          plannedWeightGrams:
            result.plannedWeightGrams +
            item.plannedWeightGrams,

          plannedLoadPoints:
            result.plannedLoadPoints +
            item.plannedLoadPoints,
        }),
        {
          expectedValuePaise: 0,
          plannedWeightGrams: 0,
          plannedLoadPoints: 0,
        },
      );

      if (
        totals.plannedWeightGrams >
          previewRun.maxWeightGrams ||
        totals.plannedLoadPoints >
          previewRun.maxLoadPoints
      ) {
        throw new Error(
          `${previewRun.vehicleCode} would exceed its capacity.`,
        );
      }

      if (
        totals.expectedValuePaise !==
          previewRun.expectedValuePaise ||
        totals.plannedWeightGrams !==
          previewRun.plannedWeightGrams ||
        totals.plannedLoadPoints !==
          previewRun.plannedLoadPoints
      ) {
        throw new Error(
          `The persisted totals for ${previewRun.vehicleCode} do not match the verified preview.`,
        );
      }

      return {
        runNumber: previewRun.runNumber,
        vehicleId: previewRun.vehicleId,
        expectedValuePaise:
          totals.expectedValuePaise,
        plannedWeightGrams:
          totals.plannedWeightGrams,
        plannedLoadPoints:
          totals.plannedLoadPoints,
        shopAssignments,
        productItems,
      };
    });

  const assignedSignalIds =
    preparedRuns.flatMap((run) =>
      run.shopAssignments.map(
        (assignment) =>
          assignment.demandSignalId,
      ),
    );

  if (
    new Set(assignedSignalIds).size !==
    assignedSignalIds.length
  ) {
    goToSplit(
      routeId,
      "error",
      "A retailer order was assigned to more than one vehicle run.",
    );
  }

  const persistedTotals =
    preparedRuns.reduce(
      (result, run) => ({
        shops:
          result.shops +
          run.shopAssignments.length,

        expectedValuePaise:
          result.expectedValuePaise +
          run.expectedValuePaise,

        plannedWeightGrams:
          result.plannedWeightGrams +
          run.plannedWeightGrams,

        plannedLoadPoints:
          result.plannedLoadPoints +
          run.plannedLoadPoints,
      }),
      {
        shops: 0,
        expectedValuePaise: 0,
        plannedWeightGrams: 0,
        plannedLoadPoints: 0,
      },
    );

  if (
    persistedTotals.shops !==
      preview.confirmedDemand.shops ||
    persistedTotals.expectedValuePaise !==
      preview.confirmedDemand.expectedValuePaise ||
    persistedTotals.plannedWeightGrams !==
      preview.confirmedDemand.weightGrams ||
    persistedTotals.plannedLoadPoints !==
      preview.confirmedDemand.loadPoints
  ) {
    goToSplit(
      routeId,
      "error",
      "The combined run totals do not match the complete confirmed demand.",
    );
  }

  await prisma.$transaction(
    async (transaction) => {
      const currentDispatch =
        await transaction.dispatch.findUnique({
          where: {
            id: dispatchId,
          },
          select: {
            status: true,
          },
        });

      if (!currentDispatch) {
        throw new Error(
          "The dispatch was deleted before runs were generated.",
        );
      }

      if (currentDispatch.status !== "DRAFT") {
        throw new Error(
          "The dispatch is no longer in draft status.",
        );
      }

      const concurrentRuns =
        await transaction.dispatchRun.count({
          where: {
            dispatchId,
          },
        });

      if (concurrentRuns > 0) {
        throw new Error(
          "Vehicle runs were already generated.",
        );
      }

      for (const run of preparedRuns) {
        const createdRun =
          await transaction.dispatchRun.create({
            data: {
              dispatchId,
              runNumber: run.runNumber,
              vehicleId: run.vehicleId,
              status: "DRAFT",
              expectedValuePaise:
                run.expectedValuePaise,
              plannedWeightGrams:
                run.plannedWeightGrams,
              plannedLoadPoints:
                run.plannedLoadPoints,
            },
          });

        await transaction.dispatchRunItem.createMany({
          data: run.productItems.map((item) => ({
            dispatchRunId: createdRun.id,
            productId: item.productId,
            confirmedQuantity:
              item.confirmedQuantity,
            reserveQuantity: 0,
            plannedQuantity:
              item.confirmedQuantity,
            unitWeightGrams:
              item.unitWeightGrams,
            unitLoadPoints:
              item.unitLoadPoints,
            plannedWeightGrams:
              item.plannedWeightGrams,
            plannedLoadPoints:
              item.plannedLoadPoints,
            confirmedValuePaise:
              item.confirmedValuePaise,
          })),
        });

        await transaction.dispatchRunShop.createMany({
          data: run.shopAssignments.map(
            (assignment) => ({
              dispatchRunId: createdRun.id,
              demandSignalId:
                assignment.demandSignalId,
              shopId: assignment.shopId,
              sequence: assignment.sequence,
              expectedValuePaise:
                assignment.expectedValuePaise,
              plannedWeightGrams:
                assignment.plannedWeightGrams,
              plannedLoadPoints:
                assignment.plannedLoadPoints,
            }),
          ),
        });
      }

      await transaction.dispatch.update({
        where: {
          id: dispatchId,
        },
        data: {
          vehicleId: null,
          driverId: null,
          salesmanId: null,
        },
      });
    },
  );

  revalidatePath(
    `/routes/${routeId}/dispatch/split`,
  );
  revalidatePath(
    `/routes/${routeId}/dispatch/runs`,
  );
  revalidatePath(
    `/routes/${routeId}/dispatch`,
  );
  revalidatePath("/operations");
  revalidatePath("/operations/cycle");

  goToRuns(
    routeId,
    "success",
    `${preparedRuns.length} persistent vehicle runs were created safely.`,
  );
}