import Link from "next/link";
import { notFound } from "next/navigation";
import DeliveryCompletionForm from "@/components/delivery/DeliveryCompletionForm";
import { prisma } from "@/lib/prisma";
import {
  completeDeliveryStop,
  markStopArrived,
  skipDeliveryStop,
} from "./actions";

export const dynamic = "force-dynamic";

type StopPageProps = {
  params: Promise<{
    id: string;
    stopId: string;
  }>;
  searchParams: Promise<{
    success?: string | string[];
    error?: string | string[];
  }>;
};

const statusLabels: Record<string, string> = {
  PENDING: "Pending",
  ARRIVED: "At shop",
  DELIVERED: "Delivered",
  PARTIAL: "Partial delivery",
  FAILED: "Failed",
  SKIPPED: "Skipped",
};

const terminalStatuses = new Set([
  "DELIVERED",
  "PARTIAL",
  "FAILED",
  "SKIPPED",
]);

function firstValue(
  value: string | string[] | undefined,
): string {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

function formatMoney(paise: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(paise / 100);
}

function formatDateTime(date: Date | null): string {
  if (!date) {
    return "Not recorded";
  }

  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

export default async function StopPage({
  params,
  searchParams,
}: StopPageProps) {
  const { id: dispatchId, stopId } = await params;
  const query = await searchParams;

  const stop = await prisma.deliveryStop.findUnique({
    where: {
      id: stopId,
    },
    include: {
      dispatch: {
        include: {
          route: true,
          vehicle: true,
          driver: true,
          salesman: true,
        },
      },
      shop: true,
      items: {
        include: {
          product: true,
        },
        orderBy: {
          orderedQuantity: "desc",
        },
      },
    },
  });

  if (!stop || stop.dispatchId !== dispatchId) {
    notFound();
  }

  const success = firstValue(query.success);
  const error = firstValue(query.error);
  const closed = terminalStatuses.has(stop.status);

  const location = [
    stop.shop.address,
    stop.shop.locality,
    "Haridwar",
  ]
    .filter(Boolean)
    .join(", ");

  const mapsUrl =
    `https://www.google.com/maps/search/?api=1&query=` +
    encodeURIComponent(location);

  return (
    <main className="min-h-screen bg-slate-100 pb-10 text-slate-950">
      <header className="bg-slate-950 px-5 pb-8 pt-6 text-white">
        <div className="mx-auto max-w-lg">
          <div className="flex items-center justify-between gap-4">
            <Link
              href={`/driver/dispatch/${dispatchId}`}
              className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10 text-xl font-black text-emerald-300"
            >
              ←
            </Link>

            <span className="rounded-full bg-white/10 px-3 py-1.5 text-xs font-black text-emerald-300">
              {statusLabels[stop.status] ?? stop.status}
            </span>
          </div>

          <p className="mt-7 text-xs font-black uppercase tracking-[0.18em] text-emerald-300">
            Stop {stop.sequence} · {stop.dispatch.route.code}
          </p>

          <h1 className="mt-2 text-3xl font-black tracking-tight">
            {stop.shop.name}
          </h1>

          <p className="mt-3 text-sm leading-6 text-slate-300">
            {stop.shop.ownerName ?? "Owner not recorded"} ·{" "}
            {stop.shop.locality ?? "Locality not recorded"}
          </p>

          <div className="mt-6 grid grid-cols-2 gap-3">
            <a
              href={`tel:${stop.shop.phone}`}
              className="flex min-h-12 items-center justify-center rounded-xl border border-slate-700 text-sm font-black"
            >
              Call shop
            </a>

            <a
              href={mapsUrl}
              target="_blank"
              rel="noreferrer"
              className="flex min-h-12 items-center justify-center rounded-xl bg-emerald-400 text-sm font-black text-slate-950"
            >
              Navigate
            </a>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-lg px-4">
        {success && (
          <div className="-mt-4 mb-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-bold text-emerald-800">
            {success}
          </div>
        )}

        {error && (
          <div className="-mt-4 mb-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-800">
            {error}
          </div>
        )}

        <section className={`${success || error ? "" : "-mt-4"} grid grid-cols-2 gap-3`}>
          <article className="rounded-2xl bg-white p-4 shadow-sm">
            <p className="text-xs text-slate-400">Expected value</p>
            <p className="mt-1 text-lg font-black">
              {formatMoney(stop.expectedValuePaise)}
            </p>
          </article>

          <article className="rounded-2xl bg-white p-4 shadow-sm">
            <p className="text-xs text-slate-400">
              Previous outstanding
            </p>
            <p className="mt-1 text-lg font-black">
              {formatMoney(stop.shop.outstandingPaise)}
            </p>
          </article>

          <article className="rounded-2xl bg-white p-4 shadow-sm">
            <p className="text-xs text-slate-400">
              Delivery window
            </p>
            <p className="mt-1 text-sm font-black">
              {stop.shop.preferredWindow ?? "Not specified"}
            </p>
          </article>

          <article className="rounded-2xl bg-white p-4 shadow-sm">
            <p className="text-xs text-slate-400">Products</p>
            <p className="mt-1 text-lg font-black">
              {stop.items.length}
            </p>
          </article>
        </section>

        {!closed && stop.status === "PENDING" && (
          <form action={markStopArrived} className="mt-5">
            <input
              type="hidden"
              name="dispatchId"
              value={dispatchId}
            />
            <input type="hidden" name="stopId" value={stop.id} />

            <button
              type="submit"
              className="w-full rounded-2xl bg-blue-600 py-4 text-base font-black text-white shadow-lg"
            >
              Mark arrived at shop
            </button>
          </form>
        )}

        {!closed && (
          <>
            <section className="mt-5 rounded-2xl border border-violet-200 bg-violet-50 p-4">
              <p className="text-xs font-black uppercase tracking-wider text-violet-700">
                Pilot testing only
              </p>
              <p className="mt-2 text-sm text-violet-900">
                Retailer confirmation code:
              </p>
              <p className="mt-2 text-2xl font-black tracking-[0.35em] text-violet-950">
                {stop.confirmationCode}
              </p>
              <p className="mt-2 text-xs leading-5 text-violet-700">
                Production must send this privately to the retailer.
                It must not remain visible to the driver.
              </p>
            </section>

            <section className="mt-6">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.16em] text-emerald-700">
                  Complete delivery
                </p>
                <h2 className="mt-1 text-xl font-black">
                  Products, payment and OTP
                </h2>
              </div>

              <div className="mt-4">
                <DeliveryCompletionForm
                  dispatchId={dispatchId}
                  stopId={stop.id}
                  expectedValuePaise={stop.expectedValuePaise}
                  oldOutstandingPaise={stop.shop.outstandingPaise}
                  items={stop.items.map((item) => ({
                    id: item.id,
                    productName: item.product.name,
                    unit: item.product.unit,
                    orderedQuantity: item.orderedQuantity,
                    unitPricePaise: item.unitPricePaise,
                  }))}
                  action={completeDeliveryStop}
                />
              </div>
            </section>

            <section className="mt-6 rounded-2xl border border-red-200 bg-white p-4 shadow-sm">
              <h2 className="font-black text-red-700">Skip this shop</h2>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                Use only when the shop is closed, refuses delivery, or
                cannot be served.
              </p>

              <form action={skipDeliveryStop} className="mt-4">
                <input
                  type="hidden"
                  name="dispatchId"
                  value={dispatchId}
                />
                <input type="hidden" name="stopId" value={stop.id} />

                <textarea
                  name="skipReason"
                  required
                  rows={3}
                  maxLength={500}
                  placeholder="Reason the delivery could not be completed"
                  className="w-full resize-none rounded-xl border border-red-200 p-3 text-sm"
                />

                <button
                  type="submit"
                  className="mt-3 w-full rounded-xl bg-red-50 py-3 text-sm font-black text-red-700"
                >
                  Record skipped stop
                </button>
              </form>
            </section>
          </>
        )}

        {closed && (
          <section className="mt-5 rounded-3xl bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase tracking-wider text-emerald-700">
                  Stop closed
                </p>
                <h2 className="mt-1 text-xl font-black">
                  {statusLabels[stop.status] ?? stop.status}
                </h2>
              </div>

              <span className="rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-black text-emerald-700">
                {formatDateTime(stop.completedAt)}
              </span>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-slate-50 p-3">
                <p className="text-xs text-slate-400">
                  Current collected
                </p>
                <p className="mt-1 font-black">
                  {formatMoney(stop.currentOrderCollectedPaise)}
                </p>
              </div>

              <div className="rounded-xl bg-slate-50 p-3">
                <p className="text-xs text-slate-400">
                  Old outstanding collected
                </p>
                <p className="mt-1 font-black">
                  {formatMoney(stop.outstandingCollectedPaise)}
                </p>
              </div>

              <div className="rounded-xl bg-slate-50 p-3">
                <p className="text-xs text-slate-400">
                  New credit
                </p>
                <p className="mt-1 font-black">
                  {formatMoney(stop.creditExtendedPaise)}
                </p>
              </div>

              <div className="rounded-xl bg-slate-50 p-3">
                <p className="text-xs text-slate-400">
                  Returns collected
                </p>
                <p className="mt-1 font-black">
                  {stop.returnedCrates}
                </p>
              </div>
            </div>

            {stop.driverNote && (
              <div className="mt-4 rounded-xl bg-blue-50 p-3">
                <p className="text-xs font-black text-blue-700">
                  Driver note
                </p>
                <p className="mt-1 text-sm text-blue-900">
                  {stop.driverNote}
                </p>
              </div>
            )}

            <Link
              href={`/driver/dispatch/${dispatchId}`}
              className="mt-5 flex min-h-12 items-center justify-center rounded-xl bg-slate-950 text-sm font-black text-white"
            >
              Return to route manifest
            </Link>
          </section>
        )}
      </div>
    </main>
  );
}