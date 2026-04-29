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
  status: string;
  fulfillment_type: string;
  total_cents: number;
  created_at: string;
  items: OrderItem[];
};

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
    console.log("API_URL:", API_URL);

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
      console.log("polling orders", new Date().toLocaleTimeString());
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

  const pending = orders.filter((order) => order.status === "pending");
  const paid = orders.filter((order) => order.status === "paid");
  const fulfilled = orders.filter((order) => order.status === "fulfilled");
  const refunded = orders.filter((order) => order.status === "refunded");

  const revenueCents = orders
    .filter((order) => order.status !== "canceled")
    .reduce((sum, order) => sum + order.total_cents, 0);

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

        <div className="mt-8 grid gap-5 lg:grid-cols-3">
          {/* <OrderColumn */}
          {/*   title="New Orders" */}
          {/*   orders={pending} */}
          {/*   emptyText="No new orders." */}
          {/*   actions={[ */}
          {/*     // { label: "Mark Paid", status: "paid" }, */}
          {/*     { label: "Cancel", status: "canceled" }, */}
          {/*   ]} */}
          {/*   onUpdateStatus={updateStatus} */}
          {/* /> */}

          <OrderColumn
            title="In Progress"
            orders={paid}
            emptyText="No orders in progress."
            actions={[
              { label: "Fulfill", status: "fulfilled" },
              { label: "Refund", status: "refunded" },
              { label: "Cancel", status: "canceled" },
            ]}
            onUpdateStatus={updateStatus}
          />

          <OrderColumn
            title="Fulfilled"
            orders={fulfilled}
            emptyText="No fulfilled orders yet."
            actions={[{ label: "Refund", status: "refunded" }]}
            onUpdateStatus={updateStatus}
          />

          <OrderColumn
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

function OrderColumn({
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

      <div className="space-y-4">
        {orders.length === 0 ? (
          <p className="text-sm text-neutral-500">{emptyText}</p>
        ) : (
          orders.map((order) => (
            <OrderCard
              key={order.order_id}
              order={order}
              actions={actions}
              onUpdateStatus={onUpdateStatus}
            />
          ))
        )}
      </div>
    </section>
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
          <p className="text-sm text-neutral-400">Order</p>
          <p className="mt-1 font-mono text-xs text-neutral-300">
            {order.order_id.slice(0, 8)}
          </p>
        </div>

        <div className="text-right">
          <p className="text-sm text-neutral-400">Total</p>
          <p className="mt-1 font-bold">
            ${(order.total_cents / 100).toFixed(2)}
          </p>
        </div>
      </div>

      <div className="mt-4 rounded-lg bg-neutral-900 p-3">
        <p className="text-xs uppercase tracking-wide text-neutral-500">
          Items
        </p>

        <div className="mt-2 space-y-2">
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

      <p className="mt-3 text-xs text-neutral-500">
        Created: {new Date(order.created_at).toLocaleTimeString()}
      </p>

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
