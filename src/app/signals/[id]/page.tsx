import Link from "next/link";
import { notFound } from "next/navigation";
import CopyConfirmationLink from "@/components/signals/CopyConfirmationLink";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type SignalDetailPageProps = {
  params: Promise<{
    id: string;
  }>;
};

const statusLabels: Record<string, string> = {
  DRAFT: "Draft",
  SENT: "Awaiting response",
  CONFIRMED: "Confirmed",
  MODIFIED: "Confirmed with changes",
  REJECTED: "Not required",
  EXPIRED: "Expired",
  NO_RESPONSE: "No response",
};

const statusStyles: Record<string, string> = {
  DRAFT: "bg-violet-50 text-violet-700 ring-violet-600/20",
  SENT: "bg-amber-50 text-amber-700 ring-amber-600/20",
  CONFIRMED:
    "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  MODIFIED: "bg-blue-50 text-blue-700 ring-blue-600/20",
  REJECTED: "bg-red-50 text-red-700 ring-red-600/20",
  EXPIRED: "bg-slate-100 text-slate-600 ring-slate-500/20",
  NO_RESPONSE:
    "bg-orange-50 text-orange-700 ring-orange-600/20",
};

function formatMoney(paise: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(paise / 100);
}

function formatDate(date: Date | null): string {
  if (!date) {
    return "Not available";
  }

  return new Intl.DateTimeFormat("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

function formatDateTime(date: Date | null): string {
  if (!date) {
    return "Not recorded";
  }

  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`inline-flex rounded-full px-3 py-1.5 text-xs font-bold ring-1 ring-inset ${
        statusStyles[status] ??
        "bg-slate-100 text-slate-600 ring-slate-500/20"
      }`}
    >
      {statusLabels[status] ?? status}
    </span>
  );
}

