import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type DriverDispatchPageProps = {
  params: Promise<{
    id: string;
  }>;
};

const statusLabels: Record<string, string> = {
  DRAFT: "Draft",
  LOADING: "Warehouse loading",
  FINALIZED: "Ready for departure",
  DISPATCHED: "Route active",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

function formatMoney(paise: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(paise / 100);
}

function formatWeight(grams: number): string {
  return `${(grams / 1000).toLocaleString("en-IN", {
    maximumFractionDigits: 1,
  })} kg`;
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(date);
}

function formatTime(date: Date | null): string {
  if (!date) {
    return "Not started";
  }

  return new Intl.DateTimeFormat("en-IN", {
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

export default async function DriverDispatchPage({
  params,
}: DriverDispatchPageProps) {
  const { id } = await params;

  const dispatch = await prisma.dispatch.findUnique({
    where: {
      id,
    },
    include: {
      route: true,
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
  });

  if (!dispatch) {
    notFound();
  }

  const signals = await prisma.demandSignal.findMany({
    where: {
      routeId: dispatch.routeId,
      targetDate: dispatch.targetDate,
      status: {
        in: ["CONFIRMED", "MODIFIED"],
      },
    },
    include: {
      shop: true,
      items: true,
    },
  });

  signals.sort(
    (first, second) =>
      (first.shop.preferredWindow ?? "").localeCompare(
        second.shop.preferredWindow ?? "",
      ) ||
      first.shop.name.localeCompare(second.shop.name),
  );

  const stops = signals.map((signal, index) => {
    const expectedValuePaise = signal.items.reduce(
      (total, item) =>
        total +
        item.unitPricePaise *
          (item.confirmedQuantity ?? item.suggestedQuantity),
      0,
    );

    const location = [
      signal.shop.address,
      signal.shop.locality,
      "Haridwar",
    ]
      .filter(Boolean)
      .join(", ");

    return {
      sequence: index + 1,
      signalId: signal.id,
      shop: signal.shop,
      expectedValuePaise,
      productCount: signal.items.length,
      mapsUrl: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
        location,
      )}`,
    };
  });

  const totalExpectedValuePaise = stops.reduce(
    (total, stop) => total + stop.expectedValuePaise,
    0,
  );

  const totalOutstandingPaise = stops.reduce(
    (total, stop) => total + stop.shop.outstandingPaise,
    0,
  );

  return (
    <main className="min-h-screen bg-slate-100 pb-10 text-slate-950">
      <header className="bg-slate-950 px-5 pb-8 pt-6 text-white">
        <div className="mx-auto max-w-lg">
          <div className="flex items-start justify-between gap-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-400 font-black text-slate-950">
              DS
            </div>

            <span className="rounded-full bg-white/10 px-3 py-1.5 text-xs font-bold text-emerald-300">
              {statusLabels[dispatch.status] ?? dispatch.status}
            </span>
          </div>

          <p className="mt-7 text-xs font-black uppercase tracking-[0.18em] text-emerald-300">
            {dispatch.route.code} · {formatDate(dispatch.targetDate)}
          </p>

          <h1 className="mt-2 text-3xl font-black tracking-tight">
            Driver route manifest
          </h1>

          <p className="mt-3 text-sm leading-6 text-slate-300">
            {dispatch.route.name}
          </p>

          <div className="mt-6 grid grid-cols-2 gap-3">
            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
              <p className="text-xs text-slate-400">Driver</p>
              <p className="mt-1 text-sm font-black">
                {dispatch.driver?.name ?? "Not assigned"}
              </p>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
              <p className="text-xs text-slate-400">Salesperson</p>
              <p className="mt-1 text-sm font-black">
                {dispatch.salesman?.name ?? "Not assigned"}
              </p>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
              <p className="text-xs text-slate-400">Vehicle</p>
              <p className="mt-1 text-sm font-black">
                {dispatch.vehicle?.code ?? "Not assigned"}
              </p>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
              <p className="text-xs text-slate-400">Departure</p>
              <p className="mt-1 text-sm font-black">
                {formatTime(dispatch.dispatchedAt)}
              </p>
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-lg px-4">
        <section className="-mt-4 grid grid-cols-2 gap-3">
          <article className="rounded-2xl bg-white p-4 shadow-sm">
            <p className="text-xs text-slate-400">Route stops</p>
            <p className="mt-1 text-2xl font-black">
              {stops.length}
            </p>
          </article>

          <article className="rounded-2xl bg-white p-4 shadow-sm">
            <p className="text-xs text-slate-400">Expected sales</p>
            <p className="mt-1 text-lg font-black">
              {formatMoney(totalExpectedValuePaise)}
            </p>
          </article>

          <article className="rounded-2xl bg-white p-4 shadow-sm">
            <p className="text-xs text-slate-400">Vehicle load</p>
            <p className="mt-1 text-lg font-black">
              {formatWeight(dispatch.plannedWeightGrams)}
            </p>
          </article>

          <article className="rounded-2xl bg-white p-4 shadow-sm">
            <p className="text-xs text-slate-400">Old outstanding</p>
            <p className="mt-1 text-lg font-black">
              {formatMoney(totalOutstandingPaise)}
            </p>
          </article>
        </section>

        {dispatch.notes && (
          <section className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4">
            <p className="text-xs font-black uppercase tracking-wider text-amber-700">
              Dispatch instructions
            </p>
            <p className="mt-2 text-sm leading-6 text-amber-900">
              {dispatch.notes}
            </p>
          </section>
        )}

        <section className="mt-6">
          <div className="flex items-end justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.16em] text-emerald-700">
                Delivery sequence
              </p>
              <h2 className="mt-1 text-xl font-black">
                Shops on this route
              </h2>
            </div>

            <p className="text-sm font-bold text-slate-500">
              {stops.length} stops
            </p>
          </div>

          <div className="mt-4 space-y-3">
            {stops.map((stop) => (
              <article
                key={stop.signalId}
                className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
              >
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-950 text-sm font-black text-emerald-400">
                    {stop.sequence}
                  </div>

                  <div className="min-w-0 flex-1">
                    <h3 className="font-black">{stop.shop.name}</h3>

                    <p className="mt-1 text-xs text-slate-500">
                      {stop.shop.ownerName ?? "Owner not recorded"} ·{" "}
                      {stop.shop.locality ?? "No locality"}
                    </p>
                  </div>

                  <p className="text-sm font-black">
                    {formatMoney(stop.expectedValuePaise)}
                  </p>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3">
                  <div className="rounded-xl bg-slate-50 p-3">
                    <p className="text-xs text-slate-400">
                      Delivery window
                    </p>
                    <p className="mt-1 text-sm font-black">
                      {stop.shop.preferredWindow ?? "Not specified"}
                    </p>
                  </div>

                  <div className="rounded-xl bg-slate-50 p-3">
                    <p className="text-xs text-slate-400">Products</p>
                    <p className="mt-1 text-sm font-black">
                      {stop.productCount}
                    </p>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3">
                  <a
                    href={`tel:${stop.shop.phone}`}
                    className="flex min-h-11 items-center justify-center rounded-xl border border-slate-200 text-sm font-black text-slate-700"
                  >
                    Call shop
                  </a>

                  <a
                    href={stop.mapsUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="flex min-h-11 items-center justify-center rounded-xl bg-emerald-400 text-sm font-black text-slate-950"
                  >
                    Navigate
                  </a>
                </div>

                <Link
                  href={`/signals/${stop.signalId}`}
                  className="mt-3 flex min-h-11 items-center justify-center rounded-xl bg-slate-950 text-sm font-black text-white"
                >
                  View order details
                </Link>
              </article>
            ))}
          </div>
        </section>

        <section className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 p-4">
            <h2 className="font-black">Vehicle load summary</h2>
            <p className="mt-1 text-sm text-slate-500">
              Final warehouse manifest
            </p>
          </div>

          <div className="divide-y divide-slate-100">
            {dispatch.items.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between gap-4 p-4"
              >
                <div>
                  <p className="text-sm font-black">
                    {item.product.name}
                  </p>
                  <p className="mt-1 text-xs text-slate-400">
                    {item.confirmedQuantity} confirmed +{" "}
                    {item.reserveQuantity} reserve
                  </p>
                </div>

                <p className="text-sm font-black">
                  {item.plannedQuantity} {item.product.unit}
                </p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}