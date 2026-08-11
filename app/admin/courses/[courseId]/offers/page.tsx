"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";

type OfferCustomization = {
  id: string;
  label: string;
  price_cents: number;
  sort_order: number;
};

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
  customizations: OfferCustomization[];
};

const FULFILLMENT_OPTIONS = [
  { value: "before_round", label: "Before Round" },
  { value: "at_turn", label: "At the Turn" },
  { value: "after_round", label: "After Round" },
];

type WindowOption = { label: string; minutes: number | null };

const AVAILABILITY_OPTIONS: Record<
  string,
  { from: WindowOption[]; until: WindowOption[] }
> = {
  before_round: {
    from: [
      { label: "Anytime", minutes: null },
      { label: "7 days before", minutes: -10080 },
      { label: "2 days before", minutes: -2880 },
      { label: "24 hours before", minutes: -1440 },
      { label: "4 hours before", minutes: -240 },
      { label: "2 hours before", minutes: -120 },
    ],
    until: [
      { label: "Anytime", minutes: null },
      { label: "2 hours before", minutes: -120 },
      { label: "30 min before", minutes: -30 },
      { label: "At tee time", minutes: 0 },
    ],
  },
  at_turn: {
    from: [
      { label: "Anytime", minutes: null },
      { label: "24 hours before", minutes: -1440 },
      { label: "4 hours before", minutes: -240 },
      { label: "2 hours before", minutes: -120 },
      { label: "At tee time", minutes: 0 },
    ],
    until: [
      { label: "Anytime", minutes: null },
      { label: "At the turn (~1h 45m)", minutes: 105 },
    ],
  },
  after_round: {
    from: [
      { label: "Anytime", minutes: null },
      { label: "24 hours before", minutes: -1440 },
      { label: "At tee time", minutes: 0 },
      { label: "At the turn (~1h 45m)", minutes: 105 },
    ],
    until: [
      { label: "Anytime", minutes: null },
      { label: "After round (~4h)", minutes: 240 },
    ],
  },
};

function minutesToLabel(
  minutes: number | undefined,
  options: WindowOption[],
): string {
  if (minutes == null) return "Anytime";
  const match = options.find((o) => o.minutes === minutes);
  return match ? match.label : `${minutes}m`;
}

