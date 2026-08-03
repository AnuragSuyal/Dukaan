"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";

const activeStatuses = ["PENDING", "ARRIVED"] as const;
const terminalStatuses = [
  "DELIVERED",
  "PARTIAL",
  "FAILED",
  "SKIPPED",
] as const;

const paymentMethods = [
  "CASH",
  "UPI",
  "CREDIT",
  "BANK_TRANSFER",
  "MIXED",
] as const;

type PaymentMethodValue = (typeof paymentMethods)[number];

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

function integerField(
  formData: FormData,
  field: string,
): number {
  const raw = formData.get(field);

  if (typeof raw !== "string" || !/^\d+$/.test(raw)) {
    throw new Error(`${field} must be a non-negative integer.`);
  }

  const value = Number(raw);

  if (!Number.isSafeInteger(value) || value < 0 || value > 9999) {
    throw new Error(`${field} is outside the supported range.`);
  }

  return value;
}

function moneyField(
  formData: FormData,
  field: string,
): number {
  const raw = formData.get(field);

  if (
    typeof raw !== "string" ||
    !/^\d+(?:\.\d{1,2})?$/.test(raw.trim())
  ) {
    throw new Error(`${field} must be a valid rupee amount.`);
  }

  const [rupeesPart, paisePart = ""] = raw.trim().split(".");

  return (
    Number(rupeesPart) * 100 +
    Number(paisePart.padEnd(2, "0"))
  );
}

function paymentMethodField(
  formData: FormData,
): PaymentMethodValue | null {
  const value = formData.get("paymentMethod");

  if (typeof value !== "string") {
    return null;
  }

  return paymentMethods.includes(value as PaymentMethodValue)
    ? (value as PaymentMethodValue)
    : null;
}

function goToStop(
  dispatchId: string,
  stopId: string,
  type: "success" | "error",
  message: string,
): never {
  redirect(
    `/driver/dispatch/${dispatchId}/stop/${stopId}?${type}=${encodeURIComponent(
      message,
    )}`,
  );
}

function goToManifest(
  dispatchId: string,
  type: "success" | "error",
  message: string,
): never {
  redirect(
    `/driver/dispatch/${dispatchId}?${type}=${encodeURIComponent(
      message,
    )}`,
  );
}

async function synchronizeDispatchCompletion(
  dispatchId: string,
): Promise<void> {
  const [totalStops, activeStops] = await Promise.all([
    prisma.deliveryStop.count({
      where: {
        dispatchId,
      },
    }),
    prisma.deliveryStop.count({
      where: {
        dispatchId,
        status: {
          in: [...activeStatuses],
        },
      },
    }),
  ]);

  if (totalStops > 0 && activeStops === 0) {
    await prisma.dispatch.updateMany({
      where: {
        id: dispatchId,
        status: "DISPATCHED",
      },
      data: {
        status: "COMPLETED",
        completedAt: new Date(),
      },
    });
  }
}

export async function markStopArrived(
  formData: FormData,
): Promise<void> {
  const dispatchId = requiredText(formData, "dispatchId");
  const stopId = requiredText(formData, "stopId");

  const stop = await prisma.deliveryStop.findUnique({
    where: {
      id: stopId,
    },
  });

  if (!stop || stop.dispatchId !== dispatchId) {
    goToManifest(
      dispatchId,
      "error",
      "The selected delivery stop could not be found.",
    );
  }

  if (stop.status === "ARRIVED") {
    goToStop(
      dispatchId,
      stopId,
      "success",
      "Arrival was already recorded.",
    );
  }

  if (stop.status !== "PENDING") {
    goToStop(
      dispatchId,
      stopId,
      "error",
      "This stop can no longer be marked as arrived.",
    );
  }

  await prisma.deliveryStop.update({
    where: {
      id: stop.id,
    },
    data: {
      status: "ARRIVED",
      arrivedAt: new Date(),
    },
  });

  revalidatePath(`/driver/dispatch/${dispatchId}`);
  revalidatePath(
    `/driver/dispatch/${dispatchId}/stop/${stopId}`,
  );

  goToStop(
    dispatchId,
    stopId,
    "success",
    "Arrival at the shop was recorded.",
  );
}

