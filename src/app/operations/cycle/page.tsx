import Link from "next/link";
import { getDailyOperations } from "@/lib/daily-operations";

export const dynamic = "force-dynamic";

const dispatchLabels: Record<string, string> = {
  DRAFT: "Draft",
  LOADING: "Loading",
  FINALIZED: "Ready",
  DISPATCHED: "On route",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

const dispatchStyles: Record<string, string> = {
  DRAFT: "bg-slate-100 text-slate-700",
  LOADING: "bg-amber-50 text-amber-700",
  FINALIZED: "bg-blue-50 text-blue-700",
  DISPATCHED: "bg-violet-50 text-violet-700",
  COMPLETED: "bg-emerald-50 text-emerald-700",
  CANCELLED: "bg-red-50 text-red-700",
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
    return "No active demand cycle";
  }

  return new Intl.DateTimeFormat("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

function MetricCard({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-black">{value}</p>
      <p className="mt-2 text-xs leading-5 text-slate-400">
        {detail}
      </p>
    </article>
  );
}

export default async function DailyCyclePage() {
  const dashboard = await getDailyOperations();
  const metrics = dashboard.metrics;

  const overallProgress =
    metrics.totalStops === 0
      ? 0
      : Math.round(
          (metrics.completedStops / metrics.totalStops) * 100,
        );

  return (
    <main className="min-h-screen bg-[#f5f7fb] pb-12 text-slate-950">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-[1500px] flex-col justify-between gap-5 px-5 py-5 sm:px-8 lg:flex-row lg:items-center">
          <div className="flex items-center gap-4">
            <Link
              href="/operations"
              className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-950 text-xl font-black text-emerald-400"
            >
              ←
            </Link>

            <div>
              <p className="text-xs font-black uppercase tracking-[0.16em] text-emerald-700">
                Multi-route planning
              </p>
              <h1 className="mt-1 text-xl font-black sm:text-2xl">
                Daily operations launchpad
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <p className="text-sm font-bold text-slate-500">
              {formatDate(dashboard.cycleDate)}
            </p>

            <Link
              href="/operations/cycle"
              className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-black shadow-sm"
            >
              Refresh
            </Link>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-[1500px] px-5 py-7 sm:px-8">
        <section className="rounded-3xl bg-slate-950 p-6 text-white shadow-xl sm:p-8">
          <div className="flex flex-col justify-between gap-7 xl:flex-row xl:items-end">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-300">
                Current demand cycle
              </p>

              <h2 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">
                Prepare every route from one workspace
              </h2>

              <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-300">
                Review retailer confirmation, demand value, dispatch
                readiness and delivery progress before opening each
                route workspace.
              </p>
            </div>

            <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-5">
              <div className="flex items-end justify-between">
                <div>
                  <p className="text-xs text-slate-400">
                    Overall delivery progress
                  </p>
                  <p className="mt-1 text-2xl font-black">
                    {metrics.completedStops}/{metrics.totalStops}
                  </p>
                </div>

                <p className="text-3xl font-black text-emerald-300">
                  {overallProgress}%
                </p>
              </div>

              <div className="mt-4 h-3 overflow-hidden rounded-full bg-slate-800">
                <div
                  className="h-full rounded-full bg-emerald-400"
                  style={{ width: `${overallProgress}%` }}
                />
              </div>
            </div>
          </div>
        </section>

        <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            label="Routes with demand"
            value={`${metrics.routesWithDemand}/${metrics.totalRoutes}`}
            detail="Routes containing retailer demand signals."
          />

          <MetricCard
            label="Dispatches created"
            value={`${metrics.dispatchesCreated}/${metrics.totalRoutes}`}
            detail="Routes with an existing dispatch workspace."
          />

          <MetricCard
            label="Confirmed shops"
            value={metrics.confirmedShops.toString()}
            detail={`${metrics.pendingShops} retailer confirmations remain pending.`}
          />

          <MetricCard
            label="Confirmed demand"
            value={formatMoney(metrics.confirmedValuePaise)}
            detail={`${formatMoney(
              metrics.pendingPotentialPaise,
            )} additional pending potential.`}
          />
        </section>

        <section className="mt-8">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.16em] text-emerald-700">
              All route workspaces
            </p>
            <h2 className="mt-1 text-2xl font-black">
              Daily dispatch readiness
            </h2>
          </div>

          <div className="mt-5 grid gap-5 xl:grid-cols-2">
            {dashboard.routes.map((route) => {
              const dispatchStatus =
                route.dispatchStatus ?? "NOT_STARTED";

              return (
                <article
                  key={route.routeId}
                  className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
                >
                  <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-black uppercase tracking-[0.14em] text-emerald-700">
                          {route.routeCode}
                        </span>

                        <span
                          className={`rounded-full px-3 py-1 text-xs font-black ${
                            route.dispatchStatus
                              ? dispatchStyles[
                                  route.dispatchStatus
                                ] ??
                                "bg-slate-100 text-slate-700"
                              : "bg-amber-50 text-amber-700"
                          }`}
                        >
                          {route.dispatchStatus
                            ? dispatchLabels[
                                route.dispatchStatus
                              ] ?? route.dispatchStatus
                            : "Dispatch not created"}
                        </span>

                        {route.reconciliationStatus && (
                          <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700">
                            Reconciliation{" "}
                            {route.reconciliationStatus.toLowerCase()}
                          </span>
                        )}
                      </div>

                      <h3 className="mt-2 text-xl font-black">
                        {route.routeName}
                      </h3>

                      <p className="mt-2 text-sm text-slate-500">
                        {route.vehicleCode ?? "No vehicle"} ·{" "}
                        {route.driverName ?? "No driver"} ·{" "}
                        {route.salesmanName ?? "No salesperson"}
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <Link
                        href={`/routes/${route.routeId}/dispatch`}
                        className="rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-black text-white"
                      >
                        {route.dispatchId
                          ? "Manage dispatch"
                          : "Build dispatch"}
                      </Link>

                      {route.dispatchId &&
                        ["FINALIZED", "DISPATCHED", "COMPLETED"].includes(
                          dispatchStatus,
                        ) && (
                          <Link
                            href={`/driver/dispatch/${route.dispatchId}`}
                            className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-black text-slate-700"
                          >
                            Driver view
                          </Link>
                        )}
                    </div>
                  </div>

                  <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <div className="rounded-xl bg-slate-50 p-3">
                      <p className="text-xs text-slate-400">
                        Signals
                      </p>
                      <p className="mt-1 text-lg font-black">
                        {route.totalSignals}
                      </p>
                    </div>

                    <div className="rounded-xl bg-emerald-50 p-3">
                      <p className="text-xs text-emerald-700">
                        Confirmed
                      </p>
                      <p className="mt-1 text-lg font-black text-emerald-900">
                        {route.confirmedSignals}
                      </p>
                    </div>

                    <div className="rounded-xl bg-amber-50 p-3">
                      <p className="text-xs text-amber-700">
                        Pending
                      </p>
                      <p className="mt-1 text-lg font-black text-amber-900">
                        {route.pendingSignals}
                      </p>
                    </div>

                    <div className="rounded-xl bg-red-50 p-3">
                      <p className="text-xs text-red-700">
                        Rejected
                      </p>
                      <p className="mt-1 text-lg font-black text-red-900">
                        {route.rejectedSignals}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-2xl border border-slate-200 p-4">
                      <p className="text-xs text-slate-400">
                        Confirmed demand
                      </p>
                      <p className="mt-1 text-xl font-black">
                        {formatMoney(route.confirmedValuePaise)}
                      </p>
                    </div>

                    <div className="rounded-2xl border border-slate-200 p-4">
                      <p className="text-xs text-slate-400">
                        Pending potential
                      </p>
                      <p className="mt-1 text-xl font-black">
                        {formatMoney(route.pendingPotentialPaise)}
                      </p>
                    </div>
                  </div>

                  {route.dispatchId && (
                    <>
                      <div className="mt-5">
                        <div className="flex justify-between text-xs font-bold text-slate-500">
                          <span>
                            {route.completedStops}/{route.totalStops} stops
                          </span>
                          <span>{route.progress}%</span>
                        </div>

                        <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-slate-100">
                          <div
                            className="h-full rounded-full bg-emerald-400"
                            style={{ width: `${route.progress}%` }}
                          />
                        </div>
                      </div>

                      <div className="mt-4 grid grid-cols-2 gap-3">
                        <div className="rounded-xl border border-slate-200 p-3">
                          <p className="text-xs text-slate-400">
                            Planned weight
                          </p>
                          <p className="mt-1 text-sm font-black">
                            {route.plannedWeightKg} kg
                          </p>
                        </div>

                        <div className="rounded-xl border border-slate-200 p-3">
                          <p className="text-xs text-slate-400">
                            Load points
                          </p>
                          <p className="mt-1 text-sm font-black">
                            {route.plannedLoadPoints}
                          </p>
                        </div>
                      </div>
                    </>
                  )}
                </article>
              );
            })}
          </div>
        </section>
      </div>
    </main>
  );
}