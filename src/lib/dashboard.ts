import { prisma } from "@/lib/prisma";

export type DashboardShop = {
  shop: string;
  route: string;
  predictionPaise: number;
  status: string;
  products: number;
  time: string;
};

export type DashboardVanLoad = {
  product: string;
  unit: string;
  confirmed: number;
  reserve: number;
  percent: number;
};

export type DashboardRoute = {
  routeCode: string;
  routeName: string;
  totalSignals: number;
  confirmedSignals: number;
};

export type DashboardData = {
  distributorName: string;
  targetDate: Date | null;
  totalSignals: number;
  confirmedSignals: number;
  pendingSignals: number;
  totalSuggestedPaise: number;
  collectionExpectedPaise: number;
  routeReadiness: number;
  routesPrepared: number;
  shops: DashboardShop[];
  selectedRoute: DashboardRoute | null;
  vanLoad: DashboardVanLoad[];
  vanLoadReadiness: number;
};

const confirmedStatuses = new Set([
  "CONFIRMED",
  "MODIFIED",
]);

const statusRank: Record<string, number> = {
  CONFIRMED: 1,
  MODIFIED: 2,
  SENT: 3,
  NO_RESPONSE: 4,
  DRAFT: 5,
  REJECTED: 6,
  EXPIRED: 7,
};

const statusLabels: Record<string, string> = {
  CONFIRMED: "Confirmed",
  MODIFIED: "Modified",
  SENT: "Awaiting",
  NO_RESPONSE: "No response",
  DRAFT: "Draft",
  REJECTED: "Rejected",
  EXPIRED: "Expired",
};

export async function getDashboardData(): Promise<DashboardData> {
  const distributor = await prisma.distributor.findFirst({
    orderBy: {
      createdAt: "asc",
    },
  });

  const latestSignal = await prisma.demandSignal.findFirst({
    orderBy: {
      targetDate: "desc",
    },
    select: {
      targetDate: true,
    },
  });

  if (!latestSignal) {
    return {
      distributorName: distributor?.name ?? "DukaanSignal Pilot",
      targetDate: null,
      totalSignals: 0,
      confirmedSignals: 0,
      pendingSignals: 0,
      totalSuggestedPaise: 0,
      collectionExpectedPaise: 0,
      routeReadiness: 0,
      routesPrepared: 0,
      shops: [],
      selectedRoute: null,
      vanLoad: [],
      vanLoadReadiness: 0,
    };
  }

  const signals = await prisma.demandSignal.findMany({
    where: {
      targetDate: latestSignal.targetDate,
    },
    include: {
      shop: {
        include: {
          route: true,
        },
      },
      items: {
        include: {
          product: true,
        },
      },
    },
  });

  signals.sort(
    (first, second) =>
      (statusRank[first.status] ?? 99) -
        (statusRank[second.status] ?? 99) ||
      first.shop.name.localeCompare(second.shop.name),
  );

  const confirmed = signals.filter((signal) =>
    confirmedStatuses.has(signal.status),
  );

  const totalSuggestedPaise = signals.reduce(
    (total, signal) => total + signal.totalSuggestedPaise,
    0,
  );

  const collectionExpectedPaise = confirmed.reduce(
    (total, signal) => total + signal.shop.outstandingPaise,
    0,
  );

  const preparedRouteIds = new Set(
    confirmed
      .map((signal) => signal.routeId)
      .filter((routeId): routeId is string => routeId !== null),
  );

  const routeReadiness =
    signals.length === 0
      ? 0
      : Math.round((confirmed.length / signals.length) * 100);

  const routeStats = new Map<string, DashboardRoute>();

  for (const signal of signals) {
    if (!signal.routeId || !signal.shop.route) {
      continue;
    }

    const current = routeStats.get(signal.routeId) ?? {
      routeCode: signal.shop.route.code,
      routeName: signal.shop.route.name,
      totalSignals: 0,
      confirmedSignals: 0,
    };

    current.totalSignals += 1;

    if (confirmedStatuses.has(signal.status)) {
      current.confirmedSignals += 1;
    }

    routeStats.set(signal.routeId, current);
  }

  const selectedRouteEntry = [...routeStats.entries()].sort(
    ([, first], [, second]) =>
      second.confirmedSignals - first.confirmedSignals ||
      second.totalSignals - first.totalSignals,
  )[0];

  const selectedRouteId = selectedRouteEntry?.[0] ?? null;
  const selectedRoute = selectedRouteEntry?.[1] ?? null;

  const groupedLoad = new Map<
    string,
    {
      product: string;
      unit: string;
      confirmed: number;
    }
  >();

  if (selectedRouteId) {
    for (const signal of confirmed) {
      if (signal.routeId !== selectedRouteId) {
        continue;
      }

      for (const item of signal.items) {
        const quantity =
          item.confirmedQuantity ?? item.suggestedQuantity;

        const current = groupedLoad.get(item.productId) ?? {
          product: item.product.name,
          unit: item.product.unit,
          confirmed: 0,
        };

        current.confirmed += quantity;
        groupedLoad.set(item.productId, current);
      }
    }
  }

  const loadRows = [...groupedLoad.values()]
    .sort(
      (first, second) =>
        second.confirmed - first.confirmed,
    )
    .slice(0, 4);

  const highestQuantity = Math.max(
    1,
    ...loadRows.map((item) => item.confirmed),
  );

  const vanLoad: DashboardVanLoad[] = loadRows.map((item) => ({
    product: item.product,
    unit: item.unit,
    confirmed: item.confirmed,
    reserve: Math.max(1, Math.ceil(item.confirmed * 0.1)),
    percent: Math.max(
      10,
      Math.round((item.confirmed / highestQuantity) * 100),
    ),
  }));

  const vanLoadReadiness =
    selectedRoute && selectedRoute.totalSignals > 0
      ? Math.round(
          (selectedRoute.confirmedSignals /
            selectedRoute.totalSignals) *
            100,
        )
      : 0;

  const shops: DashboardShop[] = signals
    .slice(0, 5)
    .map((signal) => ({
      shop: signal.shop.name,
      route: signal.shop.route?.code ?? "Unassigned",
      predictionPaise: signal.totalSuggestedPaise,
      status: statusLabels[signal.status] ?? signal.status,
      products: signal.items.length,
      time: signal.shop.preferredWindow ?? "Not specified",
    }));

  return {
    distributorName: distributor?.name ?? "DukaanSignal Pilot",
    targetDate: latestSignal.targetDate,
    totalSignals: signals.length,
    confirmedSignals: confirmed.length,
    pendingSignals: signals.length - confirmed.length,
    totalSuggestedPaise,
    collectionExpectedPaise,
    routeReadiness,
    routesPrepared: preparedRouteIds.size,
    shops,
    selectedRoute,
    vanLoad,
    vanLoadReadiness,
  };
}