import { prisma } from "@/lib/prisma";

const terminalStopStatuses = new Set([
  "DELIVERED",
  "PARTIAL",
  "FAILED",
  "SKIPPED",
]);

export type DailyRoutePlan = {
  routeId: string;
  routeCode: string;
  routeName: string;

  totalSignals: number;
  confirmedSignals: number;
  pendingSignals: number;
  rejectedSignals: number;

  confirmedValuePaise: number;
  pendingPotentialPaise: number;

  dispatchId: string | null;
  dispatchStatus: string | null;

  vehicleCode: string | null;
  driverName: string | null;
  salesmanName: string | null;

  plannedWeightKg: number;
  plannedLoadPoints: number;

  completedStops: number;
  totalStops: number;
  progress: number;

  reconciliationStatus: string | null;
};

export type DailyOperationsData = {
  cycleDate: Date | null;

  metrics: {
    totalRoutes: number;
    routesWithDemand: number;
    dispatchesCreated: number;
    activeRoutes: number;
    completedRoutes: number;

    confirmedShops: number;
    pendingShops: number;

    confirmedValuePaise: number;
    pendingPotentialPaise: number;

    completedStops: number;
    totalStops: number;
  };

  routes: DailyRoutePlan[];
};

function emptyDailyOperations(): DailyOperationsData {
  return {
    cycleDate: null,
    metrics: {
      totalRoutes: 0,
      routesWithDemand: 0,
      dispatchesCreated: 0,
      activeRoutes: 0,
      completedRoutes: 0,
      confirmedShops: 0,
      pendingShops: 0,
      confirmedValuePaise: 0,
      pendingPotentialPaise: 0,
      completedStops: 0,
      totalStops: 0,
    },
    routes: [],
  };
}

function signalItemValue(
  item: {
    suggestedQuantity: number;
    confirmedQuantity: number | null;
    unitPricePaise: number;
  },
  useConfirmedQuantity: boolean,
): number {
  const quantity = useConfirmedQuantity
    ? item.confirmedQuantity ?? item.suggestedQuantity
    : item.suggestedQuantity;

  return quantity * item.unitPricePaise;
}

