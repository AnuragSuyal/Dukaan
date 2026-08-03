import { notFound } from "next/navigation";
import ConfirmationClient from "@/components/confirmation/ConfirmationClient";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type ConfirmationPageProps = {
  params: Promise<{
    token: string;
  }>;
};

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(date);
}

const statusLabels: Record<string, string> = {
  DRAFT: "Draft suggestion",
  SENT: "Awaiting response",
  CONFIRMED: "Already confirmed",
  MODIFIED: "Confirmed with changes",
  REJECTED: "Not required",
  EXPIRED: "Expired",
  NO_RESPONSE: "Awaiting response",
};

export default async function ConfirmationPage({
  params,
}: ConfirmationPageProps) {
  const { token } = await params;

  const signal = await prisma.demandSignal.findUnique({
    where: {
      confirmationToken: token,
    },
    include: {
      distributor: true,
      shop: true,
      items: {
        include: {
          product: true,
        },
        orderBy: {
          suggestedTotalPaise: "desc",
        },
      },
    },
  });

  if (!signal) {
    notFound();
  }

  return (
    <ConfirmationClient
      token={signal.confirmationToken}
      shopName={signal.shop.name}
      ownerName={signal.shop.ownerName}
      distributorName={signal.distributor.name}
      deliveryDate={formatDate(signal.targetDate)}
      deliveryWindow={
        signal.shop.preferredWindow ?? "During regular route"
      }
      initialStatus={
        statusLabels[signal.status] ?? signal.status
      }
      items={signal.items.map((item) => ({
        id: item.id,
        productName: item.product.name,
        brand: item.product.brand,
        packSize: item.product.packSize,
        unit: item.product.unit,
        suggestedQuantity:
          item.confirmedQuantity ?? item.suggestedQuantity,
        unitPricePaise: item.unitPricePaise,
        confidence: item.confidence,
        reason: item.reason,
      }))}
    />
  );
}