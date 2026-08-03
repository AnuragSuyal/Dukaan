type Metric = {
  label: string;
  value: string;
  change: string;
  description: string;
  accent: string;
};

const metrics: Metric[] = [
  {
    label: "Tomorrow's predicted demand",
    value: "₹1,84,320",
    change: "+12.4%",
    description: "Across 47 shops",
    accent: "bg-emerald-500",
  },
  {
    label: "Orders confirmed",
    value: "31 / 47",
    change: "66%",
    description: "Before van loading",
    accent: "bg-blue-500",
  },
  {
    label: "Collection expected",
    value: "₹47,300",
    change: "8 due",
    description: "Cash, UPI and credit",
    accent: "bg-amber-500",
  },
  {
    label: "Route readiness",
    value: "82%",
    change: "On track",
    description: "3 issues need review",
    accent: "bg-violet-500",
  },
];

const shops = [
  {
    shop: "Sharma General Store",
    route: "Route 04",
    prediction: "₹8,420",
    status: "Confirmed",
    products: "7 products",
    time: "10:00–11:00",
  },
  {
    shop: "Krishna Fast Food",
    route: "Route 04",
    prediction: "₹6,180",
    status: "Modified",
    products: "5 products",
    time: "Before 12:00",
  },
  {
    shop: "Gupta Provision Store",
    route: "Route 04",
    prediction: "₹11,260",
    status: "Awaiting",
    products: "9 products",
    time: "11:30–13:00",
  },
  {
    shop: "Ganga Bakery",
    route: "Route 07",
    prediction: "₹4,850",
    status: "Confirmed",
    products: "4 products",
    time: "09:30–10:30",
  },
  {
    shop: "Haridwar Juice Corner",
    route: "Route 07",
    prediction: "₹3,940",
    status: "No response",
    products: "6 products",
    time: "After 13:00",
  },
];

const vanLoad = [
  { product: "Coke 750 ml", confirmed: 28, reserve: 3, unit: "crates", percent: 91 },
  { product: "Water 1 litre", confirmed: 22, reserve: 4, unit: "cases", percent: 82 },
  { product: "Chips ₹10", confirmed: 14, reserve: 2, unit: "cartons", percent: 74 },
  { product: "Assorted biscuits", confirmed: 9, reserve: 2, unit: "cartons", percent: 58 },
];

