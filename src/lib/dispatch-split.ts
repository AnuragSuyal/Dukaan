import { prisma } from "@/lib/prisma";

type VehicleCandidate = {
  id: string;
  code: string;
  name: string;
  maxWeightGrams: number;
  maxLoadPoints: number;
};

export type SplitShopLoad = {
  signalId: string;
  shopId: string;
  shopName: string;
  ownerName: string | null;
  locality: string | null;
  preferredWindow: string | null;
  expectedValuePaise: number;
  weightGrams: number;
  loadPoints: number;
  productLines: number;
};

export type SplitRunPreview = {
  runNumber: number;
  vehicleId: string;
  vehicleCode: string;
  vehicleName: string;
  maxWeightGrams: number;
  maxLoadPoints: number;
  plannedWeightGrams: number;
  plannedLoadPoints: number;
  expectedValuePaise: number;
  weightUtilization: number;
  spaceUtilization: number;
  shops: SplitShopLoad[];
};

export type DispatchSplitPreview = {
  dispatch: {
    id: string;
    routeId: string;
    routeCode: string;
    routeName: string;
    targetDate: Date;
    currentStatus: string;
    currentManifestWeightGrams: number;
    currentManifestLoadPoints: number;
  };

  confirmedDemand: {
    shops: number;
    expectedValuePaise: number;
    weightGrams: number;
    loadPoints: number;
  };

  activeVehicles: VehicleCandidate[];
  singleVehicleFits: boolean;
  unassignableShops: SplitShopLoad[];
  recommendedRuns: SplitRunPreview[];
  reserveExcluded: boolean;
};

type MutableRun = {
  vehicle: VehicleCandidate;
  shops: SplitShopLoad[];
  weightGrams: number;
  loadPoints: number;
  expectedValuePaise: number;
};

type AssignmentResult = {
  runs: MutableRun[];
  maximumUtilization: number;
};

function percentage(
  used: number,
  capacity: number,
): number {
  if (capacity <= 0) {
    return 0;
  }

  return Math.round((used / capacity) * 100);
}

function utilization(
  used: number,
  capacity: number,
): number {
  if (capacity <= 0) {
    return Number.POSITIVE_INFINITY;
  }

  return used / capacity;
}

function combinations<T>(
  values: T[],
  size: number,
): T[][] {
  const result: T[][] = [];

  function visit(
    startIndex: number,
    current: T[],
  ): void {
    if (current.length === size) {
      result.push([...current]);
      return;
    }

    for (
      let index = startIndex;
      index < values.length;
      index += 1
    ) {
      current.push(values[index]);
      visit(index + 1, current);
      current.pop();
    }
  }

  visit(0, []);

  return result;
}

function maximumRunUtilization(
  runs: MutableRun[],
): number {
  return Math.max(
    ...runs.map((run) =>
      Math.max(
        utilization(
          run.weightGrams,
          run.vehicle.maxWeightGrams,
        ),
        utilization(
          run.loadPoints,
          run.vehicle.maxLoadPoints,
        ),
      ),
    ),
  );
}

function copyRuns(
  runs: MutableRun[],
): MutableRun[] {
  return runs.map((run) => ({
    vehicle: run.vehicle,
    shops: [...run.shops],
    weightGrams: run.weightGrams,
    loadPoints: run.loadPoints,
    expectedValuePaise: run.expectedValuePaise,
  }));
}

