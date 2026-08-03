import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type RunsPageProps = {
  params: Promise<{
    id: string;
  }>;
  searchParams: Promise<{
    success?: string | string[];
    error?: string | string[];
  }>;
};

const runStatusLabels: Record<string, string> = {
  DRAFT: "Draft",
  LOADING: "Loading",
  FINALIZED: "Ready",
  DISPATCHED: "On route",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

const runStatusStyles: Record<string, string> = {
  DRAFT: "bg-slate-100 text-slate-700",
  LOADING: "bg-amber-50 text-amber-700",
  FINALIZED: "bg-blue-50 text-blue-700",
  DISPATCHED: "bg-violet-50 text-violet-700",
  COMPLETED: "bg-emerald-50 text-emerald-700",
  CANCELLED: "bg-red-50 text-red-700",
};

function firstValue(
  value: string | string[] | undefined,
): string {
  return Array.isArray(value)
    ? value[0] ?? ""
    : value ?? "";
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

export default async function DispatchRunsPage({
  params,
  searchParams,
}: RunsPageProps) {
  const { id } = await params;
  const query = await searchParams;

  const dispatch =
    await prisma.dispatch.findFirst({
      where: {
        routeId: id,
      },
      orderBy: {
        targetDate: "desc",
      },
      include: {
        route: true,
        runs: {
          include: {
            vehicle: true,
            driver: true,
            salesman: true,
            shopAssignments: {
              include: {
                shop: true,
              },
              orderBy: {
                sequence: "asc",
              },
            },
            items: {
              include: {
                product: true,
              },
              orderBy: [
                {
                  plannedLoadPoints: "desc",
                },
                {
                  productId: "asc",
                },
              ],
            },
          },
          orderBy: {
            runNumber: "asc",
          },
        },
      },
    });

  if (!dispatch) {
    notFound();
  }

  const success = firstValue(query.success);
  const error = firstValue(query.error);

  const totals = dispatch.runs.reduce(
    (result, run) => ({
      shops:
        result.shops +
        run.shopAssignments.length,

      expectedValuePaise:
        result.expectedValuePaise +
        run.expectedValuePaise,

      plannedWeightGrams:
        result.plannedWeightGrams +
        run.plannedWeightGrams,

      plannedLoadPoints:
        result.plannedLoadPoints +
        run.plannedLoadPoints,
    }),
    {
      shops: 0,
      expectedValuePaise: 0,
      plannedWeightGrams: 0,
      plannedLoadPoints: 0,
    },
  );

  return (
    <main className="min-h-screen bg-[#f5f7fb] pb-12 text-slate-950">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-[1500px] flex-col justify-between gap-4 px-5 py-5 sm:px-8 lg:flex-row lg:items-center">
          <div className="flex items-center gap-4">
            <Link
              href={`/routes/${id}/dispatch`}
              className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-950 text-xl font-black text-emerald-400"
            >
              ←
            </Link>

            <div>
              <p className="text-xs font-black uppercase tracking-[0.16em] text-emerald-700">
                Multi-vehicle dispatch
              </p>

              <h1 className="mt-1 text-xl font-black sm:text-2xl">
                Persistent vehicle runs
              </h1>
            </div>
          </div>

          <Link
            href={`/routes/${id}/dispatch/split`}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-black text-slate-700 shadow-sm"
          >
            Review split preview
          </Link>
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

        <section className="rounded-3xl bg-slate-950 p-6 text-white shadow-xl sm:p-8">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-300">
            {dispatch.route.code} ·{" "}
            {formatDate(dispatch.targetDate)}
          </p>

          <div className="mt-4 flex flex-col justify-between gap-7 xl:flex-row xl:items-end">
            <div>
              <h2 className="text-3xl font-black tracking-tight sm:text-4xl">
                {dispatch.route.name}
              </h2>

              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">
                Each run has a separate vehicle, shop
                allocation and confirmed product
                manifest.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
                <p className="text-xl font-black">
                  {dispatch.runs.length}
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  Vehicle runs
                </p>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
                <p className="text-xl font-black">
                  {totals.shops}
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  Assigned shops
                </p>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
                <p className="text-xl font-black">
                  {formatWeight(
                    totals.plannedWeightGrams,
                  )}
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  Confirmed weight
                </p>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
                <p className="text-xl font-black">
                  {formatMoney(
                    totals.expectedValuePaise,
                  )}
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  Confirmed value
                </p>
              </div>
            </div>
          </div>
        </section>

        {dispatch.runs.length === 0 && (
          <section className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-6">
            <h2 className="font-black text-amber-900">
              No persistent runs created
            </h2>

            <p className="mt-2 text-sm leading-6 text-amber-800">
              Open the split preview and generate a safe
              allocation first.
            </p>

            <Link
              href={`/routes/${id}/dispatch/split`}
              className="mt-4 inline-flex rounded-xl bg-slate-950 px-4 py-3 text-sm font-black text-white"
            >
              Open split preview
            </Link>
          </section>
        )}

        <section className="mt-6 space-y-6">
          {dispatch.runs.map((run) => {
            const weightUtilization =
              run.vehicle &&
              run.vehicle.maxWeightGrams > 0
                ? Math.round(
                    (run.plannedWeightGrams /
                      run.vehicle.maxWeightGrams) *
                      100,
                  )
                : null;

            const spaceUtilization =
              run.vehicle &&
              run.vehicle.maxLoadPoints > 0
                ? Math.round(
                    (run.plannedLoadPoints /
                      run.vehicle.maxLoadPoints) *
                      100,
                  )
                : null;

            return (
              <article
                key={run.id}
                className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm"
              >
                <div className="bg-slate-950 p-5 text-white sm:p-6">
                  <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
                    <div>
                      <div className="flex flex-wrap items-center gap-3">
                        <p className="text-xs font-black uppercase tracking-[0.16em] text-emerald-300">
                          Run {run.runNumber}
                        </p>

                        <span
                          className={`rounded-full px-3 py-1 text-xs font-black ${
                            runStatusStyles[run.status] ??
                            "bg-slate-100 text-slate-700"
                          }`}
                        >
                          {runStatusLabels[run.status] ??
                            run.status}
                        </span>
                      </div>

                      <h3 className="mt-2 text-2xl font-black">
                        {run.vehicle?.code ??
                          "No vehicle"}{" "}
                        ·{" "}
                        {run.vehicle?.name ??
                          "Vehicle not assigned"}
                      </h3>

                      <p className="mt-2 text-sm text-slate-400">
                        {run.driver?.name ??
                          "Driver not assigned"}{" "}
                        ·{" "}
                        {run.salesman?.name ??
                          "Salesperson not assigned"}
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                      <div className="rounded-xl border border-slate-800 bg-slate-900 p-3">
                        <p className="text-lg font-black">
                          {run.shopAssignments.length}
                        </p>
                        <p className="mt-1 text-xs text-slate-400">
                          Shops
                        </p>
                      </div>

                      <div className="rounded-xl border border-slate-800 bg-slate-900 p-3">
                        <p className="text-lg font-black">
                          {formatWeight(
                            run.plannedWeightGrams,
                          )}
                        </p>
                        <p className="mt-1 text-xs text-slate-400">
                          {weightUtilization ?? "—"}%
                          weight
                        </p>
                      </div>

                      <div className="rounded-xl border border-slate-800 bg-slate-900 p-3">
                        <p className="text-lg font-black">
                          {run.plannedLoadPoints}
                        </p>
                        <p className="mt-1 text-xs text-slate-400">
                          {spaceUtilization ?? "—"}%
                          space
                        </p>
                      </div>

                      <div className="rounded-xl border border-slate-800 bg-slate-900 p-3">
                        <p className="text-lg font-black">
                          {formatMoney(
                            run.expectedValuePaise,
                          )}
                        </p>
                        <p className="mt-1 text-xs text-slate-400">
                          Order value
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid lg:grid-cols-[1fr_1.2fr]">
                  <section className="border-b border-slate-200 p-5 lg:border-b-0 lg:border-r sm:p-6">
                    <h4 className="font-black">
                      Assigned shop sequence
                    </h4>

                    <div className="mt-4 space-y-3">
                      {run.shopAssignments.map(
                        (assignment) => (
                          <div
                            key={assignment.id}
                            className="flex items-start gap-3 rounded-xl bg-slate-50 p-3"
                          >
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-950 text-xs font-black text-emerald-400">
                              {assignment.sequence}
                            </div>

                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-black">
                                {assignment.shop.name}
                              </p>

                              <p className="mt-1 text-xs text-slate-500">
                                {assignment.shop.locality ??
                                  "No locality"}{" "}
                                ·{" "}
                                {formatWeight(
                                  assignment.plannedWeightGrams,
                                )}{" "}
                                ·{" "}
                                {
                                  assignment.plannedLoadPoints
                                }{" "}
                                points
                              </p>
                            </div>

                            <p className="text-sm font-black">
                              {formatMoney(
                                assignment.expectedValuePaise,
                              )}
                            </p>
                          </div>
                        ),
                      )}
                    </div>
                  </section>

                  <section className="p-5 sm:p-6">
                    <h4 className="font-black">
                      Product loading manifest
                    </h4>

                    <div className="mt-4 overflow-x-auto">
                      <table className="w-full min-w-[650px] text-left">
                        <thead>
                          <tr className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-400">
                            <th className="pb-3 font-bold">
                              Product
                            </th>
                            <th className="pb-3 font-bold">
                              Quantity
                            </th>
                            <th className="pb-3 font-bold">
                              Weight
                            </th>
                            <th className="pb-3 font-bold">
                              Points
                            </th>
                            <th className="pb-3 font-bold">
                              Value
                            </th>
                          </tr>
                        </thead>

                        <tbody>
                          {run.items.map((item) => (
                            <tr
                              key={item.id}
                              className="border-b border-slate-100 last:border-0"
                            >
                              <td className="py-4">
                                <p className="text-sm font-black">
                                  {item.product.name}
                                </p>

                                <p className="mt-1 text-xs text-slate-400">
                                  {item.product.sku} ·{" "}
                                  {item.product.unit}
                                </p>
                              </td>

                              <td className="py-4 font-black">
                                {item.plannedQuantity}
                              </td>

                              <td className="py-4 font-bold">
                                {formatWeight(
                                  item.plannedWeightGrams,
                                )}
                              </td>

                              <td className="py-4 font-bold">
                                {item.plannedLoadPoints}
                              </td>

                              <td className="py-4 font-black">
                                {formatMoney(
                                  item.confirmedValuePaise,
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </section>
                </div>
              </article>
            );
          })}
        </section>
      </div>
    </main>
  );
}