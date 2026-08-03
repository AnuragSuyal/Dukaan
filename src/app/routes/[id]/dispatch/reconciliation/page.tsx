import Link from "next/link";
import { notFound } from "next/navigation";
import { buildReconciliationWorkspace } from "@/lib/reconciliation";
import {
  createOrRefreshReconciliation,
  finalizeReconciliation,
} from "./actions";

export const dynamic = "force-dynamic";

type ReconciliationPageProps = {
  params: Promise<{
    id: string;
  }>;
  searchParams: Promise<{
    success?: string | string[];
    error?: string | string[];
  }>;
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

function rupeeInput(paise: number): string {
  return (paise / 100).toFixed(2);
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

function varianceText(value: number): string {
  if (value === 0) {
    return "Matched";
  }

  return value > 0
    ? `+${formatMoney(value)}`
    : formatMoney(value);
}

export default async function ReconciliationPage({
  params,
  searchParams,
}: ReconciliationPageProps) {
  const { id } = await params;
  const query = await searchParams;

  const workspace =
    await buildReconciliationWorkspace(id);

  if (!workspace) {
    notFound();
  }

  const success = firstValue(query.success);
  const error = firstValue(query.error);
  const reconciliation = workspace.reconciliation;
  const finalized =
    reconciliation?.status === "FINALIZED";

  return (
    <main className="min-h-screen bg-[#f5f7fb] text-slate-950">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-[1500px] items-center justify-between gap-4 px-5 py-5 sm:px-8">
          <div className="flex items-center gap-4">
            <Link
              href={`/routes/${id}/dispatch`}
              className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-950 text-xl font-black text-emerald-400"
            >
              ←
            </Link>

            <div>
              <p className="text-xs font-black uppercase tracking-[0.16em] text-emerald-700">
                End-of-route control
              </p>
              <h1 className="mt-1 text-xl font-black sm:text-2xl">
                Dispatch reconciliation
              </h1>
            </div>
          </div>

          <span
            className={`rounded-full px-3 py-1.5 text-xs font-black ${
              finalized
                ? "bg-emerald-50 text-emerald-700"
                : "bg-amber-50 text-amber-700"
            }`}
          >
            {reconciliation?.status ?? "NOT CREATED"}
          </span>
        </div>
      </header>

      <div className="mx-auto max-w-[1500px] px-5 py-7 sm:px-8">
        {success && (
          <div className="mb-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-bold text-emerald-800">
            {success}
          </div>
        )}

        {error && (
          <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-800">
            {error}
          </div>
        )}

        <section className="overflow-hidden rounded-3xl bg-slate-950 p-6 text-white shadow-xl sm:p-8">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-300">
            {workspace.dispatch.routeCode} ·{" "}
            {formatDate(workspace.dispatch.targetDate)}
          </p>

          <div className="mt-4 flex flex-col justify-between gap-7 xl:flex-row xl:items-end">
            <div>
              <h2 className="text-3xl font-black tracking-tight sm:text-4xl">
                Reconcile money and returned stock
              </h2>

              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">
                {workspace.dispatch.routeName} ·{" "}
                {workspace.dispatch.vehicleCode ?? "No vehicle"} ·{" "}
                {workspace.dispatch.driverName ?? "No driver"}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                [
                  "Stops completed",
                  `${workspace.completedStops}/${workspace.totalStops}`,
                ],
                [
                  "Delivered value",
                  formatMoney(
                    workspace.totalDeliveredValuePaise,
                  ),
                ],
                [
                  "Missing units",
                  workspace.totalMissingUnits,
                ],
                [
                  "Damaged units",
                  workspace.totalDamagedUnits,
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

          {!workspace.canFinalize && (
            <div className="mt-6 rounded-2xl border border-amber-500/30 bg-amber-400/10 p-4 text-sm font-bold text-amber-200">
              {workspace.activeStops} delivery stop
              {workspace.activeStops === 1 ? "" : "s"} remain active.
              Final reconciliation is blocked until every stop is
              closed.
            </div>
          )}
        </section>

        <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[
            ["Cash expected", workspace.expectedCashPaise],
            ["UPI expected", workspace.expectedUpiPaise],
            ["Bank expected", workspace.expectedBankPaise],
            ["Mixed collected", workspace.expectedMixedPaise],
            ["Credit extended", workspace.totalCreditPaise],
            [
              "Old outstanding collected",
              workspace.totalOutstandingCollectedPaise,
            ],
            [
              "Returns from shops",
              workspace.totalReturnedFromShopsUnits,
            ],
            ["Active stops", workspace.activeStops],
          ].map(([label, value]) => (
            <article
              key={label}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <p className="text-sm text-slate-500">{label}</p>
              <p className="mt-2 text-2xl font-black">
                {typeof value === "number" &&
                label !== "Returns from shops" &&
                label !== "Active stops"
                  ? formatMoney(value)
                  : value}
              </p>
            </article>
          ))}
        </section>

        <section className="mt-6">
          <form action={createOrRefreshReconciliation}>
            <input
              type="hidden"
              name="routeId"
              value={id}
            />
            <input
              type="hidden"
              name="dispatchId"
              value={workspace.dispatch.id}
            />

            <button
              type="submit"
              disabled={finalized}
              className="rounded-xl bg-slate-950 px-5 py-3 text-sm font-black text-white disabled:opacity-40"
            >
              {reconciliation
                ? "Refresh and reset draft values"
                : "Create reconciliation draft"}
            </button>
          </form>
        </section>

        {reconciliation && (
          <form
            action={finalizeReconciliation}
            className="mt-6 space-y-6"
          >
            <input
              type="hidden"
              name="routeId"
              value={id}
            />
            <input
              type="hidden"
              name="dispatchId"
              value={workspace.dispatch.id}
            />
            <input
              type="hidden"
              name="reconciliationId"
              value={reconciliation.id}
            />

            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-100 px-5 py-5 sm:px-6">
                <h2 className="font-black">
                  Financial reconciliation
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Compare system expectations with warehouse and
                  accounting verification.
                </p>
              </div>

              <div className="grid gap-4 p-5 sm:grid-cols-2 xl:grid-cols-4 sm:p-6">
                {[
                  {
                    label: "Cash",
                    expected: reconciliation.expectedCashPaise,
                    actual: reconciliation.declaredCashPaise,
                    variance: reconciliation.cashVariancePaise,
                    field: "declaredCashRupees",
                  },
                  {
                    label: "UPI",
                    expected: reconciliation.expectedUpiPaise,
                    actual: reconciliation.verifiedUpiPaise,
                    variance: reconciliation.upiVariancePaise,
                    field: "verifiedUpiRupees",
                  },
                  {
                    label: "Bank transfer",
                    expected: reconciliation.expectedBankPaise,
                    actual: reconciliation.verifiedBankPaise,
                    variance: reconciliation.bankVariancePaise,
                    field: "verifiedBankRupees",
                  },
                  {
                    label: "Mixed payment",
                    expected: reconciliation.expectedMixedPaise,
                    actual: reconciliation.declaredMixedPaise,
                    variance: reconciliation.mixedVariancePaise,
                    field: "declaredMixedRupees",
                  },
                ].map((payment) => (
                  <article
                    key={payment.label}
                    className="rounded-2xl border border-slate-200 p-4"
                  >
                    <p className="font-black">{payment.label}</p>

                    <p className="mt-3 text-xs text-slate-400">
                      Expected
                    </p>
                    <p className="mt-1 text-lg font-black">
                      {formatMoney(payment.expected)}
                    </p>

                    <label className="mt-4 block">
                      <span className="text-xs font-bold">
                        Verified amount
                      </span>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        name={payment.field}
                        defaultValue={rupeeInput(payment.actual)}
                        readOnly={finalized}
                        className="mt-2 w-full rounded-xl border border-slate-200 p-3 font-black read-only:bg-slate-100"
                      />
                    </label>

                    {finalized && (
                      <p className="mt-3 text-xs font-bold text-slate-500">
                        Variance:{" "}
                        {varianceText(payment.variance)}
                      </p>
                    )}
                  </article>
                ))}
              </div>
            </section>

            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-100 px-5 py-5 sm:px-6">
                <h2 className="font-black">
                  Vehicle stock reconciliation
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Expected return includes reserve stock and products
                  not successfully delivered.
                </p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[1050px] text-left">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50 text-xs uppercase tracking-wide text-slate-400">
                      <th className="px-6 py-4 font-bold">Product</th>
                      <th className="px-4 py-4 font-bold">Loaded</th>
                      <th className="px-4 py-4 font-bold">Delivered</th>
                      <th className="px-4 py-4 font-bold">Missing</th>
                      <th className="px-4 py-4 font-bold">Damaged</th>
                      <th className="px-4 py-4 font-bold">
                        Shop returns
                      </th>
                      <th className="px-4 py-4 font-bold">
                        Expected van return
                      </th>
                      <th className="px-6 py-4 font-bold">
                        Actual counted
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {workspace.products.map((product) => {
                      return (
                        <tr
                          key={product.productId}
                          className="border-b border-slate-100 last:border-0"
                        >
                          <td className="px-6 py-5">
                            <p className="text-sm font-black">
                              {product.productName}
                            </p>
                            <p className="mt-1 text-xs text-slate-400">
                              {product.sku} · {product.unit}
                            </p>
                          </td>

                          <td className="px-4 py-5 font-black">
                            {product.loadedQuantity}
                          </td>

                          <td className="px-4 py-5 font-black text-emerald-700">
                            {product.deliveredQuantity}
                          </td>

                          <td className="px-4 py-5 font-bold text-amber-700">
                            {product.missingQuantity}
                          </td>

                          <td className="px-4 py-5 font-bold text-red-700">
                            {product.damagedQuantity}
                          </td>

                          <td className="px-4 py-5 font-bold text-blue-700">
                            {product.returnedFromShopsQuantity}
                          </td>

                          <td className="px-4 py-5 font-black">
                            {product.expectedReturnQuantity}
                          </td>

                          <td className="px-6 py-5">                            {product.reconciliationItemId && (
                              <input
                                type="number"
                                min="0"
                                step="1"
                                name={`actualReturn:${product.reconciliationItemId}`}
                                defaultValue={product.actualReturnQuantity}
                                readOnly={finalized}
                                className="w-24 rounded-xl border border-slate-200 p-3 text-center font-black read-only:bg-slate-100"
                              />
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              <label className="block">
                <span className="font-black">
                  Reconciliation note
                </span>
                <textarea
                  name="note"
                  rows={4}
                  maxLength={1000}
                  defaultValue={reconciliation.note ?? ""}
                  readOnly={finalized}
                  placeholder="Explain cash differences, stock variance, pending replacements or warehouse findings."
                  className="mt-3 w-full resize-none rounded-xl border border-slate-200 p-3 text-sm read-only:bg-slate-100"
                />
              </label>

              <button
                type="submit"
                disabled={!workspace.canFinalize || finalized}
                className="mt-5 w-full rounded-2xl bg-emerald-400 py-4 text-base font-black text-slate-950 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {finalized
                  ? "Reconciliation finalized"
                  : "Finalize and lock reconciliation"}
              </button>
            </section>
          </form>
        )}
      </div>
    </main>
  );
}