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

type OrderPage = {
  tee_time_id: string;
  course_name: string;
  starts_at: string;
  minutes_since_tee_time: number;
  offers: Offer[];
};

type Cart = Record<string, number>;

export default function TeeTimeOrderPage() {
  const params = useParams();
  const teeTimeId = params.teeTimeId as string;

  const [data, setData] = useState<OrderPage | null>(null);
  const [cart, setCart] = useState<Cart>({});
  const [loading, setLoading] = useState(false);
  const [confirmation, setConfirmation] = useState<{
    order_id: string;
    total_cents: number;
  } | null>(null);

  useEffect(() => {
    fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/tee-times/${teeTimeId}/order-page`,
    )
      .then((res) => res.json())
      .then(setData);
  }, [teeTimeId]);

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

  async function submitOrder() {
    setLoading(true);

    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/orders`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        tee_time_id: teeTimeId,
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

  if (confirmation) {
    return (
      <main className="min-h-screen bg-neutral-950 text-white px-6 py-10">
        <div className="mx-auto max-w-md">
          <p className="text-sm text-green-400 font-medium">Foreturn IQ</p>
          <h1 className="mt-3 text-3xl font-bold">Order received</h1>

          <p className="mt-4 text-neutral-300">
            Your order has been sent to the clubhouse.
          </p>

          <div className="mt-6 rounded-xl border border-neutral-800 bg-neutral-900 p-4">
            <p className="text-sm text-neutral-400">Order ID</p>
            <p className="mt-1 break-all font-mono text-sm">
              {confirmation.order_id}
            </p>

            <p className="mt-4 text-sm text-neutral-400">Total</p>
            <p className="mt-1 text-2xl font-bold">
              ${(confirmation.total_cents / 100).toFixed(2)}
            </p>
          </div>
        </div>
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
            <div className="mb-3 flex items-center justify-between">
              <span className="text-neutral-300">
                {selectedItems.length} item(s)
              </span>
              <span className="text-xl font-bold">
                ${(totalCents / 100).toFixed(2)}
              </span>
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
