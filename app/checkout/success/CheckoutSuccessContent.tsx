"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

import Link from "next/link";

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
  subtotal_cents: number;
  sales_tax_cents: number;
  service_fee_cents: number;
  total_cents: number;
  items: OrderItem[];
  pickup_code: string;
};

export default function CheckoutSuccessPage() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get("order_id");

  const [order, setOrder] = useState<Order | null>(null);

  function formatCurrency(cents?: number | null) {
    return `$${((cents ?? 0) / 100).toFixed(2)}`;
  }

  useEffect(() => {
    if (!orderId) return;

    async function fetchOrder() {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/orders/${orderId}`,
        { cache: "no-store" },
      );

      const data = await res.json();
      setOrder(data);
    }

    fetchOrder();

    const interval = setInterval(fetchOrder, 10000);

    return () => clearInterval(interval);
  }, [orderId]);

  return (
    <main className="min-h-screen bg-neutral-950 text-white px-6 py-10">
      <div className="mx-auto max-w-md">
        <p className="text-sm text-green-400 font-medium">Foreturn IQ</p>

        <h1 className="mt-3 text-3xl font-bold">Payment received</h1>

        <p className="mt-4 text-neutral-300">
          Your order has been sent to the clubhouse.
        </p>

        {!order ? (
          <p className="mt-6 text-neutral-400">Loading order...</p>
        ) : (
          <div className="mt-6 rounded-xl border border-neutral-800 bg-neutral-900 p-4">
            <p className="text-sm text-neutral-400">Order status</p>

            <p className="mt-2 text-2xl font-bold capitalize">{order.status}</p>

            {order.status === "paid" && (
              <p className="mt-2 text-sm text-neutral-400">
                The clubhouse has received your paid order.
              </p>
            )}

            {order.status === "fulfilled" && (
              <p className="mt-2 text-sm text-green-400">
                Your order has been fulfilled.
              </p>
            )}

            <div className="mt-6 rounded-xl bg-green-500 p-4 text-black">
              <p className="text-sm font-medium">Pickup code</p>
              <p className="mt-1 text-4xl font-bold tracking-widest">
                {order.pickup_code}
              </p>
              <p className="mt-2 text-sm">Show this code at the clubhouse.</p>
            </div>

            <div className="mt-5 space-y-2">
              {order.items.map((item, index) => (
                <div key={index} className="flex justify-between text-sm">
                  <span>
                    {item.quantity}x {item.item_name}
                  </span>
                  <span className="text-neutral-400">
                    ${(item.line_total_cents / 100).toFixed(2)}
                  </span>
                </div>
              ))}
            </div>

            <div className="border-t pt-4 space-y-2">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span>{formatCurrency(order.subtotal_cents)}</span>
              </div>

              <div className="flex justify-between">
                <span>Sales Tax</span>
                <span>{formatCurrency(order.sales_tax_cents)}</span>
              </div>

              <div className="flex justify-between">
                <span>Service Fee</span>
                <span>{formatCurrency(order.service_fee_cents)}</span>
              </div>

              <div className="flex justify-between font-semibold text-lg border-t pt-2">
                <span>Total</span>
                <span>{formatCurrency(order.total_cents)}</span>
              </div>
            </div>

            <Link
              href={`/tee-times/${order.tee_time_id}/order-page`}
              className="mt-5 block w-full rounded-lg bg-green-500 px-4 py-3 text-center font-semibold text-black"
            >
              Add more items
            </Link>
          </div>
        )}

        <p className="mt-4 text-xs text-neutral-500">
          This page refreshes automatically every 10 seconds.
        </p>
      </div>
    </main>
  );
}
