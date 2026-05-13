"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";

type Offer = {
  id: string;
  name: string;
  description?: string;
  price_cents: number;
  category: string;
  fulfillment_type: string;
  is_active: boolean;
  available_from_minutes?: number;
  available_until_minutes?: number;
};

const FULFILLMENT_OPTIONS = [
  { value: "before_round", label: "Before Round" },
  { value: "at_turn", label: "At the Turn" },
  { value: "after_round", label: "After Round" },
];

export default function CourseOffersPage() {
  const params = useParams();
  const courseId = params.courseId as string;

  const [courseName, setCourseName] = useState("");
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [category, setCategory] = useState("");
  const [fulfillmentType, setFulfillmentType] = useState("before_round");
  const [availableFrom, setAvailableFrom] = useState("");
  const [availableUntil, setAvailableUntil] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const API = process.env.NEXT_PUBLIC_API_URL;

  const fetchOffers = useCallback(async () => {
    setLoading(true);
    try {
      const [courseRes, offersRes] = await Promise.all([
        fetch(`${API}/courses/${courseId}`),
        fetch(`${API}/courses/${courseId}/offers`),
      ]);
      const courseData = await courseRes.json();
      const offersData = await offersRes.json();
      setCourseName(courseData.name);
      setOffers(offersData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [courseId, API]);

  useEffect(() => {
    fetchOffers();
  }, [fetchOffers]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError("");

    const body: Record<string, unknown> = {
      course_id: courseId,
      name,
      price_cents: Math.round(parseFloat(price) * 100),
      category,
      fulfillment_type: fulfillmentType,
    };

    if (description) body.description = description;
    if (availableFrom !== "") body.available_from_minutes = parseInt(availableFrom);
    if (availableUntil !== "") body.available_until_minutes = parseInt(availableUntil);

    const res = await fetch(`${API}/offers`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const data = await res.json();
    setSubmitting(false);

    if (!res.ok) {
      setError(data.error || "Something went wrong");
      return;
    }

    setName("");
    setDescription("");
    setPrice("");
    setCategory("");
    setFulfillmentType("before_round");
    setAvailableFrom("");
    setAvailableUntil("");
    fetchOffers();
  }

  async function toggleActive(offer: Offer) {
    await fetch(`${API}/offers/${offer.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_active: !offer.is_active }),
    });
    fetchOffers();
  }

  const grouped = FULFILLMENT_OPTIONS.map((opt) => ({
    ...opt,
    offers: offers.filter((o) => o.fulfillment_type === opt.value),
  })).filter((g) => g.offers.length > 0);

  return (
    <main className="min-h-screen bg-neutral-950 text-white px-6 py-10">
      <div className="mx-auto max-w-3xl">
        <a
          href="/admin"
          className="text-sm text-neutral-500 hover:text-neutral-300"
        >
          ← Back to courses
        </a>

        <p className="mt-4 text-sm font-medium text-green-400">
          Foreturn IQ — Admin
        </p>
        <h1 className="mt-1 text-3xl font-bold">
          {courseName || "Loading..."}
        </h1>
        <p className="mt-1 text-neutral-400">Manage offers</p>

        {/* Create form */}
        <section className="mt-8 rounded-2xl border border-neutral-800 bg-neutral-900/60 p-6">
          <h2 className="text-lg font-semibold">Add an offer</h2>

          <form onSubmit={handleCreate} className="mt-5 space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm text-neutral-300">Name</label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  placeholder="Hot Dog"
                  className="mt-2 block w-full rounded-lg border border-neutral-700 bg-neutral-950 px-4 py-2.5 text-base"
                />
              </div>

              <div>
                <label className="block text-sm text-neutral-300">
                  Price ($)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  required
                  placeholder="4.99"
                  className="mt-2 block w-full rounded-lg border border-neutral-700 bg-neutral-950 px-4 py-2.5 text-base"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm text-neutral-300">
                Description{" "}
                <span className="text-neutral-500">(optional)</span>
              </label>
              <input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="All beef frank on a toasted bun"
                className="mt-2 block w-full rounded-lg border border-neutral-700 bg-neutral-950 px-4 py-2.5 text-base"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm text-neutral-300">
                  Category
                </label>
                <input
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  required
                  placeholder="Food"
                  className="mt-2 block w-full rounded-lg border border-neutral-700 bg-neutral-950 px-4 py-2.5 text-base"
                />
              </div>

              <div>
                <label className="block text-sm text-neutral-300">
                  Fulfillment
                </label>
                <select
                  value={fulfillmentType}
                  onChange={(e) => setFulfillmentType(e.target.value)}
                  className="mt-2 block w-full rounded-lg border border-neutral-700 bg-neutral-950 px-4 py-2.5 text-base"
                >
                  {FULFILLMENT_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm text-neutral-300">
                  Available from{" "}
                  <span className="text-neutral-500">(minutes, optional)</span>
                </label>
                <input
                  type="number"
                  value={availableFrom}
                  onChange={(e) => setAvailableFrom(e.target.value)}
                  placeholder="e.g. -60"
                  className="mt-2 block w-full rounded-lg border border-neutral-700 bg-neutral-950 px-4 py-2.5 text-base"
                />
              </div>

              <div>
                <label className="block text-sm text-neutral-300">
                  Available until{" "}
                  <span className="text-neutral-500">(minutes, optional)</span>
                </label>
                <input
                  type="number"
                  value={availableUntil}
                  onChange={(e) => setAvailableUntil(e.target.value)}
                  placeholder="e.g. 120"
                  className="mt-2 block w-full rounded-lg border border-neutral-700 bg-neutral-950 px-4 py-2.5 text-base"
                />
              </div>
            </div>

            {error && (
              <p className="rounded-lg border border-red-800 bg-red-900/30 px-4 py-3 text-sm text-red-300">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="rounded-lg bg-green-500 px-5 py-2.5 font-semibold text-black disabled:opacity-50"
            >
              {submitting ? "Adding..." : "Add offer"}
            </button>
          </form>
        </section>

        {/* Offer list */}
        <section className="mt-8">
          <h2 className="text-lg font-semibold">
            Current offers{" "}
            <span className="ml-1 text-sm font-normal text-neutral-500">
              ({offers.length})
            </span>
          </h2>

          {loading ? (
            <p className="mt-4 text-sm text-neutral-500">Loading...</p>
          ) : offers.length === 0 ? (
            <p className="mt-4 text-sm text-neutral-500">No offers yet.</p>
          ) : (
            <div className="mt-4 space-y-6">
              {grouped.map((group) => (
                <div key={group.value}>
                  <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-neutral-500">
                    {group.label}
                  </p>
                  <div className="space-y-3">
                    {group.offers.map((offer) => (
                      <div
                        key={offer.id}
                        className={`flex items-start justify-between gap-4 rounded-xl border p-4 ${
                          offer.is_active
                            ? "border-neutral-800 bg-neutral-900/60"
                            : "border-neutral-800/50 bg-neutral-900/20 opacity-50"
                        }`}
                      >
                        <div>
                          <p className="font-medium">{offer.name}</p>
                          {offer.description && (
                            <p className="mt-0.5 text-sm text-neutral-400">
                              {offer.description}
                            </p>
                          )}
                          <div className="mt-2 flex flex-wrap gap-2 text-xs text-neutral-500">
                            <span>
                              ${(offer.price_cents / 100).toFixed(2)}
                            </span>
                            <span>·</span>
                            <span>{offer.category}</span>
                            {offer.available_from_minutes != null && (
                              <>
                                <span>·</span>
                                <span>
                                  from {offer.available_from_minutes}m
                                </span>
                              </>
                            )}
                            {offer.available_until_minutes != null && (
                              <>
                                <span>·</span>
                                <span>
                                  until {offer.available_until_minutes}m
                                </span>
                              </>
                            )}
                          </div>
                        </div>

                        <button
                          onClick={() => toggleActive(offer)}
                          className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold ${
                            offer.is_active
                              ? "bg-neutral-800 text-neutral-300 hover:bg-neutral-700"
                              : "bg-green-500/20 text-green-400 hover:bg-green-500/30"
                          }`}
                        >
                          {offer.is_active ? "Deactivate" : "Activate"}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
