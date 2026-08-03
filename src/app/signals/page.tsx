import Link from "next/link";
import CopyConfirmationLink from "@/components/signals/CopyConfirmationLink";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const filterStatuses = [
  "ALL",
  "CONFIRMED",
  "MODIFIED",
  "SENT",
  "NO_RESPONSE",
  "DRAFT",
  "REJECTED",
  "EXPIRED",
] as const;

type StatusFilter = (typeof filterStatuses)[number];

type SignalsPageProps = {
  searchParams: Promise<{
    status?: string | string[];
    q?: string | string[];
  }>;
};

const statusLabels: Record<string, string> = {
  ALL: "All",
  DRAFT: "Draft",
  SENT: "Awaiting",
  CONFIRMED: "Confirmed",
  MODIFIED: "Modified",
  REJECTED: "Rejected",
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
  EXPIRED: "bg-slate-100 text-slate-500 ring-slate-500/20",
  NO_RESPONSE:
    "bg-orange-50 text-orange-700 ring-orange-600/20",
};

function firstValue(
  value: string | string[] | undefined,
): string {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

function normalizeStatus(value: string): StatusFilter {
  const normalized = value.toUpperCase();

  return filterStatuses.includes(normalized as StatusFilter)
    ? (normalized as StatusFilter)
    : "ALL";
}

function formatMoney(paise: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(paise / 100);
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(date);
}

function buildFilterHref(
  status: StatusFilter,
  query: string,
): string {
  const params = new URLSearchParams();

  if (status !== "ALL") {
    params.set("status", status);
  }

  if (query) {
    params.set("q", query);
  }

  const queryString = params.toString();

  return queryString ? `/signals?${queryString}` : "/signals";
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ring-1 ring-inset ${
        statusStyles[status] ??
        "bg-slate-100 text-slate-600 ring-slate-500/20"
      }`}
    >
      {statusLabels[status] ?? status}
    </span>
  );
}

export default async function SignalsPage({
  searchParams,
}: SignalsPageProps) {
  const params = await searchParams;

  const requestedStatus = normalizeStatus(
    firstValue(params.status),
  );

  const query = firstValue(params.q).trim();
  const normalizedQuery = query.toLocaleLowerCase("en-IN");

  const latestSignal = await prisma.demandSignal.findFirst({
    orderBy: {
      targetDate: "desc",
    },
    select: {
      targetDate: true,
    },
  });

  const signals = latestSignal
    ? await prisma.demandSignal.findMany({
        where: {
          targetDate: latestSignal.targetDate,
        },
        include: {
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
        orderBy: [
          {
            averageConfidence: "desc",
          },
          {
            createdAt: "asc",
          },
        ],
      })
    : [];

  const statusCounts = signals.reduce<Record<string, number>>(
    (counts, signal) => {
      counts[signal.status] =
        (counts[signal.status] ?? 0) + 1;

      return counts;
    },
    {},
  );

  const filteredSignals = signals.filter((signal) => {
    const statusMatches =
      requestedStatus === "ALL" ||
      signal.status === requestedStatus;

    const searchableText = [
      signal.shop.name,
      signal.shop.ownerName,
      signal.shop.locality,
      signal.shop.phone,
      signal.shop.route?.code,
      signal.shop.route?.name,
      ...signal.items.map((item) => item.product.name),
    ]
      .filter(Boolean)
      .join(" ")
      .toLocaleLowerCase("en-IN");

    const queryMatches =
      !normalizedQuery ||
      searchableText.includes(normalizedQuery);

    return statusMatches && queryMatches;
  });

  const confirmedCount =
    (statusCounts.CONFIRMED ?? 0) +
    (statusCounts.MODIFIED ?? 0);

  const pendingCount =
    (statusCounts.SENT ?? 0) +
    (statusCounts.NO_RESPONSE ?? 0) +
    (statusCounts.DRAFT ?? 0);

  return (
    <main className="min-h-screen bg-[#f5f7fb] text-slate-950">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-[1500px] items-center justify-between gap-4 px-5 py-5 sm:px-8">
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-950 font-black text-emerald-400"
            >
              DS
            </Link>

            <div>
              <h1 className="text-xl font-black tracking-tight sm:text-2xl">
                Demand signals
              </h1>

              <p className="mt-1 text-sm text-slate-500">
                Review, confirm and share tomorrow&apos;s retailer
                requirements.
              </p>
            </div>
          </div>

          <Link
            href="/"
            className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 shadow-sm hover:bg-slate-50"
          >
            Dashboard
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-[1500px] px-5 py-7 sm:px-8">
        <section className="rounded-3xl bg-slate-950 p-6 text-white shadow-xl sm:p-8">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-300">
            Retailer confirmation control
          </p>

          <div className="mt-3 flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
            <div>
              <h2 className="text-3xl font-black tracking-tight sm:text-4xl">
                {signals.length} signals generated
              </h2>

              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">
                {confirmedCount} retailers have confirmed or modified
                their requirements. {pendingCount} still require a
                response.
              </p>
            </div>

            <div className="grid grid-cols-3 gap-3">
              {[
                ["Confirmed", confirmedCount],
                ["Pending", pendingCount],
                ["Visible", filteredSignals.length],
              ].map(([label, value]) => (
                <div
                  key={label}
                  className="min-w-24 rounded-2xl border border-slate-800 bg-slate-900 p-3"
                >
                  <p className="text-xl font-black">{value}</p>
                  <p className="mt-1 text-xs text-slate-400">
                    {label}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <form
            action="/signals"
            method="GET"
            className="flex flex-col gap-3 sm:flex-row"
          >
            {requestedStatus !== "ALL" && (
              <input
                type="hidden"
                name="status"
                value={requestedStatus}
              />
            )}

            <input
              type="search"
              name="q"
              defaultValue={query}
              placeholder="Search shop, route, owner or product..."
              className="min-h-12 flex-1 rounded-xl border border-slate-200 px-4 text-sm outline-none focus:border-emerald-500"
            />

            <button
              type="submit"
              className="min-h-12 rounded-xl bg-slate-950 px-6 text-sm font-bold text-white hover:bg-slate-800"
            >
              Search
            </button>

            {(query || requestedStatus !== "ALL") && (
              <Link
                href="/signals"
                className="flex min-h-12 items-center justify-center rounded-xl border border-slate-200 px-5 text-sm font-bold text-slate-600 hover:bg-slate-50"
              >
                Clear
              </Link>
            )}
          </form>

          <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
            {filterStatuses.map((status) => {
              const count =
                status === "ALL"
                  ? signals.length
                  : statusCounts[status] ?? 0;

              return (
                <Link
                  key={status}
                  href={buildFilterHref(status, query)}
                  className={`whitespace-nowrap rounded-full px-4 py-2 text-xs font-bold transition ${
                    requestedStatus === status
                      ? "bg-slate-950 text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {statusLabels[status]} · {count}
                </Link>
              );
            })}
          </div>
        </section>

        <section className="mt-6 space-y-4 lg:hidden">
          {filteredSignals.map((signal) => {
            const productNames = signal.items
              .slice(0, 3)
              .map((item) => item.product.name);

            const extraProducts =
              signal.items.length - productNames.length;

            return (
              <article
                key={signal.id}
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <Link
                      href={`/signals/${signal.id}`}
                      className="font-black hover:text-emerald-700"
                    >
                      {signal.shop.name}
                    </Link>

                    <p className="mt-1 text-xs text-slate-400">
                      {signal.shop.route?.code ?? "Unassigned"} ·{" "}
                      {signal.shop.locality ?? "No locality"}
                    </p>
                  </div>

                  <StatusBadge status={signal.status} />
                </div>

                <div className="mt-5 grid grid-cols-2 gap-3">
                  <div className="rounded-xl bg-slate-50 p-3">
                    <p className="text-xs text-slate-400">
                      Suggested value
                    </p>
                    <p className="mt-1 font-black">
                      {formatMoney(signal.totalSuggestedPaise)}
                    </p>
                  </div>

                  <div className="rounded-xl bg-slate-50 p-3">
                    <p className="text-xs text-slate-400">
                      Confidence
                    </p>
                    <p className="mt-1 font-black">
                      {signal.averageConfidence}%
                    </p>
                  </div>
                </div>

                <div className="mt-4">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Suggested products
                  </p>

                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    {productNames.join(", ")}
                    {extraProducts > 0
                      ? ` and ${extraProducts} more`
                      : ""}
                  </p>
                </div>

                {signal.merchantNote && (
                  <div className="mt-4 rounded-xl border border-blue-100 bg-blue-50 p-3">
                    <p className="text-xs font-bold text-blue-700">
                      Retailer note
                    </p>
                    <p className="mt-1 text-sm text-blue-800">
                      {signal.merchantNote}
                    </p>
                  </div>
                )}

                <div className="mt-5 flex items-center justify-between gap-2">
                  <CopyConfirmationLink
                    token={signal.confirmationToken}
                  />

                  <Link
                    href={`/confirm/${signal.confirmationToken}`}
                    target="_blank"
                    className="rounded-xl bg-emerald-400 px-4 py-2 text-xs font-black text-slate-950"
                  >
                    Open retailer page
                  </Link>
                </div>
              </article>
            );
          })}
        </section>

        <section className="mt-6 hidden overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm lg:block">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1100px] text-left">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wider text-slate-400">
                  <th className="px-6 py-4 font-bold">Shop</th>
                  <th className="px-4 py-4 font-bold">Products</th>
                  <th className="px-4 py-4 font-bold">Value</th>
                  <th className="px-4 py-4 font-bold">Confidence</th>
                  <th className="px-4 py-4 font-bold">Status</th>
                  <th className="px-4 py-4 font-bold">Target</th>
                  <th className="px-6 py-4 text-right font-bold">
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody>
                {filteredSignals.map((signal) => (
                  <tr
                    key={signal.id}
                    className="border-b border-slate-100 last:border-0 hover:bg-slate-50/70"
                  >
                    <td className="px-6 py-5">
                      <Link
                        href={`/signals/${signal.id}`}
                        className="text-sm font-black hover:text-emerald-700"
                      >
                        {signal.shop.name}
                      </Link>
                      <p className="mt-1 text-xs text-slate-400">
                        {signal.shop.route?.code ?? "Unassigned"} ·{" "}
                        {signal.shop.locality ?? "No locality"}
                      </p>
                    </td>

                    <td className="max-w-xs px-4 py-5">
                      <p className="truncate text-sm text-slate-600">
                        {signal.items
                          .map((item) => item.product.name)
                          .join(", ")}
                      </p>
                      <p className="mt-1 text-xs text-slate-400">
                        {signal.items.length} products
                      </p>
                    </td>

                    <td className="px-4 py-5 text-sm font-black">
                      {formatMoney(signal.totalSuggestedPaise)}
                    </td>

                    <td className="px-4 py-5">
                      <div className="w-28">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold">
                            {signal.averageConfidence}%
                          </span>
                        </div>

                        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100">
                          <div
                            className="h-full rounded-full bg-emerald-500"
                            style={{
                              width: `${signal.averageConfidence}%`,
                            }}
                          />
                        </div>
                      </div>
                    </td>

                    <td className="px-4 py-5">
                      <StatusBadge status={signal.status} />
                    </td>

                    <td className="px-4 py-5 text-sm text-slate-600">
                      {formatDate(signal.targetDate)}
                    </td>

                    <td className="px-6 py-5">
                      <div className="flex justify-end gap-2">
                        <CopyConfirmationLink
                          token={signal.confirmationToken}
                        />

                        <Link
                          href={`/confirm/${signal.confirmationToken}`}
                          target="_blank"
                          className="rounded-xl bg-slate-950 px-3 py-2 text-xs font-bold text-white hover:bg-slate-800"
                        >
                          Open
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {filteredSignals.length === 0 && (
          <section className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
            <h2 className="text-lg font-black">
              No matching demand signals
            </h2>
            <p className="mt-2 text-sm text-slate-500">
              Try a different status or search term.
            </p>
          </section>
        )}
      </div>
    </main>
  );
}