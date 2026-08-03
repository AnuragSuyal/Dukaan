import Link from "next/link";
import { notFound } from "next/navigation";
import PrintRouteSheet from "@/components/routes/PrintRouteSheet";
import { getDispatchWorkspace } from "@/lib/dispatches";
import {
  createOrRefreshDispatch,
  finalizeDispatch,
  markVehicleDeparted,
  optimizeDispatchForVehicle,
  startDispatchLoading,
  updateDispatchAssignment,
} from "./actions";

export const dynamic = "force-dynamic";

type DispatchPageProps = {
  params: Promise<{
    id: string;
  }>;
  searchParams: Promise<{
    success?: string | string[];
    error?: string | string[];
  }>;
};

const statusStyles: Record<string, string> = {
  DRAFT: "bg-violet-50 text-violet-700",
  LOADING: "bg-amber-50 text-amber-700",
  FINALIZED: "bg-emerald-50 text-emerald-700",
  DISPATCHED: "bg-blue-50 text-blue-700",
  COMPLETED: "bg-slate-100 text-slate-700",
  CANCELLED: "bg-red-50 text-red-700",
};

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
    year: "numeric",
  }).format(date);
}

export default async function DispatchPage({
  params,
  searchParams,
}: DispatchPageProps) {
  const { id } = await params;
  const query = await searchParams;
  const workspace = await getDispatchWorkspace(id);

  if (!workspace) {
    notFound();
  }

  const success = firstValue(query.success);
  const error = firstValue(query.error);

  const {
    route,
    plan,
    dispatch,
    manifestItems,
    vehicles,
    drivers,
    salesmen,
    recommendedVehicle,
    assignedWeightPercentage,
    assignedLoadPointPercentage,
  } = workspace;

  const locked =
    dispatch !== null &&
    ["FINALIZED", "DISPATCHED", "COMPLETED"].includes(
      dispatch.status,
    );

  return (
    <main className="min-h-screen bg-[#f5f7fb] text-slate-950">
      <header className="border-b border-slate-200 bg-white print:hidden">
        <div className="mx-auto flex max-w-[1500px] items-center justify-between gap-4 px-5 py-5 sm:px-8">
          <div className="flex items-center gap-4">
            <Link
              href={`/routes/${route.id}`}
              className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-950 text-lg font-black text-emerald-400"
            >
              ←
            </Link>

            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-700">
                Dispatch control
              </p>
              <h1 className="mt-1 text-xl font-black sm:text-2xl">
                {route.name}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href={`/routes/${route.id}/dispatch/split`}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 shadow-sm hover:bg-slate-50"
            >
              Split load
            </Link>

            <Link
              href={`/routes/${route.id}/dispatch/reconciliation`}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 shadow-sm hover:bg-slate-50"
            >
              Reconciliation
            </Link>

            <PrintRouteSheet />
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-[1500px] px-5 py-7 sm:px-8">
        {success && (
          <div className="mb-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-bold text-emerald-800 print:hidden">
            {success}
          </div>
        )}

        {error && (
          <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-800 print:hidden">
            {error}
          </div>
        )}

        <section className="overflow-hidden rounded-3xl bg-slate-950 text-white shadow-xl">
          <div className="grid gap-8 p-6 sm:p-8 lg:grid-cols-[1.3fr_0.7fr]">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-300">
                {route.code} · {formatDate(plan.targetDate)}
              </p>

              <h2 className="mt-4 text-3xl font-black tracking-tight sm:text-4xl">
                Vehicle-ready dispatch manifest
              </h2>

              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">
                Confirmed demand and reserve stock are converted into
                real weight and space requirements before departure.
              </p>

              <div className="mt-7 flex flex-wrap gap-3 print:hidden">
                <form action={createOrRefreshDispatch}>
                  <input type="hidden" name="routeId" value={route.id} />

                  <button
                    type="submit"
                    disabled={locked}
                    className="rounded-xl bg-emerald-400 px-4 py-3 text-sm font-black text-slate-950 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {dispatch
                      ? "Refresh manifest"
                      : "Create draft dispatch"}
                  </button>
                </form>

                <Link
                  href={`/routes/${route.id}`}
                  className="rounded-xl border border-slate-700 px-4 py-3 text-sm font-bold text-white"
                >
                  Loading plan
                </Link>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
              <div className="flex items-center justify-between">
                <p className="text-sm font-bold">Dispatch status</p>

                <span
                  className={`rounded-full px-3 py-1.5 text-xs font-black ${
                    dispatch
                      ? statusStyles[dispatch.status] ??
                        "bg-slate-100 text-slate-700"
                      : "bg-slate-800 text-slate-300"
                  }`}
                >
                  {dispatch?.status ?? "NOT CREATED"}
                </span>
              </div>

              <div className="mt-6 grid grid-cols-2 gap-3">
                {[
                  ["Confirmed shops", plan.confirmedShops],
                  ["Pending shops", plan.pendingShops],
                  ["Manifest products", manifestItems.length],
                  [
                    "Confirmed value",
                    formatMoney(plan.confirmedValuePaise),
                  ],
                ].map(([label, value]) => (
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
          <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Planned weight</p>
            <p className="mt-2 text-2xl font-black">
              {formatWeight(
                dispatch?.plannedWeightGrams ??
                  plan.plannedWeightGrams,
              )}
            </p>
            <p className="mt-2 text-xs text-slate-400">
              Confirmed stock plus reserve
            </p>
          </article>

          <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">
              Planned load points
            </p>
            <p className="mt-2 text-2xl font-black">
              {dispatch?.plannedLoadPoints ??
                plan.plannedLoadPoints}
            </p>
            <p className="mt-2 text-xs text-slate-400">
              Standardized vehicle-space units
            </p>
          </article>

          <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">
              Weight utilization
            </p>
            <p className="mt-2 text-2xl font-black">
              {assignedWeightPercentage === null
                ? "—"
                : `${assignedWeightPercentage}%`}
            </p>
            <p className="mt-2 text-xs text-slate-400">
              Against assigned vehicle limit
            </p>
          </article>

          <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">
              Space utilization
            </p>
            <p className="mt-2 text-2xl font-black">
              {assignedLoadPointPercentage === null
                ? "—"
                : `${assignedLoadPointPercentage}%`}
            </p>
            <p className="mt-2 text-xs text-slate-400">
              Against assigned load points
            </p>
          </article>
        </section>

        <section className="mt-6 grid gap-6 xl:grid-cols-[0.75fr_1.25fr]">
          <div className="space-y-6 print:hidden">
            <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              <h2 className="font-black">Vehicle recommendation</h2>

              <p className="mt-2 text-sm leading-6 text-slate-500">
                The smallest active vehicle that fits both weight and
                space is recommended.
              </p>

              {recommendedVehicle ? (
                <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                  <p className="text-xs font-black uppercase tracking-wider text-emerald-700">
                    Recommended
                  </p>
                  <p className="mt-2 text-lg font-black text-emerald-950">
                    {recommendedVehicle.code} ·{" "}
                    {recommendedVehicle.name}
                  </p>
                  <p className="mt-2 text-sm text-emerald-800">
                    Weight {recommendedVehicle.weightPercentage}% ·
                    Space {recommendedVehicle.loadPointPercentage}%
                  </p>
                </div>
              ) : (
                <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-800">
                  No active vehicle can safely carry this complete load.
                </div>
              )}

              <div className="mt-4 space-y-3">
                {vehicles.map((vehicle) => (
                  <div
                    key={vehicle.id}
                    className="rounded-xl border border-slate-200 p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-black">
                          {vehicle.code} · {vehicle.name}
                        </p>
                        <p className="mt-1 text-xs text-slate-400">
                          {vehicle.registrationNumber ??
                            "Registration not recorded"}
                        </p>
                      </div>

                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-bold ${
                          vehicle.fits
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-red-50 text-red-700"
                        }`}
                      >
                        {vehicle.fits ? "Fits" : "Over capacity"}
                      </span>
                    </div>

                    <p className="mt-3 text-xs text-slate-500">
                      Weight {vehicle.weightPercentage}% · Space{" "}
                      {vehicle.loadPointPercentage}%
                    </p>

                    {dispatch &&
                      !locked &&
                      !vehicle.fits &&
                      vehicle.canFitByReserveTrim && (
                        <form
                          action={optimizeDispatchForVehicle}
                          className="mt-3"
                        >
                          <input
                            type="hidden"
                            name="routeId"
                            value={route.id}
                          />
                          <input
                            type="hidden"
                            name="dispatchId"
                            value={dispatch.id}
                          />
                          <input
                            type="hidden"
                            name="vehicleId"
                            value={vehicle.id}
                          />

                          <button
                            type="submit"
                            className="w-full rounded-xl border border-amber-300 bg-amber-50 px-3 py-2.5 text-xs font-black text-amber-800 hover:bg-amber-100"
                          >
                            Trim optional reserve to fit
                          </button>
                        </form>
                      )}

                    {!vehicle.fits &&
                      !vehicle.canFitByReserveTrim && (
                        <p className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-xs font-bold text-red-700">
                          Confirmed demand itself exceeds this vehicle.
                        </p>
                      )}
                  </div>
                ))}
              </div>
            </article>

            {dispatch && (
              <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                <h2 className="font-black">Dispatch assignment</h2>

                <form
                  action={updateDispatchAssignment}
                  className="mt-5 space-y-4"
                >
                  <input
                    type="hidden"
                    name="routeId"
                    value={route.id}
                  />
                  <input
                    type="hidden"
                    name="dispatchId"
                    value={dispatch.id}
                  />

                  <label className="block">
                    <span className="text-sm font-bold">Vehicle</span>
                    <select
                      name="vehicleId"
                      defaultValue={
                        dispatch.vehicleId ??
                        recommendedVehicle?.id ??
                        ""
                      }
                      disabled={locked}
                      className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm"
                    >
                      <option value="">Select vehicle</option>
                      {vehicles.map((vehicle) => (
                        <option
                          key={vehicle.id}
                          value={vehicle.id}
                        >
                          {vehicle.code} · {vehicle.name} ·{" "}
                          {vehicle.fits ? "Fits" : "Over capacity"}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="block">
                    <span className="text-sm font-bold">Driver</span>
                    <select
                      name="driverId"
                      defaultValue={dispatch.driverId ?? ""}
                      disabled={locked}
                      className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm"
                    >
                      <option value="">Select driver</option>
                      {drivers.map((driver) => (
                        <option key={driver.id} value={driver.id}>
                          {driver.name} · {driver.employeeCode}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="block">
                    <span className="text-sm font-bold">
                      Salesperson
                    </span>
                    <select
                      name="salesmanId"
                      defaultValue={dispatch.salesmanId ?? ""}
                      disabled={locked}
                      className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm"
                    >
                      <option value="">Select salesperson</option>
                      {salesmen.map((salesman) => (
                        <option
                          key={salesman.id}
                          value={salesman.id}
                        >
                          {salesman.name} · {salesman.employeeCode}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="block">
                    <span className="text-sm font-bold">
                      Dispatch notes
                    </span>
                    <textarea
                      name="notes"
                      defaultValue={dispatch.notes ?? ""}
                      disabled={locked}
                      rows={3}
                      maxLength={500}
                      className="mt-2 w-full resize-none rounded-xl border border-slate-200 p-3 text-sm"
                      placeholder="Loading, return-crate or route instructions."
                    />
                  </label>

                  <button
                    type="submit"
                    disabled={locked}
                    className="w-full rounded-xl bg-slate-950 py-3 text-sm font-black text-white disabled:opacity-40"
                  >
                    Save assignments
                  </button>
                </form>

                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <form action={startDispatchLoading}>
                    <input
                      type="hidden"
                      name="routeId"
                      value={route.id}
                    />
                    <input
                      type="hidden"
                      name="dispatchId"
                      value={dispatch.id}
                    />

                    <button
                      type="submit"
                      disabled={dispatch.status !== "DRAFT"}
                      className="w-full rounded-xl border border-amber-300 bg-amber-50 py-3 text-sm font-black text-amber-800 disabled:opacity-40"
                    >
                      Start loading
                    </button>
                  </form>

                  <form action={finalizeDispatch}>
                    <input
                      type="hidden"
                      name="routeId"
                      value={route.id}
                    />
                    <input
                      type="hidden"
                      name="dispatchId"
                      value={dispatch.id}
                    />

                    <button
                      type="submit"
                      disabled={locked}
                      className="w-full rounded-xl bg-emerald-400 py-3 text-sm font-black text-slate-950 disabled:opacity-40"
                    >
                      Finalize dispatch
                    </button>
                  </form>
                </div>

                {dispatch.status === "FINALIZED" && (
                  <form
                    action={markVehicleDeparted}
                    className="mt-4"
                  >
                    <input
                      type="hidden"
                      name="routeId"
                      value={route.id}
                    />
                    <input
                      type="hidden"
                      name="dispatchId"
                      value={dispatch.id}
                    />

                    <button
                      type="submit"
                      className="w-full rounded-xl bg-blue-600 py-3.5 text-sm font-black text-white hover:bg-blue-700"
                    >
                      Mark vehicle departed
                    </button>
                  </form>
                )}

                {["FINALIZED", "DISPATCHED", "COMPLETED"].includes(
                  dispatch.status,
                ) && (
                  <Link
                    href={`/driver/dispatch/${dispatch.id}`}
                    target="_blank"
                    className="mt-3 flex w-full items-center justify-center rounded-xl border border-slate-200 bg-white py-3 text-sm font-black text-slate-800 hover:bg-slate-50"
                  >
                    Open mobile driver view
                  </Link>
                )}
              </article>
            )}
          </div>

          <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-5 py-5 sm:px-6">
              <h2 className="font-black">Dispatch manifest</h2>
              <p className="mt-1 text-sm text-slate-500">
                Product-level weight and vehicle-space calculation.
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[1050px] text-left">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50 text-xs uppercase tracking-wide text-slate-400">
                    <th className="px-6 py-4 font-bold">Product</th>
                    <th className="px-4 py-4 font-bold">Confirmed</th>
                    <th className="px-4 py-4 font-bold">Reserve</th>
                    <th className="px-4 py-4 font-bold">Load</th>
                    <th className="px-4 py-4 font-bold">Weight</th>
                    <th className="px-4 py-4 font-bold">Points</th>
                    <th className="px-6 py-4 text-right font-bold">
                      Value
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {manifestItems.map((item) => (
                    <tr
                      key={item.productId}
                      className="border-b border-slate-100 last:border-0"
                    >
                      <td className="px-6 py-5">
                        <p className="text-sm font-black">
                          {item.productName}
                        </p>
                        <p className="mt-1 text-xs text-slate-400">
                          {[item.brand, item.packSize, item.sku]
                            .filter(Boolean)
                            .join(" · ")}
                        </p>
                      </td>

                      <td className="px-4 py-5 text-sm font-bold">
                        {item.confirmedQuantity} {item.unit}
                      </td>

                      <td className="px-4 py-5 text-sm font-bold text-amber-700">
                        +{item.reserveQuantity} {item.unit}
                      </td>

                      <td className="px-4 py-5 text-sm font-black">
                        {item.plannedQuantity} {item.unit}
                      </td>

                      <td className="px-4 py-5 text-sm">
                        {formatWeight(item.plannedWeightGrams)}
                      </td>

                      <td className="px-4 py-5 text-sm font-bold">
                        {item.plannedLoadPoints}
                      </td>

                      <td className="px-6 py-5 text-right text-sm font-black">
                        {formatMoney(item.confirmedValuePaise)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </article>
        </section>
      </div>
    </main>
  );
}