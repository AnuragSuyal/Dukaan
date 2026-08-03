"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { buildReconciliationWorkspace } from "@/lib/reconciliation";

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

function moneyField(
  formData: FormData,
  field: string,
): number {
  const raw = requiredText(formData, field);

  if (!/^\d+(?:\.\d{1,2})?$/.test(raw)) {
    throw new Error(`${field} must be a valid rupee amount.`);
  }

  const [rupees, paise = ""] = raw.split(".");

  return (
    Number(rupees) * 100 +
    Number(paise.padEnd(2, "0"))
  );
}

function quantityField(
  formData: FormData,
  field: string,
): number {
  const raw = requiredText(formData, field);

  if (!/^\d+$/.test(raw)) {
    throw new Error(`${field} must be a whole number.`);
  }

  const value = Number(raw);

  if (!Number.isSafeInteger(value) || value < 0 || value > 999999) {
    throw new Error(`${field} is outside the supported range.`);
  }

  return value;
}

function optionalText(
  formData: FormData,
  field: string,
): string | null {
  const value = formData.get(field);

  if (typeof value !== "string" || !value.trim()) {
    return null;
  }

  return value.trim();
}

function goToReconciliation(
  routeId: string,
  type: "success" | "error",
  message: string,
): never {
  redirect(
    `/routes/${routeId}/dispatch/reconciliation?${type}=${encodeURIComponent(
      message,
    )}`,
  );
}

export async function createOrRefreshReconciliation(
  formData: FormData,
): Promise<void> {
  const routeId = requiredText(formData, "routeId");
  const dispatchId = requiredText(formData, "dispatchId");

  const workspace =
    await buildReconciliationWorkspace(routeId);

  if (
    !workspace ||
    workspace.dispatch.id !== dispatchId
  ) {
    goToReconciliation(
      routeId,
      "error",
      "The current dispatch could not be found.",
    );
  }

  if (workspace.reconciliation?.status === "FINALIZED") {
    goToReconciliation(
      routeId,
      "error",
      "A finalized reconciliation cannot be refreshed.",
    );
  }

  const existing = await prisma.dispatchReconciliation.findUnique({
    where: {
      dispatchId,
    },
    include: {
      items: true,
    },
  });

  const existingActualReturns = new Map(
    existing?.items.map((item) => [
      item.productId,
      item.actualReturnQuantity,
    ]) ?? [],
  );

  await prisma.$transaction(async (transaction) => {
    const reconciliation =
      await transaction.dispatchReconciliation.upsert({
        where: {
          dispatchId,
        },
        update: {
          expectedCashPaise: workspace.expectedCashPaise,
          expectedUpiPaise: workspace.expectedUpiPaise,
          expectedBankPaise: workspace.expectedBankPaise,
          expectedMixedPaise: workspace.expectedMixedPaise,
          totalDeliveredValuePaise:
            workspace.totalDeliveredValuePaise,
          totalCreditPaise: workspace.totalCreditPaise,
          totalOutstandingCollectedPaise:
            workspace.totalOutstandingCollectedPaise,
          totalMissingUnits: workspace.totalMissingUnits,
          totalDamagedUnits: workspace.totalDamagedUnits,
          totalReturnedFromShopsUnits:
            workspace.totalReturnedFromShopsUnits,
        },
        create: {
          dispatchId,
          expectedCashPaise: workspace.expectedCashPaise,
          declaredCashPaise: workspace.expectedCashPaise,
          expectedUpiPaise: workspace.expectedUpiPaise,
          verifiedUpiPaise: workspace.expectedUpiPaise,
          expectedBankPaise: workspace.expectedBankPaise,
          verifiedBankPaise: workspace.expectedBankPaise,
          expectedMixedPaise: workspace.expectedMixedPaise,
          declaredMixedPaise: workspace.expectedMixedPaise,
          totalDeliveredValuePaise:
            workspace.totalDeliveredValuePaise,
          totalCreditPaise: workspace.totalCreditPaise,
          totalOutstandingCollectedPaise:
            workspace.totalOutstandingCollectedPaise,
          totalMissingUnits: workspace.totalMissingUnits,
          totalDamagedUnits: workspace.totalDamagedUnits,
          totalReturnedFromShopsUnits:
            workspace.totalReturnedFromShopsUnits,
        },
      });

    await transaction.dispatchReconciliationItem.deleteMany({
      where: {
        reconciliationId: reconciliation.id,
      },
    });

    await transaction.dispatchReconciliationItem.createMany({
      data: workspace.products.map((product) => {
        const actualReturnQuantity =
          existingActualReturns.get(product.productId) ??
          product.expectedReturnQuantity;

        return {
          reconciliationId: reconciliation.id,
          productId: product.productId,
          loadedQuantity: product.loadedQuantity,
          deliveredQuantity: product.deliveredQuantity,
          missingQuantity: product.missingQuantity,
          damagedQuantity: product.damagedQuantity,
          returnedFromShopsQuantity:
            product.returnedFromShopsQuantity,
          expectedReturnQuantity:
            product.expectedReturnQuantity,
          actualReturnQuantity,
          varianceQuantity:
            actualReturnQuantity -
            product.expectedReturnQuantity,
        };
      }),
    });
  });

  revalidatePath(
    `/routes/${routeId}/dispatch/reconciliation`,
  );

  goToReconciliation(
    routeId,
    "success",
    existing
      ? "Reconciliation preview refreshed."
      : "Draft reconciliation created.",
  );
}

