import Link from "next/link";
import { getRouteOverviewData } from "@/lib/routes";

export const dynamic = "force-dynamic";

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

export default async function RoutesPage() {
  const data = await getRouteOverviewData();

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
                Route control
              </h1>
              <p className="mt-1 text-sm text-slate-500">
                Turn confirmed retailer demand into warehouse and van
                loading plans.
              </p>
            </div>
          </div>

          <Link
            href="/signals"
            className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 shadow-sm hover:bg-slate-50"
          >
            Demand signals
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-[1500px] px-5 py-7 sm:px-8">
        <section className="overflow-hidden rounded-3xl bg-slate-950 p-6 text-white shadow-xl sm:p-8">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-300">
            {formatDate(data.targetDate)} dispatch
          </p>

          <div className="mt-4 flex flex-col justify-between gap-7 xl:flex-row xl:items-end">
            <div>
              <h2 className="text-3xl font-black tracking-tight sm:text-4xl">
                {data.routes.length} routes under preparation
              </h2>

              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">
                {data.totalConfirmedShops} shops have confirmed demand
                and {data.totalPendingShops} still require a response.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                ["Confirmed shops", data.totalConfirmedShops],
                ["Pending shops", data.totalPendingShops],
                ["Handling units", data.totalHandlingUnits],
                [
                  "Confirmed value",
                  formatMoney(data.totalConfirmedValuePaise),
                ],
              ].map(([label, value]) => (
                <div
                  key={label}
                  className="min-w-32 rounded-2xl border border-slate-800 bg-slate-900 p-4"
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

        <section className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {data.routes.map((route) => (
            <article
              key={route.id}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.16em] text-emerald-700">
                    {route.code}
                  </p>
                  <h2 className="mt-2 text-lg font-black">
                    {route.name}
                  </h2>
                </div>

                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-bold ${
                    route.readiness >= 80
                      ? "bg-emerald-50 text-emerald-700"
                      : route.readiness >= 50
                        ? "bg-amber-50 text-amber-700"
                        : "bg-slate-100 text-slate-600"
                  }`}
                >
                  {route.readiness}%
                </span>
              </div>

              <p className="mt-2 text-xs text-slate-400">
                {route.deliveryDays ?? "Delivery days not assigned"}
              </p>

              <div className="mt-5 h-2 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-emerald-500"
                  style={{
                    width: `${route.readiness}%`,
                  }}
                />
              </div>

              <p className="mt-2 text-xs font-semibold text-slate-500">
                {route.statusLabel}
              </p>

              <div className="mt-5 grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-slate-50 p-3">
                  <p className="text-xs text-slate-400">
                    Confirmed shops
                  </p>
                  <p className="mt-1 text-lg font-black">
                    {route.confirmedShops}
                  </p>
                </div>

                <div className="rounded-xl bg-slate-50 p-3">
                  <p className="text-xs text-slate-400">
                    Pending shops
                  </p>
                  <p className="mt-1 text-lg font-black">
                    {route.pendingShops}
                  </p>
                </div>

                <div className="rounded-xl bg-slate-50 p-3">
                  <p className="text-xs text-slate-400">
                    Handling units
                  </p>
                  <p className="mt-1 text-lg font-black">
                    {route.handlingUnits}
                  </p>
                </div>

                <div className="rounded-xl bg-slate-50 p-3">
                  <p className="text-xs text-slate-400">
                    Products
                  </p>
                  <p className="mt-1 text-lg font-black">
                    {route.uniqueProducts}
                  </p>
                </div>
              </div>

              <div className="mt-5 border-t border-slate-100 pt-4">
                <p className="text-xs text-slate-400">
                  Confirmed order value
                </p>
                <p className="mt-1 text-xl font-black">
                  {formatMoney(route.confirmedValuePaise)}
                </p>
              </div>

              <Link
                href={`/routes/${route.id}`}
                className="mt-5 flex w-full items-center justify-center rounded-xl bg-slate-950 py-3 text-sm font-bold text-white hover:bg-slate-800"
              >
                Open loading plan
              </Link>
            </article>
          ))}
        </section>

        {data.routes.length === 0 && (
          <section className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
            <h2 className="text-lg font-black">
              No active routes found
            </h2>
            <p className="mt-2 text-sm text-slate-500">
              Add routes and demand signals before preparing dispatch.
            </p>
          </section>
        )}
      </div>
    </main>
  );
}