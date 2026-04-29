"use client";

import Link from "next/link";

export default function CheckoutCancelPage() {
  return (
    <main className="min-h-screen bg-neutral-950 text-white px-6 py-10">
      <div className="mx-auto max-w-md">
        <p className="text-sm text-green-400 font-medium">Foreturn IQ</p>
        <h1 className="mt-3 text-3xl font-bold">Checkout canceled</h1>
        <p className="mt-4 text-neutral-300">Your order was not paid.</p>
        <Link
          href="/"
          className="mt-6 inline-block rounded-lg bg-neutral-800 px-4 py-3 font-semibold"
        >
          Go back
        </Link>
      </div>
    </main>
  );
}
