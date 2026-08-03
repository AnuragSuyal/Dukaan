"use client";

import { useMemo, useState } from "react";

type ConfirmationItem = {
  id: string;
  productName: string;
  brand: string | null;
  packSize: string | null;
  unit: string;
  suggestedQuantity: number;
  unitPricePaise: number;
  confidence: number;
  reason: string;
};

type ConfirmationClientProps = {
  token: string;
  shopName: string;
  ownerName: string | null;
  distributorName: string;
  deliveryDate: string;
  deliveryWindow: string;
  initialStatus: string;
  items: ConfirmationItem[];
};

type SubmissionState =
  | { type: "idle" }
  | { type: "loading" }
  | { type: "success"; message: string }
  | { type: "error"; message: string };

function formatMoney(paise: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(paise / 100);
}

export default function ConfirmationClient({
  token,
  shopName,
  ownerName,
  distributorName,
  deliveryDate,
  deliveryWindow,
  initialStatus,
  items,
}: ConfirmationClientProps) {
  const [quantities, setQuantities] = useState<Record<string, number>>(
    Object.fromEntries(
      items.map((item) => [item.id, item.suggestedQuantity]),
    ),
  );

  const [note, setNote] = useState("");
  const [submission, setSubmission] =
    useState<SubmissionState>({ type: "idle" });

  const totalPaise = useMemo(
    () =>
      items.reduce(
        (total, item) =>
          total +
          item.unitPricePaise * (quantities[item.id] ?? 0),
        0,
      ),
    [items, quantities],
  );

  const totalUnits = useMemo(
    () =>
      Object.values(quantities).reduce(
        (total, quantity) => total + quantity,
        0,
      ),
    [quantities],
  );

  function updateQuantity(itemId: string, quantity: number) {
    setQuantities((current) => ({
      ...current,
      [itemId]: Math.max(0, Math.min(999, quantity)),
    }));
  }

  async function submitOrder(action: "confirm" | "reject") {
    setSubmission({ type: "loading" });

    try {
      const response = await fetch(`/api/confirm/${token}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action,
          note,
          items: items.map((item) => ({
            itemId: item.id,
            quantity: quantities[item.id] ?? 0,
          })),
        }),
      });

      const result = (await response.json()) as {
        message?: string;
        error?: string;
      };

      if (!response.ok) {
        throw new Error(result.error ?? "Order could not be updated.");
      }

      setSubmission({
        type: "success",
        message:
          result.message ??
          "Your response has been recorded successfully.",
      });
    } catch (error) {
      setSubmission({
        type: "error",
        message:
          error instanceof Error
            ? error.message
            : "Something went wrong. Please try again.",
      });
    }
  }

  if (submission.type === "success") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-100 px-5 py-10">
        <section className="w-full max-w-md rounded-3xl bg-white p-7 text-center shadow-xl">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-3xl">
            ✓
          </div>

          <h1 className="mt-5 text-2xl font-black text-slate-950">
            Response recorded
          </h1>

          <p className="mt-3 text-sm leading-6 text-slate-500">
            {submission.message}
          </p>

          <div className="mt-6 rounded-2xl bg-slate-50 p-4 text-left">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Shop
            </p>
            <p className="mt-1 font-bold text-slate-900">{shopName}</p>

            <p className="mt-4 text-xs font-bold uppercase tracking-wider text-slate-400">
              Supplier
            </p>
            <p className="mt-1 font-bold text-slate-900">
              {distributorName}
            </p>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-100 pb-36 text-slate-950">
      <header className="bg-slate-950 px-5 pb-8 pt-6 text-white">
        <div className="mx-auto max-w-lg">
          <div className="flex items-center justify-between">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-400 font-black text-slate-950">
              DS
            </div>

            <span className="rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold text-slate-200">
              {initialStatus}
            </span>
          </div>

          <p className="mt-7 text-xs font-bold uppercase tracking-[0.18em] text-emerald-300">
            Suggested replenishment
          </p>

          <h1 className="mt-2 text-3xl font-black tracking-tight">
            Confirm tomorrow&apos;s order
          </h1>

          <p className="mt-3 text-sm leading-6 text-slate-300">
            Hello {ownerName ?? "shop owner"}, review the suggested
            quantities before {distributorName} prepares the delivery.
          </p>
        </div>
      </header>

      <div className="mx-auto max-w-lg px-4">
        <section className="-mt-4 grid grid-cols-2 gap-3">
          <div className="rounded-2xl bg-white p-4 shadow-sm">
            <p className="text-xs font-semibold text-slate-400">
              Delivery date
            </p>
            <p className="mt-1 text-sm font-black">{deliveryDate}</p>
          </div>

          <div className="rounded-2xl bg-white p-4 shadow-sm">
            <p className="text-xs font-semibold text-slate-400">
              Preferred time
            </p>
            <p className="mt-1 text-sm font-black">{deliveryWindow}</p>
          </div>
        </section>

        <section className="mt-5">
          <div className="flex items-end justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-700">
                {shopName}
              </p>
              <h2 className="mt-1 text-xl font-black">
                Suggested products
              </h2>
            </div>

            <p className="text-sm font-bold text-slate-500">
              {items.length} items
            </p>
          </div>

          <div className="mt-4 space-y-3">
            {items.map((item) => {
              const quantity = quantities[item.id] ?? 0;

              return (
                <article
                  key={item.id}
                  className={`rounded-2xl border bg-white p-4 shadow-sm ${
                    quantity === 0
                      ? "border-slate-200 opacity-60"
                      : "border-slate-200"
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <h3 className="font-black">{item.productName}</h3>

                      <p className="mt-1 text-xs text-slate-500">
                        {[item.brand, item.packSize, item.unit]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>

                      <p className="mt-3 text-sm font-bold text-slate-900">
                        {formatMoney(item.unitPricePaise)} per {item.unit}
                      </p>
                    </div>

                    <span className="rounded-lg bg-emerald-50 px-2 py-1 text-[11px] font-bold text-emerald-700">
                      {item.confidence}% likely
                    </span>
                  </div>

                  <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-4">
                    <button
                      type="button"
                      aria-label={`Reduce ${item.productName}`}
                      onClick={() =>
                        updateQuantity(item.id, quantity - 1)
                      }
                      className="flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 bg-white text-xl font-bold shadow-sm active:scale-95"
                    >
                      −
                    </button>

                    <div className="text-center">
                      <input
                        aria-label={`${item.productName} quantity`}
                        inputMode="numeric"
                        value={quantity}
                        onChange={(event) =>
                          updateQuantity(
                            item.id,
                            Number(event.target.value) || 0,
                          )
                        }
                        className="w-20 rounded-xl border border-slate-200 px-3 py-2 text-center text-xl font-black outline-none focus:border-emerald-500"
                      />
                      <p className="mt-1 text-[11px] text-slate-400">
                        {item.unit}
                      </p>
                    </div>

                    <button
                      type="button"
                      aria-label={`Increase ${item.productName}`}
                      onClick={() =>
                        updateQuantity(item.id, quantity + 1)
                      }
                      className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-950 text-xl font-bold text-white shadow-sm active:scale-95"
                    >
                      +
                    </button>
                  </div>

                  <div className="mt-4 flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2.5">
                    <p className="text-xs text-slate-500">
                      {quantity === 0
                        ? "Removed from order"
                        : item.reason}
                    </p>

                    <p className="ml-3 whitespace-nowrap text-sm font-black">
                      {formatMoney(item.unitPricePaise * quantity)}
                    </p>
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        <section className="mt-5 rounded-2xl bg-white p-4 shadow-sm">
          <label
            htmlFor="merchant-note"
            className="text-sm font-black"
          >
            Delivery instructions
          </label>

          <textarea
            id="merchant-note"
            value={note}
            onChange={(event) => setNote(event.target.value)}
            rows={3}
            placeholder="Example: Deliver before 11 AM or collect 3 empty crates."
            className="mt-3 w-full resize-none rounded-xl border border-slate-200 p-3 text-sm outline-none focus:border-emerald-500"
          />
        </section>

        {submission.type === "error" && (
          <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700">
            {submission.message}
          </div>
        )}
      </div>

      <footer className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/95 px-4 py-4 backdrop-blur">
        <div className="mx-auto max-w-lg">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-400">
                Confirming {totalUnits} total units
              </p>
              <p className="text-xl font-black">
                {formatMoney(totalPaise)}
              </p>
            </div>

            <button
              type="button"
              disabled={submission.type === "loading"}
              onClick={() => submitOrder("reject")}
              className="rounded-xl px-3 py-2 text-sm font-bold text-red-600 disabled:opacity-50"
            >
              Not needed
            </button>
          </div>

          <button
            type="button"
            disabled={
              submission.type === "loading" || totalUnits === 0
            }
            onClick={() => submitOrder("confirm")}
            className="w-full rounded-2xl bg-emerald-400 py-4 text-base font-black text-slate-950 shadow-lg disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submission.type === "loading"
              ? "Saving response..."
              : "Confirm order"}
          </button>
        </div>
      </footer>
    </main>
  );
}