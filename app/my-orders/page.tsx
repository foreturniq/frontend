"use client";

import { useEffect, useRef, useState } from "react";

type GolferOrderItem = {
  item_name: string;
  quantity: number;
  line_total_cents: number;
};

type GolferOrder = {
  order_id: string;
  pickup_code: string;
  status: string;
  order_type: string;
  total_cents: number;
  course_name: string;
  starts_at: string;
  items: GolferOrderItem[];
};

const ORDER_TYPE_LABELS: Record<string, string> = {
  before_round: "Before Round",
  at_turn: "At the Turn",
  after_round: "After Round",
};

export default function MyOrdersPage() {
  const [phone, setPhone] = useState("");
  const [submittedPhone, setSubmittedPhone] = useState<string | null>(null);
  const [orders, setOrders] = useState<GolferOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  async function fetchOrders(phoneNumber: string) {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/golfer/orders?phone=${encodeURIComponent(phoneNumber)}`,
    );
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || "Failed to load orders");
    }
    return res.json() as Promise<GolferOrder[]>;
  }

  useEffect(() => {
    if (!submittedPhone) return;

    if (intervalRef.current) clearInterval(intervalRef.current);

    intervalRef.current = setInterval(async () => {
      try {
        const data = await fetchOrders(submittedPhone);
        setOrders(data);
      } catch {
        // silent on poll failures
      }
    }, 10000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [submittedPhone]);

  async function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    const trimmed = phone.trim();
    if (!trimmed) return;

    setLoading(true);
    setError(null);

    try {
      const data = await fetchOrders(trimmed);
      setOrders(data);
      setSubmittedPhone(trimmed);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-neutral-950 text-white px-6 py-10">
      <div className="mx-auto max-w-md">
        <p className="text-sm text-green-400 font-medium">Foreturn IQ</p>
        <h1 className="mt-3 text-3xl font-bold">My Orders</h1>
        <p className="mt-2 text-neutral-400">
          Enter the phone number you used when booking your tee time.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 flex gap-3">
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+1 (555) 000-0000"
            className="flex-1 rounded-lg border border-neutral-700 bg-neutral-900 px-4 py-3 text-white placeholder-neutral-500 focus:border-green-500 focus:outline-none"
          />
          <button
            type="submit"
            disabled={loading}
            className="rounded-lg bg-green-500 px-4 py-3 font-semibold text-black disabled:opacity-50"
          >
            {loading ? "..." : "Search"}
          </button>
        </form>

        {error && (
          <p className="mt-4 text-sm text-red-400">{error}</p>
        )}

        {submittedPhone && !loading && (
          <div className="mt-8">
            {orders.length === 0 ? (
              <p className="text-neutral-400">No open orders found for that number.</p>
            ) : (
              <div className="space-y-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
                  {orders.length} open order{orders.length !== 1 ? "s" : ""}
                </p>
                {orders.map((order) => (
                  <div
                    key={order.order_id}
                    className="rounded-xl border border-neutral-800 bg-neutral-900 p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold">{order.course_name}</p>
                        <p className="mt-0.5 text-sm text-neutral-400">
                          {new Date(order.starts_at).toLocaleString([], {
                            month: "short",
                            day: "numeric",
                            hour: "numeric",
                            minute: "2-digit",
                          })}
                          {" · "}
                          {ORDER_TYPE_LABELS[order.order_type] ?? order.order_type}
                        </p>
                      </div>
                      <span
                        className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${
                          order.status === "fulfilled"
                            ? "bg-green-500/20 text-green-400"
                            : "bg-neutral-800 text-neutral-300"
                        }`}
                      >
                        {order.status === "fulfilled" ? "Ready" : "Preparing"}
                      </span>
                    </div>

                    <div className="mt-4 rounded-lg bg-green-500/10 border border-green-800 px-4 py-3">
                      <p className="text-xs uppercase tracking-wide text-green-400">
                        Pickup Code
                      </p>
                      <p className="mt-1 text-3xl font-bold tracking-widest text-white">
                        {order.pickup_code}
                      </p>
                    </div>

                    <div className="mt-3 space-y-1">
                      {order.items.map((item, i) => (
                        <div key={i} className="flex justify-between text-sm text-neutral-300">
                          <span>{item.quantity}× {item.item_name}</span>
                          <span>${(item.line_total_cents / 100).toFixed(2)}</span>
                        </div>
                      ))}
                    </div>

                    <div className="mt-3 border-t border-neutral-800 pt-3 flex justify-between text-sm font-semibold">
                      <span>Total</span>
                      <span>${(order.total_cents / 100).toFixed(2)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <p className="mt-4 text-xs text-neutral-500">
              Updates automatically every 10 seconds.
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
