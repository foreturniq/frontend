"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";

type OrderItem = {
  item_name: string;
  quantity: number;
  unit_price_cents: number;
  line_total_cents: number;
};

type Order = {
  order_id: string;
  tee_time_id: string;
  golfer_name: string;
  tee_time_starts_at: string;
  status: string;
  fulfillment_type: string;
  order_type: string;
  pickup_code: string;
  total_cents: number;
  created_at: string;
  items: OrderItem[];
  predicted_arrival_at: string;
  prep_start_at: string;
  target_ready_start_at: string;
  target_ready_end_at: string;
  timing_bucket: string;
};

const ORDER_TYPE_LABELS: Record<string, string> = {
  before_round: "Before Round",
  at_turn: "At the Turn",
  after_round: "After Round",
};

const TIMING_SECTIONS: {
  bucket: string;
  label: string;
  borderClass: string;
  badgeClass: string;
}[] = [
  {
    bucket: "prepare_now",
    label: "Prepare Now",
    borderClass: "border-orange-500",
    badgeClass: "bg-orange-500/20 text-orange-300",
  },
  {
    bucket: "coming_up",
    label: "Coming Up Soon",
    borderClass: "border-yellow-500",
    badgeClass: "bg-yellow-500/20 text-yellow-300",
  },
  {
    bucket: "later_today",
    label: "Later Today",
    borderClass: "border-neutral-700",
    badgeClass: "bg-neutral-800 text-neutral-300",
  },
  {
    bucket: "future",
    label: "Future Pre-Orders",
    borderClass: "border-blue-800",
    badgeClass: "bg-blue-900/30 text-blue-300",
  },
  {
    bucket: "past_due",
    label: "Past Due",
    borderClass: "border-red-800",
    badgeClass: "bg-red-900/30 text-red-300",
  },
];

function formatTime(iso: string): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
}

function abbreviateName(name: string): string {
  if (!name) return "Unknown";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0];
  return `${parts[0]} ${parts[parts.length - 1][0]}.`;
}

