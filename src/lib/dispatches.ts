import { prisma } from "@/lib/prisma";

const confirmedStatuses = new Set(["CONFIRMED", "MODIFIED"]);
const pendingStatuses = new Set(["DRAFT", "SENT", "NO_RESPONSE"]);

export type DispatchPlanItem = {
  productId: string;
  sku: string;
  productName: string;
  brand: string | null;
  packSize: string | null;
  unit: string;
  confirmedQuantity: number;
  reserveQuantity: number;
  plannedQuantity: number;
  unitWeightGrams: number;
  unitLoadPoints: number;
  plannedWeightGrams: number;
  plannedLoadPoints: number;
  confirmedValuePaise: number;
};

export type DispatchPlan = {
  routeId: string;
  distributorId: string;
  targetDate: Date;
  confirmedShops: number;
  pendingShops: number;
  confirmedValuePaise: number;
  plannedWeightGrams: number;
  plannedLoadPoints: number;
  items: DispatchPlanItem[];
};

export async function buildCurrentDispatchPlan(
  routeId: string,
): Promise<DispatchPlan | null> {
  const latestSignal = await prisma.demandSignal.findFirst({
    where: {
      routeId,
    },
    orderBy: {
      targetDate: "desc",
    },
    select: {
      targetDate: true,
      distributorId: true,
    },
  });

  if (!latestSignal) {
    return null;
  }

  const signals = await prisma.demandSignal.findMany({
    where: {
      routeId,
      targetDate: latestSignal.targetDate,
    },
    include: {
      items: {
        include: {
          product: true,
        },
      },
    },
  });

  const confirmedSignals = signals.filter((signal) =>
    confirmedStatuses.has(signal.status),
  );

  const pendingSignals = signals.filter((signal) =>
    pendingStatuses.has(signal.status),
  );

  const itemMap = new Map<
    string,
    {
      productId: string;
      sku: string;
      productName: string;
      brand: string | null;
      packSize: string | null;
      unit: string;
      confirmedQuantity: number;
      unitWeightGrams: number;
      unitLoadPoints: number;
      unitPricePaise: number;
    }
  >();

  for (const signal of confirmedSignals) {
    for (const item of signal.items) {
      const quantity =
        item.confirmedQuantity ?? item.suggestedQuantity;

      const current = itemMap.get(item.productId) ?? {
        productId: item.productId,
        sku: item.product.sku,
        productName: item.product.name,
        brand: item.product.brand,
        packSize: item.product.packSize,
        unit: item.product.unit,
        confirmedQuantity: 0,
        unitWeightGrams: item.product.unitWeightGrams,
        unitLoadPoints: item.product.unitLoadPoints,
        unitPricePaise: item.unitPricePaise,
      };

      current.confirmedQuantity += quantity;
      itemMap.set(item.productId, current);
    }
  }

  const items: DispatchPlanItem[] = [...itemMap.values()]
    .map((item) => {
      const reserveQuantity =
        item.confirmedQuantity > 0
          ? Math.max(1, Math.ceil(item.confirmedQuantity * 0.1))
          : 0;

      const plannedQuantity =
        item.confirmedQuantity + reserveQuantity;

      return {
        productId: item.productId,
        sku: item.sku,
        productName: item.productName,
        brand: item.brand,
        packSize: item.packSize,
        unit: item.unit,
        confirmedQuantity: item.confirmedQuantity,
        reserveQuantity,
        plannedQuantity,
        unitWeightGrams: item.unitWeightGrams,
        unitLoadPoints: item.unitLoadPoints,
        plannedWeightGrams:
          plannedQuantity * item.unitWeightGrams,
        plannedLoadPoints:
          plannedQuantity * item.unitLoadPoints,
        confirmedValuePaise:
          item.confirmedQuantity * item.unitPricePaise,
      };
    })
    .sort(
      (first, second) =>
        second.plannedLoadPoints -
          first.plannedLoadPoints ||
        first.productName.localeCompare(second.productName),
    );

  return {
    routeId,
    distributorId: latestSignal.distributorId,
    targetDate: latestSignal.targetDate,
    confirmedShops: confirmedSignals.length,
    pendingShops: pendingSignals.length,
    confirmedValuePaise: items.reduce(
      (total, item) => total + item.confirmedValuePaise,
      0,
    ),
    plannedWeightGrams: items.reduce(
      (total, item) => total + item.plannedWeightGrams,
      0,
    ),
    plannedLoadPoints: items.reduce(
      (total, item) => total + item.plannedLoadPoints,
      0,
    ),
    items,
  };
}

