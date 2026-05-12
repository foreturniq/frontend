"use client";

import { useState } from "react";

type CreatedCourse = {
  id: string;
  name: string;
};

export default function AdminNewCoursePage() {
  const [name, setName] = useState("");
  const [stripeAccountId, setStripeAccountId] = useState("");
  const [loading, setLoading] = useState(false);
  const [created, setCreated] = useState<CreatedCourse | null>(null);
  const [error, setError] = useState("");

  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL || "https://api.foreturniq.com";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/courses`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        stripe_account_id: stripeAccountId,
      }),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error || "Something went wrong");
      return;
    }

    setCreated({ id: data.id, name });
  }

  if (created) {
    const dashboardUrl = `${appUrl}/courses/${created.id}/orders`;
    const qrUrl = `${appUrl}/courses/${created.id}/qr`;
    const orderUrl = `${appUrl}/courses/${created.id}/order`;

    return (
      <main className="min-h-screen bg-neutral-950 text-white px-6 py-10">
        <div className="mx-auto max-w-lg">
          <p className="text-sm font-medium text-green-400">Foreturn IQ — Admin</p>
          <h1 className="mt-2 text-3xl font-bold">Course created</h1>
          <p className="mt-2 text-neutral-400">{created.name} is ready to go.</p>

          <div className="mt-8 space-y-4">
            <InfoRow label="Course ID" value={created.id} mono />
            <InfoRow label="Dashboard" value={dashboardUrl} link />
            <InfoRow label="QR Code Page" value={qrUrl} link />
            <InfoRow label="Golfer Order URL" value={orderUrl} link />
          </div>

          <button
            onClick={() => {
              setCreated(null);
              setName("");
              setStripeAccountId("");
            }}
            className="mt-8 rounded-lg border border-neutral-700 px-4 py-2 text-sm text-neutral-300"
          >
            Add another course
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-neutral-950 text-white px-6 py-10">
      <div className="mx-auto max-w-lg">
        <p className="text-sm font-medium text-green-400">Foreturn IQ — Admin</p>
        <h1 className="mt-2 text-3xl font-bold">New Course</h1>
        <p className="mt-2 text-neutral-400">
          Add a golf course and connect it to Stripe.
        </p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-5">
          <div>
            <label className="block text-sm text-neutral-300">
              Course name
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder="Pebble Beach Golf Links"
              className="mt-2 block w-full rounded-lg border border-neutral-700 bg-neutral-900 px-4 py-3 text-base"
            />
          </div>

          <div>
            <label className="block text-sm text-neutral-300">
              Stripe account ID
            </label>
            <p className="mt-1 text-xs text-neutral-500">
              Found in Stripe Dashboard → Connect → Accounts. Starts with{" "}
              <span className="font-mono">acct_</span>
            </p>
            <input
              value={stripeAccountId}
              onChange={(e) => setStripeAccountId(e.target.value)}
              placeholder="acct_1234567890"
              className="mt-2 block w-full rounded-lg border border-neutral-700 bg-neutral-900 px-4 py-3 font-mono text-base"
            />
          </div>

          {error && (
            <p className="rounded-lg border border-red-800 bg-red-900/30 px-4 py-3 text-sm text-red-300">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-green-500 px-4 py-3 font-semibold text-black disabled:opacity-50"
          >
            {loading ? "Creating..." : "Create course"}
          </button>
        </form>
      </div>
    </main>
  );
}

function InfoRow({
  label,
  value,
  mono,
  link,
}: {
  label: string;
  value: string;
  mono?: boolean;
  link?: boolean;
}) {
  return (
    <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-4">
      <p className="text-xs uppercase tracking-wide text-neutral-500">{label}</p>
      {link ? (
        <a
          href={value}
          target="_blank"
          rel="noreferrer"
          className="mt-1 block break-all text-sm text-green-400 underline"
        >
          {value}
        </a>
      ) : (
        <p
          className={`mt-1 break-all text-sm ${mono ? "font-mono text-neutral-200" : "text-neutral-200"}`}
        >
          {value}
        </p>
      )}
    </div>
  );
}