export default function CourseOrdersPage() {
  const params = useParams();
  const courseId = params.courseId as string;
  const [courseName, setCourseName] = useState<string>("");

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  async function fetchCourse(courseId: string) {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/courses/${courseId}`,
      {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      },
    );

    const data = await res.json();
    return data.name;
  }

  const fetchOrders = useCallback(async () => {
    const API_URL = process.env.NEXT_PUBLIC_API_URL;

    if (!API_URL) {
      console.error("NEXT_PUBLIC_API_URL is missing.");
    }

    setRefreshing(true);

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/courses/${courseId}/orders?t=${Date.now()}`,
        { cache: "no-store" },
      );

      const data = await res.json();

      setOrders(data);
      setLoading(false);
      setLastRefreshedAt(new Date().toLocaleTimeString());
    } catch (err) {
      console.error(err);
    } finally {
      setRefreshing(false);
    }
  }, [courseId]);

  async function updateStatus(orderId: string, status: string) {
    await fetch(`${process.env.NEXT_PUBLIC_API_URL}/orders/${orderId}/status`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ status }),
    });

    fetchOrders();
  }

  useEffect(() => {
    fetchOrders();

    const interval = setInterval(() => {
      fetchOrders();
    }, 10000);

    return () => clearInterval(interval);
  }, [fetchOrders]);

  useEffect(() => {
    if (!courseId) return;

    const loadCourse = async () => {
      try {
        const name = await fetchCourse(courseId);
        setCourseName(name);
      } catch (err) {
        console.error(err);
      }
    };
    loadCourse();
  }, [courseId]);

  const today = new Date().toDateString();

  const paid = orders.filter((o) => o.status === "paid");
  const fulfilled = orders.filter(
    (o) =>
      o.status === "fulfilled" &&
      new Date(o.tee_time_starts_at).toDateString() === today,
  );
  const refunded = orders.filter(
    (o) =>
      o.status === "refunded" &&
      new Date(o.tee_time_starts_at).toDateString() === today,
  );

  const revenueCents = orders
    .filter(
      (o) =>
        o.status !== "canceled" &&
        new Date(o.tee_time_starts_at).toDateString() === today,
    )
    .reduce((sum, o) => sum + o.total_cents, 0);

  const paidActions = [
    { label: "Fulfill", status: "fulfilled" },
    { label: "Refund", status: "refunded" },
    { label: "Cancel", status: "canceled" },
  ];

  if (loading) {
    return (
      <main className="min-h-screen bg-neutral-950 text-white p-6">
        Loading orders...
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-neutral-950 text-white px-6 py-8">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-medium text-green-400">Foreturn IQ</p>
            <h1 className="mt-2 text-3xl font-bold">{courseName}</h1>
            <h2 className="mt-3 text-2xl font-bold">Order Queue</h2>
            <p className="mt-2 text-neutral-400">
              Manage incoming golfer orders for this course.
            </p>
            <p className="mt-2 text-sm text-neutral-500 flex items-center gap-2">
              Last refreshed: {lastRefreshedAt ?? "never"}
              {refreshing && (
                <span className="h-2 w-2 rounded-full bg-green-400 animate-pulse" />
              )}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={fetchOrders}
              disabled={refreshing}
              className="rounded-lg border border-neutral-700 px-4 py-2 text-sm font-semibold text-neutral-200 disabled:opacity-50"
            >
              {refreshing ? "Refreshing..." : "Refresh"}
            </button>

            <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-4">
              <p className="text-sm text-neutral-400">Revenue captured</p>
              <p className="text-2xl font-bold">
                ${(revenueCents / 100).toFixed(2)}
              </p>
            </div>
          </div>
        </div>

        {/* Paid orders grouped by timing bucket */}
        <div className="mt-8 space-y-5">
          {paid.length === 0 ? (
            <div className="rounded-2xl border border-neutral-800 bg-neutral-900/60 p-8 text-center">
              <p className="text-neutral-500">No paid orders.</p>
            </div>
          ) : (
            TIMING_SECTIONS.map((section) => {
              const sectionOrders = paid.filter(
                (o) => o.timing_bucket === section.bucket,
              );
              if (sectionOrders.length === 0) return null;

              return (
                <section
                  key={section.bucket}
                  className={`rounded-2xl border ${section.borderClass} bg-neutral-900/60 p-4`}
                >
                  <div className="mb-4 flex items-center justify-between">
                    <h2 className="text-lg font-semibold">{section.label}</h2>
                    <span
                      className={`rounded-full px-3 py-1 text-sm font-medium ${section.badgeClass}`}
                    >
                      {sectionOrders.length}
                    </span>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {sectionOrders.map((order) => (
                      <OrderCard
                        key={order.order_id}
                        order={order}
                        actions={paidActions}
                        onUpdateStatus={updateStatus}
                      />
                    ))}
                  </div>
                </section>
              );
            })
          )}
        </div>

        {/* Fulfilled and Refunded */}
        <div className="mt-6 grid gap-5 lg:grid-cols-2">
          <SimpleOrderColumn
            title="Fulfilled"
            orders={fulfilled}
            emptyText="No fulfilled orders yet."
            actions={[{ label: "Refund", status: "refunded" }]}
            onUpdateStatus={updateStatus}
          />

          <SimpleOrderColumn
            title="Refunded"
            orders={refunded}
            emptyText="No refunded orders yet."
            actions={[]}
            onUpdateStatus={updateStatus}
          />
        </div>
      </div>
    </main>
  );
}