const navItems = [
  ["Overview", "01"],
  ["Demand signals", "02"],
  ["Shop confirmations", "03"],
  ["Routes", "04"],
  ["Van loading", "05"],
  ["Deliveries", "06"],
  ["Collections", "07"],
  ["Reports", "08"],
];

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    Confirmed: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
    Modified: "bg-blue-50 text-blue-700 ring-blue-600/20",
    Awaiting: "bg-amber-50 text-amber-700 ring-amber-600/20",
    "No response": "bg-slate-100 text-slate-600 ring-slate-500/20",
  };

  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${
        styles[status] ?? styles["No response"]
      }`}
    >
      {status}
    </span>
  );
}

export default function Home() {
  return (
    <div className="min-h-screen bg-[#f5f7fb] text-slate-950">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-slate-800 bg-[#101722] text-white lg:flex lg:flex-col">
        <div className="flex h-20 items-center border-b border-slate-800 px-6">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-400 font-black text-slate-950">
            DS
          </div>
          <div className="ml-3">
            <p className="text-base font-bold tracking-tight">DukaanSignal</p>
            <p className="text-xs text-slate-400">Distribution intelligence</p>
          </div>
        </div>

        <nav className="flex-1 space-y-1 px-3 py-6">
          {navItems.map(([label, number], index) => (
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
          <p className="mt-2 text-sm font-semibold">Haridwar Distribution Co.</p>
          <p className="mt-1 text-xs leading-5 text-slate-400">
            Mock data is active. Database connection comes next.
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
                  Predict, confirm, load and deliver before demand is missed.
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
                  Tomorrow&apos;s dispatch intelligence
                </div>
                <h2 className="mt-5 max-w-2xl text-3xl font-black tracking-tight sm:text-4xl">
                  Know the order before the van leaves.
                </h2>
                <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-300 sm:text-base">
                  DukaanSignal has identified 47 shops likely to require
                  replenishment. Thirty-one have already confirmed or modified
                  their suggested orders.
                </p>

                <div className="mt-7 flex flex-wrap gap-3">
                  <button className="rounded-xl bg-emerald-400 px-4 py-2.5 text-sm font-bold text-slate-950 hover:bg-emerald-300">
                    Review demand signals
                  </button>
                  <button className="rounded-xl border border-slate-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800">
                    Open confirmation queue
                  </button>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold">Route preparation</p>
                  <p className="text-sm font-bold text-emerald-300">82%</p>
                </div>
                <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-800">
                  <div className="h-full w-[82%] rounded-full bg-emerald-400" />
                </div>

                <div className="mt-6 grid grid-cols-2 gap-3">
                  {[
                    ["47", "Shops analysed"],
                    ["31", "Orders confirmed"],
                    ["4", "Routes prepared"],
                    ["3", "Issues pending"],
                  ].map(([value, label]) => (
                    <div
                      key={label}
                      className="rounded-xl border border-slate-800 bg-slate-950/50 p-3"
                    >
                      <p className="text-xl font-black">{value}</p>
                      <p className="mt-1 text-xs text-slate-400">{label}</p>
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
                <div className={`h-1.5 w-10 rounded-full ${metric.accent}`} />
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
                  <h3 className="font-bold">Shop confirmation queue</h3>
                  <p className="mt-1 text-sm text-slate-500">
                    Suggested orders for tomorrow&apos;s routes
                  </p>
                </div>
                <button className="text-sm font-semibold text-emerald-700 hover:text-emerald-800">
                  View all
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[760px] text-left">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/70 text-xs uppercase tracking-wide text-slate-400">
                      <th className="px-6 py-3 font-semibold">Shop</th>
                      <th className="px-4 py-3 font-semibold">Suggested value</th>
                      <th className="px-4 py-3 font-semibold">Products</th>
                      <th className="px-4 py-3 font-semibold">Window</th>
                      <th className="px-6 py-3 font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {shops.map((shop) => (
                      <tr
                        key={shop.shop}
                        className="border-b border-slate-100 last:border-0 hover:bg-slate-50/70"
                      >
                        <td className="px-6 py-4">
                          <p className="text-sm font-bold">{shop.shop}</p>
                          <p className="mt-1 text-xs text-slate-400">
                            {shop.route}
                          </p>
                        </td>
                        <td className="px-4 py-4 text-sm font-semibold">
                          {shop.prediction}
                        </td>
                        <td className="px-4 py-4 text-sm text-slate-600">
                          {shop.products}
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
                  <h3 className="font-bold">Van 03 loading plan</h3>
                  <p className="mt-1 text-sm text-slate-500">
                    Route 04 · departure 08:30
                  </p>
                </div>
                <span className="rounded-lg bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700">
                  91% capacity
                </span>
              </div>

              <div className="mt-6 space-y-5">
                {vanLoad.map((item) => (
                  <div key={item.product}>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-bold">{item.product}</p>
                        <p className="mt-1 text-xs text-slate-400">
                          {item.confirmed} confirmed + {item.reserve} reserve{" "}
                          {item.unit}
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
              </div>

              <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4">
                <p className="text-sm font-bold text-amber-900">
                  One stock issue detected
                </p>
                <p className="mt-1 text-xs leading-5 text-amber-700">
                  Water 1 litre requires four additional reserve cases, but only
                  two are currently available.
                </p>
              </div>

              <button className="mt-5 w-full rounded-xl border border-slate-200 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50">
                Open complete loading sheet
              </button>
            </article>
          </section>

          <section className="mt-6 grid gap-6 lg:grid-cols-3">
            {[
              {
                step: "01",
                title: "Predict demand",
                text: "Analyse each shop's reorder cycle, quantities and buying patterns.",
                status: "47 signals ready",
              },
              {
                step: "02",
                title: "Confirm on WhatsApp",
                text: "Retailers confirm, modify or reject the suggested requirement.",
                status: "31 responses",
              },
              {
                step: "03",
                title: "Prepare dispatch",
                text: "Combine orders into picking sheets, van loads and delivery routes.",
                status: "4 routes prepared",
              },
            ].map((item) => (
              <article
                key={item.step}
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black tracking-[0.18em] text-emerald-600">
                    STEP {item.step}
                  </span>
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                    {item.status}
                  </span>
                </div>
                <h3 className="mt-5 text-lg font-black">{item.title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  {item.text}
                </p>
              </article>
            ))}
          </section>

          <footer className="py-8 text-center text-xs text-slate-400">
            DukaanSignal pilot dashboard · UI foundation · Mock operational data
          </footer>
        </div>
      </main>
    </div>
  );
}
