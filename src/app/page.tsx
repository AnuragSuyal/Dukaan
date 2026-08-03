import Link from "next/link";
import { getDashboardData } from "@/lib/dashboard";

export const dynamic = "force-dynamic";

const navigation = [
  ["Overview", "01"],
  ["Demand signals", "02"],
  ["Shop confirmations", "03"],
  ["Routes", "04"],
  ["Van loading", "05"],
  ["Deliveries", "06"],
  ["Collections", "07"],
  ["Reports", "08"],
];

function formatMoney(paise: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(paise / 100);
}

function formatDate(date: Date | null): string {
  if (!date) {
    return "No dispatch date";
  }

  return new Intl.DateTimeFormat("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(date);
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    Confirmed:
      "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
    Modified:
      "bg-blue-50 text-blue-700 ring-blue-600/20",
    Awaiting:
      "bg-amber-50 text-amber-700 ring-amber-600/20",
    "No response":
      "bg-slate-100 text-slate-600 ring-slate-500/20",
    Draft:
      "bg-violet-50 text-violet-700 ring-violet-600/20",
    Rejected:
      "bg-red-50 text-red-700 ring-red-600/20",
  };

  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${
        styles[status] ??
        "bg-slate-100 text-slate-600 ring-slate-500/20"
      }`}
    >
      {status}
    </span>
  );
}

export default async function Home() {
  const data = await getDashboardData();

  const metrics = [
    {
      label: "Tomorrow's predicted demand",
      value: formatMoney(data.totalSuggestedPaise),
      change: `${data.totalSignals} shops`,
      description: "Calculated from active demand signals",
      accent: "bg-emerald-500",
    },
    {
      label: "Orders confirmed",
      value: `${data.confirmedSignals} / ${data.totalSignals}`,
      change: `${data.routeReadiness}%`,
      description: "Confirmed or modified by retailers",
      accent: "bg-blue-500",
    },
    {
      label: "Collection expected",
      value: formatMoney(data.collectionExpectedPaise),
      change: "Outstanding",
      description: "Across shops with confirmed orders",
      accent: "bg-amber-500",
    },
    {
      label: "Route readiness",
      value: `${data.routeReadiness}%`,
      change: `${data.routesPrepared} routes`,
      description: `${data.pendingSignals} signals still pending`,
      accent: "bg-violet-500",
    },
  ];

  return (
    <div className="min-h-screen bg-[#f5f7fb] text-slate-950">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-slate-800 bg-[#101722] text-white lg:flex lg:flex-col">
        <div className="flex h-20 items-center border-b border-slate-800 px-6">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-400 font-black text-slate-950">
            DS
          </div>

          <div className="ml-3">
            <p className="text-base font-bold tracking-tight">
              DukaanSignal
            </p>
            <p className="text-xs text-slate-400">
              Distribution intelligence
            </p>
          </div>
        </div>

        <nav className="flex-1 space-y-1 px-3 py-6">
          {navigation.map(([label, number], index) => (
            <button
              key={label}
              className={`flex w-full items-center rounded-xl px-3 py-3 text-left text-sm transition ${
                index === 0
                  ? "bg-white text-slate-950 shadow-sm"
                  : "text-slate-400 hover:bg-slate-800 hover:text-white"
              }`}
            >
              <span
                className={`mr-3 flex h-7 w-7 items-center justify-center rounded-lg text-[10px] font-bold ${
                  index === 0
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-slate-800 text-slate-500"
                }`}
              >
                {number}
              </span>
              {label}
            </button>
          ))}
        </nav>

        <div className="m-4 rounded-2xl border border-slate-700 bg-slate-800/70 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-400">
            Pilot workspace
          </p>
          <p className="mt-2 text-sm font-semibold">
            {data.distributorName}
          </p>
          <p className="mt-1 text-xs leading-5 text-slate-400">
            Live SQLite data is connected through Prisma.
          </p>
        </div>
      </aside>

      <main className="lg:pl-64">
        <header className="sticky top-0 z-20 border-b border-slate-200/80 bg-white/90 backdrop-blur">
          <div className="flex h-20 items-center justify-between px-5 sm:px-8">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-950 font-black text-emerald-400 lg:hidden">
                DS
              </div>

              <div>
                <h1 className="text-lg font-bold tracking-tight sm:text-xl">
                  Distribution command centre
                </h1>
                <p className="hidden text-sm text-slate-500 sm:block">
                  {formatDate(data.targetDate)} dispatch preparation
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button className="hidden rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 sm:block">
                Import data
              </button>
              <button className="rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-slate-800">
                Generate signals
              </button>
            </div>
          </div>
        </header>

        <div className="mx-auto max-w-[1600px] px-5 py-7 sm:px-8">
          <section className="overflow-hidden rounded-3xl bg-slate-950 text-white shadow-xl shadow-slate-200">
            <div className="grid gap-8 p-6 sm:p-8 xl:grid-cols-[1.4fr_0.8fr]">
              <div>
                <div className="inline-flex rounded-full bg-emerald-400/10 px-3 py-1 text-xs font-semibold text-emerald-300 ring-1 ring-emerald-400/20">
                  Live dispatch intelligence
                </div>

                <h2 className="mt-5 max-w-2xl text-3xl font-black tracking-tight sm:text-4xl">
                  Know the order before the van leaves.
                </h2>

                <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-300 sm:text-base">
                  DukaanSignal has generated {data.totalSignals} retailer
                  demand signals. {data.confirmedSignals} shops have already
                  confirmed or modified their suggested requirements.
                </p>

                <div className="mt-7 flex flex-wrap gap-3">
                  <Link
                    href="/signals"
                    className="rounded-xl bg-emerald-400 px-4 py-2.5 text-sm font-bold text-slate-950 hover:bg-emerald-300"
                  >
                    Review demand signals
                  </Link>
                  <button className="rounded-xl border border-slate-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800">
                    Open confirmation queue
                  </button>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold">
                    Route preparation
                  </p>
                  <p className="text-sm font-bold text-emerald-300">
                    {data.routeReadiness}%
                  </p>
                </div>

                <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-800">
                  <div
                    className="h-full rounded-full bg-emerald-400"
                    style={{ width: `${data.routeReadiness}%` }}
                  />
                </div>

                <div className="mt-6 grid grid-cols-2 gap-3">
                  {[
                    [data.totalSignals, "Shops analysed"],
                    [data.confirmedSignals, "Orders confirmed"],
                    [data.routesPrepared, "Routes prepared"],
                    [data.pendingSignals, "Signals pending"],
                  ].map(([value, label]) => (
                    <div
                      key={label}
                      className="rounded-xl border border-slate-800 bg-slate-950/50 p-3"
                    >
                      <p className="text-xl font-black">{value}</p>
                      <p className="mt-1 text-xs text-slate-400">
                        {label}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>

          <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {metrics.map((metric) => (
              <article
                key={metric.label}
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
              >
                <div
                  className={`h-1.5 w-10 rounded-full ${metric.accent}`}
                />
                <p className="mt-5 text-sm font-medium text-slate-500">
                  {metric.label}
                </p>

                <div className="mt-2 flex items-end justify-between gap-3">
                  <p className="text-2xl font-black tracking-tight">
                    {metric.value}
                  </p>
                  <span className="rounded-lg bg-slate-100 px-2 py-1 text-xs font-bold text-slate-700">
                    {metric.change}
                  </span>
                </div>

                <p className="mt-2 text-xs text-slate-400">
                  {metric.description}
                </p>
              </article>
            ))}
          </section>

          <section className="mt-6 grid gap-6 xl:grid-cols-[1.35fr_0.65fr]">
            <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-100 px-5 py-5 sm:px-6">
                <div>
                  <h3 className="font-bold">
                    Shop confirmation queue
                  </h3>
                  <p className="mt-1 text-sm text-slate-500">
                    Live demand signals from SQLite
                  </p>
                </div>

                <Link
                  href="/signals"
                  className="text-sm font-semibold text-emerald-700"
                >
                  View all
                </Link>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[760px] text-left">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/70 text-xs uppercase tracking-wide text-slate-400">
                      <th className="px-6 py-3 font-semibold">Shop</th>
                      <th className="px-4 py-3 font-semibold">
                        Suggested value
                      </th>
                      <th className="px-4 py-3 font-semibold">
                        Products
                      </th>
                      <th className="px-4 py-3 font-semibold">
                        Window
                      </th>
                      <th className="px-6 py-3 font-semibold">
                        Status
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {data.shops.map((shop) => (
                      <tr
                        key={shop.shop}
                        className="border-b border-slate-100 last:border-0 hover:bg-slate-50/70"
                      >
                        <td className="px-6 py-4">
                          <p className="text-sm font-bold">
                            {shop.shop}
                          </p>
                          <p className="mt-1 text-xs text-slate-400">
                            {shop.route}
                          </p>
                        </td>

                        <td className="px-4 py-4 text-sm font-semibold">
                          {formatMoney(shop.predictionPaise)}
                        </td>

                        <td className="px-4 py-4 text-sm text-slate-600">
                          {shop.products} products
                        </td>

                        <td className="px-4 py-4 text-sm text-slate-600">
                          {shop.time}
                        </td>

                        <td className="px-6 py-4">
                          <StatusBadge status={shop.status} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </article>

            <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-bold">
                    Intelligent loading plan
                  </h3>
                  <p className="mt-1 text-sm text-slate-500">
                    {data.selectedRoute?.routeCode ?? "No route selected"}
                  </p>
                </div>

                <span className="rounded-lg bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700">
                  {data.vanLoadReadiness}% ready
                </span>
              </div>

              <div className="mt-6 space-y-5">
                {data.vanLoad.map((item) => (
                  <div key={item.product}>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-bold">
                          {item.product}
                        </p>
                        <p className="mt-1 text-xs text-slate-400">
                          {item.confirmed} confirmed + {item.reserve}{" "}
                          reserve {item.unit}
                        </p>
                      </div>

                      <p className="text-xs font-bold text-slate-500">
                        {item.percent}%
                      </p>
                    </div>

                    <div className="mt-2.5 h-2 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full bg-slate-900"
                        style={{ width: `${item.percent}%` }}
                      />
                    </div>
                  </div>
                ))}

                {data.vanLoad.length === 0 && (
                  <p className="text-sm text-slate-500">
                    No confirmed load is available yet.
                  </p>
                )}
              </div>
            </article>
          </section>

          <section className="mt-6 grid gap-6 lg:grid-cols-3">
            {[
              {
                step: "01",
                title: "Predict demand",
                text: `${data.totalSignals} shop-level suggestions generated from historical orders.`,
              },
              {
                step: "02",
                title: "Confirm requirements",
                text: `${data.confirmedSignals} retailers confirmed or modified their suggested quantities.`,
              },
              {
                step: "03",
                title: "Prepare dispatch",
                text: `${data.routesPrepared} delivery routes now contain confirmed commercial demand.`,
              },
            ].map((item) => (
              <article
                key={item.step}
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
              >
                <span className="text-xs font-black tracking-[0.18em] text-emerald-600">
                  STEP {item.step}
                </span>
                <h3 className="mt-5 text-lg font-black">
                  {item.title}
                </h3>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  {item.text}
                </p>
              </article>
            ))}
          </section>

          <footer className="py-8 text-center text-xs text-slate-400">
            DukaanSignal pilot dashboard Ã‚Â· Live Prisma data Ã‚Â·{" "}
            {formatDate(data.targetDate)}
          </footer>
        </div>
      </main>
    </div>
  );
}