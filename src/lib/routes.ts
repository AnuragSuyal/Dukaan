import { prisma } from "@/lib/prisma";

const confirmedStatuses = new Set(["CONFIRMED", "MODIFIED"]);
const pendingStatuses = new Set(["DRAFT", "SENT", "NO_RESPONSE"]);

const statusLabels: Record<string, string> = {
  DRAFT: "Draft",
  SENT: "Awaiting",
  CONFIRMED: "Confirmed",
  MODIFIED: "Modified",
  REJECTED: "Rejected",
  EXPIRED: "Expired",
  NO_RESPONSE: "No response",
};

export type RouteOverviewRow = {
  id: string;
  code: string;
  name: string;
  deliveryDays: string | null;
  registeredShops: number;
  totalSignals: number;
  confirmedShops: number;
  pendingShops: number;
  rejectedShops: number;
  readiness: number;
  confirmedValuePaise: number;
  suggestedValuePaise: number;
  handlingUnits: number;
  uniqueProducts: number;
  statusLabel: string;
};

export type RouteOverviewData = {
  targetDate: Date | null;
  routes: RouteOverviewRow[];
  totalConfirmedShops: number;
  totalPendingShops: number;
  totalConfirmedValuePaise: number;
  totalHandlingUnits: number;
};

export type RouteLoadItem = {
  productId: string;
  sku: string;
  productName: string;
  brand: string | null;
  packSize: string | null;
  unit: string;
  confirmedQuantity: number;
  pendingPotentialQuantity: number;
  reserveQuantity: number;
  plannedLoadQuantity: number;
  unitPricePaise: number;
  confirmedValuePaise: number;
};

export type RouteShopRow = {
  signalId: string;
  shopName: string;
  ownerName: string | null;
  phone: string;
  locality: string | null;
  preferredWindow: string | null;
  status: string;
  statusLabel: string;
  suggestedValuePaise: number;
  confirmedValuePaise: number;
  productCount: number;
  modifiedProductCount: number;
  merchantNote: string | null;
};

export type RouteDetailData = {
  route: {
    id: string;
    code: string;
    name: string;
    deliveryDays: string | null;
    distributorName: string;
  };
  targetDate: Date;
  totalSignals: number;
  confirmedShops: number;
  pendingShops: number;
  rejectedShops: number;
  readiness: number;
  suggestedValuePaise: number;
  confirmedValuePaise: number;
  handlingUnits: number;
  uniqueProducts: number;
  loadItems: RouteLoadItem[];
  shops: RouteShopRow[];
};

function calculateConfirmedSignalValue(
  signal: {
    status: string;
    items: Array<{
      suggestedQuantity: number;
      confirmedQuantity: number | null;
      unitPricePaise: number;
    }>;
  },
): number {
  if (!confirmedStatuses.has(signal.status)) {
    return 0;
  }

  return signal.items.reduce(
    (total, item) =>
      total +
      item.unitPricePaise *
        (item.confirmedQuantity ?? item.suggestedQuantity),
    0,
  );
}

