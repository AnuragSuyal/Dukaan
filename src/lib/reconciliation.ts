import { prisma } from "@/lib/prisma";

const terminalStopStatuses = new Set([
  "DELIVERED",
  "PARTIAL",
  "FAILED",
  "SKIPPED",
]);

type ProductSnapshot = {
  reconciliationItemId: string | null;
  productId: string;
  sku: string;
  productName: string;
  brand: string | null;
  unit: string;
  loadedQuantity: number;
  deliveredQuantity: number;
  missingQuantity: number;
  damagedQuantity: number;
  returnedFromShopsQuantity: number;
  expectedReturnQuantity: number;
  actualReturnQuantity: number;
  varianceQuantity: number;
};

export type ReconciliationWorkspace = {
  dispatch: {
    id: string;
    status: string;
    targetDate: Date;
    completedAt: Date | null;
    routeId: string;
    routeCode: string;
    routeName: string;
    vehicleCode: string | null;
    driverName: string | null;
    salesmanName: string | null;
  };
  reconciliation: {
    id: string;
    status: string;
    expectedCashPaise: number;
    declaredCashPaise: number;
    cashVariancePaise: number;
    expectedUpiPaise: number;
    verifiedUpiPaise: number;
    upiVariancePaise: number;
    expectedBankPaise: number;
    verifiedBankPaise: number;
    bankVariancePaise: number;
    expectedMixedPaise: number;
    declaredMixedPaise: number;
    mixedVariancePaise: number;
    note: string | null;
    finalizedAt: Date | null;
  } | null;
  expectedCashPaise: number;
  expectedUpiPaise: number;
  expectedBankPaise: number;
  expectedMixedPaise: number;
  totalDeliveredValuePaise: number;
  totalCreditPaise: number;
  totalOutstandingCollectedPaise: number;
  totalMissingUnits: number;
  totalDamagedUnits: number;
  totalReturnedFromShopsUnits: number;
  completedStops: number;
  totalStops: number;
  activeStops: number;
  canFinalize: boolean;
  products: ProductSnapshot[];
};