function findBestAssignment(
  vehicles: VehicleCandidate[],
  shops: SplitShopLoad[],
): AssignmentResult | null {
  const sortedShops = [...shops].sort(
    (first, second) =>
      second.loadPoints - first.loadPoints ||
      second.weightGrams - first.weightGrams ||
      first.shopName.localeCompare(second.shopName),
  );

  const runs: MutableRun[] = vehicles.map((vehicle) => ({
    vehicle,
    shops: [],
    weightGrams: 0,
    loadPoints: 0,
    expectedValuePaise: 0,
  }));

  let bestRuns: MutableRun[] | null = null;
  let bestMaximumUtilization =
    Number.POSITIVE_INFINITY;

  function search(shopIndex: number): void {
    if (shopIndex >= sortedShops.length) {
      if (runs.some((run) => run.shops.length === 0)) {
        return;
      }

      const score = maximumRunUtilization(runs);

      if (score < bestMaximumUtilization) {
        bestMaximumUtilization = score;
        bestRuns = copyRuns(runs);
      }

      return;
    }

    const shop = sortedShops[shopIndex];
    const exploredStates = new Set<string>();

    for (
      let runIndex = 0;
      runIndex < runs.length;
      runIndex += 1
    ) {
      const run = runs[runIndex];

      const nextWeight =
        run.weightGrams + shop.weightGrams;

      const nextPoints =
        run.loadPoints + shop.loadPoints;

      if (
        nextWeight >
          run.vehicle.maxWeightGrams ||
        nextPoints >
          run.vehicle.maxLoadPoints
      ) {
        continue;
      }

      const stateKey = [
        run.vehicle.maxWeightGrams,
        run.vehicle.maxLoadPoints,
        run.weightGrams,
        run.loadPoints,
      ].join(":");

      if (exploredStates.has(stateKey)) {
        continue;
      }

      exploredStates.add(stateKey);

      run.shops.push(shop);
      run.weightGrams = nextWeight;
      run.loadPoints = nextPoints;
      run.expectedValuePaise +=
        shop.expectedValuePaise;

      search(shopIndex + 1);

      run.shops.pop();
      run.weightGrams -= shop.weightGrams;
      run.loadPoints -= shop.loadPoints;
      run.expectedValuePaise -=
        shop.expectedValuePaise;
    }
  }

  search(0);

  if (!bestRuns) {
    return null;
  }

  return {
    runs: bestRuns,
    maximumUtilization:
      bestMaximumUtilization,
  };
}

function compareFleetOptions(
  first: {
    vehicles: VehicleCandidate[];
    assignment: AssignmentResult;
  },
  second: {
    vehicles: VehicleCandidate[];
    assignment: AssignmentResult;
  },
): number {
  const firstPoints = first.vehicles.reduce(
    (total, vehicle) =>
      total + vehicle.maxLoadPoints,
    0,
  );

  const secondPoints = second.vehicles.reduce(
    (total, vehicle) =>
      total + vehicle.maxLoadPoints,
    0,
  );

  if (firstPoints !== secondPoints) {
    return firstPoints - secondPoints;
  }

  const firstWeight = first.vehicles.reduce(
    (total, vehicle) =>
      total + vehicle.maxWeightGrams,
    0,
  );

  const secondWeight = second.vehicles.reduce(
    (total, vehicle) =>
      total + vehicle.maxWeightGrams,
    0,
  );

  if (firstWeight !== secondWeight) {
    return firstWeight - secondWeight;
  }

  return (
    first.assignment.maximumUtilization -
    second.assignment.maximumUtilization
  );
}

