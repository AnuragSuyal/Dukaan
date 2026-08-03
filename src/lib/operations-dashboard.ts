import { prisma } from "@/lib/prisma";

type AlertSeverity = "critical" | "warning" | "info";

export type OperationsAlert = {
  id: string;
  severity: AlertSeverity;
  title: string;
  message: string;
  routeId: string;
  routeCode: string;
};

export type OperationsRouteSummary = {
  dispatchId: string;
  routeId: string;
  routeCode: string;
  routeName: string;
  dispatchStatus: string;
  vehicleCode: string | null;
  driverName: string | null;
  salesmanName: string | null;
  plannedWeightKg: number;
  plannedLoadPoints: number;
  weightUtilization: number | null;
  spaceUtilization: number | null;
  completedStops: number;
  totalStops: number;
  progress: number;
  expectedValuePaise: number;
  deliveredValuePaise: number;
  collectedPaise: number;
  creditExtendedPaise: number;
  missingUnits: number;
  damagedUnits: number;
  exceptionStops: number;
  reconciliationStatus: string | null;
  reconciliationMatched: boolean;
};

export type OperationsDashboardData = {
  cycleDate: Date | null;
  metrics: {
    totalRoutes: number;
    activeRoutes: number;
    completedRoutes: number;
    completedStops: number;
    totalStops: number;
    expectedValuePaise: number;
    deliveredValuePaise: number;
    collectedPaise: number;
    creditExtendedPaise: number;
    currentOutstandingPaise: number;
    missingUnits: number;
    damagedUnits: number;
    exceptionStops: number;
  };
  routes: OperationsRouteSummary[];
  alerts: OperationsAlert[];
  paymentMix: {
    cashPaise: number;
    upiPaise: number;
    bankPaise: number;
    mixedPaise: number;
  };
};

const activeDispatchStatuses = new Set([
  "DRAFT",
  "LOADING",
  "FINALIZED",
  "DISPATCHED",
]);

const terminalStopStatuses = new Set([
  "DELIVERED",
  "PARTIAL",
  "FAILED",
  "SKIPPED",
]);

function percentage(
  used: number,
  capacity: number,
): number | null {
  if (capacity <= 0) {
    return null;
  }

  return Math.round((used / capacity) * 100);
}

function emptyDashboard(): OperationsDashboardData {
  return {
    cycleDate: null,
    metrics: {
      totalRoutes: 0,
      activeRoutes: 0,
      completedRoutes: 0,
      completedStops: 0,
      totalStops: 0,
      expectedValuePaise: 0,
      deliveredValuePaise: 0,
      collectedPaise: 0,
      creditExtendedPaise: 0,
      currentOutstandingPaise: 0,
      missingUnits: 0,
      damagedUnits: 0,
      exceptionStops: 0,
    },
    routes: [],
    alerts: [],
    paymentMix: {
      cashPaise: 0,
      upiPaise: 0,
      bankPaise: 0,
      mixedPaise: 0,
    },
  };
}

