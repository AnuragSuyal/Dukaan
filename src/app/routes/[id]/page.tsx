import Link from "next/link";
import { notFound } from "next/navigation";
import PrintRouteSheet from "@/components/routes/PrintRouteSheet";
import { getRouteDetailData } from "@/lib/routes";

export const dynamic = "force-dynamic";

type RouteDetailPageProps = {
  params: Promise<{
    id: string;
  }>;
};

const statusStyles: Record<string, string> = {
  CONFIRMED:
    "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  MODIFIED:
    "bg-blue-50 text-blue-700 ring-blue-600/20",
  SENT:
    "bg-amber-50 text-amber-700 ring-amber-600/20",
  NO_RESPONSE:
    "bg-orange-50 text-orange-700 ring-orange-600/20",
  DRAFT:
    "bg-violet-50 text-violet-700 ring-violet-600/20",
  REJECTED:
    "bg-red-50 text-red-700 ring-red-600/20",
  EXPIRED:
    "bg-slate-100 text-slate-600 ring-slate-500/20",
};

function formatMoney(paise: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(paise / 100);
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

export default async function RouteDetailPage({
  params,
}: RouteDetailPageProps) {
  const { id } = await params;
  const data = await getRouteDetailData(id);

  if (!data) {
    notFound();
  }

  const plannedHandlingUnits = data.loadItems.reduce(
    (total, item) => total + item.plannedLoadQuantity,
    0,
  );

  return (
    <main className="min-h-screen bg-[#f5f7fb] text-slate-950">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-[1500px] items-center justify-between gap-4 px-5 py-5 sm:px-8">
          <div className="flex items-center gap-4">
            <Link
              href="/routes"
              className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-950 text-lg font-black text-emerald-400"
            >
              ←
            </Link>

            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-700">
                Route loading control
              </p>
              <h1 className="mt-1 text-xl font-black sm:text-2xl">
                {data.route.name}
              </h1>
            </div>
          </div>

          <PrintRouteSheet />
        </div>
      </header>

      <div className="mx-auto max-w-[1500px] px-5 py-7 sm:px-8">
        <section className="overflow-hidden rounded-3xl bg-slate-950 text-white shadow-xl">
          <div className="grid gap-8 p-6 sm:p-8 lg:grid-cols-[1.3fr_0.7fr]">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-300">
                {data.route.code} · {formatDate(data.targetDate)}
              </p>

              <h2 className="mt-4 text-3xl font-black tracking-tight sm:text-4xl">
                Warehouse loading plan
              </h2>

              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">
                Load confirmed retailer demand first, then add the
                recommended reserve quantity for normal route selling.
              </p>

              <div className="mt-7 flex flex-wrap gap-3">
                <Link
                  href="/signals"
                  className="rounded-xl bg-emerald-400 px-4 py-3 text-sm font-black text-slate-950"
                >
                  Review pending shops
                </Link>

                <Link
                  href="/routes"
                  className="rounded-xl border border-slate-700 px-4 py-3 text-sm font-bold text-white"
                >
                  All routes
                </Link>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
              <div className="flex items-center justify-between">
                <p className="text-sm font-bold">Route readiness</p>
                <p className="text-xl font-black text-emerald-300">
                  {data.readiness}%
                </p>
              </div>

              <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-800">
                <div
                  className="h-full rounded-full bg-emerald-400"
                  style={{
                    width: `${data.readiness}%`,
                  }}
                />
              </div>

              <div className="mt-6 grid grid-cols-2 gap-3">
                {[
                  ["Confirmed", data.confirmedShops],
                  ["Pending", data.pendingShops],
                  ["Products", data.uniqueProducts],
                  ["Planned units", plannedHandlingUnits],
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

        <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          {[
            {
              label: "Confirmed value",
              value: formatMoney(data.confirmedValuePaise),
              note: `${data.confirmedShops} confirmed shops`,
            },
            {
              label: "Suggested value",
              value: formatMoney(data.suggestedValuePaise),
              note: `${data.totalSignals} total signals`,
            },
            {
              label: "Confirmed units",
              value: data.handlingUnits.toString(),
              note: "Cartons, crates, cases and boxes",
            },
            {
              label: "Planned load",
              value: plannedHandlingUnits.toString(),
              note: "Confirmed quantity plus reserve",
            },
            {
              label: "Rejected or expired",
              value: data.rejectedShops.toString(),
              note: `${data.pendingShops} still pending`,
            },
          ].map((metric) => (
            <article
              key={metric.label}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <p className="text-sm font-medium text-slate-500">
                {metric.label}
              </p>
              <p className="mt-2 text-2xl font-black">
                {metric.value}
              </p>
              <p className="mt-2 text-xs text-slate-400">
                {metric.note}
              </p>
            </article>
          ))}
        </section>

        <section className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-5 py-5 sm:px-6">
            <h2 className="font-black">
              Warehouse picking and van loading
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Reserve stock is currently calculated as 10% of confirmed
              quantity.
            </p>
          </div>

          <div className="hidden overflow-x-auto md:block">
            <table className="w-full min-w-[1000px] text-left">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50 text-xs uppercase tracking-wide text-slate-400">
                  <th className="px-6 py-4 font-bold">Product</th>
                  <th className="px-4 py-4 font-bold">Confirmed</th>
                  <th className="px-4 py-4 font-bold">Reserve</th>
                  <th className="px-4 py-4 font-bold">Load total</th>
                  <th className="px-4 py-4 font-bold">
                    Pending potential
                  </th>
                  <th className="px-6 py-4 text-right font-bold">
                    Confirmed value
                  </th>
                </tr>
              </thead>

              <tbody>
                {data.loadItems.map((item) => (
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

                    <td className="px-4 py-5 text-sm font-black">
                      {item.confirmedQuantity} {item.unit}
                    </td>

                    <td className="px-4 py-5 text-sm font-bold text-amber-700">
                      +{item.reserveQuantity} {item.unit}
                    </td>

                    <td className="px-4 py-5">
                      <span className="rounded-xl bg-slate-950 px-3 py-2 text-sm font-black text-white">
                        {item.plannedLoadQuantity} {item.unit}
                      </span>
                    </td>

                    <td className="px-4 py-5 text-sm text-slate-600">
                      {item.pendingPotentialQuantity} {item.unit}
                    </td>

                    <td className="px-6 py-5 text-right text-sm font-black">
                      {formatMoney(item.confirmedValuePaise)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="space-y-3 p-4 md:hidden">
            {data.loadItems.map((item) => (
              <article
                key={item.productId}
                className="rounded-2xl border border-slate-200 p-4"
              >
                <h3 className="font-black">{item.productName}</h3>
                <p className="mt-1 text-xs text-slate-400">
                  {item.packSize ?? item.unit}
                </p>

                <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-xl bg-slate-50 p-3">
                    <p className="text-xs text-slate-400">
                      Confirmed
                    </p>
                    <p className="mt-1 font-black">
                      {item.confirmedQuantity}
                    </p>
                  </div>

                  <div className="rounded-xl bg-amber-50 p-3">
                    <p className="text-xs text-amber-700">
                      Reserve
                    </p>
                    <p className="mt-1 font-black text-amber-800">
                      +{item.reserveQuantity}
                    </p>
                  </div>

                  <div className="rounded-xl bg-slate-950 p-3 text-white">
                    <p className="text-xs text-slate-400">Load</p>
                    <p className="mt-1 font-black">
                      {item.plannedLoadQuantity}
                    </p>
                  </div>
                </div>

                <p className="mt-4 text-right font-black">
                  {formatMoney(item.confirmedValuePaise)}
                </p>
              </article>
            ))}
          </div>
        </section>

        <section className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-5 py-5 sm:px-6">
            <h2 className="font-black">Shops on this route</h2>
            <p className="mt-1 text-sm text-slate-500">
              Confirmation, value and retailer instructions.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[1000px] text-left">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50 text-xs uppercase tracking-wide text-slate-400">
                  <th className="px-6 py-4 font-bold">Shop</th>
                  <th className="px-4 py-4 font-bold">Window</th>
                  <th className="px-4 py-4 font-bold">Status</th>
                  <th className="px-4 py-4 font-bold">Suggested</th>
                  <th className="px-4 py-4 font-bold">Confirmed</th>
                  <th className="px-4 py-4 font-bold">Changes</th>
                  <th className="px-6 py-4 text-right font-bold">
                    Action
                  </th>
                </tr>
              </thead>

              <tbody>
                {data.shops.map((shop) => (
                  <tr
                    key={shop.signalId}
                    className="border-b border-slate-100 last:border-0"
                  >
                    <td className="px-6 py-5">
                      <p className="text-sm font-black">
                        {shop.shopName}
                      </p>
                      <p className="mt-1 text-xs text-slate-400">
                        {shop.ownerName ?? "Owner not recorded"} ·{" "}
                        {shop.locality ?? "No locality"}
                      </p>

                      {shop.merchantNote && (
                        <p className="mt-2 max-w-md text-xs text-blue-700">
                          Note: {shop.merchantNote}
                        </p>
                      )}
                    </td>

                    <td className="px-4 py-5 text-sm text-slate-600">
                      {shop.preferredWindow ?? "Not specified"}
                    </td>

                    <td className="px-4 py-5">
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-bold ring-1 ring-inset ${
                          statusStyles[shop.status] ??
                          "bg-slate-100 text-slate-600 ring-slate-500/20"
                        }`}
                      >
                        {shop.statusLabel}
                      </span>
                    </td>

                    <td className="px-4 py-5 text-sm font-bold">
                      {formatMoney(shop.suggestedValuePaise)}
                    </td>

                    <td className="px-4 py-5 text-sm font-black">
                      {shop.confirmedValuePaise > 0
                        ? formatMoney(shop.confirmedValuePaise)
                        : "—"}
                    </td>

                    <td className="px-4 py-5 text-sm">
                      {shop.modifiedProductCount}
                    </td>

                    <td className="px-6 py-5 text-right">
                      <Link
                        href={`/signals/${shop.signalId}`}
                        className="rounded-xl bg-slate-950 px-3 py-2 text-xs font-bold text-white"
                      >
                        Inspect
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}