export async function buildDispatchSplitPreview(
  routeId: string,
): Promise<DispatchSplitPreview | null> {
  const dispatch = await prisma.dispatch.findFirst({
    where: {
      routeId,
    },
    orderBy: {
      targetDate: "desc",
    },
    include: {
      route: {
        select: {
          code: true,
          name: true,
        },
      },
    },
  });

  if (!dispatch) {
    return null;
  }

  const [signals, vehicles] = await Promise.all([
    prisma.demandSignal.findMany({
      where: {
        routeId,
        targetDate: dispatch.targetDate,
        status: {
          in: ["CONFIRMED", "MODIFIED"],
        },
      },
      include: {
        shop: {
          select: {
            id: true,
            name: true,
            ownerName: true,
            locality: true,
            preferredWindow: true,
          },
        },
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
    }),

    prisma.vehicle.findMany({
      where: {
        distributorId: dispatch.distributorId,
        status: "ACTIVE",
      },
      select: {
        id: true,
        code: true,
        name: true,
        maxWeightGrams: true,
        maxLoadPoints: true,
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
  ]);

  const shopLoads: SplitShopLoad[] =
    signals.map((signal) => {
      const totals = signal.items.reduce(
        (result, item) => {
          const quantity =
            item.confirmedQuantity ??
            item.suggestedQuantity;

          return {
            expectedValuePaise:
              result.expectedValuePaise +
              quantity * item.unitPricePaise,

            weightGrams:
              result.weightGrams +
              quantity *
                item.product.unitWeightGrams,

            loadPoints:
              result.loadPoints +
              quantity *
                item.product.unitLoadPoints,
          };
        },
        {
          expectedValuePaise: 0,
          weightGrams: 0,
          loadPoints: 0,
        },
      );

      return {
        signalId: signal.id,
        shopId: signal.shop.id,
        shopName: signal.shop.name,
        ownerName: signal.shop.ownerName,
        locality: signal.shop.locality,
        preferredWindow:
          signal.shop.preferredWindow,
        expectedValuePaise:
          totals.expectedValuePaise,
        weightGrams: totals.weightGrams,
        loadPoints: totals.loadPoints,
        productLines: signal.items.length,
      };
    });

  const confirmedDemand = shopLoads.reduce(
    (total, shop) => ({
      shops: total.shops + 1,
      expectedValuePaise:
        total.expectedValuePaise +
        shop.expectedValuePaise,
      weightGrams:
        total.weightGrams + shop.weightGrams,
      loadPoints:
        total.loadPoints + shop.loadPoints,
    }),
    {
      shops: 0,
      expectedValuePaise: 0,
      weightGrams: 0,
      loadPoints: 0,
    },
  );

  const singleVehicleFits = vehicles.some(
    (vehicle) =>
      confirmedDemand.weightGrams <=
        vehicle.maxWeightGrams &&
      confirmedDemand.loadPoints <=
        vehicle.maxLoadPoints,
  );

  const unassignableShops = shopLoads.filter(
    (shop) =>
      !vehicles.some(
        (vehicle) =>
          shop.weightGrams <=
            vehicle.maxWeightGrams &&
          shop.loadPoints <=
            vehicle.maxLoadPoints,
      ),
  );

  let selectedOption: {
    vehicles: VehicleCandidate[];
    assignment: AssignmentResult;
  } | null = null;

  if (
    shopLoads.length > 0 &&
    vehicles.length > 0 &&
    unassignableShops.length === 0
  ) {
    const maximumVehicleCount = Math.min(
      vehicles.length,
      shopLoads.length,
    );

    for (
      let vehicleCount = 1;
      vehicleCount <= maximumVehicleCount;
      vehicleCount += 1
    ) {
      const feasibleOptions: Array<{
        vehicles: VehicleCandidate[];
        assignment: AssignmentResult;
      }> = [];

      for (
        const vehicleSet of combinations(
          vehicles,
          vehicleCount,
        )
      ) {
        const totalWeightCapacity =
          vehicleSet.reduce(
            (total, vehicle) =>
              total + vehicle.maxWeightGrams,
            0,
          );

        const totalPointCapacity =
          vehicleSet.reduce(
            (total, vehicle) =>
              total + vehicle.maxLoadPoints,
            0,
          );

        if (
          confirmedDemand.weightGrams >
            totalWeightCapacity ||
          confirmedDemand.loadPoints >
            totalPointCapacity
        ) {
          continue;
        }

        const assignment = findBestAssignment(
          vehicleSet,
          shopLoads,
        );

        if (assignment) {
          feasibleOptions.push({
            vehicles: vehicleSet,
            assignment,
          });
        }
      }

      if (feasibleOptions.length > 0) {
        feasibleOptions.sort(compareFleetOptions);
        selectedOption = feasibleOptions[0];
        break;
      }
    }
  }

  const recommendedRuns =
    selectedOption?.assignment.runs
      .map((run) => ({
        runNumber: 0,
        vehicleId: run.vehicle.id,
        vehicleCode: run.vehicle.code,
        vehicleName: run.vehicle.name,
        maxWeightGrams:
          run.vehicle.maxWeightGrams,
        maxLoadPoints:
          run.vehicle.maxLoadPoints,
        plannedWeightGrams:
          run.weightGrams,
        plannedLoadPoints:
          run.loadPoints,
        expectedValuePaise:
          run.expectedValuePaise,
        weightUtilization: percentage(
          run.weightGrams,
          run.vehicle.maxWeightGrams,
        ),
        spaceUtilization: percentage(
          run.loadPoints,
          run.vehicle.maxLoadPoints,
        ),
        shops: [...run.shops].sort(
          (first, second) =>
            (
              first.preferredWindow ?? ""
            ).localeCompare(
              second.preferredWindow ?? "",
            ) ||
            first.shopName.localeCompare(
              second.shopName,
            ),
        ),
      }))
      .sort((first, second) =>
        first.vehicleCode.localeCompare(
          second.vehicleCode,
        ),
      )
      .map((run, index) => ({
        ...run,
        runNumber: index + 1,
      })) ?? [];

  return {
    dispatch: {
      id: dispatch.id,
      routeId: dispatch.routeId,
      routeCode: dispatch.route.code,
      routeName: dispatch.route.name,
      targetDate: dispatch.targetDate,
      currentStatus: dispatch.status,
      currentManifestWeightGrams:
        dispatch.plannedWeightGrams,
      currentManifestLoadPoints:
        dispatch.plannedLoadPoints,
    },

    confirmedDemand,
    activeVehicles: vehicles,
    singleVehicleFits,
    unassignableShops,
    recommendedRuns,
    reserveExcluded: true,
  };
}