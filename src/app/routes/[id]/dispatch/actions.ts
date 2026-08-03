"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { buildCurrentDispatchPlan } from "@/lib/dispatches";

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

function goToWorkspace(
  routeId: string,
  type: "success" | "error",
  message: string,
): never {
  redirect(
    `/routes/${routeId}/dispatch?${type}=${encodeURIComponent(
      message,
    )}`,
  );
}

export async function createOrRefreshDispatch(
  formData: FormData,
): Promise<void> {
  const routeId = requiredText(formData, "routeId");
  const plan = await buildCurrentDispatchPlan(routeId);

  if (!plan || plan.items.length === 0) {
    goToWorkspace(
      routeId,
      "error",
      "No confirmed demand is available for this route.",
    );
  }

  const existing = await prisma.dispatch.findUnique({
    where: {
      routeId_targetDate: {
        routeId,
        targetDate: plan.targetDate,
      },
    },
  });

  if (
    existing &&
    ["FINALIZED", "DISPATCHED", "COMPLETED"].includes(
      existing.status,
    )
  ) {
    goToWorkspace(
      routeId,
      "error",
      "A finalized or completed dispatch cannot be regenerated.",
    );
  }

  const activeVehicles = await prisma.vehicle.findMany({
    where: {
      distributorId: plan.distributorId,
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
  });

  const recommendedVehicle = activeVehicles.find(
    (vehicle) =>
      plan.plannedWeightGrams <= vehicle.maxWeightGrams &&
      plan.plannedLoadPoints <= vehicle.maxLoadPoints,
  );

  await prisma.$transaction(async (transaction) => {
    const dispatch = existing
      ? await transaction.dispatch.update({
          where: {
            id: existing.id,
          },
          data: {
            confirmedValuePaise: plan.confirmedValuePaise,
            plannedWeightGrams: plan.plannedWeightGrams,
            plannedLoadPoints: plan.plannedLoadPoints,
            vehicleId:
              existing.vehicleId ??
              recommendedVehicle?.id ??
              null,
          },
        })
      : await transaction.dispatch.create({
          data: {
            distributorId: plan.distributorId,
            routeId,
            targetDate: plan.targetDate,
            status: "DRAFT",
            confirmedValuePaise: plan.confirmedValuePaise,
            plannedWeightGrams: plan.plannedWeightGrams,
            plannedLoadPoints: plan.plannedLoadPoints,
            vehicleId: recommendedVehicle?.id ?? null,
          },
        });

    await transaction.dispatchItem.deleteMany({
      where: {
        dispatchId: dispatch.id,
      },
    });

    await transaction.dispatchItem.createMany({
      data: plan.items.map((item) => ({
        dispatchId: dispatch.id,
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
  });

  revalidatePath(`/routes/${routeId}/dispatch`);
  revalidatePath(`/routes/${routeId}`);

  goToWorkspace(
    routeId,
    "success",
    existing
      ? "Dispatch manifest refreshed from current confirmed demand."
      : "Draft dispatch created successfully.",
  );
}

export async function updateDispatchAssignment(
  formData: FormData,
): Promise<void> {
  const routeId = requiredText(formData, "routeId");
  const dispatchId = requiredText(formData, "dispatchId");

  const vehicleId = optionalText(formData, "vehicleId");
  const driverId = optionalText(formData, "driverId");
  const salesmanId = optionalText(formData, "salesmanId");
  const notes = optionalText(formData, "notes")?.slice(0, 500) ?? null;

  const dispatch = await prisma.dispatch.findUnique({
    where: {
      id: dispatchId,
    },
  });

  if (!dispatch || dispatch.routeId !== routeId) {
    goToWorkspace(
      routeId,
      "error",
      "The selected dispatch could not be found.",
    );
  }

  if (
    ["FINALIZED", "DISPATCHED", "COMPLETED"].includes(
      dispatch.status,
    )
  ) {
    goToWorkspace(
      routeId,
      "error",
      "Assignments cannot be changed after finalization.",
    );
  }

  if (vehicleId) {
    const vehicle = await prisma.vehicle.findFirst({
      where: {
        id: vehicleId,
        distributorId: dispatch.distributorId,
        status: "ACTIVE",
      },
    });

    if (!vehicle) {
      goToWorkspace(
        routeId,
        "error",
        "The selected vehicle is unavailable.",
      );
    }
  }

  if (driverId) {
    const driver = await prisma.staff.findFirst({
      where: {
        id: driverId,
        distributorId: dispatch.distributorId,
        role: "DRIVER",
        isActive: true,
      },
    });

    if (!driver) {
      goToWorkspace(
        routeId,
        "error",
        "The selected driver is unavailable.",
      );
    }
  }

  if (salesmanId) {
    const salesman = await prisma.staff.findFirst({
      where: {
        id: salesmanId,
        distributorId: dispatch.distributorId,
        role: "SALESMAN",
        isActive: true,
      },
    });

    if (!salesman) {
      goToWorkspace(
        routeId,
        "error",
        "The selected salesperson is unavailable.",
      );
    }
  }

  await prisma.dispatch.update({
    where: {
      id: dispatchId,
    },
    data: {
      vehicleId,
      driverId,
      salesmanId,
      notes,
    },
  });

  revalidatePath(`/routes/${routeId}/dispatch`);

  goToWorkspace(
    routeId,
    "success",
    "Vehicle and staff assignments were saved.",
  );
}

export async function startDispatchLoading(
  formData: FormData,
): Promise<void> {
  const routeId = requiredText(formData, "routeId");
  const dispatchId = requiredText(formData, "dispatchId");

  const dispatch = await prisma.dispatch.findUnique({
    where: {
      id: dispatchId,
    },
    include: {
      _count: {
        select: {
          items: true,
        },
      },
    },
  });

  if (!dispatch || dispatch.routeId !== routeId) {
    goToWorkspace(
      routeId,
      "error",
      "The dispatch could not be found.",
    );
  }

  if (dispatch.status !== "DRAFT") {
    goToWorkspace(
      routeId,
      "error",
      "Only a draft dispatch can begin loading.",
    );
  }

  if (dispatch._count.items === 0) {
    goToWorkspace(
      routeId,
      "error",
      "The dispatch manifest contains no products.",
    );
  }

  await prisma.dispatch.update({
    where: {
      id: dispatchId,
    },
    data: {
      status: "LOADING",
    },
  });

  revalidatePath(`/routes/${routeId}/dispatch`);

  goToWorkspace(
    routeId,
    "success",
    "Warehouse loading has started.",
  );
}

export async function finalizeDispatch(
  formData: FormData,
): Promise<void> {
  const routeId = requiredText(formData, "routeId");
  const dispatchId = requiredText(formData, "dispatchId");

  const dispatch = await prisma.dispatch.findUnique({
    where: {
      id: dispatchId,
    },
    include: {
      vehicle: true,
      driver: true,
      salesman: true,
      items: true,
    },
  });

  if (!dispatch || dispatch.routeId !== routeId) {
    goToWorkspace(
      routeId,
      "error",
      "The dispatch could not be found.",
    );
  }

  if (!["DRAFT", "LOADING"].includes(dispatch.status)) {
    goToWorkspace(
      routeId,
      "error",
      "This dispatch cannot be finalized in its current state.",
    );
  }

  if (!dispatch.vehicle) {
    goToWorkspace(
      routeId,
      "error",
      "Assign a vehicle before finalizing.",
    );
  }

  if (!dispatch.driver) {
    goToWorkspace(
      routeId,
      "error",
      "Assign a driver before finalizing.",
    );
  }

  if (!dispatch.salesman) {
    goToWorkspace(
      routeId,
      "error",
      "Assign a salesperson before finalizing.",
    );
  }

  const plannedWeightGrams = dispatch.items.reduce(
    (total, item) => total + item.plannedWeightGrams,
    0,
  );

  const plannedLoadPoints = dispatch.items.reduce(
    (total, item) => total + item.plannedLoadPoints,
    0,
  );

  if (plannedWeightGrams > dispatch.vehicle.maxWeightGrams) {
    goToWorkspace(
      routeId,
      "error",
      "The planned load exceeds the vehicle weight limit.",
    );
  }

  if (plannedLoadPoints > dispatch.vehicle.maxLoadPoints) {
    goToWorkspace(
      routeId,
      "error",
      "The planned load exceeds the vehicle space limit.",
    );
  }

  await prisma.dispatch.update({
    where: {
      id: dispatchId,
    },
    data: {
      status: "FINALIZED",
      plannedWeightGrams,
      plannedLoadPoints,
      finalizedAt: new Date(),
    },
  });

  revalidatePath(`/routes/${routeId}/dispatch`);
  revalidatePath(`/routes/${routeId}`);

  goToWorkspace(
    routeId,
    "success",
    "Dispatch finalized. The manifest is ready for departure.",
  );
}
export async function optimizeDispatchForVehicle(
  formData: FormData,
): Promise<void> {
  const routeId = requiredText(formData, "routeId");
  const dispatchId = requiredText(formData, "dispatchId");
  const vehicleId = requiredText(formData, "vehicleId");

  const dispatch = await prisma.dispatch.findUnique({
    where: {
      id: dispatchId,
    },
    include: {
      items: true,
    },
  });

  if (!dispatch || dispatch.routeId !== routeId) {
    goToWorkspace(
      routeId,
      "error",
      "The selected dispatch could not be found.",
    );
  }

  if (!["DRAFT", "LOADING"].includes(dispatch.status)) {
    goToWorkspace(
      routeId,
      "error",
      "Reserve stock cannot be changed after finalization.",
    );
  }

  const vehicle = await prisma.vehicle.findFirst({
    where: {
      id: vehicleId,
      distributorId: dispatch.distributorId,
      status: "ACTIVE",
    },
  });

  if (!vehicle) {
    goToWorkspace(
      routeId,
      "error",
      "The selected vehicle is unavailable.",
    );
  }

  const confirmedWeightGrams = dispatch.items.reduce(
    (total, item) =>
      total +
      item.confirmedQuantity * item.unitWeightGrams,
    0,
  );

  const confirmedLoadPoints = dispatch.items.reduce(
    (total, item) =>
      total +
      item.confirmedQuantity * item.unitLoadPoints,
    0,
  );

  if (
    confirmedWeightGrams > vehicle.maxWeightGrams ||
    confirmedLoadPoints > vehicle.maxLoadPoints
  ) {
    goToWorkspace(
      routeId,
      "error",
      "Confirmed retailer demand alone exceeds this vehicle. Use a larger vehicle or split the dispatch.",
    );
  }

  const optimizedItems = dispatch.items.map((item) => ({
    id: item.id,
    confirmedQuantity: item.confirmedQuantity,
    reserveQuantity: item.reserveQuantity,
    plannedQuantity: item.plannedQuantity,
    unitWeightGrams: item.unitWeightGrams,
    unitLoadPoints: item.unitLoadPoints,
    plannedWeightGrams: item.plannedWeightGrams,
    plannedLoadPoints: item.plannedLoadPoints,
  }));

  let plannedWeightGrams = optimizedItems.reduce(
    (total, item) => total + item.plannedWeightGrams,
    0,
  );

  let plannedLoadPoints = optimizedItems.reduce(
    (total, item) => total + item.plannedLoadPoints,
    0,
  );

  let removedReserveUnits = 0;

  while (
    plannedWeightGrams > vehicle.maxWeightGrams ||
    plannedLoadPoints > vehicle.maxLoadPoints
  ) {
    const candidates = optimizedItems
      .filter((item) => item.reserveQuantity > 0)
      .sort((first, second) => {
        if (plannedLoadPoints > vehicle.maxLoadPoints) {
          return (
            second.unitLoadPoints - first.unitLoadPoints ||
            second.unitWeightGrams - first.unitWeightGrams
          );
        }

        return (
          second.unitWeightGrams - first.unitWeightGrams ||
          second.unitLoadPoints - first.unitLoadPoints
        );
      });

    const selected = candidates[0];

    if (!selected) {
      goToWorkspace(
        routeId,
        "error",
        "The vehicle cannot be made safe by reducing reserve stock.",
      );
    }

    selected.reserveQuantity -= 1;
    selected.plannedQuantity -= 1;
    selected.plannedWeightGrams -= selected.unitWeightGrams;
    selected.plannedLoadPoints -= selected.unitLoadPoints;

    plannedWeightGrams -= selected.unitWeightGrams;
    plannedLoadPoints -= selected.unitLoadPoints;
    removedReserveUnits += 1;
  }

  await prisma.$transaction([
    ...optimizedItems.map((item) =>
      prisma.dispatchItem.update({
        where: {
          id: item.id,
        },
        data: {
          reserveQuantity: item.reserveQuantity,
          plannedQuantity: item.plannedQuantity,
          plannedWeightGrams: item.plannedWeightGrams,
          plannedLoadPoints: item.plannedLoadPoints,
        },
      }),
    ),

    prisma.dispatch.update({
      where: {
        id: dispatch.id,
      },
      data: {
        vehicleId: vehicle.id,
        plannedWeightGrams,
        plannedLoadPoints,
      },
    }),
  ]);

  revalidatePath(`/routes/${routeId}/dispatch`);

  goToWorkspace(
    routeId,
    "success",
    removedReserveUnits === 0
      ? `${vehicle.code} already fits the current dispatch.`
      : `${removedReserveUnits} optional reserve unit${
          removedReserveUnits === 1 ? "" : "s"
        } removed. The dispatch now safely fits ${vehicle.code}.`,
  );
}
export async function markVehicleDeparted(
  formData: FormData,
): Promise<void> {
  const routeId = requiredText(formData, "routeId");
  const dispatchId = requiredText(formData, "dispatchId");

  const dispatch = await prisma.dispatch.findUnique({
    where: {
      id: dispatchId,
    },
    include: {
      vehicle: true,
      driver: true,
      salesman: true,
      items: true,
    },
  });

  if (!dispatch || dispatch.routeId !== routeId) {
    goToWorkspace(
      routeId,
      "error",
      "The selected dispatch could not be found.",
    );
  }

  if (dispatch.status !== "FINALIZED") {
    goToWorkspace(
      routeId,
      "error",
      "Only a finalized dispatch can leave the warehouse.",
    );
  }

  if (!dispatch.vehicle || !dispatch.driver || !dispatch.salesman) {
    goToWorkspace(
      routeId,
      "error",
      "Vehicle, driver and salesperson assignments are required.",
    );
  }

  if (dispatch.items.length === 0) {
    goToWorkspace(
      routeId,
      "error",
      "The dispatch manifest contains no products.",
    );
  }

  const actualWeightGrams = dispatch.items.reduce(
    (total, item) => total + item.plannedWeightGrams,
    0,
  );

  const actualLoadPoints = dispatch.items.reduce(
    (total, item) => total + item.plannedLoadPoints,
    0,
  );

  if (actualWeightGrams > dispatch.vehicle.maxWeightGrams) {
    goToWorkspace(
      routeId,
      "error",
      "Departure blocked because the vehicle is overweight.",
    );
  }

  if (actualLoadPoints > dispatch.vehicle.maxLoadPoints) {
    goToWorkspace(
      routeId,
      "error",
      "Departure blocked because the vehicle exceeds its space limit.",
    );
  }

  await prisma.dispatch.update({
    where: {
      id: dispatch.id,
    },
    data: {
      status: "DISPATCHED",
      dispatchedAt: new Date(),
      plannedWeightGrams: actualWeightGrams,
      plannedLoadPoints: actualLoadPoints,
    },
  });

  revalidatePath(`/routes/${routeId}/dispatch`);
  revalidatePath(`/driver/dispatch/${dispatch.id}`);

  goToWorkspace(
    routeId,
    "success",
    "Vehicle departure recorded. The driver route is now active.",
  );
}