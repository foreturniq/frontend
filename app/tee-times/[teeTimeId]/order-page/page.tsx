"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";

type Offer = {
  id: string;
  name: string;
  description?: string;
  price_cents: number;
  category: string;
  fulfillment_type: string;
};

type LastOrderItem = {
  offer_id: string;
  item_name: string;
  quantity: number;
  unit_price_cents: number;
  available: boolean;
};

type LastOrder = {
  tee_time_date: string;
  items: LastOrderItem[];
};

type OrderPage = {
  tee_time_id: string;
  course_name: string;
  starts_at: string;
  minutes_since_tee_time: number;
  offers: Offer[];
  service_fee_cents: number;
  service_fee_label: string;
  last_order: LastOrder | null;
};

type Cart = Record<string, number>;

type OrderType = "before_round" | "at_turn" | "after_round";

const ORDER_TYPE_OPTIONS: { value: OrderType; label: string; hint: string }[] =
  [
    {
      value: "before_round",
      label: "Before Round",
      hint: "Ready ~20 min before tee time",
    },
    {
      value: "at_turn",
      label: "At the Turn",
      hint: "Ready ~1h 45min into your round",
    },
    {
      value: "after_round",
      label: "After Round",
      hint: "Ready ~4 hours after tee time",
    },
  ];