function OrderCard({
  order,
  actions,
  onUpdateStatus,
}: {
  order: Order;
  actions: { label: string; status: string }[];
  onUpdateStatus: (orderId: string, status: string) => void;
}) {
  return (
    <div className="rounded-xl border border-neutral-800 bg-neutral-950 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-wide text-green-400">
            Pickup Code
          </p>
          <h2 className="mt-1 text-3xl font-bold tracking-widest">
            {order.pickup_code || "----"}
          </h2>
        </div>
        <div className="text-right">
          <p className="text-xs text-neutral-500">
            #{order.order_id.slice(0, 8)}
          </p>
          <p className="mt-1 font-bold">
            ${(order.total_cents / 100).toFixed(2)}
          </p>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
        <span className="font-medium">
          {abbreviateName(order.golfer_name)}
        </span>
        <span className="text-neutral-600">•</span>
        <span className="text-neutral-300">
          {formatTime(order.tee_time_starts_at)}
        </span>
        <span className="text-neutral-600">•</span>
        <span className="rounded bg-neutral-800 px-2 py-0.5 text-xs text-neutral-300">
          {ORDER_TYPE_LABELS[order.order_type] ?? order.order_type}
        </span>
      </div>

      <div className="mt-3 rounded-lg bg-neutral-900 p-3 space-y-1">
        <div className="flex justify-between text-xs">
          <span className="text-neutral-400">Predicted Arrival</span>
          <span className="font-semibold text-white">
            {formatTime(order.predicted_arrival_at)}
          </span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-neutral-400">Prep Starts</span>
          <span className="font-medium text-neutral-200">
            {formatTime(order.prep_start_at)}
          </span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-neutral-400">Ready Window</span>
          <span className="text-neutral-300">
            {formatTime(order.target_ready_start_at)}–
            {formatTime(order.target_ready_end_at)}
          </span>
        </div>
      </div>

      <div className="mt-3 rounded-lg bg-neutral-900 p-3">
        <p className="text-xs uppercase tracking-wide text-neutral-500">
          Items
        </p>
        <div className="mt-2 space-y-1">
          {order.items.map((item, index) => (
            <div key={index} className="flex justify-between gap-3 text-sm">
              <span>
                {item.quantity}x {item.item_name}
              </span>
              <span className="text-neutral-400">
                ${(item.line_total_cents / 100).toFixed(2)}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {actions.map((action) => (
          <button
            key={action.status}
            onClick={() => onUpdateStatus(order.order_id, action.status)}
            className="rounded-lg bg-green-500 px-3 py-2 text-sm font-semibold text-black"
          >
            {action.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function SimpleOrderColumn({
  title,
  orders,
  emptyText,
  actions,
  onUpdateStatus,
}: {
  title: string;
  orders: Order[];
  emptyText: string;
  actions: { label: string; status: string }[];
  onUpdateStatus: (orderId: string, status: string) => void;
}) {
  return (
    <section className="rounded-2xl border border-neutral-800 bg-neutral-900/60 p-4">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold">{title}</h2>
        <span className="rounded-full bg-neutral-800 px-3 py-1 text-sm text-neutral-300">
          {orders.length}
        </span>
      </div>

      <div className="space-y-3">
        {orders.length === 0 ? (
          <p className="text-sm text-neutral-500">{emptyText}</p>
        ) : (
          orders.map((order) => (
            <div
              key={order.order_id}
              className="rounded-xl border border-neutral-800 bg-neutral-950 p-3"
            >
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="font-mono text-xs text-neutral-400">
                    #{order.order_id.slice(0, 8)}
                  </p>
                  <p className="mt-0.5 text-sm font-medium">
                    {abbreviateName(order.golfer_name)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-neutral-300">
                    {order.pickup_code}
                  </p>
                  <p className="text-xs text-neutral-500">
                    {ORDER_TYPE_LABELS[order.order_type] ?? order.order_type}
                  </p>
                </div>
              </div>
              <div className="mt-2 space-y-1">
                {order.items.map((item, i) => (
                  <p key={i} className="text-xs text-neutral-400">
                    {item.quantity}x {item.item_name}
                  </p>
                ))}
              </div>
              {actions.length > 0 && (
                <div className="mt-3 flex gap-2">
                  {actions.map((action) => (
                    <button
                      key={action.status}
                      onClick={() => onUpdateStatus(order.order_id, action.status)}
                      className="rounded-lg bg-green-500 px-3 py-1.5 text-xs font-semibold text-black"
                    >
                      {action.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </section>
  );
}