export async function getDailyOperations(): Promise<DailyOperationsData> {
  const [latestSignal, latestDispatch] = await Promise.all([
    prisma.demandSignal.findFirst({
      orderBy: {
        targetDate: "desc",
      },
      select: {
        targetDate: true,
      },
    }),

    prisma.dispatch.findFirst({
      orderBy: {
        targetDate: "desc",
      },
      select: {
        targetDate: true,
      },
    }),
  ]);

  const candidateDates = [
    latestSignal?.targetDate,
    latestDispatch?.targetDate,
  ].filter((date): date is Date => Boolean(date));

  if (candidateDates.length === 0) {
    return emptyDailyOperations();
  }

  const cycleDate = candidateDates.reduce((latest, date) =>
    date.getTime() > latest.getTime() ? date : latest,
  );

  const [routes, signals, dispatches] = await Promise.all([
    prisma.route.findMany({
      orderBy: {
        code: "asc",
      },
      select: {
        id: true,
        code: true,
        name: true,
      },
    }),

    prisma.demandSignal.findMany({
      where: {
        targetDate: cycleDate,
      },
      select: {
        routeId: true,
        status: true,
        items: {
          select: {
            suggestedQuantity: true,
            confirmedQuantity: true,
            unitPricePaise: true,
          },
        },
      },
    }),

    prisma.dispatch.findMany({
      where: {
        targetDate: cycleDate,
      },
      include: {
        vehicle: {
          select: {
            code: true,
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
          select: {
            status: true,
          },
        },
        reconciliation: {
          select: {
            status: true,
          },
        },
      },
      orderBy: {
        updatedAt: "desc",
      },
    }),
  ]);

  const signalsByRoute = new Map<
    string,
    typeof signals
  >();

  for (const signal of signals) {
    if (!signal.routeId) {
      continue;
    }

    const current = signalsByRoute.get(signal.routeId) ?? [];
    current.push(signal);
    signalsByRoute.set(signal.routeId, current);
  }

  const dispatchByRoute = new Map<
    string,
    (typeof dispatches)[number]
  >();

  for (const dispatch of dispatches) {
    if (!dispatchByRoute.has(dispatch.routeId)) {
      dispatchByRoute.set(dispatch.routeId, dispatch);
    }
  }

  const routePlans: DailyRoutePlan[] = routes.map((route) => {
    const routeSignals = signalsByRoute.get(route.id) ?? [];
    const dispatch = dispatchByRoute.get(route.id) ?? null;

    let confirmedSignals = 0;
    let pendingSignals = 0;
    let rejectedSignals = 0;

    let confirmedValuePaise = 0;
    let pendingPotentialPaise = 0;

    for (const signal of routeSignals) {
      if (
        signal.status === "CONFIRMED" ||
        signal.status === "MODIFIED"
      ) {
        confirmedSignals += 1;

        confirmedValuePaise += signal.items.reduce(
          (total, item) =>
            total + signalItemValue(item, true),
          0,
        );

        continue;
      }

      if (
        signal.status === "DRAFT" ||
        signal.status === "SENT" ||
        signal.status === "NO_RESPONSE"
      ) {
        pendingSignals += 1;

        pendingPotentialPaise += signal.items.reduce(
          (total, item) =>
            total + signalItemValue(item, false),
          0,
        );

        continue;
      }

      if (
        signal.status === "REJECTED" ||
        signal.status === "EXPIRED"
      ) {
        rejectedSignals += 1;
      }
    }

    const completedStops =
      dispatch?.stops.filter((stop) =>
        terminalStopStatuses.has(stop.status),
      ).length ?? 0;

    const totalStops = Math.max(
      dispatch?.stops.length ?? 0,
      confirmedSignals,
    );

    const progress =
      totalStops === 0
        ? 0
        : Math.round((completedStops / totalStops) * 100);

    return {
      routeId: route.id,
      routeCode: route.code,
      routeName: route.name,

      totalSignals: routeSignals.length,
      confirmedSignals,
      pendingSignals,
      rejectedSignals,

      confirmedValuePaise,
      pendingPotentialPaise,

      dispatchId: dispatch?.id ?? null,
      dispatchStatus: dispatch?.status ?? null,

      vehicleCode: dispatch?.vehicle?.code ?? null,
      driverName: dispatch?.driver?.name ?? null,
      salesmanName: dispatch?.salesman?.name ?? null,

      plannedWeightKg: dispatch
        ? Math.round(dispatch.plannedWeightGrams / 100) / 10
        : 0,

      plannedLoadPoints:
        dispatch?.plannedLoadPoints ?? 0,

      completedStops,
      totalStops,
      progress,

      reconciliationStatus:
        dispatch?.reconciliation?.status ?? null,
    };
  });

  const metrics = routePlans.reduce(
    (totals, route) => ({
      totalRoutes: totals.totalRoutes + 1,

      routesWithDemand:
        totals.routesWithDemand +
        (route.totalSignals > 0 ? 1 : 0),

      dispatchesCreated:
        totals.dispatchesCreated +
        (route.dispatchId ? 1 : 0),

      activeRoutes:
        totals.activeRoutes +
        (route.dispatchStatus &&
        !["COMPLETED", "CANCELLED"].includes(
          route.dispatchStatus,
        )
          ? 1
          : 0),

      completedRoutes:
        totals.completedRoutes +
        (route.dispatchStatus === "COMPLETED" ? 1 : 0),

      confirmedShops:
        totals.confirmedShops + route.confirmedSignals,

      pendingShops:
        totals.pendingShops + route.pendingSignals,

      confirmedValuePaise:
        totals.confirmedValuePaise +
        route.confirmedValuePaise,

      pendingPotentialPaise:
        totals.pendingPotentialPaise +
        route.pendingPotentialPaise,

      completedStops:
        totals.completedStops + route.completedStops,

      totalStops:
        totals.totalStops + route.totalStops,
    }),
    {
      totalRoutes: 0,
      routesWithDemand: 0,
      dispatchesCreated: 0,
      activeRoutes: 0,
      completedRoutes: 0,
      confirmedShops: 0,
      pendingShops: 0,
      confirmedValuePaise: 0,
      pendingPotentialPaise: 0,
      completedStops: 0,
      totalStops: 0,
    },
  );

  return {
    cycleDate,
    metrics,
    routes: routePlans,
  };
}