export async function getRouteOverviewData(): Promise<RouteOverviewData> {
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
      targetDate: null,
      routes: [],
      totalConfirmedShops: 0,
      totalPendingShops: 0,
      totalConfirmedValuePaise: 0,
      totalHandlingUnits: 0,
    };
  }

  const routes = await prisma.route.findMany({
    where: {
      status: "ACTIVE",
    },
    include: {
      _count: {
        select: {
          shops: true,
        },
      },
      demandSignals: {
        where: {
          targetDate: latestSignal.targetDate,
        },
        include: {
          items: true,
        },
      },
    },
    orderBy: {
      code: "asc",
    },
  });

  const routeRows: RouteOverviewRow[] = routes.map((route) => {
    const confirmedSignals = route.demandSignals.filter((signal) =>
      confirmedStatuses.has(signal.status),
    );

    const pendingSignals = route.demandSignals.filter((signal) =>
      pendingStatuses.has(signal.status),
    );

    const rejectedSignals = route.demandSignals.filter(
      (signal) =>
        signal.status === "REJECTED" ||
        signal.status === "EXPIRED",
    );

    const readinessDenominator =
      confirmedSignals.length + pendingSignals.length;

    const readiness =
      readinessDenominator === 0
        ? 0
        : Math.round(
            (confirmedSignals.length / readinessDenominator) * 100,
          );

    const confirmedValuePaise = confirmedSignals.reduce(
      (total, signal) =>
        total + calculateConfirmedSignalValue(signal),
      0,
    );

    const suggestedValuePaise = route.demandSignals.reduce(
      (total, signal) => total + signal.totalSuggestedPaise,
      0,
    );

    const handlingUnits = confirmedSignals.reduce(
      (routeTotal, signal) =>
        routeTotal +
        signal.items.reduce(
          (signalTotal, item) =>
            signalTotal +
            (item.confirmedQuantity ??
              item.suggestedQuantity),
          0,
        ),
      0,
    );

    const uniqueProducts = new Set(
      confirmedSignals.flatMap((signal) =>
        signal.items.map((item) => item.productId),
      ),
    ).size;

    const statusLabel =
      readiness >= 80
        ? "Ready for loading"
        : readiness >= 50
          ? "Building load"
          : "Waiting for shops";

    return {
      id: route.id,
      code: route.code,
      name: route.name,
      deliveryDays: route.deliveryDays,
      registeredShops: route._count.shops,
      totalSignals: route.demandSignals.length,
      confirmedShops: confirmedSignals.length,
      pendingShops: pendingSignals.length,
      rejectedShops: rejectedSignals.length,
      readiness,
      confirmedValuePaise,
      suggestedValuePaise,
      handlingUnits,
      uniqueProducts,
      statusLabel,
    };
  });

  return {
    targetDate: latestSignal.targetDate,
    routes: routeRows,
    totalConfirmedShops: routeRows.reduce(
      (total, route) => total + route.confirmedShops,
      0,
    ),
    totalPendingShops: routeRows.reduce(
      (total, route) => total + route.pendingShops,
      0,
    ),
    totalConfirmedValuePaise: routeRows.reduce(
      (total, route) => total + route.confirmedValuePaise,
      0,
    ),
    totalHandlingUnits: routeRows.reduce(
      (total, route) => total + route.handlingUnits,
      0,
    ),
  };
}

