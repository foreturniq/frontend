"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

import Link from "next/link";

export default function CheckoutCancelContent() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get("order_id");

  const [teeTimeId, setTeeTimeId] = useState<string | null>(null);

  useEffect(() => {
    if (!orderId) return;

    fetch(`${process.env.NEXT_PUBLIC_API_URL}/orders/${orderId}`, {
      cache: "no-store",
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => setTeeTimeId(data?.tee_time_id ?? null))
      .catch((err) => console.error(err));
  }, [orderId]);

  return (
    <main className="min-h-screen bg-neutral-950 text-white px-6 py-10">
      <div className="mx-auto max-w-md">
        <p className="text-sm text-green-400 font-medium">Foreturn IQ</p>
        <h1 className="mt-3 text-3xl font-bold">Checkout canceled</h1>
        <p className="mt-4 text-neutral-300">
          Your order was not paid and you have not been charged.
        </p>
        {teeTimeId && (
          <Link
            href={`/tee-times/${teeTimeId}/order-page`}
            className="mt-6 inline-block rounded-lg bg-green-500 px-4 py-3 font-semibold text-black"
          >
            Back to menu
          </Link>
        )}
      </div>
    </main>
  );
}
