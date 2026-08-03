"use client";

import { useMemo, useState } from "react";

type DeliveryItem = {
  id: string;
  productName: string;
  unit: string;
  orderedQuantity: number;
  unitPricePaise: number;
};

type ItemState = {
  delivered: number;
  missing: number;
  damaged: number;
  returned: number;
};

type DeliveryCompletionFormProps = {
  dispatchId: string;
  stopId: string;
  expectedValuePaise: number;
  oldOutstandingPaise: number;
  items: DeliveryItem[];
  action: (formData: FormData) => void | Promise<void>;
};

const paymentMethods = [
  ["CASH", "Cash"],
  ["UPI", "UPI"],
  ["BANK_TRANSFER", "Bank transfer"],
  ["CREDIT", "Credit"],
  ["MIXED", "Mixed payment"],
] as const;

function formatMoney(paise: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(paise / 100);
}

function rupeesInputValue(paise: number): string {
  return (paise / 100).toFixed(2);
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.max(minimum, Math.min(maximum, value));
}

export default function DeliveryCompletionForm({
  dispatchId,
  stopId,
  expectedValuePaise,
  oldOutstandingPaise,
  items,
  action,
}: DeliveryCompletionFormProps) {
  const [itemState, setItemState] = useState<Record<string, ItemState>>(
    Object.fromEntries(
      items.map((item) => [
        item.id,
        {
          delivered: item.orderedQuantity,
          missing: 0,
          damaged: 0,
          returned: 0,
        },
      ]),
    ),
  );

  const [paymentMethod, setPaymentMethod] = useState("CASH");

  const [mixedCurrentCollected, setMixedCurrentCollected] =
    useState(rupeesInputValue(expectedValuePaise));

  const [mixedCreditExtended, setMixedCreditExtended] =
    useState("0.00");

  const deliveredValuePaise = useMemo(
    () =>
      items.reduce((total, item) => {
        const state = itemState[item.id];

        return (
          total +
          item.unitPricePaise * (state?.delivered ?? 0)
        );
      }, 0),
    [itemState, items],
  );

  const deliveredUnits = useMemo(
    () =>
      Object.values(itemState).reduce(
        (total, state) => total + state.delivered,
        0,
      ),
    [itemState],
  );

  const missingUnits = useMemo(
    () =>
      Object.values(itemState).reduce(
        (total, state) => total + state.missing,
        0,
      ),
    [itemState],
  );

  const damagedUnits = useMemo(
    () =>
      Object.values(itemState).reduce(
        (total, state) => total + state.damaged,
        0,
      ),
    [itemState],
  );

  const currentCollected =
    paymentMethod === "CREDIT"
      ? "0.00"
      : paymentMethod === "MIXED"
        ? mixedCurrentCollected
        : rupeesInputValue(deliveredValuePaise);

  const creditExtended =
    paymentMethod === "CREDIT"
      ? rupeesInputValue(deliveredValuePaise)
      : paymentMethod === "MIXED"
        ? mixedCreditExtended
        : "0.00";

  function handlePaymentMethodChange(nextMethod: string) {
    setPaymentMethod(nextMethod);

    if (nextMethod === "MIXED") {
      setMixedCurrentCollected(
        rupeesInputValue(deliveredValuePaise),
      );
      setMixedCreditExtended("0.00");
    }
  }

  function updateDelivered(item: DeliveryItem, value: number) {
    setItemState((current) => {
      const existing = current[item.id];
      const delivered = clamp(value, 0, item.orderedQuantity);
      const remaining = item.orderedQuantity - delivered;
      const damaged = clamp(existing.damaged, 0, remaining);

      return {
        ...current,
        [item.id]: {
          ...existing,
          delivered,
          damaged,
          missing: remaining - damaged,
        },
      };
    });
  }

  function updateMissing(item: DeliveryItem, value: number) {
    setItemState((current) => {
      const existing = current[item.id];
      const maximum =
        item.orderedQuantity - existing.delivered;

      const missing = clamp(value, 0, maximum);

      return {
        ...current,
        [item.id]: {
          ...existing,
          missing,
          damaged: maximum - missing,
        },
      };
    });
  }

  function updateDamaged(item: DeliveryItem, value: number) {
    setItemState((current) => {
      const existing = current[item.id];
      const maximum =
        item.orderedQuantity - existing.delivered;

      const damaged = clamp(value, 0, maximum);

      return {
        ...current,
        [item.id]: {
          ...existing,
          damaged,
          missing: maximum - damaged,
        },
      };
    });
  }

  function updateReturned(item: DeliveryItem, value: number) {
    setItemState((current) => ({
      ...current,
      [item.id]: {
        ...current[item.id],
        returned: clamp(value, 0, 999),
      },
    }));
  }

  return (
    <form action={action} className="space-y-5">
      <input type="hidden" name="dispatchId" value={dispatchId} />
      <input type="hidden" name="stopId" value={stopId} />

      <section className="space-y-3">
        {items.map((item) => {
          const state = itemState[item.id];

          return (
            <article
              key={item.id}
              className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-black">{item.productName}</h3>
                  <p className="mt-1 text-xs text-slate-500">
                    Ordered: {item.orderedQuantity} {item.unit}
                  </p>
                </div>

                <p className="text-sm font-black">
                  {formatMoney(
                    item.unitPricePaise * state.delivered,
                  )}
                </p>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3">
                <label>
                  <span className="text-xs font-bold text-emerald-700">
                    Delivered
                  </span>
                  <input
                    type="number"
                    min="0"
                    max={item.orderedQuantity}
                    inputMode="numeric"
                    name={`delivered:${item.id}`}
                    value={state.delivered}
                    onChange={(event) =>
                      updateDelivered(
                        item,
                        Number(event.target.value) || 0,
                      )
                    }
                    className="mt-1.5 w-full rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-center text-lg font-black outline-none focus:border-emerald-500"
                  />
                </label>

                <label>
                  <span className="text-xs font-bold text-amber-700">
                    Missing
                  </span>
                  <input
                    type="number"
                    min="0"
                    max={item.orderedQuantity}
                    inputMode="numeric"
                    name={`missing:${item.id}`}
                    value={state.missing}
                    onChange={(event) =>
                      updateMissing(
                        item,
                        Number(event.target.value) || 0,
                      )
                    }
                    className="mt-1.5 w-full rounded-xl border border-amber-200 bg-amber-50 p-3 text-center text-lg font-black outline-none focus:border-amber-500"
                  />
                </label>

                <label>
                  <span className="text-xs font-bold text-red-700">
                    Damaged
                  </span>
                  <input
                    type="number"
                    min="0"
                    max={item.orderedQuantity}
                    inputMode="numeric"
                    name={`damaged:${item.id}`}
                    value={state.damaged}
                    onChange={(event) =>
                      updateDamaged(
                        item,
                        Number(event.target.value) || 0,
                      )
                    }
                    className="mt-1.5 w-full rounded-xl border border-red-200 bg-red-50 p-3 text-center text-lg font-black outline-none focus:border-red-500"
                  />
                </label>

                <label>
                  <span className="text-xs font-bold text-blue-700">
                    Old stock returned
                  </span>
                  <input
                    type="number"
                    min="0"
                    max="999"
                    inputMode="numeric"
                    name={`returned:${item.id}`}
                    value={state.returned}
                    onChange={(event) =>
                      updateReturned(
                        item,
                        Number(event.target.value) || 0,
                      )
                    }
                    className="mt-1.5 w-full rounded-xl border border-blue-200 bg-blue-50 p-3 text-center text-lg font-black outline-none focus:border-blue-500"
                  />
                </label>
              </div>

              <p className="mt-3 text-xs text-slate-400">
                Delivered + missing + damaged must equal the ordered
                quantity. The form keeps this balanced automatically.
              </p>
            </article>
          );
        })}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="font-black">Payment and credit</h2>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="rounded-xl bg-slate-50 p-3">
            <p className="text-xs text-slate-400">
              Original order value
            </p>
            <p className="mt-1 font-black">
              {formatMoney(expectedValuePaise)}
            </p>
          </div>

          <div className="rounded-xl bg-emerald-50 p-3">
            <p className="text-xs text-emerald-700">
              Delivered value
            </p>
            <p className="mt-1 font-black text-emerald-900">
              {formatMoney(deliveredValuePaise)}
            </p>
          </div>
        </div>

        <label className="mt-4 block">
          <span className="text-sm font-bold">Payment method</span>
          <select
            name="paymentMethod"
            value={paymentMethod}
            onChange={(event) => handlePaymentMethodChange(event.target.value)}
            className="mt-2 w-full rounded-xl border border-slate-200 bg-white p-3 text-sm"
          >
            {paymentMethods.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <label>
            <span className="text-xs font-bold">
              Current order collected
            </span>
            <input
              type="number"
              min="0"
              step="0.01"
              inputMode="decimal"
              name="currentOrderCollectedRupees"
              value={currentCollected}
              onChange={(event) =>
                setMixedCurrentCollected(event.target.value)
              }
              readOnly={paymentMethod !== "MIXED"}
              className="mt-1.5 w-full rounded-xl border border-slate-200 p-3 font-black"
            />
          </label>

          <label>
            <span className="text-xs font-bold">
              New credit extended
            </span>
            <input
              type="number"
              min="0"
              step="0.01"
              inputMode="decimal"
              name="creditExtendedRupees"
              value={creditExtended}
              onChange={(event) =>
                setMixedCreditExtended(event.target.value)
              }
              readOnly={paymentMethod !== "MIXED"}
              className="mt-1.5 w-full rounded-xl border border-slate-200 p-3 font-black"
            />
          </label>
        </div>

        <label className="mt-4 block">
          <span className="text-sm font-bold">
            Previous outstanding collected
          </span>
          <p className="mt-1 text-xs text-slate-400">
            Existing outstanding: {formatMoney(oldOutstandingPaise)}
          </p>
          <input
            type="number"
            min="0"
            max={(oldOutstandingPaise / 100).toFixed(2)}
            step="0.01"
            inputMode="decimal"
            name="outstandingCollectedRupees"
            defaultValue="0.00"
            className="mt-2 w-full rounded-xl border border-slate-200 p-3 font-black"
          />
        </label>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="font-black">Shopkeeper confirmation</h2>

        <label className="mt-4 block">
          <span className="text-sm font-bold">Shopkeeper name</span>
          <input
            type="text"
            name="shopkeeperName"
            maxLength={100}
            placeholder="Name of person receiving the delivery"
            className="mt-2 w-full rounded-xl border border-slate-200 p-3 text-sm"
          />
        </label>

        <label className="mt-4 block">
          <span className="text-sm font-bold">
            Six-digit confirmation code
          </span>
          <input
            type="text"
            name="confirmationCode"
            required
            inputMode="numeric"
            pattern="[0-9]{6}"
            maxLength={6}
            placeholder="Enter retailer OTP"
            className="mt-2 w-full rounded-xl border border-slate-200 p-3 text-center text-xl font-black tracking-[0.35em]"
          />
        </label>

        <label className="mt-4 block">
          <span className="text-sm font-bold">Driver note</span>
          <textarea
            name="driverNote"
            rows={3}
            maxLength={500}
            placeholder="Delivery issue, replacement promise, payment note, etc."
            className="mt-2 w-full resize-none rounded-xl border border-slate-200 p-3 text-sm"
          />
        </label>
      </section>

      <section className="rounded-2xl bg-slate-950 p-4 text-white">
        <div className="grid grid-cols-3 gap-3 text-center">
          <div>
            <p className="text-xs text-slate-400">Delivered</p>
            <p className="mt-1 text-xl font-black">{deliveredUnits}</p>
          </div>
          <div>
            <p className="text-xs text-slate-400">Missing</p>
            <p className="mt-1 text-xl font-black text-amber-300">
              {missingUnits}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-400">Damaged</p>
            <p className="mt-1 text-xl font-black text-red-300">
              {damagedUnits}
            </p>
          </div>
        </div>
      </section>

      <button
        type="submit"
        className="w-full rounded-2xl bg-emerald-400 py-4 text-base font-black text-slate-950 shadow-lg active:scale-[0.99]"
      >
        Complete this delivery stop
      </button>
    </form>
  );
}