export async function getOperationsDashboard(): Promise<OperationsDashboardData> {
  const latestDispatch = await prisma.dispatch.findFirst({
    orderBy: {
      targetDate: "desc",
    },
    select: {
      targetDate: true,
    },
  });

  if (!latestDispatch) {
    return emptyDashboard();
  }

  const [dispatches, signals] = await Promise.all([
    prisma.dispatch.findMany({
      where: {
        targetDate: latestDispatch.targetDate,
      },
      include: {
        route: {
          select: {
            id: true,
            code: true,
            name: true,
          },
        },
        vehicle: {
          select: {
            code: true,
            maxWeightGrams: true,
            maxLoadPoints: true,
          },
        },
        driver: {
          select: {
            name: true,
          },
        },
        salesman: {
          select: {
            name: true,
          },
        },
        stops: {
          include: {
            shop: {
              select: {
                id: true,
                name: true,
                outstandingPaise: true,
              },
            },
            items: {
              select: {
                deliveredQuantity: true,
                missingQuantity: true,
                damagedQuantity: true,
                returnedQuantity: true,
                unitPricePaise: true,
              },
            },
          },
          orderBy: {
            sequence: "asc",
          },
        },
        reconciliation: {
          select: {
            status: true,
            cashVariancePaise: true,
            upiVariancePaise: true,
            bankVariancePaise: true,
            mixedVariancePaise: true,
            items: {
              select: {
                varianceQuantity: true,
              },
            },
          },
        },
      },
    }),

    prisma.demandSignal.findMany({
      where: {
        targetDate: latestDispatch.targetDate,
        status: {
          in: ["CONFIRMED", "MODIFIED"],
        },
      },
      select: {
        routeId: true,
        shop: {
          select: {
            id: true,
            outstandingPaise: true,
          },
        },
        items: {
          select: {
            suggestedQuantity: true,
            confirmedQuantity: true,
            unitPricePaise: true,
          },
        },
      },
    }),
  ]);

  const expectedByRoute = new Map<string, number>();
  const confirmedShopsByRoute = new Map<string, number>();
  const retailerBalances = new Map<string, number>();

  const dispatchRouteIds = new Set(
    dispatches.map((dispatch) => dispatch.routeId),
  );

  for (const signal of signals) {
    if (
      !signal.routeId ||
      !dispatchRouteIds.has(signal.routeId)
    ) {
      continue;
    }

    const signalValuePaise = signal.items.reduce(
      (total, item) =>
        total +
        (item.confirmedQuantity ?? item.suggestedQuantity) *
          item.unitPricePaise,
      0,
    );

    expectedByRoute.set(
      signal.routeId,
      (expectedByRoute.get(signal.routeId) ?? 0) +
        signalValuePaise,
    );

    confirmedShopsByRoute.set(
      signal.routeId,
      (confirmedShopsByRoute.get(signal.routeId) ?? 0) + 1,
    );

    retailerBalances.set(
      signal.shop.id,
      signal.shop.outstandingPaise,
    );
  }

  const alerts: OperationsAlert[] = [];
  const paymentMix = {
    cashPaise: 0,
    upiPaise: 0,
    bankPaise: 0,
    mixedPaise: 0,
  };

  const routes = dispatches
    .map((dispatch): OperationsRouteSummary => {
      let deliveredValuePaise = 0;
      let collectedPaise = 0;
      let creditExtendedPaise = 0;
      let missingUnits = 0;
      let damagedUnits = 0;

      for (const stop of dispatch.stops) {
        const stopCollectedPaise =
          stop.currentOrderCollectedPaise +
          stop.outstandingCollectedPaise;

        collectedPaise += stopCollectedPaise;
        creditExtendedPaise += stop.creditExtendedPaise;

        switch (stop.paymentMethod) {
          case "CASH":
            paymentMix.cashPaise += stopCollectedPaise;
            break;
          case "UPI":
            paymentMix.upiPaise += stopCollectedPaise;
            break;
          case "BANK_TRANSFER":
            paymentMix.bankPaise += stopCollectedPaise;
            break;
          case "MIXED":
            paymentMix.mixedPaise += stopCollectedPaise;
            break;
          default:
            break;
        }

        retailerBalances.set(
          stop.shop.id,
          stop.shop.outstandingPaise,
        );

        for (const item of stop.items) {
          deliveredValuePaise +=
            item.deliveredQuantity * item.unitPricePaise;

          missingUnits += item.missingQuantity;
          damagedUnits += item.damagedQuantity;
        }
      }

      const completedStops = dispatch.stops.filter((stop) =>
        terminalStopStatuses.has(stop.status),
      ).length;

      const confirmedShopCount =
        confirmedShopsByRoute.get(dispatch.routeId) ?? 0;

      const totalStops = Math.max(
        dispatch.stops.length,
        confirmedShopCount,
      );

      const progress =
        totalStops === 0
          ? 0
          : Math.round((completedStops / totalStops) * 100);

      const exceptionStops = dispatch.stops.filter((stop) =>
        ["PARTIAL", "FAILED", "SKIPPED"].includes(stop.status),
      ).length;

      const expectedValuePaise =
        expectedByRoute.get(dispatch.routeId) ??
        dispatch.stops.reduce(
          (total, stop) =>
            total + stop.expectedValuePaise,
          0,
        );

      const weightUtilization = dispatch.vehicle
        ? percentage(
            dispatch.plannedWeightGrams,
            dispatch.vehicle.maxWeightGrams,
          )
        : null;

      const spaceUtilization = dispatch.vehicle
        ? percentage(
            dispatch.plannedLoadPoints,
            dispatch.vehicle.maxLoadPoints,
          )
        : null;

      const financialVariancePaise = dispatch.reconciliation
        ? Math.abs(
            dispatch.reconciliation.cashVariancePaise,
          ) +
          Math.abs(
            dispatch.reconciliation.upiVariancePaise,
          ) +
          Math.abs(
            dispatch.reconciliation.bankVariancePaise,
          ) +
          Math.abs(
            dispatch.reconciliation.mixedVariancePaise,
          )
        : 0;

      const hasStockVariance =
        dispatch.reconciliation?.items.some(
          (item) => item.varianceQuantity !== 0,
        ) ?? false;

      const reconciliationMatched =
        dispatch.reconciliation?.status === "FINALIZED" &&
        financialVariancePaise === 0 &&
        !hasStockVariance;

      const assignmentsMissing =
        !dispatch.vehicle ||
        !dispatch.driver ||
        !dispatch.salesman;

      if (
        assignmentsMissing &&
        dispatch.status !== "DRAFT"
      ) {
        alerts.push({
          id: `${dispatch.id}-assignment`,
          severity: "critical",
          title: "Dispatch assignment incomplete",
          message:
            "Vehicle, driver or salesperson assignment is missing.",
          routeId: dispatch.routeId,
          routeCode: dispatch.route.code,
        });
      }

      if (
        (weightUtilization ?? 0) > 100 ||
        (spaceUtilization ?? 0) > 100
      ) {
        alerts.push({
          id: `${dispatch.id}-capacity`,
          severity: "critical",
          title: "Vehicle capacity exceeded",
          message: `Weight ${weightUtilization ?? 0}% · Space ${
            spaceUtilization ?? 0
          }%.`,
          routeId: dispatch.routeId,
          routeCode: dispatch.route.code,
        });
      }

      if (
        exceptionStops > 0 ||
        missingUnits > 0 ||
        damagedUnits > 0
      ) {
        alerts.push({
          id: `${dispatch.id}-exceptions`,
          severity: "warning",
          title: "Delivery exceptions recorded",
          message: `${exceptionStops} exception stop${
            exceptionStops === 1 ? "" : "s"
          }, ${missingUnits} missing and ${damagedUnits} damaged units.`,
          routeId: dispatch.routeId,
          routeCode: dispatch.route.code,
        });
      }

      if (
        dispatch.status === "COMPLETED" &&
        dispatch.reconciliation?.status !== "FINALIZED"
      ) {
        alerts.push({
          id: `${dispatch.id}-reconciliation`,
          severity: "warning",
          title: "Reconciliation pending",
          message:
            "The route is completed but financial and stock reconciliation is not finalized.",
          routeId: dispatch.routeId,
          routeCode: dispatch.route.code,
        });
      }

      if (
        dispatch.reconciliation?.status === "FINALIZED" &&
        !reconciliationMatched
      ) {
        alerts.push({
          id: `${dispatch.id}-variance`,
          severity: "critical",
          title: "Reconciliation variance detected",
          message:
            "Finalized financial or vehicle-stock values do not match expected totals.",
          routeId: dispatch.routeId,
          routeCode: dispatch.route.code,
        });
      }

      return {
        dispatchId: dispatch.id,
        routeId: dispatch.routeId,
        routeCode: dispatch.route.code,
        routeName: dispatch.route.name,
        dispatchStatus: dispatch.status,
        vehicleCode: dispatch.vehicle?.code ?? null,
        driverName: dispatch.driver?.name ?? null,
        salesmanName: dispatch.salesman?.name ?? null,
        plannedWeightKg:
          Math.round(dispatch.plannedWeightGrams / 100) / 10,
        plannedLoadPoints: dispatch.plannedLoadPoints,
        weightUtilization,
        spaceUtilization,
        completedStops,
        totalStops,
        progress,
        expectedValuePaise,
        deliveredValuePaise,
        collectedPaise,
        creditExtendedPaise,
        missingUnits,
        damagedUnits,
        exceptionStops,
        reconciliationStatus:
          dispatch.reconciliation?.status ?? null,
        reconciliationMatched,
      };
    })
    .sort((first, second) =>
      first.routeCode.localeCompare(second.routeCode),
    );

  const metrics = routes.reduce(
    (totals, route) => ({
      totalRoutes: totals.totalRoutes + 1,
      activeRoutes:
        totals.activeRoutes +
        (activeDispatchStatuses.has(route.dispatchStatus)
          ? 1
          : 0),
      completedRoutes:
        totals.completedRoutes +
        (route.dispatchStatus === "COMPLETED" ? 1 : 0),
      completedStops:
        totals.completedStops + route.completedStops,
      totalStops: totals.totalStops + route.totalStops,
      expectedValuePaise:
        totals.expectedValuePaise +
        route.expectedValuePaise,
      deliveredValuePaise:
        totals.deliveredValuePaise +
        route.deliveredValuePaise,
      collectedPaise:
        totals.collectedPaise + route.collectedPaise,
      creditExtendedPaise:
        totals.creditExtendedPaise +
        route.creditExtendedPaise,
      currentOutstandingPaise:
        totals.currentOutstandingPaise,
      missingUnits:
        totals.missingUnits + route.missingUnits,
      damagedUnits:
        totals.damagedUnits + route.damagedUnits,
      exceptionStops:
        totals.exceptionStops + route.exceptionStops,
    }),
    {
      totalRoutes: 0,
      activeRoutes: 0,
      completedRoutes: 0,
      completedStops: 0,
      totalStops: 0,
      expectedValuePaise: 0,
      deliveredValuePaise: 0,
      collectedPaise: 0,
      creditExtendedPaise: 0,
      currentOutstandingPaise: 0,
      missingUnits: 0,
      damagedUnits: 0,
      exceptionStops: 0,
    },
  );

  metrics.currentOutstandingPaise = [
    ...retailerBalances.values(),
  ].reduce((total, value) => total + value, 0);

  const severityOrder: Record<AlertSeverity, number> = {
    critical: 0,
    warning: 1,
    info: 2,
  };

  alerts.sort(
    (first, second) =>
      severityOrder[first.severity] -
        severityOrder[second.severity] ||
      first.routeCode.localeCompare(second.routeCode),
  );

  return {
    cycleDate: latestDispatch.targetDate,
    metrics,
    routes,
    alerts,
    paymentMix,
  };
}