export async function skipDeliveryStop(
  formData: FormData,
): Promise<void> {
  const dispatchId = requiredText(formData, "dispatchId");
  const stopId = requiredText(formData, "stopId");
  const reason = requiredText(formData, "skipReason").slice(0, 500);

  const stop = await prisma.deliveryStop.findUnique({
    where: {
      id: stopId,
    },
  });

  if (!stop || stop.dispatchId !== dispatchId) {
    goToManifest(
      dispatchId,
      "error",
      "The selected delivery stop could not be found.",
    );
  }

  if (!activeStatuses.includes(stop.status as "PENDING" | "ARRIVED")) {
    goToStop(
      dispatchId,
      stopId,
      "error",
      "This delivery stop is already closed.",
    );
  }

  await prisma.deliveryStop.update({
    where: {
      id: stop.id,
    },
    data: {
      status: "SKIPPED",
      completedAt: new Date(),
      driverNote: reason,
    },
  });

  await synchronizeDispatchCompletion(dispatchId);

  revalidatePath(`/driver/dispatch/${dispatchId}`);

  goToManifest(
    dispatchId,
    "success",
    "The shop was skipped and the reason was recorded.",
  );
}

export async function completeDeliveryStop(
  formData: FormData,
): Promise<void> {
  const dispatchId = requiredText(formData, "dispatchId");
  const stopId = requiredText(formData, "stopId");

  const stop = await prisma.deliveryStop.findUnique({
    where: {
      id: stopId,
    },
    include: {
      shop: true,
      items: true,
    },
  });

  if (!stop || stop.dispatchId !== dispatchId) {
    goToManifest(
      dispatchId,
      "error",
      "The selected delivery stop could not be found.",
    );
  }

  if (!activeStatuses.includes(stop.status as "PENDING" | "ARRIVED")) {
    goToStop(
      dispatchId,
      stopId,
      "error",
      "This delivery stop has already been completed.",
    );
  }

  const submittedCode = requiredText(
    formData,
    "confirmationCode",
  );

  if (submittedCode !== stop.confirmationCode) {
    goToStop(
      dispatchId,
      stopId,
      "error",
      "The shopkeeper confirmation code is incorrect.",
    );
  }

  const submittedItems = stop.items.map((item) => {
    const deliveredQuantity = integerField(
      formData,
      `delivered:${item.id}`,
    );
    const missingQuantity = integerField(
      formData,
      `missing:${item.id}`,
    );
    const damagedQuantity = integerField(
      formData,
      `damaged:${item.id}`,
    );
    const returnedQuantity = integerField(
      formData,
      `returned:${item.id}`,
    );

    if (
      deliveredQuantity +
        missingQuantity +
        damagedQuantity !==
      item.orderedQuantity
    ) {
      goToStop(
        dispatchId,
        stopId,
        "error",
        "Delivered, missing and damaged quantities must equal the ordered quantity.",
      );
    }

    return {
      item,
      deliveredQuantity,
      missingQuantity,
      damagedQuantity,
      returnedQuantity,
    };
  });

  const deliveredValuePaise = submittedItems.reduce(
    (total, submitted) =>
      total +
      submitted.deliveredQuantity *
        submitted.item.unitPricePaise,
    0,
  );

  const currentOrderCollectedPaise = moneyField(
    formData,
    "currentOrderCollectedRupees",
  );

  const outstandingCollectedPaise = moneyField(
    formData,
    "outstandingCollectedRupees",
  );

  const creditExtendedPaise = moneyField(
    formData,
    "creditExtendedRupees",
  );

  const paymentMethod = paymentMethodField(formData);
  const totalCashMovement =
    currentOrderCollectedPaise + outstandingCollectedPaise;

  if (
    deliveredValuePaise > 0 ||
    totalCashMovement > 0 ||
    creditExtendedPaise > 0
  ) {
    if (!paymentMethod) {
      goToStop(
        dispatchId,
        stopId,
        "error",
        "Select a valid payment method.",
      );
    }
  }

  if (
    currentOrderCollectedPaise + creditExtendedPaise !==
    deliveredValuePaise
  ) {
    goToStop(
      dispatchId,
      stopId,
      "error",
      "Current-order collection plus new credit must equal the delivered value.",
    );
  }

  if (
    outstandingCollectedPaise >
    stop.shop.outstandingPaise
  ) {
    goToStop(
      dispatchId,
      stopId,
      "error",
      "The previous outstanding collection exceeds the shop balance.",
    );
  }

  if (
    paymentMethod === "CREDIT" &&
    totalCashMovement > 0
  ) {
    goToStop(
      dispatchId,
      stopId,
      "error",
      "Credit-only payment cannot include a cash or UPI collection.",
    );
  }

  if (
    paymentMethod &&
    ["CASH", "UPI", "BANK_TRANSFER"].includes(
      paymentMethod,
    ) &&
    creditExtendedPaise > 0
  ) {
    goToStop(
      dispatchId,
      stopId,
      "error",
      "Use Mixed payment when part of the order remains on credit.",
    );
  }

  const updatedOutstandingPaise =
    stop.shop.outstandingPaise -
    outstandingCollectedPaise +
    creditExtendedPaise;

  if (updatedOutstandingPaise > stop.shop.creditLimitPaise) {
    goToStop(
      dispatchId,
      stopId,
      "error",
      "This delivery would exceed the retailer credit limit.",
    );
  }

  const allDelivered = submittedItems.every(
    (submitted) =>
      submitted.deliveredQuantity ===
        submitted.item.orderedQuantity &&
      submitted.missingQuantity === 0 &&
      submitted.damagedQuantity === 0,
  );

  const deliveredUnits = submittedItems.reduce(
    (total, submitted) =>
      total + submitted.deliveredQuantity,
    0,
  );

  const finalStatus = allDelivered
    ? "DELIVERED"
    : deliveredUnits > 0
      ? "PARTIAL"
      : "FAILED";

  const damagedItemsCollected = submittedItems.reduce(
    (total, submitted) =>
      total + submitted.damagedQuantity,
    0,
  );

  const returnedCrates = submittedItems.reduce(
    (total, submitted) =>
      total + submitted.returnedQuantity,
    0,
  );

  const shopkeeperName = optionalText(
    formData,
    "shopkeeperName",
  )?.slice(0, 100) ?? null;

  const driverNote = optionalText(
    formData,
    "driverNote",
  )?.slice(0, 500) ?? null;

  await prisma.$transaction([
    ...submittedItems.map((submitted) =>
      prisma.deliveryStopItem.update({
        where: {
          id: submitted.item.id,
        },
        data: {
          deliveredQuantity: submitted.deliveredQuantity,
          missingQuantity: submitted.missingQuantity,
          damagedQuantity: submitted.damagedQuantity,
          returnedQuantity: submitted.returnedQuantity,
        },
      }),
    ),

    prisma.deliveryStop.update({
      where: {
        id: stop.id,
      },
      data: {
        status: finalStatus,
        arrivedAt: stop.arrivedAt ?? new Date(),
        completedAt: new Date(),
        paymentMethod,
        currentOrderCollectedPaise,
        outstandingCollectedPaise,
        creditExtendedPaise,
        returnedCrates,
        damagedItemsCollected,
        shopkeeperName,
        driverNote,
      },
    }),

    prisma.shop.update({
      where: {
        id: stop.shopId,
      },
      data: {
        outstandingPaise: updatedOutstandingPaise,
      },
    }),
  ]);

  await synchronizeDispatchCompletion(dispatchId);

  revalidatePath(`/driver/dispatch/${dispatchId}`);
  revalidatePath(
    `/driver/dispatch/${dispatchId}/stop/${stopId}`,
  );
  revalidatePath("/");
  revalidatePath("/routes");

  goToManifest(
    dispatchId,
    "success",
    finalStatus === "DELIVERED"
      ? "Delivery completed successfully."
      : finalStatus === "PARTIAL"
        ? "Partial delivery recorded with product exceptions."
        : "Failed delivery recorded.",
  );
}