export async function getRouteDetailData(
  routeId: string,
): Promise<RouteDetailData | null> {
  const latestSignal = await prisma.demandSignal.findFirst({
    orderBy: {
      targetDate: "desc",
    },
    select: {
      targetDate: true,
    },
  });

  if (!latestSignal) {
    return null;
  }

  const route = await prisma.route.findUnique({
    where: {
      id: routeId,
    },
    include: {
      distributor: true,
      demandSignals: {
        where: {
          targetDate: latestSignal.targetDate,
        },
        include: {
          shop: true,
          items: {
            include: {
              product: true,
            },
          },
        },
      },
    },
  });

  if (!route) {
    return null;
  }

  route.demandSignals.sort((first, second) =>
    first.shop.name.localeCompare(second.shop.name),
  );

  const confirmedSignals = route.demandSignals.filter((signal) =>
    confirmedStatuses.has(signal.status),
  );

  const pendingSignals = route.demandSignals.filter((signal) =>
    pendingStatuses.has(signal.status),
  );

  const rejectedSignals = route.demandSignals.filter(
    (signal) =>
      signal.status === "REJECTED" ||
      signal.status === "EXPIRED",
  );

  const readinessDenominator =
    confirmedSignals.length + pendingSignals.length;

  const readiness =
    readinessDenominator === 0
      ? 0
      : Math.round(
          (confirmedSignals.length / readinessDenominator) * 100,
        );

  const loadMap = new Map<
    string,
    {
      productId: string;
      sku: string;
      productName: string;
      brand: string | null;
      packSize: string | null;
      unit: string;
      confirmedQuantity: number;
      pendingPotentialQuantity: number;
      unitPricePaise: number;
    }
  >();

  for (const signal of confirmedSignals) {
    for (const item of signal.items) {
      const quantity =
        item.confirmedQuantity ?? item.suggestedQuantity;

      const current = loadMap.get(item.productId) ?? {
        productId: item.productId,
        sku: item.product.sku,
        productName: item.product.name,
        brand: item.product.brand,
        packSize: item.product.packSize,
        unit: item.product.unit,
        confirmedQuantity: 0,
        pendingPotentialQuantity: 0,
        unitPricePaise: item.unitPricePaise,
      };

      current.confirmedQuantity += quantity;
      loadMap.set(item.productId, current);
    }
  }

  for (const signal of pendingSignals) {
    for (const item of signal.items) {
      const current = loadMap.get(item.productId) ?? {
        productId: item.productId,
        sku: item.product.sku,
        productName: item.product.name,
        brand: item.product.brand,
        packSize: item.product.packSize,
        unit: item.product.unit,
        confirmedQuantity: 0,
        pendingPotentialQuantity: 0,
        unitPricePaise: item.unitPricePaise,
      };

      current.pendingPotentialQuantity += item.suggestedQuantity;
      loadMap.set(item.productId, current);
    }
  }

  const loadItems: RouteLoadItem[] = [...loadMap.values()]
    .map((item) => {
      const reserveQuantity =
        item.confirmedQuantity === 0
          ? 0
          : Math.max(
              1,
              Math.ceil(item.confirmedQuantity * 0.1),
            );

      return {
        ...item,
        reserveQuantity,
        plannedLoadQuantity:
          item.confirmedQuantity + reserveQuantity,
        confirmedValuePaise:
          item.confirmedQuantity * item.unitPricePaise,
      };
    })
    .sort(
      (first, second) =>
        second.plannedLoadQuantity -
          first.plannedLoadQuantity ||
        first.productName.localeCompare(second.productName),
    );

  const shops: RouteShopRow[] = route.demandSignals.map(
    (signal) => {
      const confirmedValuePaise =
        calculateConfirmedSignalValue(signal);

      const modifiedProductCount = signal.items.filter(
        (item) =>
          item.confirmedQuantity !== null &&
          item.confirmedQuantity !== item.suggestedQuantity,
      ).length;

      return {
        signalId: signal.id,
        shopName: signal.shop.name,
        ownerName: signal.shop.ownerName,
        phone: signal.shop.phone,
        locality: signal.shop.locality,
        preferredWindow: signal.shop.preferredWindow,
        status: signal.status,
        statusLabel:
          statusLabels[signal.status] ?? signal.status,
        suggestedValuePaise: signal.totalSuggestedPaise,
        confirmedValuePaise,
        productCount: signal.items.length,
        modifiedProductCount,
        merchantNote: signal.merchantNote,
      };
    },
  );

  const confirmedValuePaise = confirmedSignals.reduce(
    (total, signal) =>
      total + calculateConfirmedSignalValue(signal),
    0,
  );

  return {
    route: {
      id: route.id,
      code: route.code,
      name: route.name,
      deliveryDays: route.deliveryDays,
      distributorName: route.distributor.name,
    },
    targetDate: latestSignal.targetDate,
    totalSignals: route.demandSignals.length,
    confirmedShops: confirmedSignals.length,
    pendingShops: pendingSignals.length,
    rejectedShops: rejectedSignals.length,
    readiness,
    suggestedValuePaise: route.demandSignals.reduce(
      (total, signal) => total + signal.totalSuggestedPaise,
      0,
    ),
    confirmedValuePaise,
    handlingUnits: loadItems.reduce(
      (total, item) => total + item.confirmedQuantity,
      0,
    ),
    uniqueProducts: loadItems.filter(
      (item) => item.confirmedQuantity > 0,
    ).length,
    loadItems,
    shops,
  };
}