export default function TeeTimeOrderPage() {
  const params = useParams();
  const teeTimeId = params.teeTimeId as string;

  const [data, setData] = useState<OrderPage | null>(null);
  const [orderType, setOrderType] = useState<OrderType>("before_round");
  const [cart, setCart] = useState<Cart>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/tee-times/${teeTimeId}/order-page`,
    )
      .then((res) => res.json())
      .then((d) => {
        setData(d);
        const cutoff = new Date(d.starts_at).getTime() - 5 * 60 * 1000;
        if (Date.now() >= cutoff) {
          setOrderType("at_turn");
        }
      });
  }, [teeTimeId]);

  const availableOrderTypes = useMemo(() => {
    if (!data) return ORDER_TYPE_OPTIONS;
    const cutoff = new Date(data.starts_at).getTime() - 5 * 60 * 1000;
    return ORDER_TYPE_OPTIONS.filter(
      (opt) => opt.value !== "before_round" || Date.now() < cutoff,
    );
  }, [data]);

  const selectedItems = useMemo(() => {
    if (!data) return [];

    return data.offers
      .filter((offer) => cart[offer.id] > 0)
      .map((offer) => ({
        ...offer,
        quantity: cart[offer.id],
        line_total_cents: offer.price_cents * cart[offer.id],
      }));
  }, [cart, data]);

  const totalCents = selectedItems.reduce(
    (sum, item) => sum + item.line_total_cents,
    0,
  );

  function addToCart(offerId: string) {
    setCart((prev) => ({
      ...prev,
      [offerId]: (prev[offerId] || 0) + 1,
    }));
  }

  function removeFromCart(offerId: string) {
    setCart((prev) => ({
      ...prev,
      [offerId]: Math.max((prev[offerId] || 0) - 1, 0),
    }));
  }

  function quickReorder() {
    if (!data?.last_order) return;
    const newCart: Cart = {};
    for (const item of data.last_order.items) {
      if (item.available) {
        newCart[item.offer_id] = item.quantity;
      }
    }
    setCart(newCart);
  }

  async function submitOrder() {
    setLoading(true);

    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/orders`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        tee_time_id: teeTimeId,
        order_type: orderType,
        items: selectedItems.map((item) => ({
          offer_id: item.id,
          quantity: item.quantity,
        })),
      }),
    });

    const result = await res.json();

    if (!res.ok) {
      alert(result.error || "Unable to create order");
      setLoading(false);
      return;
    }

    const checkoutRes = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/checkout/session`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          order_id: result.order_id,
        }),
      },
    );

    const checkoutData = await checkoutRes.json();

    if (!checkoutRes.ok) {
      alert(checkoutData.error || "Unable to start checkout");
      setLoading(false);
      return;
    }

    window.location.href = checkoutData.checkout_url;
  }

  if (!data) {
    return (
      <main className="min-h-screen bg-neutral-950 text-white p-6">
        Loading...
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-neutral-950 text-white px-6 py-10">
      <div className="mx-auto max-w-md pb-32">
        <p className="text-sm text-green-400 font-medium">Foreturn IQ</p>

        <h1 className="mt-3 text-3xl font-bold">{data.course_name}</h1>

        <p className="mt-2 text-neutral-400">
          Tee time: {new Date(data.starts_at).toLocaleString()}
        </p>

        {data.last_order && (
          <div className="mt-8 rounded-xl border border-neutral-700 bg-neutral-900 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-wide text-green-400">
                  Last time you ordered
                </p>
                <p className="mt-0.5 text-sm text-neutral-400">
                  {new Date(data.last_order.tee_time_date).toLocaleDateString(
                    [],
                    { month: "long", day: "numeric" },
                  )}
                </p>
              </div>
              <button
                onClick={quickReorder}
                className="shrink-0 rounded-lg bg-green-500 px-3 py-2 text-sm font-semibold text-black"
              >
                Reorder
              </button>
            </div>
            <div className="mt-3 space-y-1">
              {data.last_order.items.map((item, i) => (
                <div
                  key={i}
                  className={`flex justify-between text-sm ${
                    item.available ? "text-neutral-200" : "text-neutral-600 line-through"
                  }`}
                >
                  <span>
                    {item.quantity}x {item.item_name}
                  </span>
                  <span>${(item.unit_price_cents / 100).toFixed(2)}</span>
                </div>
              ))}
              {data.last_order.items.some((i) => !i.available) && (
                <p className="mt-2 text-xs text-neutral-500">
                  Struck-through items are no longer available and won&apos;t be added.
                </p>
              )}
            </div>
          </div>
        )}

        <div className="mt-8">
          <h2 className="text-xl font-semibold">When would you like it?</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            {availableOrderTypes.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setOrderType(opt.value)}
                className={`rounded-xl border p-3 text-left transition-colors ${
                  orderType === opt.value
                    ? "border-green-500 bg-green-500/10"
                    : "border-neutral-800 bg-neutral-900 hover:border-neutral-700"
                }`}
              >
                <p className="font-semibold text-sm">{opt.label}</p>
                <p className="mt-1 text-xs text-neutral-400">{opt.hint}</p>
              </button>
            ))}
          </div>
        </div>

        <h2 className="mt-8 text-xl font-semibold">Available offers</h2>

        <div className="mt-4 space-y-4">
          {data.offers.length === 0 ? (
            <p className="text-neutral-400">No offers available right now.</p>
          ) : (
            data.offers.map((offer) => (
              <div
                key={offer.id}
                className="rounded-xl border border-neutral-800 bg-neutral-900 p-4"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="font-semibold">{offer.name}</h3>

                    {offer.description && (
                      <p className="mt-1 text-sm text-neutral-400">
                        {offer.description}
                      </p>
                    )}

                    <p className="mt-3 font-bold">
                      ${(offer.price_cents / 100).toFixed(2)}
                    </p>
                  </div>

                  <button
                    onClick={() => addToCart(offer.id)}
                    className="rounded-lg bg-green-500 px-3 py-2 text-sm font-semibold text-black"
                  >
                    Add
                  </button>
                </div>

                {cart[offer.id] > 0 && (
                  <div className="mt-4 flex items-center gap-3">
                    <button
                      onClick={() => removeFromCart(offer.id)}
                      className="rounded bg-neutral-800 px-3 py-1"
                    >
                      -
                    </button>

                    <span>{cart[offer.id]}</span>

                    <button
                      onClick={() => addToCart(offer.id)}
                      className="rounded bg-neutral-800 px-3 py-1"
                    >
                      +
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {selectedItems.length > 0 && (
        <div className="fixed inset-x-0 bottom-0 border-t border-neutral-800 bg-neutral-950 p-4">
          <div className="mx-auto max-w-md">
            <div className="mb-3 space-y-1.5 text-sm">
              <div className="flex justify-between text-neutral-400">
                <span>Subtotal</span>
                <span>${(totalCents / 100).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-neutral-400">
                <span>Sales Tax (8%)</span>
                <span>${(totalCents * 0.08 / 100).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-neutral-400">
                <span>
                  Service Fee{" "}
                  {data && (
                    <span className="text-xs text-neutral-500">
                      — {data.service_fee_label}
                    </span>
                  )}
                </span>
                <span>
                  {data?.service_fee_cents === 0
                    ? "Free"
                    : `$${((data?.service_fee_cents ?? 0) / 100).toFixed(2)}`}
                </span>
              </div>
              <div className="flex justify-between border-t border-neutral-800 pt-1.5 font-bold text-white">
                <span>Total</span>
                <span>
                  ${(
                    (totalCents * 1.08 + (data?.service_fee_cents ?? 0)) /
                    100
                  ).toFixed(2)}
                </span>
              </div>
            </div>

            <button
              onClick={submitOrder}
              disabled={loading}
              className="w-full rounded-lg bg-green-500 px-4 py-3 font-semibold text-black disabled:opacity-50"
            >
              {loading ? "Submitting..." : "Place order"}
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
