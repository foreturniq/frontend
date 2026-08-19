"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "next/navigation";

type OfferCustomization = {
  id: string;
  label: string;
  price_cents: number;
};

type Offer = {
  id: string;
  name: string;
  description?: string;
  price_cents: number;
  category: string;
  fulfillment_type: string;
  customizations: OfferCustomization[];
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

type ActiveOrderItem = {
  item_name: string;
  quantity: number;
  line_total_cents: number;
};

type ActiveOrder = {
  order_id: string;
  pickup_code: string;
  status: string;
  order_type: string;
  total_cents: number;
  items: ActiveOrderItem[];
};

type OrderPage = {
  tee_time_id: string;
  course_name: string;
  starts_at: string;
  minutes_since_tee_time: number;
  offers: Offer[];
  last_order: LastOrder | null;
  active_orders: ActiveOrder[];
};

// Each cart entry is one independent instance of an offer.
type CartItem = {
  key: string;
  offerId: string;
  selectedCustomizationIds: string[];
};

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

let nextKey = 0;
function makeKey() {
  return String(++nextKey);
}

export default function TeeTimeOrderPage() {
  const params = useParams();
  const teeTimeId = params.teeTimeId as string;

  const [data, setData] = useState<OrderPage | null>(null);
  const [orderType, setOrderType] = useState<OrderType>("before_round");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [showReview, setShowReview] = useState(false);
  const [tipMode, setTipMode] = useState<"none" | 15 | 20 | 25 | "custom">(
    "none",
  );
  const [customTipDollars, setCustomTipDollars] = useState("");

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

  function offerById(offerId: string): Offer | undefined {
    return data?.offers.find((o) => o.id === offerId);
  }

  const categorySectionRefs = useRef<Record<string, HTMLDivElement | null>>(
    {},
  );

  // Offers already arrive sorted by category from the backend, so first
  // appearance order doubles as display order.
  const categories = useMemo(() => {
    const seen = new Set<string>();
    const result: string[] = [];
    for (const offer of data?.offers ?? []) {
      const cat = offer.category || "Other";
      if (!seen.has(cat)) {
        seen.add(cat);
        result.push(cat);
      }
    }
    return result;
  }, [data]);

  const offersByCategory = useMemo(() => {
    const map: Record<string, Offer[]> = {};
    for (const offer of data?.offers ?? []) {
      const cat = offer.category || "Other";
      (map[cat] ??= []).push(offer);
    }
    return map;
  }, [data]);

  function scrollToCategory(cat: string) {
    categorySectionRefs.current[cat]?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }

  function itemPrice(cartItem: CartItem): number {
    const offer = offerById(cartItem.offerId);
    if (!offer) return 0;
    const customizationTotal = cartItem.selectedCustomizationIds.reduce(
      (sum, id) => {
        const c = offer.customizations.find((c) => c.id === id);
        return sum + (c?.price_cents ?? 0);
      },
      0,
    );
    return offer.price_cents + customizationTotal;
  }

  const totalCents = cart.reduce((sum, item) => sum + itemPrice(item), 0);

  // 5% of subtotal + $0.50 flat, uncapped — mirrors service.CalculateServiceFee on the backend.
  const serviceFeeCents = Math.round(totalCents * 0.05) + 50;

  const tipCents = useMemo(() => {
    if (tipMode === "none") return 0;
    if (tipMode === "custom") {
      const dollars = parseFloat(customTipDollars);
      return Number.isFinite(dollars) && dollars > 0
        ? Math.round(dollars * 100)
        : 0;
    }
    return Math.round((totalCents * tipMode) / 100);
  }, [tipMode, customTipDollars, totalCents]);

  function addToCart(offerId: string) {
    setCart((prev) => [
      ...prev,
      { key: makeKey(), offerId, selectedCustomizationIds: [] },
    ]);
  }

  function removeFromCart(key: string) {
    setCart((prev) => prev.filter((item) => item.key !== key));
  }

  function toggleCustomization(key: string, customizationId: string) {
    setCart((prev) =>
      prev.map((item) => {
        if (item.key !== key) return item;
        const ids = item.selectedCustomizationIds;
        const newIds = ids.includes(customizationId)
          ? ids.filter((id) => id !== customizationId)
          : [...ids, customizationId];
        return { ...item, selectedCustomizationIds: newIds };
      }),
    );
  }

  function quickReorder() {
    if (!data?.last_order) return;
    const newCart: CartItem[] = [];
    for (const item of data.last_order.items) {
      if (item.available) {
        for (let i = 0; i < item.quantity; i++) {
          newCart.push({
            key: makeKey(),
            offerId: item.offer_id,
            selectedCustomizationIds: [],
          });
        }
      }
    }
    setCart(newCart);
  }

  async function submitOrder() {
    setLoading(true);

    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/orders`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tee_time_id: teeTimeId,
        order_type: orderType,
        items: cart.map((item) => ({
          offer_id: item.offerId,
          quantity: 1,
          customization_ids: item.selectedCustomizationIds,
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
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          order_id: result.order_id,
          tip_cents: tipCents,
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
      <div
        className="mx-auto max-w-md"
        style={{ paddingBottom: cart.length > 0 ? `${220 + cart.length * 28}px` : "40px" }}
      >
        <p className="text-sm text-green-400 font-medium">Foreturn IQ</p>

        <h1 className="mt-3 text-3xl font-bold">{data.course_name}</h1>

        <p className="mt-2 text-neutral-400">
          Tee time: {new Date(data.starts_at).toLocaleString()}
        </p>

        {data.active_orders?.length > 0 && (
          <div className="mt-8 space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-green-400">
              Your Orders
            </p>
            {data.active_orders.map((order) => (
              <div
                key={order.order_id}
                className="rounded-xl border border-green-800 bg-green-950/20 p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-green-400">
                      Pickup Code
                    </p>
                    <p className="mt-1 text-3xl font-bold tracking-widest text-white">
                      {order.pickup_code}
                    </p>
                    <p className="mt-1 text-xs text-neutral-400">
                      Show this to the server
                    </p>
                  </div>
                  <div className="text-right">
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                        order.status === "fulfilled"
                          ? "bg-green-500/20 text-green-400"
                          : "bg-neutral-800 text-neutral-300"
                      }`}
                    >
                      {order.status === "fulfilled" ? "Ready" : "Preparing"}
                    </span>
                    <p className="mt-2 text-sm font-bold text-white">
                      ${(order.total_cents / 100).toFixed(2)}
                    </p>
                  </div>
                </div>
                <div className="mt-3 space-y-1">
                  {order.items.map((item, i) => (
                    <p key={i} className="text-sm text-neutral-300">
                      {item.quantity}× {item.item_name}
                    </p>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

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
                    item.available
                      ? "text-neutral-200"
                      : "text-neutral-600 line-through"
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
                  Struck-through items are no longer available and won&apos;t be
                  added.
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

        {data.offers.length === 0 ? (
          <>
            <h2 className="mt-8 text-xl font-semibold">Available offers</h2>
            <p className="mt-4 text-neutral-400">
              No offers available right now.
            </p>
          </>
        ) : (
          <>
            <div className="sticky top-0 z-10 -mx-6 mt-8 flex h-14 items-center border-b border-neutral-800 bg-neutral-950/95 px-6 backdrop-blur">
              <div className="flex gap-2 overflow-x-auto">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => scrollToCategory(cat)}
                    className="shrink-0 rounded-full border border-neutral-800 bg-neutral-900 px-3 py-1.5 text-sm font-medium text-neutral-300 hover:border-green-500 hover:text-white"
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-4 space-y-8">
              {categories.map((cat) => (
                <div
                  key={cat}
                  ref={(el) => {
                    categorySectionRefs.current[cat] = el;
                  }}
                  className="scroll-mt-28"
                >
                  <h2 className="sticky top-14 z-[5] -mx-6 bg-neutral-950 px-6 py-2 text-xl font-semibold">
                    {cat}
                  </h2>
                  <div className="mt-4 space-y-4">
                    {offersByCategory[cat].map((offer) => {
                      const instances = cart.filter(
                        (item) => item.offerId === offer.id,
                      );

                      return (
                        <div
                          key={offer.id}
                          className="rounded-xl border border-neutral-800 bg-neutral-900"
                        >
                          <div className="flex items-start justify-between gap-4 p-4">
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
                              className="shrink-0 rounded-lg bg-green-500 px-3 py-2 text-sm font-semibold text-black"
                            >
                              Add
                            </button>
                          </div>

                          {instances.length > 0 && (
                            <div className="border-t border-neutral-800 divide-y divide-neutral-800/60">
                              {instances.map((cartItem, idx) => (
                                <div key={cartItem.key} className="px-4 py-3">
                                  <div className="flex items-center justify-between">
                                    <p className="text-sm font-medium text-neutral-300">
                                      {offer.name}{" "}
                                      <span className="text-neutral-600">
                                        #{idx + 1}
                                      </span>
                                    </p>
                                    <div className="flex items-center gap-3">
                                      <p className="text-sm font-semibold">
                                        ${(itemPrice(cartItem) / 100).toFixed(2)}
                                      </p>
                                      <button
                                        onClick={() => removeFromCart(cartItem.key)}
                                        className="text-xs text-neutral-600 hover:text-red-400"
                                      >
                                        Remove
                                      </button>
                                    </div>
                                  </div>

                                  {offer.customizations.length > 0 && (
                                    <div className="mt-2 space-y-1.5">
                                      {offer.customizations.map((c) => {
                                        const checked =
                                          cartItem.selectedCustomizationIds.includes(
                                            c.id,
                                          );
                                        return (
                                          <label
                                            key={c.id}
                                            className="flex cursor-pointer items-center gap-2.5"
                                          >
                                            <input
                                              type="checkbox"
                                              checked={checked}
                                              onChange={() =>
                                                toggleCustomization(
                                                  cartItem.key,
                                                  c.id,
                                                )
                                              }
                                              className="h-4 w-4 rounded border-neutral-600 bg-neutral-800 accent-green-500"
                                            />
                                            <span className="text-sm text-neutral-300">
                                              {c.label}
                                            </span>
                                            {c.price_cents > 0 && (
                                              <span className="text-xs text-green-400">
                                                +$
                                                {(c.price_cents / 100).toFixed(2)}
                                              </span>
                                            )}
                                          </label>
                                        );
                                      })}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {cart.length > 0 && !showReview && (
        <div className="fixed inset-x-0 bottom-0 z-20 border-t border-neutral-800 bg-neutral-950 p-4">
          <div className="mx-auto flex max-w-md items-center justify-between gap-4">
            <span className="text-sm text-neutral-400">
              {cart.length} item{cart.length !== 1 ? "s" : ""} · $
              {(totalCents / 100).toFixed(2)}
            </span>
            <button
              type="button"
              onClick={() => setShowReview(true)}
              className="rounded-lg bg-green-500 px-5 py-2.5 font-semibold text-black"
            >
              Review Order
            </button>
          </div>
        </div>
      )}

      {cart.length > 0 && showReview && (
        <div className="fixed inset-x-0 bottom-0 z-20 border-t border-neutral-800 bg-neutral-950 p-4">
          <div className="mx-auto max-w-md">
            <button
              type="button"
              onClick={() => setShowReview(false)}
              className="mb-2 text-sm text-neutral-400"
            >
              ← Add more items
            </button>

            <div className="mb-3 space-y-1 text-base">
              {cart.map((cartItem) => {
                const offer = offerById(cartItem.offerId);
                if (!offer) return null;
                const price = itemPrice(cartItem);
                const customLabels = cartItem.selectedCustomizationIds
                  .map(
                    (id) => offer.customizations.find((c) => c.id === id)?.label,
                  )
                  .filter(Boolean) as string[];
                return (
                  <div
                    key={cartItem.key}
                    className="flex justify-between text-neutral-300"
                  >
                    <span>
                      {offer.name}
                      {customLabels.length > 0 && (
                        <span className="text-neutral-500">
                          {" "}
                          ({customLabels.join(", ")})
                        </span>
                      )}
                    </span>
                    <span>${(price / 100).toFixed(2)}</span>
                  </div>
                );
              })}

              <div className="border-t border-neutral-800 pt-1.5 space-y-1">
                <div className="flex justify-between text-neutral-400">
                  <span>Sales Tax (8%)</span>
                  <span>${((totalCents * 0.08) / 100).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-neutral-400">
                  <span>Service Fee (5% + $0.50)</span>
                  <span>${(serviceFeeCents / 100).toFixed(2)}</span>
                </div>
                <p className="text-sm text-neutral-500">
                  Covers payment processing — paid to Foreturn IQ, not the
                  course.
                </p>
              </div>

              <div className="border-t border-neutral-800 pt-2 space-y-2">
                <span className="text-neutral-400">
                  Tip for {data?.course_name ?? "the course"}
                </span>
                <div className="flex gap-2">
                  {([15, 20, 25] as const).map((pct) => (
                    <button
                      key={pct}
                      type="button"
                      onClick={() => setTipMode(pct)}
                      className={`flex-1 rounded-lg border px-2 py-2 text-base font-medium ${
                        tipMode === pct
                          ? "border-green-500 bg-green-500/10 text-green-400"
                          : "border-neutral-800 text-neutral-300"
                      }`}
                    >
                      <div>{pct}%</div>
                      <div className="text-sm opacity-75">
                        ${((Math.round((totalCents * pct) / 100)) / 100).toFixed(2)}
                      </div>
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setTipMode("custom")}
                    className={`flex-1 rounded-lg border px-2 py-2 text-base font-medium ${
                      tipMode === "custom"
                        ? "border-green-500 bg-green-500/10 text-green-400"
                        : "border-neutral-800 text-neutral-300"
                    }`}
                  >
                    Custom
                  </button>
                </div>
                {tipMode === "custom" && (
                  <div className="flex items-center gap-1 rounded-lg border border-neutral-800 px-3 py-2">
                    <span className="text-neutral-500">$</span>
                    <input
                      type="number"
                      inputMode="decimal"
                      min="0"
                      step="0.01"
                      placeholder="0.00"
                      value={customTipDollars}
                      onChange={(e) => setCustomTipDollars(e.target.value)}
                      className="w-full bg-transparent text-white outline-none"
                    />
                  </div>
                )}
                {tipMode !== "none" && (
                  <button
                    type="button"
                    onClick={() => {
                      setTipMode("none");
                      setCustomTipDollars("");
                    }}
                    className="text-sm text-neutral-500 underline"
                  >
                    Remove tip
                  </button>
                )}
                <div className="flex justify-between text-neutral-400">
                  <span>Tip</span>
                  <span>${(tipCents / 100).toFixed(2)}</span>
                </div>
              </div>

              <div className="flex justify-between border-t border-neutral-800 pt-1.5 font-bold text-white">
                <span>Total</span>
                <span>
                  $
                  {(
                    (totalCents * 1.08 + serviceFeeCents + tipCents) /
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