export async function getDispatchWorkspace(routeId: string) {
  const route = await prisma.route.findUnique({
    where: {
      id: routeId,
    },
    include: {
      distributor: true,
    },
  });

  if (!route) {
    return null;
  }

  const plan = await buildCurrentDispatchPlan(routeId);

  if (!plan) {
    return null;
  }

  const [vehicles, drivers, salesmen, dispatch] = await Promise.all([
    prisma.vehicle.findMany({
      where: {
        distributorId: route.distributorId,
        status: "ACTIVE",
      },
      orderBy: [
        {
          maxLoadPoints: "asc",
        },
        {
          maxWeightGrams: "asc",
        },
      ],
    }),

    prisma.staff.findMany({
      where: {
        distributorId: route.distributorId,
        role: "DRIVER",
        isActive: true,
      },
      orderBy: {
        name: "asc",
      },
    }),

    prisma.staff.findMany({
      where: {
        distributorId: route.distributorId,
        role: "SALESMAN",
        isActive: true,
      },
      orderBy: {
        name: "asc",
      },
    }),

    prisma.dispatch.findUnique({
      where: {
        routeId_targetDate: {
          routeId,
          targetDate: plan.targetDate,
        },
      },
      include: {
        vehicle: true,
        driver: true,
        salesman: true,
        items: {
          include: {
            product: true,
          },
          orderBy: {
            plannedLoadPoints: "desc",
          },
        },
      },
    }),
  ]);

  const activeWeight =
    dispatch?.plannedWeightGrams ?? plan.plannedWeightGrams;

  const activeLoadPoints =
    dispatch?.plannedLoadPoints ?? plan.plannedLoadPoints;

  const confirmedWeightGrams = plan.items.reduce(
    (total, item) =>
      total +
      item.confirmedQuantity * item.unitWeightGrams,
    0,
  );

  const confirmedLoadPoints = plan.items.reduce(
    (total, item) =>
      total +
      item.confirmedQuantity * item.unitLoadPoints,
    0,
  );

  const vehicleOptions = vehicles.map((vehicle) => {
    const weightPercentage =
      vehicle.maxWeightGrams === 0
        ? 0
        : Math.round(
            (activeWeight / vehicle.maxWeightGrams) * 100,
          );

    const loadPointPercentage =
      vehicle.maxLoadPoints === 0
        ? 0
        : Math.round(
            (activeLoadPoints / vehicle.maxLoadPoints) * 100,
          );

    const fitsWeight =
      activeWeight <= vehicle.maxWeightGrams;

    const fitsLoadPoints =
      activeLoadPoints <= vehicle.maxLoadPoints;

    const confirmedDemandFits =
      confirmedWeightGrams <= vehicle.maxWeightGrams &&
      confirmedLoadPoints <= vehicle.maxLoadPoints;

    return {
      ...vehicle,
      weightPercentage,
      loadPointPercentage,
      fitsWeight,
      fitsLoadPoints,
      fits: fitsWeight && fitsLoadPoints,
      confirmedDemandFits,
      canFitByReserveTrim:
        confirmedDemandFits &&
        !(fitsWeight && fitsLoadPoints),
    };
  });

  const recommendedVehicle =
    vehicleOptions.find((vehicle) => vehicle.fits) ?? null;

  const manifestItems = dispatch
    ? dispatch.items.map((item) => ({
        productId: item.productId,
        sku: item.product.sku,
        productName: item.product.name,
        brand: item.product.brand,
        packSize: item.product.packSize,
        unit: item.product.unit,
        confirmedQuantity: item.confirmedQuantity,
        reserveQuantity: item.reserveQuantity,
        plannedQuantity: item.plannedQuantity,
        unitWeightGrams: item.unitWeightGrams,
        unitLoadPoints: item.unitLoadPoints,
        plannedWeightGrams: item.plannedWeightGrams,
        plannedLoadPoints: item.plannedLoadPoints,
        confirmedValuePaise: item.confirmedValuePaise,
      }))
    : plan.items;

  const assignedVehicle = dispatch?.vehicle ?? null;

  const assignedWeightPercentage = assignedVehicle
    ? Math.round(
        (activeWeight / assignedVehicle.maxWeightGrams) * 100,
      )
    : null;

  const assignedLoadPointPercentage = assignedVehicle
    ? Math.round(
        (activeLoadPoints / assignedVehicle.maxLoadPoints) * 100,
      )
    : null;

  return {
    route: {
      id: route.id,
      code: route.code,
      name: route.name,
      distributorName: route.distributor.name,
    },
    plan,
    dispatch,
    manifestItems,
    vehicles: vehicleOptions,
    drivers,
    salesmen,
    recommendedVehicle,
    assignedWeightPercentage,
    assignedLoadPointPercentage,
  };
}