export default async function SignalDetailPage({
  params,
}: SignalDetailPageProps) {
  const { id } = await params;

  const signal = await prisma.demandSignal.findUnique({
    where: {
      id,
    },
    include: {
      distributor: true,
      shop: {
        include: {
          route: true,
        },
      },
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

  const confirmedTotalPaise = signal.items.reduce(
    (total, item) =>
      total +
      item.unitPricePaise *
        (item.confirmedQuantity ?? item.suggestedQuantity),
    0,
  );

  const modifiedItems = signal.items.filter(
    (item) =>
      item.confirmedQuantity !== null &&
      item.confirmedQuantity !== item.suggestedQuantity,
  );

  const totalSuggestedUnits = signal.items.reduce(
    (total, item) => total + item.suggestedQuantity,
    0,
  );

  const totalConfirmedUnits = signal.items.reduce(
    (total, item) =>
      total +
      (item.confirmedQuantity ?? item.suggestedQuantity),
    0,
  );

  const creditAvailablePaise = Math.max(
    0,
    signal.shop.creditLimitPaise - signal.shop.outstandingPaise,
  );

  const timeline = [
    {
      label: "Signal generated",
      value: formatDateTime(signal.createdAt),
      completed: true,
    },
    {
      label: "Sent to retailer",
      value: formatDateTime(signal.sentAt),
      completed: signal.sentAt !== null,
    },
    {
      label: "Retailer responded",
      value: formatDateTime(signal.confirmedAt),
      completed: signal.confirmedAt !== null,
    },
    {
      label: "Link expiry",
      value: formatDateTime(signal.expiresAt),
      completed: false,
    },
  ];

  return (
    <main className="min-h-screen bg-[#f5f7fb] text-slate-950">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-[1450px] items-center justify-between gap-4 px-5 py-5 sm:px-8">
          <div className="flex items-center gap-4">
            <Link
              href="/signals"
              className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-950 text-lg font-black text-emerald-400"
            >
              ←
            </Link>

            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-700">
                Demand signal
              </p>

              <h1 className="mt-1 text-xl font-black tracking-tight sm:text-2xl">
                {signal.shop.name}
              </h1>
            </div>
          </div>

          <StatusBadge status={signal.status} />
        </div>
      </header>

      <div className="mx-auto max-w-[1450px] px-5 py-7 sm:px-8">
        <section className="overflow-hidden rounded-3xl bg-slate-950 text-white shadow-xl">
          <div className="grid gap-8 p-6 sm:p-8 lg:grid-cols-[1.3fr_0.7fr]">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-300">
                Retailer replenishment record
              </p>

              <h2 className="mt-4 text-3xl font-black tracking-tight sm:text-4xl">
                {signal.shop.name}
              </h2>

              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">
                {signal.shop.ownerName ?? "Retailer"} ·{" "}
                {signal.shop.locality ?? "Locality not specified"} ·{" "}
                {signal.shop.phone}
              </p>

              <div className="mt-7 flex flex-wrap gap-3">
                <Link
                  href={`/confirm/${signal.confirmationToken}`}
                  target="_blank"
                  className="rounded-xl bg-emerald-400 px-4 py-3 text-sm font-black text-slate-950 hover:bg-emerald-300"
                >
                  Open retailer page
                </Link>

                <CopyConfirmationLink
                  token={signal.confirmationToken}
                />

                <Link
                  href="/signals"
                  className="rounded-xl border border-slate-700 px-4 py-3 text-sm font-bold text-white hover:bg-slate-800"
                >
                  Back to signals
                </Link>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Delivery plan
              </p>

              <div className="mt-5 space-y-4">
                <div>
                  <p className="text-xs text-slate-400">Target date</p>
                  <p className="mt-1 font-black">
                    {formatDate(signal.targetDate)}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-slate-400">
                    Preferred window
                  </p>
                  <p className="mt-1 font-black">
                    {signal.shop.preferredWindow ??
                      "No preference recorded"}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-slate-400">Route</p>
                  <p className="mt-1 font-black">
                    {signal.shop.route?.code ?? "Unassigned"} ·{" "}
                    {signal.shop.route?.name ?? "No route"}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          {[
            {
              label: "Suggested value",
              value: formatMoney(signal.totalSuggestedPaise),
              note: `${totalSuggestedUnits} total units`,
            },
            {
              label: "Confirmed value",
              value: formatMoney(confirmedTotalPaise),
              note: `${totalConfirmedUnits} total units`,
            },
            {
              label: "Average confidence",
              value: `${signal.averageConfidence}%`,
              note: `${signal.items.length} products`,
            },
            {
              label: "Outstanding credit",
              value: formatMoney(signal.shop.outstandingPaise),
              note: `Limit ${formatMoney(
                signal.shop.creditLimitPaise,
              )}`,
            },
            {
              label: "Credit available",
              value: formatMoney(creditAvailablePaise),
              note:
                creditAvailablePaise >= confirmedTotalPaise
                  ? "Order within credit limit"
                  : "Credit review required",
            },
          ].map((metric) => (
            <article
              key={metric.label}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <p className="text-sm font-medium text-slate-500">
                {metric.label}
              </p>

              <p className="mt-2 text-2xl font-black tracking-tight">
                {metric.value}
              </p>

              <p className="mt-2 text-xs text-slate-400">
                {metric.note}
              </p>
            </article>
          ))}
        </section>

        <section className="mt-6 grid gap-6 xl:grid-cols-[1.35fr_0.65fr]">
          <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-5 py-5 sm:px-6">
              <h2 className="font-black">Product quantities</h2>

              <p className="mt-1 text-sm text-slate-500">
                Compare the system suggestion with the retailer response.
              </p>
            </div>

            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[850px] text-left">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50 text-xs uppercase tracking-wide text-slate-400">
                    <th className="px-6 py-4 font-bold">Product</th>
                    <th className="px-4 py-4 font-bold">Suggested</th>
                    <th className="px-4 py-4 font-bold">Confirmed</th>
                    <th className="px-4 py-4 font-bold">Change</th>
                    <th className="px-4 py-4 font-bold">Confidence</th>
                    <th className="px-6 py-4 text-right font-bold">
                      Confirmed value
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {signal.items.map((item) => {
                    const confirmedQuantity =
                      item.confirmedQuantity ??
                      item.suggestedQuantity;

                    const difference =
                      confirmedQuantity - item.suggestedQuantity;

                    return (
                      <tr
                        key={item.id}
                        className="border-b border-slate-100 last:border-0"
                      >
                        <td className="px-6 py-5">
                          <p className="text-sm font-black">
                            {item.product.name}
                          </p>

                          <p className="mt-1 text-xs text-slate-400">
                            {[item.product.brand, item.product.packSize]
                              .filter(Boolean)
                              .join(" · ")}
                          </p>

                          <p className="mt-2 max-w-md text-xs leading-5 text-slate-500">
                            {item.reason}
                          </p>
                        </td>

                        <td className="px-4 py-5 text-sm font-bold">
                          {item.suggestedQuantity} {item.product.unit}
                        </td>

                        <td className="px-4 py-5 text-sm font-black">
                          {confirmedQuantity} {item.product.unit}
                        </td>

                        <td className="px-4 py-5">
                          <span
                            className={`rounded-full px-2.5 py-1 text-xs font-bold ${
                              difference > 0
                                ? "bg-emerald-50 text-emerald-700"
                                : difference < 0
                                  ? "bg-red-50 text-red-700"
                                  : "bg-slate-100 text-slate-600"
                            }`}
                          >
                            {difference > 0
                              ? `+${difference}`
                              : difference}
                          </span>
                        </td>

                        <td className="px-4 py-5">
                          <p className="text-sm font-black">
                            {item.confidence}%
                          </p>

                          <div className="mt-2 h-1.5 w-24 overflow-hidden rounded-full bg-slate-100">
                            <div
                              className="h-full rounded-full bg-emerald-500"
                              style={{
                                width: `${item.confidence}%`,
                              }}
                            />
                          </div>
                        </td>

                        <td className="px-6 py-5 text-right text-sm font-black">
                          {formatMoney(
                            item.unitPricePaise * confirmedQuantity,
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="space-y-3 p-4 md:hidden">
              {signal.items.map((item) => {
                const confirmedQuantity =
                  item.confirmedQuantity ?? item.suggestedQuantity;

                const difference =
                  confirmedQuantity - item.suggestedQuantity;

                return (
                  <article
                    key={item.id}
                    className="rounded-2xl border border-slate-200 p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="font-black">
                          {item.product.name}
                        </h3>

                        <p className="mt-1 text-xs text-slate-400">
                          {item.product.packSize ?? item.product.unit}
                        </p>
                      </div>

                      <span className="rounded-lg bg-emerald-50 px-2 py-1 text-xs font-bold text-emerald-700">
                        {item.confidence}%
                      </span>
                    </div>

                    <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                      <div className="rounded-xl bg-slate-50 p-3">
                        <p className="text-xs text-slate-400">
                          Suggested
                        </p>
                        <p className="mt-1 font-black">
                          {item.suggestedQuantity}
                        </p>
                      </div>

                      <div className="rounded-xl bg-slate-50 p-3">
                        <p className="text-xs text-slate-400">
                          Confirmed
                        </p>
                        <p className="mt-1 font-black">
                          {confirmedQuantity}
                        </p>
                      </div>

                      <div className="rounded-xl bg-slate-50 p-3">
                        <p className="text-xs text-slate-400">Change</p>
                        <p className="mt-1 font-black">
                          {difference > 0
                            ? `+${difference}`
                            : difference}
                        </p>
                      </div>
                    </div>

                    <p className="mt-4 text-xs leading-5 text-slate-500">
                      {item.reason}
                    </p>

                    <p className="mt-3 text-right font-black">
                      {formatMoney(
                        item.unitPricePaise * confirmedQuantity,
                      )}
                    </p>
                  </article>
                );
              })}
            </div>
          </article>

          <div className="space-y-6">
            <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              <h2 className="font-black">Retailer response</h2>

              <div className="mt-5 rounded-2xl bg-slate-50 p-4">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Changes made
                </p>

                <p className="mt-2 text-2xl font-black">
                  {modifiedItems.length}
                </p>

                <p className="mt-1 text-sm text-slate-500">
                  {modifiedItems.length === 0
                    ? "All suggested quantities were accepted."
                    : "Product quantities were modified."}
                </p>
              </div>

              <div className="mt-4 rounded-2xl border border-blue-100 bg-blue-50 p-4">
                <p className="text-xs font-bold uppercase tracking-wider text-blue-700">
                  Retailer note
                </p>

                <p className="mt-2 text-sm leading-6 text-blue-900">
                  {signal.merchantNote ||
                    "No delivery instructions were provided."}
                </p>
              </div>
            </article>

            <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              <h2 className="font-black">Signal timeline</h2>

              <div className="mt-6 space-y-5">
                {timeline.map((event, index) => (
                  <div
                    key={event.label}
                    className="relative flex gap-4"
                  >
                    {index < timeline.length - 1 && (
                      <div className="absolute left-[7px] top-5 h-full w-px bg-slate-200" />
                    )}

                    <div
                      className={`relative mt-1 h-4 w-4 shrink-0 rounded-full border-4 ${
                        event.completed
                          ? "border-emerald-100 bg-emerald-500"
                          : "border-slate-100 bg-slate-300"
                      }`}
                    />

                    <div className="pb-2">
                      <p className="text-sm font-black">
                        {event.label}
                      </p>

                      <p className="mt-1 text-xs text-slate-500">
                        {event.value}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </article>
          </div>
        </section>
      </div>
    </main>
  );
}