function allWindowOptions(): WindowOption[] {
  const seen = new Set<number | null>();
  const result: WindowOption[] = [];
  for (const group of Object.values(AVAILABILITY_OPTIONS)) {
    for (const opt of [...group.from, ...group.until]) {
      if (!seen.has(opt.minutes)) {
        seen.add(opt.minutes);
        result.push(opt);
      }
    }
  }
  return result;
}

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

  function handleFulfillmentChange(value: string) {
    setFulfillmentType(value);
    setAvailableFrom("null");
    setAvailableUntil("null");
  }
  const [availableFrom, setAvailableFrom] = useState<string>("null");
  const [availableUntil, setAvailableUntil] = useState<string>("null");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Customization panel state
  const [expandedOfferId, setExpandedOfferId] = useState<string | null>(null);
  const [newCustomLabel, setNewCustomLabel] = useState("");
  const [newCustomPrice, setNewCustomPrice] = useState("");
  const [savingCustomization, setSavingCustomization] = useState(false);

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

  async function handleCreate(e: React.SyntheticEvent<HTMLFormElement>) {
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
    const fromMinutes =
      availableFrom === "null" ? null : parseInt(availableFrom);
    const untilMinutes =
      availableUntil === "null" ? null : parseInt(availableUntil);
    if (fromMinutes !== null) body.available_from_minutes = fromMinutes;
    if (untilMinutes !== null) body.available_until_minutes = untilMinutes;

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
    setAvailableFrom("null");
    setAvailableUntil("null");
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

  function toggleCustomizationPanel(offerId: string) {
    setExpandedOfferId(expandedOfferId === offerId ? null : offerId);
    setNewCustomLabel("");
    setNewCustomPrice("");
  }

  async function addCustomization(
    e: React.SyntheticEvent<HTMLFormElement>,
    offerId: string,
  ) {
    e.preventDefault();
    setSavingCustomization(true);

    const priceCents = newCustomPrice
      ? Math.round(parseFloat(newCustomPrice) * 100)
      : 0;

    await fetch(`${API}/offers/${offerId}/customizations`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ label: newCustomLabel, price_cents: priceCents }),
    });

    setNewCustomLabel("");
    setNewCustomPrice("");
    setSavingCustomization(false);
    fetchOffers();
  }

  async function deleteCustomization(offerId: string, customizationId: string) {
    await fetch(`${API}/offers/${offerId}/customizations/${customizationId}`, {
      method: "DELETE",
    });
    fetchOffers();
  }

  // Offers whose fulfillment_type doesn't match one of the known
  // FULFILLMENT_OPTIONS values (e.g. legacy/seeded data using a different
  // vocabulary) still need to show up somewhere instead of vanishing.
  const knownFulfillmentValues = new Set(
    FULFILLMENT_OPTIONS.map((opt) => opt.value),
  );

  const knownGroups = FULFILLMENT_OPTIONS.map((opt) => ({
    key: opt.value,
    label: opt.label,
    offers: offers.filter((o) => o.fulfillment_type === opt.value),
  })).filter((g) => g.offers.length > 0);

  const unknownValues = Array.from(
    new Set(
      offers
        .filter((o) => !knownFulfillmentValues.has(o.fulfillment_type))
        .map((o) => o.fulfillment_type),
    ),
  ).sort();

  const unknownGroups = unknownValues.map((value) => ({
    key: value || "unknown",
    label: value || "(no fulfillment type)",
    offers: offers.filter((o) => o.fulfillment_type === value),
  }));

  const grouped = [...knownGroups, ...unknownGroups];

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
                Description <span className="text-neutral-500">(optional)</span>
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
                  onChange={(e) => handleFulfillmentChange(e.target.value)}
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
                  Available from
                </label>
                <select
                  value={availableFrom}
                  onChange={(e) => setAvailableFrom(e.target.value)}
                  className="mt-2 block w-full rounded-lg border border-neutral-700 bg-neutral-950 px-4 py-2.5 text-base"
                >
                  {AVAILABILITY_OPTIONS[fulfillmentType].from.map((o) => (
                    <option key={String(o.minutes)} value={String(o.minutes)}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm text-neutral-300">
                  Available until
                </label>
                <select
                  value={availableUntil}
                  onChange={(e) => setAvailableUntil(e.target.value)}
                  className="mt-2 block w-full rounded-lg border border-neutral-700 bg-neutral-950 px-4 py-2.5 text-base"
                >
                  {AVAILABILITY_OPTIONS[fulfillmentType].until.map((o) => (
                    <option key={String(o.minutes)} value={String(o.minutes)}>
                      {o.label}
                    </option>
                  ))}
                </select>
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
                <div key={group.key}>
                  <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-neutral-500">
                    {group.label}
                  </p>
                  <div className="space-y-3">
                    {group.offers.map((offer) => (
                      <div
                        key={offer.id}
                        className={`rounded-xl border ${
                          offer.is_active
                            ? "border-neutral-800 bg-neutral-900/60"
                            : "border-neutral-800/50 bg-neutral-900/20 opacity-50"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-4 p-4">
                          <div>
                            <p className="font-medium">{offer.name}</p>
                            {offer.description && (
                              <p className="mt-0.5 text-sm text-neutral-400">
                                {offer.description}
                              </p>
                            )}
                            <div className="mt-2 flex flex-wrap gap-2 text-xs text-neutral-500">
                              <span>${(offer.price_cents / 100).toFixed(2)}</span>
                              <span>·</span>
                              <span>{offer.category}</span>
                              {offer.available_from_minutes != null && (
                                <>
                                  <span>·</span>
                                  <span>
                                    from{" "}
                                    {minutesToLabel(
                                      offer.available_from_minutes,
                                      allWindowOptions(),
                                    )}
                                  </span>
                                </>
                              )}
                              {offer.available_until_minutes != null && (
                                <>
                                  <span>·</span>
                                  <span>
                                    until{" "}
                                    {minutesToLabel(
                                      offer.available_until_minutes,
                                      allWindowOptions(),
                                    )}
                                  </span>
                                </>
                              )}
                            </div>
                          </div>

                          <div className="flex shrink-0 gap-2">
                            <button
                              onClick={() => toggleCustomizationPanel(offer.id)}
                              className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${
                                expandedOfferId === offer.id
                                  ? "bg-neutral-600 text-white"
                                  : "bg-neutral-800 text-neutral-300 hover:bg-neutral-700"
                              }`}
                            >
                              Customize
                              {offer.customizations.length > 0 && (
                                <span className="ml-1.5 rounded-full bg-neutral-700 px-1.5 py-0.5 text-neutral-300">
                                  {offer.customizations.length}
                                </span>
                              )}
                            </button>
                            <button
                              onClick={() => toggleActive(offer)}
                              className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${
                                offer.is_active
                                  ? "bg-neutral-800 text-neutral-300 hover:bg-neutral-700"
                                  : "bg-green-500/20 text-green-400 hover:bg-green-500/30"
                              }`}
                            >
                              {offer.is_active ? "Deactivate" : "Activate"}
                            </button>
                          </div>
                        </div>

                        {/* Customization panel */}
                        {expandedOfferId === offer.id && (
                          <div className="border-t border-neutral-800 px-4 pb-4 pt-4">
                            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-neutral-500">
                              Customization options
                            </p>

                            {offer.customizations.length === 0 ? (
                              <p className="mb-3 text-sm text-neutral-600">
                                No options yet.
                              </p>
                            ) : (
                              <div className="mb-4 space-y-2">
                                {offer.customizations.map((c) => (
                                  <div
                                    key={c.id}
                                    className="flex items-center justify-between rounded-lg border border-neutral-800 bg-neutral-950 px-3 py-2"
                                  >
                                    <div className="flex items-center gap-3 text-sm">
                                      <span className="text-neutral-200">
                                        {c.label}
                                      </span>
                                      {c.price_cents > 0 ? (
                                        <span className="text-xs text-green-400">
                                          +${(c.price_cents / 100).toFixed(2)}
                                        </span>
                                      ) : (
                                        <span className="text-xs text-neutral-600">
                                          free
                                        </span>
                                      )}
                                    </div>
                                    <button
                                      onClick={() =>
                                        deleteCustomization(offer.id, c.id)
                                      }
                                      className="text-xs text-neutral-600 hover:text-red-400"
                                    >
                                      Remove
                                    </button>
                                  </div>
                                ))}
                              </div>
                            )}

                            <form
                              onSubmit={(e) => addCustomization(e, offer.id)}
                              className="flex gap-2"
                            >
                              <input
                                value={newCustomLabel}
                                onChange={(e) =>
                                  setNewCustomLabel(e.target.value)
                                }
                                required
                                placeholder="e.g. Add bacon"
                                className="flex-1 rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm"
                              />
                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={newCustomPrice}
                                onChange={(e) =>
                                  setNewCustomPrice(e.target.value)
                                }
                                placeholder="Price (optional)"
                                className="w-36 rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm"
                              />
                              <button
                                type="submit"
                                disabled={savingCustomization}
                                className="rounded-lg bg-green-500 px-3 py-2 text-sm font-semibold text-black disabled:opacity-50"
                              >
                                Add
                              </button>
                            </form>
                          </div>
                        )}
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