export async function buildReconciliationWorkspace(
  routeId: string,
): Promise<ReconciliationWorkspace | null> {
  const dispatch = await prisma.dispatch.findFirst({
    where: {
      routeId,
    },
    orderBy: {
      targetDate: "desc",
    },
    include: {
      route: true,
      vehicle: true,
      driver: true,
      salesman: true,
      items: {
        include: {
          product: true,
        },
      },
      stops: {
        include: {
          items: true,
        },
        orderBy: {
          sequence: "asc",
        },
      },
      reconciliation: {
        include: {
          items: true,
        },
      },
    },
  });

  if (!dispatch) {
    return null;
  }

  let expectedCashPaise = 0;
  let expectedUpiPaise = 0;
  let expectedBankPaise = 0;
  let expectedMixedPaise = 0;
  let totalDeliveredValuePaise = 0;
  let totalCreditPaise = 0;
  let totalOutstandingCollectedPaise = 0;
  let totalMissingUnits = 0;
  let totalDamagedUnits = 0;
  let totalReturnedFromShopsUnits = 0;

  const completedStops = dispatch.stops.filter((stop) =>
    terminalStopStatuses.has(stop.status),
  ).length;

  const activeStops = dispatch.stops.length - completedStops;

  for (const stop of dispatch.stops) {
    const collectedPaise =
      stop.currentOrderCollectedPaise +
      stop.outstandingCollectedPaise;

    switch (stop.paymentMethod) {
      case "CASH":
        expectedCashPaise += collectedPaise;
        break;
      case "UPI":
        expectedUpiPaise += collectedPaise;
        break;
      case "BANK_TRANSFER":
        expectedBankPaise += collectedPaise;
        break;
      case "MIXED":
        expectedMixedPaise += collectedPaise;
        break;
      default:
        break;
    }

    totalCreditPaise += stop.creditExtendedPaise;
    totalOutstandingCollectedPaise +=
      stop.outstandingCollectedPaise;

    for (const item of stop.items) {
      totalDeliveredValuePaise +=
        item.deliveredQuantity * item.unitPricePaise;

      totalMissingUnits += item.missingQuantity;
      totalDamagedUnits += item.damagedQuantity;
      totalReturnedFromShopsUnits += item.returnedQuantity;
    }
  }

  const existingItems = new Map(
    dispatch.reconciliation?.items.map((item) => [
      item.productId,
      item,
    ]) ?? [],
  );

  const productMap = new Map<
    string,
    ProductSnapshot
  >();

  for (const item of dispatch.items) {
    const existing = existingItems.get(item.productId);

    productMap.set(item.productId, {
      reconciliationItemId: existing?.id ?? null,
      productId: item.productId,
      sku: item.product.sku,
      productName: item.product.name,
      brand: item.product.brand,
      unit: item.product.unit,
      loadedQuantity: item.plannedQuantity,
      deliveredQuantity: 0,
      missingQuantity: 0,
      damagedQuantity: 0,
      returnedFromShopsQuantity: 0,
      expectedReturnQuantity: item.plannedQuantity,
      actualReturnQuantity:
        existing?.actualReturnQuantity ??
        item.plannedQuantity,
      varianceQuantity:
        existing?.varianceQuantity ?? 0,
    });
  }

  for (const stop of dispatch.stops) {
    for (const item of stop.items) {
      const product = productMap.get(item.productId);

      if (!product) {
        continue;
      }

      product.deliveredQuantity += item.deliveredQuantity;
      product.missingQuantity += item.missingQuantity;
      product.damagedQuantity += item.damagedQuantity;
      product.returnedFromShopsQuantity += item.returnedQuantity;
    }
  }

  const products = [...productMap.values()]
    .map((product) => {
      const expectedReturnQuantity = Math.max(
        0,
        product.loadedQuantity - product.deliveredQuantity,
      );

      const existing = existingItems.get(product.productId);

      const actualReturnQuantity =
        existing?.actualReturnQuantity ??
        expectedReturnQuantity;

      return {
        ...product,
        expectedReturnQuantity,
        actualReturnQuantity,
        varianceQuantity:
          actualReturnQuantity - expectedReturnQuantity,
      };
    })
    .sort(
      (first, second) =>
        second.loadedQuantity - first.loadedQuantity ||
        first.productName.localeCompare(second.productName),
    );

  const reconciliation = dispatch.reconciliation
    ? {
        id: dispatch.reconciliation.id,
        status: dispatch.reconciliation.status,
        expectedCashPaise:
          dispatch.reconciliation.expectedCashPaise,
        declaredCashPaise:
          dispatch.reconciliation.declaredCashPaise,
        cashVariancePaise:
          dispatch.reconciliation.cashVariancePaise,
        expectedUpiPaise:
          dispatch.reconciliation.expectedUpiPaise,
        verifiedUpiPaise:
          dispatch.reconciliation.verifiedUpiPaise,
        upiVariancePaise:
          dispatch.reconciliation.upiVariancePaise,
        expectedBankPaise:
          dispatch.reconciliation.expectedBankPaise,
        verifiedBankPaise:
          dispatch.reconciliation.verifiedBankPaise,
        bankVariancePaise:
          dispatch.reconciliation.bankVariancePaise,
        expectedMixedPaise:
          dispatch.reconciliation.expectedMixedPaise,
        declaredMixedPaise:
          dispatch.reconciliation.declaredMixedPaise,
        mixedVariancePaise:
          dispatch.reconciliation.mixedVariancePaise,
        note: dispatch.reconciliation.note,
        finalizedAt: dispatch.reconciliation.finalizedAt,
      }
    : null;

  return {
    dispatch: {
      id: dispatch.id,
      status: dispatch.status,
      targetDate: dispatch.targetDate,
      completedAt: dispatch.completedAt,
      routeId: dispatch.routeId,
      routeCode: dispatch.route.code,
      routeName: dispatch.route.name,
      vehicleCode: dispatch.vehicle?.code ?? null,
      driverName: dispatch.driver?.name ?? null,
      salesmanName: dispatch.salesman?.name ?? null,
    },
    reconciliation,
    expectedCashPaise,
    expectedUpiPaise,
    expectedBankPaise,
    expectedMixedPaise,
    totalDeliveredValuePaise,
    totalCreditPaise,
    totalOutstandingCollectedPaise,
    totalMissingUnits,
    totalDamagedUnits,
    totalReturnedFromShopsUnits,
    completedStops,
    totalStops: dispatch.stops.length,
    activeStops,
    canFinalize:
      dispatch.status === "COMPLETED" &&
      dispatch.stops.length > 0 &&
      activeStops === 0,
    products,
  };
}