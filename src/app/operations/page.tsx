import Link from "next/link";
import {
  getOperationsDashboard,
  type OperationsAlert,
} from "@/lib/operations-dashboard";

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
    return "No dispatch cycle";
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
      <p className="mt-2 text-2xl font-black tracking-tight">
        {value}
      </p>
      <p className="mt-2 text-xs leading-5 text-slate-400">
        {detail}
      </p>
    </article>
  );
}

function alertStyle(severity: OperationsAlert["severity"]) {
  switch (severity) {
    case "critical":
      return "border-red-200 bg-red-50 text-red-900";
    case "warning":
      return "border-amber-200 bg-amber-50 text-amber-900";
    default:
      return "border-blue-200 bg-blue-50 text-blue-900";
  }
}

export default async function OperationsPage() {
  const dashboard = await getOperationsDashboard();
  const metrics = dashboard.metrics;

  const routeProgress =
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
              href="/"
              className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-950 text-xl font-black text-emerald-400"
            >
              ←
            </Link>

            <div>
              <p className="text-xs font-black uppercase tracking-[0.16em] text-emerald-700">
                DukaanSignal
              </p>
              <h1 className="mt-1 text-xl font-black sm:text-2xl">
                Distributor operations control
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <p className="text-sm font-bold text-slate-500">
              {formatDate(dashboard.cycleDate)}
            </p>

            <Link
              href="/operations"
              className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-black text-slate-700 shadow-sm hover:bg-slate-50"
            >
              Refresh data
            </Link>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-[1500px] px-5 py-7 sm:px-8">
        <section className="overflow-hidden rounded-3xl bg-slate-950 p-6 text-white shadow-xl sm:p-8">
          <div className="flex flex-col justify-between gap-8 xl:flex-row xl:items-end">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-300">
                Latest dispatch cycle
              </p>

              <h2 className="mt-3 max-w-3xl text-3xl font-black tracking-tight sm:text-4xl">
                Live route, revenue and reconciliation visibility
              </h2>

              <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-300">
                Monitor fulfillment, collections, credit exposure,
                exceptions and vehicle operations from one control
                centre.
              </p>
            </div>

            <div className="w-full max-w-xl rounded-2xl border border-slate-800 bg-slate-900 p-5">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs text-slate-400">
                    Overall route progress
                  </p>
                  <p className="mt-1 text-2xl font-black">
                    {metrics.completedStops}/{metrics.totalStops}
                  </p>
                </div>

                <p className="text-3xl font-black text-emerald-300">
                  {routeProgress}%
                </p>
              </div>

              <div className="mt-4 h-3 overflow-hidden rounded-full bg-slate-800">
                <div
                  className="h-full rounded-full bg-emerald-400"
                  style={{ width: `${routeProgress}%` }}
                />
              </div>

              <div className="mt-4 flex justify-between text-xs text-slate-400">
                <span>{metrics.activeRoutes} active routes</span>
                <span>
                  {metrics.completedRoutes} completed routes
                </span>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            label="Expected route sales"
            value={formatMoney(metrics.expectedValuePaise)}
            detail="Confirmed retailer demand for this dispatch cycle."
          />

          <MetricCard
            label="Delivered value"
            value={formatMoney(metrics.deliveredValuePaise)}
            detail="Value of products successfully handed to retailers."
          />

          <MetricCard
            label="Collections"
            value={formatMoney(metrics.collectedPaise)}
            detail="Current-order and old-outstanding collections."
          />

          <MetricCard
            label="Credit extended"
            value={formatMoney(metrics.creditExtendedPaise)}
            detail="New retailer credit created during delivery."
          />

          <MetricCard
            label="Current outstanding"
            value={formatMoney(
              metrics.currentOutstandingPaise,
            )}
            detail="Latest balance across retailers in this cycle."
          />

          <MetricCard
            label="Delivery exceptions"
            value={metrics.exceptionStops.toString()}
            detail={`${metrics.missingUnits} missing and ${metrics.damagedUnits} damaged units.`}
          />

          <MetricCard
            label="Routes completed"
            value={`${metrics.completedRoutes}/${metrics.totalRoutes}`}
            detail="Routes that reached completed dispatch status."
          />

          <MetricCard
            label="Stops completed"
            value={`${metrics.completedStops}/${metrics.totalStops}`}
            detail="Delivered, partial, failed and skipped stops."
          />
        </section>

        <section className="mt-8 grid gap-6 xl:grid-cols-[1fr_380px]">
          <div>
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.16em] text-emerald-700">
                  Route control
                </p>
                <h2 className="mt-1 text-2xl font-black">
                  Dispatch operations
                </h2>
              </div>

              <Link
                href="/routes"
                className="text-sm font-black text-emerald-700"
              >
                Open all routes →
              </Link>
            </div>

            <div className="mt-4 space-y-4">
              {dashboard.routes.length === 0 && (
                <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
                  No dispatches were found.
                </div>
              )}

              {dashboard.routes.map((route) => (
                <article
                  key={route.dispatchId}
                  className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
                >
                  <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                    <div>
                      <div className="flex flex-wrap items-center gap-3">
                        <p className="text-xs font-black uppercase tracking-[0.14em] text-emerald-700">
                          {route.routeCode}
                        </p>

                        <span
                          className={`rounded-full px-3 py-1 text-xs font-black ${
                            dispatchStyles[
                              route.dispatchStatus
                            ] ??
                            "bg-slate-100 text-slate-700"
                          }`}
                        >
                          {dispatchLabels[
                            route.dispatchStatus
                          ] ?? route.dispatchStatus}
                        </span>

                        {route.reconciliationMatched && (
                          <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700">
                            Reconciled
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

                    <div className="flex gap-3">
                      <Link
                        href={`/routes/${route.routeId}/dispatch`}
                        className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-black text-slate-700"
                      >
                        Dispatch
                      </Link>

                      <Link
                        href={`/driver/dispatch/${route.dispatchId}`}
                        className="rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-black text-white"
                      >
                        Driver view
                      </Link>
                    </div>
                  </div>

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

                  <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
                    <div className="rounded-2xl bg-slate-50 p-4">
                      <p className="text-xs text-slate-400">
                        Expected
                      </p>
                      <p className="mt-1 font-black">
                        {formatMoney(route.expectedValuePaise)}
                      </p>
                    </div>

                    <div className="rounded-2xl bg-slate-50 p-4">
                      <p className="text-xs text-slate-400">
                        Delivered
                      </p>
                      <p className="mt-1 font-black">
                        {formatMoney(route.deliveredValuePaise)}
                      </p>
                    </div>

                    <div className="rounded-2xl bg-slate-50 p-4">
                      <p className="text-xs text-slate-400">
                        Collected
                      </p>
                      <p className="mt-1 font-black">
                        {formatMoney(route.collectedPaise)}
                      </p>
                    </div>

                    <div className="rounded-2xl bg-slate-50 p-4">
                      <p className="text-xs text-slate-400">
                        Credit
                      </p>
                      <p className="mt-1 font-black">
                        {formatMoney(
                          route.creditExtendedPaise,
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <div className="rounded-xl border border-slate-200 p-3">
                      <p className="text-xs text-slate-400">
                        Planned weight
                      </p>
                      <p className="mt-1 text-sm font-black">
                        {route.plannedWeightKg} kg ·{" "}
                        {route.weightUtilization ?? "—"}%
                      </p>
                    </div>

                    <div className="rounded-xl border border-slate-200 p-3">
                      <p className="text-xs text-slate-400">
                        Vehicle space
                      </p>
                      <p className="mt-1 text-sm font-black">
                        {route.plannedLoadPoints} points ·{" "}
                        {route.spaceUtilization ?? "—"}%
                      </p>
                    </div>

                    <div className="rounded-xl border border-slate-200 p-3">
                      <p className="text-xs text-slate-400">
                        Exceptions
                      </p>
                      <p className="mt-1 text-sm font-black">
                        {route.exceptionStops} stops ·{" "}
                        {route.missingUnits} missing
                      </p>
                    </div>

                    <div className="rounded-xl border border-slate-200 p-3">
                      <p className="text-xs text-slate-400">
                        Reconciliation
                      </p>
                      <p className="mt-1 text-sm font-black">
                        {route.reconciliationStatus ??
                          "Not created"}
                      </p>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>

          <aside>
            <div>
              <p className="text-xs font-black uppercase tracking-[0.16em] text-emerald-700">
                Attention required
              </p>
              <h2 className="mt-1 text-2xl font-black">
                Operational alerts
              </h2>
            </div>

            <div className="mt-4 space-y-3">
              {dashboard.alerts.length === 0 && (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
                  <p className="font-black text-emerald-800">
                    No critical operational alerts
                  </p>
                  <p className="mt-2 text-sm leading-6 text-emerald-700">
                    Capacity, assignments and reconciliation currently
                    appear healthy.
                  </p>
                </div>
              )}

              {dashboard.alerts.map((alert) => (
                <Link
                  key={alert.id}
                  href={`/routes/${alert.routeId}/dispatch`}
                  className={`block rounded-2xl border p-4 ${alertStyle(
                    alert.severity,
                  )}`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-xs font-black uppercase tracking-wider">
                      {alert.routeCode}
                    </p>
                    <span className="text-[11px] font-black uppercase">
                      {alert.severity}
                    </span>
                  </div>

                  <p className="mt-2 font-black">{alert.title}</p>
                  <p className="mt-1 text-sm leading-6 opacity-80">
                    {alert.message}
                  </p>
                </Link>
              ))}
            </div>

            <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="font-black">Payment mix</h3>
              <p className="mt-1 text-sm text-slate-500">
                Collected value by recorded payment method.
              </p>

              <div className="mt-4 space-y-3">
                {[
                  ["Cash", dashboard.paymentMix.cashPaise],
                  ["UPI", dashboard.paymentMix.upiPaise],
                  ["Bank transfer", dashboard.paymentMix.bankPaise],
                  ["Mixed", dashboard.paymentMix.mixedPaise],
                ].map(([label, value]) => (
                  <div
                    key={label}
                    className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3"
                  >
                    <p className="text-sm font-bold text-slate-600">
                      {label}
                    </p>
                    <p className="font-black">
                      {formatMoney(value as number)}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          </aside>
        </section>
      </div>
    </main>
  );
}