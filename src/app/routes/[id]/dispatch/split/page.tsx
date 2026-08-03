import Link from "next/link";
import { notFound } from "next/navigation";
import { buildDispatchSplitPreview } from "@/lib/dispatch-split";

export const dynamic = "force-dynamic";

type SplitPageProps = {
  params: Promise<{
    id: string;
  }>;
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
    year: "numeric",
  }).format(date);
}

export default async function SplitPreviewPage({
  params,
}: SplitPageProps) {
  const { id } = await params;

  const preview =
    await buildDispatchSplitPreview(id);

  if (!preview) {
    notFound();
  }

  const hasPlan =
    preview.recommendedRuns.length > 0;

  return (
    <main className="min-h-screen bg-[#f5f7fb] pb-12 text-slate-950">
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
                Capacity planning
              </p>
              <h1 className="mt-1 text-xl font-black sm:text-2xl">
                Multi-vehicle split preview
              </h1>
            </div>
          </div>

          <span className="rounded-full bg-blue-50 px-3 py-1.5 text-xs font-black text-blue-700">
            Preview only
          </span>
        </div>
      </header>

      <div className="mx-auto max-w-[1500px] px-5 py-7 sm:px-8">
        <section className="rounded-3xl bg-slate-950 p-6 text-white shadow-xl sm:p-8">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-300">
            {preview.dispatch.routeCode} ·{" "}
            {formatDate(
              preview.dispatch.targetDate,
            )}
          </p>

          <div className="mt-4 flex flex-col justify-between gap-7 xl:flex-row xl:items-end">
            <div>
              <h2 className="text-3xl font-black tracking-tight sm:text-4xl">
                Split confirmed shops into safe vehicle runs
              </h2>

              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">
                {preview.dispatch.routeName}. Each
                retailer order remains together rather
                than splitting individual shop products
                between vehicles.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
                <p className="text-xl font-black">
                  {preview.confirmedDemand.shops}
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  Confirmed shops
                </p>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
                <p className="text-xl font-black">
                  {formatWeight(
                    preview.confirmedDemand.weightGrams,
                  )}
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  Confirmed weight
                </p>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
                <p className="text-xl font-black">
                  {preview.confirmedDemand.loadPoints}
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  Confirmed points
                </p>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
                <p className="text-xl font-black">
                  {formatMoney(
                    preview.confirmedDemand
                      .expectedValuePaise,
                  )}
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  Confirmed value
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">
              Current manifest
            </p>
            <p className="mt-2 text-2xl font-black">
              {formatWeight(
                preview.dispatch
                  .currentManifestWeightGrams,
              )}
            </p>
            <p className="mt-2 text-xs text-slate-400">
              Includes optional reserve stock.
            </p>
          </article>

          <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">
              Current manifest space
            </p>
            <p className="mt-2 text-2xl font-black">
              {
                preview.dispatch
                  .currentManifestLoadPoints
              }
            </p>
            <p className="mt-2 text-xs text-slate-400">
              Route-level planned load points.
            </p>
          </article>

          <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">
              Recommended runs
            </p>
            <p className="mt-2 text-2xl font-black">
              {preview.recommendedRuns.length}
            </p>
            <p className="mt-2 text-xs text-slate-400">
              Minimum feasible active vehicles.
            </p>
          </article>

          <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">
              One vehicle possible
            </p>
            <p className="mt-2 text-2xl font-black">
              {preview.singleVehicleFits
                ? "Yes"
                : "No"}
            </p>
            <p className="mt-2 text-xs text-slate-400">
              Confirmed demand only.
            </p>
          </article>
        </section>

        <section className="mt-6 rounded-2xl border border-blue-200 bg-blue-50 p-5">
          <p className="font-black text-blue-900">
            Confirmed-demand safety preview
          </p>
          <p className="mt-2 text-sm leading-6 text-blue-800">
            Optional reserve stock is excluded from
            this split. After confirmed shop orders are
            allocated safely, spare capacity can be used
            for run-level reserve stock.
          </p>
        </section>

        {preview.unassignableShops.length > 0 && (
          <section className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-5">
            <h2 className="font-black text-red-900">
              A shop order exceeds every vehicle
            </h2>

            <div className="mt-3 space-y-2">
              {preview.unassignableShops.map(
                (shop) => (
                  <p
                    key={shop.signalId}
                    className="text-sm text-red-800"
                  >
                    {shop.shopName}:{" "}
                    {formatWeight(shop.weightGrams)} ·{" "}
                    {shop.loadPoints} points
                  </p>
                ),
              )}
            </div>
          </section>
        )}

        {!hasPlan &&
          preview.unassignableShops.length === 0 && (
            <section className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-5">
              <h2 className="font-black text-red-900">
                No feasible fleet allocation found
              </h2>

              <p className="mt-2 text-sm leading-6 text-red-800">
                The active fleet cannot carry all
                confirmed shops while keeping each shop
                order together.
              </p>
            </section>
          )}

        {hasPlan && (
          <section className="mt-8">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.16em] text-emerald-700">
                Recommended allocation
              </p>
              <h2 className="mt-1 text-2xl font-black">
                {preview.recommendedRuns.length} safe
                vehicle runs
              </h2>
            </div>

            <div className="mt-5 grid gap-5 xl:grid-cols-2">
              {preview.recommendedRuns.map(
                (run) => (
                  <article
                    key={run.vehicleId}
                    className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm"
                  >
                    <div className="bg-slate-950 p-5 text-white sm:p-6">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="text-xs font-black uppercase tracking-[0.16em] text-emerald-300">
                            Run {run.runNumber}
                          </p>
                          <h3 className="mt-2 text-xl font-black">
                            {run.vehicleCode} ·{" "}
                            {run.vehicleName}
                          </h3>
                        </div>

                        <span className="rounded-full bg-emerald-400 px-3 py-1 text-xs font-black text-slate-950">
                          Safe
                        </span>
                      </div>

                      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
                        <div className="rounded-xl border border-slate-800 bg-slate-900 p-3">
                          <p className="text-lg font-black">
                            {run.shops.length}
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
                            {run.weightUtilization}% weight
                          </p>
                        </div>

                        <div className="rounded-xl border border-slate-800 bg-slate-900 p-3">
                          <p className="text-lg font-black">
                            {run.plannedLoadPoints}
                          </p>
                          <p className="mt-1 text-xs text-slate-400">
                            {run.spaceUtilization}% space
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

                    <div className="divide-y divide-slate-100">
                      {run.shops.map(
                        (shop, index) => (
                          <div
                            key={shop.signalId}
                            className="flex items-start gap-4 p-5"
                          >
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-950 text-sm font-black text-emerald-400">
                              {index + 1}
                            </div>

                            <div className="min-w-0 flex-1">
                              <p className="font-black">
                                {shop.shopName}
                              </p>

                              <p className="mt-1 text-xs text-slate-500">
                                {shop.ownerName ??
                                  "Owner not recorded"}{" "}
                                ·{" "}
                                {shop.locality ??
                                  "No locality"}
                              </p>

                              <p className="mt-2 text-xs text-slate-400">
                                {formatWeight(
                                  shop.weightGrams,
                                )}{" "}
                                · {shop.loadPoints} points ·{" "}
                                {shop.productLines} products
                              </p>
                            </div>

                            <p className="text-sm font-black">
                              {formatMoney(
                                shop.expectedValuePaise,
                              )}
                            </p>
                          </div>
                        ),
                      )}
                    </div>
                  </article>
                ),
              )}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}