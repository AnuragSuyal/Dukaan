import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type RouteContext = {
  params: Promise<{
    token: string;
  }>;
};

type ConfirmationPayload = {
  action?: unknown;
  note?: unknown;
  items?: unknown;
};

type SubmittedItem = {
  itemId: string;
  quantity: number;
};

function isSubmittedItem(value: unknown): value is SubmittedItem {
  if (
    typeof value !== "object" ||
    value === null ||
    !("itemId" in value) ||
    !("quantity" in value)
  ) {
    return false;
  }

  const candidate = value as {
    itemId: unknown;
    quantity: unknown;
  };

  return (
    typeof candidate.itemId === "string" &&
    Number.isInteger(candidate.quantity) &&
    typeof candidate.quantity === "number" &&
    candidate.quantity >= 0 &&
    candidate.quantity <= 999
  );
}

export async function POST(
  request: Request,
  context: RouteContext,
) {
  try {
    const { token } = await context.params;
    const payload = (await request.json()) as ConfirmationPayload;

    if (
      payload.action !== "confirm" &&
      payload.action !== "reject"
    ) {
      return NextResponse.json(
        { error: "Invalid confirmation action." },
        { status: 400 },
      );
    }

    const signal = await prisma.demandSignal.findUnique({
      where: {
        confirmationToken: token,
      },
      include: {
        items: true,
      },
    });

    if (!signal) {
      return NextResponse.json(
        { error: "This order request could not be found." },
        { status: 404 },
      );
    }

    if (
      signal.expiresAt &&
      signal.expiresAt.getTime() < Date.now()
    ) {
      await prisma.demandSignal.update({
        where: {
          id: signal.id,
        },
        data: {
          status: "EXPIRED",
        },
      });

      return NextResponse.json(
        { error: "This confirmation link has expired." },
        { status: 410 },
      );
    }

    const note =
      typeof payload.note === "string"
        ? payload.note.trim().slice(0, 500)
        : null;

    if (payload.action === "reject") {
      await prisma.$transaction([
        prisma.demandSignalItem.updateMany({
          where: {
            demandSignalId: signal.id,
          },
          data: {
            confirmedQuantity: 0,
          },
        }),

        prisma.demandSignal.update({
          where: {
            id: signal.id,
          },
          data: {
            status: "REJECTED",
            merchantNote: note,
            confirmedAt: new Date(),
          },
        }),
      ]);

      return NextResponse.json({
        message:
          "The supplier has been informed that this order is not required.",
      });
    }

    if (
      !Array.isArray(payload.items) ||
      !payload.items.every(isSubmittedItem)
    ) {
      return NextResponse.json(
        { error: "The submitted product quantities are invalid." },
        { status: 400 },
      );
    }

    const submittedItems = payload.items as SubmittedItem[];
    const validItemIds = new Set(
      signal.items.map((item) => item.id),
    );

    if (
      submittedItems.length !== signal.items.length ||
      submittedItems.some(
        (item) => !validItemIds.has(item.itemId),
      )
    ) {
      return NextResponse.json(
        { error: "The submitted order does not match this request." },
        { status: 400 },
      );
    }

    const quantitiesByItem = new Map(
      submittedItems.map((item) => [
        item.itemId,
        item.quantity,
      ]),
    );

    const wasModified = signal.items.some(
      (item) =>
        quantitiesByItem.get(item.id) !==
        item.suggestedQuantity,
    );

    await prisma.$transaction([
      ...signal.items.map((item) =>
        prisma.demandSignalItem.update({
          where: {
            id: item.id,
          },
          data: {
            confirmedQuantity:
              quantitiesByItem.get(item.id) ?? 0,
          },
        }),
      ),

      prisma.demandSignal.update({
        where: {
          id: signal.id,
        },
        data: {
          status: wasModified ? "MODIFIED" : "CONFIRMED",
          merchantNote: note,
          confirmedAt: new Date(),
        },
      }),
    ]);

    return NextResponse.json({
      message: wasModified
        ? "Your modified quantities have been shared with the supplier."
        : "Your suggested order has been confirmed.",
    });
  } catch (error) {
    console.error("Retailer confirmation failed:", error);

    return NextResponse.json(
      { error: "The response could not be saved right now." },
      { status: 500 },
    );
  }
}