export async function finalizeReconciliation(
  formData: FormData,
): Promise<void> {
  const routeId = requiredText(formData, "routeId");
  const dispatchId = requiredText(formData, "dispatchId");
  const reconciliationId = requiredText(
    formData,
    "reconciliationId",
  );

  const workspace =
    await buildReconciliationWorkspace(routeId);

  if (
    !workspace ||
    workspace.dispatch.id !== dispatchId
  ) {
    goToReconciliation(
      routeId,
      "error",
      "The current dispatch could not be found.",
    );
  }

  if (!workspace.canFinalize) {
    goToReconciliation(
      routeId,
      "error",
      "Complete or close every delivery stop before final reconciliation.",
    );
  }

  const reconciliation =
    await prisma.dispatchReconciliation.findUnique({
      where: {
        id: reconciliationId,
      },
      include: {
        items: true,
      },
    });

  if (
    !reconciliation ||
    reconciliation.dispatchId !== dispatchId
  ) {
    goToReconciliation(
      routeId,
      "error",
      "The draft reconciliation could not be found.",
    );
  }

  if (reconciliation.status === "FINALIZED") {
    goToReconciliation(
      routeId,
      "error",
      "This reconciliation is already finalized.",
    );
  }

  const declaredCashPaise = moneyField(
    formData,
    "declaredCashRupees",
  );

  const verifiedUpiPaise = moneyField(
    formData,
    "verifiedUpiRupees",
  );

  const verifiedBankPaise = moneyField(
    formData,
    "verifiedBankRupees",
  );

  const declaredMixedPaise = moneyField(
    formData,
    "declaredMixedRupees",
  );

  const itemUpdates = reconciliation.items.map((item) => {
    const actualReturnQuantity = quantityField(
      formData,
      `actualReturn:${item.id}`,
    );

    return {
      id: item.id,
      actualReturnQuantity,
      varianceQuantity:
        actualReturnQuantity -
        item.expectedReturnQuantity,
    };
  });

  const note =
    optionalText(formData, "note")?.slice(0, 1000) ??
    null;

  await prisma.$transaction([
    ...itemUpdates.map((item) =>
      prisma.dispatchReconciliationItem.update({
        where: {
          id: item.id,
        },
        data: {
          actualReturnQuantity:
            item.actualReturnQuantity,
          varianceQuantity: item.varianceQuantity,
        },
      }),
    ),

    prisma.dispatchReconciliation.update({
      where: {
        id: reconciliation.id,
      },
      data: {
        status: "FINALIZED",
        declaredCashPaise,
        cashVariancePaise:
          declaredCashPaise -
          reconciliation.expectedCashPaise,
        verifiedUpiPaise,
        upiVariancePaise:
          verifiedUpiPaise -
          reconciliation.expectedUpiPaise,
        verifiedBankPaise,
        bankVariancePaise:
          verifiedBankPaise -
          reconciliation.expectedBankPaise,
        declaredMixedPaise,
        mixedVariancePaise:
          declaredMixedPaise -
          reconciliation.expectedMixedPaise,
        note,
        finalizedAt: new Date(),
      },
    }),
  ]);

  revalidatePath(
    `/routes/${routeId}/dispatch/reconciliation`,
  );
  revalidatePath(`/routes/${routeId}/dispatch`);

  goToReconciliation(
    routeId,
    "success",
    "Route reconciliation finalized and locked.",
  );
}