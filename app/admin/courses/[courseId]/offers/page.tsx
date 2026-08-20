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
  available_from_clock_minutes?: number;
  available_until_clock_minutes?: number;
  customizations: OfferCustomization[];
};

// Converts minutes-since-midnight (0-1439) to an <input type="time"> value ("HH:MM").
function clockMinutesToTimeInput(minutes: number | undefined): string {
  if (minutes == null) return "";
  const h = Math.floor(minutes / 60)
    .toString()
    .padStart(2, "0");
  const m = (minutes % 60).toString().padStart(2, "0");
  return `${h}:${m}`;
}

// Converts an <input type="time"> value ("HH:MM") back to minutes-since-midnight.
function timeInputToClockMinutes(value: string): number | null {
  if (!value) return null;
  const [h, m] = value.split(":").map(Number);
  return h * 60 + m;
}

function clockMinutesToLabel(minutes: number | undefined): string {
  if (minutes == null) return "";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  const period = h < 12 ? "AM" : "PM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${m.toString().padStart(2, "0")} ${period}`;
}

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
  const [availableFromClock, setAvailableFromClock] = useState("");
  const [availableUntilClock, setAvailableUntilClock] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Customization panel state
  const [expandedOfferId, setExpandedOfferId] = useState<string | null>(null);
  const [newCustomLabel, setNewCustomLabel] = useState("");
  const [newCustomPrice, setNewCustomPrice] = useState("");
  const [savingCustomization, setSavingCustomization] = useState(false);

  // Edit form state
  const [editingOfferId, setEditingOfferId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editPrice, setEditPrice] = useState("");
  const [editCategory, setEditCategory] = useState("");
  const [editFulfillmentType, setEditFulfillmentType] = useState("before_round");
  const [editAvailableFrom, setEditAvailableFrom] = useState("null");
  const [editAvailableUntil, setEditAvailableUntil] = useState("null");
  const [editAvailableFromClock, setEditAvailableFromClock] = useState("");
  const [editAvailableUntilClock, setEditAvailableUntilClock] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);
  const [editError, setEditError] = useState("");

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

    const fromClockMinutes = timeInputToClockMinutes(availableFromClock);
    const untilClockMinutes = timeInputToClockMinutes(availableUntilClock);
    if (fromClockMinutes !== null)
      body.available_from_clock_minutes = fromClockMinutes;
    if (untilClockMinutes !== null)
      body.available_until_clock_minutes = untilClockMinutes;

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
    setAvailableFromClock("");
    setAvailableUntilClock("");
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

  function startEdit(offer: Offer) {
    setEditingOfferId(offer.id);
    setEditName(offer.name);
    setEditDescription(offer.description ?? "");
    setEditPrice((offer.price_cents / 100).toFixed(2));
    setEditCategory(offer.category);
    setEditFulfillmentType(offer.fulfillment_type);
    setEditAvailableFrom(
      offer.available_from_minutes != null
        ? String(offer.available_from_minutes)
        : "null",
    );
    setEditAvailableUntil(
      offer.available_until_minutes != null
        ? String(offer.available_until_minutes)
        : "null",
    );
    setEditAvailableFromClock(
      clockMinutesToTimeInput(offer.available_from_clock_minutes),
    );
    setEditAvailableUntilClock(
      clockMinutesToTimeInput(offer.available_until_clock_minutes),
    );
    setEditError("");
    setExpandedOfferId(null);
  }

  function cancelEdit() {
    setEditingOfferId(null);
    setEditError("");
  }

  async function saveEdit(
    e: React.SyntheticEvent<HTMLFormElement>,
    offerId: string,
  ) {
    e.preventDefault();
    setSavingEdit(true);
    setEditError("");

    const body: Record<string, unknown> = {
      name: editName,
      price_cents: Math.round(parseFloat(editPrice) * 100),
      category: editCategory,
      fulfillment_type: editFulfillmentType,
      description: editDescription || null,
      available_from_minutes:
        editAvailableFrom === "null" ? null : parseInt(editAvailableFrom),
      available_until_minutes:
        editAvailableUntil === "null" ? null : parseInt(editAvailableUntil),
      available_from_clock_minutes: timeInputToClockMinutes(
        editAvailableFromClock,
      ),
      available_until_clock_minutes: timeInputToClockMinutes(
        editAvailableUntilClock,
      ),
    };

    const res = await fetch(`${API}/offers/${offerId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const data = await res.json();
    setSavingEdit(false);

    if (!res.ok) {
      setEditError(data.error || "Something went wrong");
      return;
    }

    setEditingOfferId(null);
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
        <div className="mt-1 flex items-center gap-3">
          <p className="text-neutral-400">Manage offers</p>
          <a
            href={`/admin/courses/${courseId}/settings`}
            className="text-sm text-green-400 hover:text-green-300"
          >
            Hours & timezone settings →
          </a>
        </div>

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

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm text-neutral-300">
                  Available from (clock time){" "}
                  <span className="text-neutral-500">(optional)</span>
                </label>
                <input
                  type="time"
                  value={availableFromClock}
                  onChange={(e) => setAvailableFromClock(e.target.value)}
                  className="mt-2 block w-full rounded-lg border border-neutral-700 bg-neutral-950 px-4 py-2.5 text-base"
                />
              </div>

              <div>
                <label className="block text-sm text-neutral-300">
                  Available until (clock time){" "}
                  <span className="text-neutral-500">(optional)</span>
                </label>
                <input
                  type="time"
                  value={availableUntilClock}
                  onChange={(e) => setAvailableUntilClock(e.target.value)}
                  className="mt-2 block w-full rounded-lg border border-neutral-700 bg-neutral-950 px-4 py-2.5 text-base"
                />
              </div>
            </div>
            <p className="text-xs text-neutral-500">
              E.g. set &quot;Available until&quot; to 11:00 AM to stop showing
              breakfast items after that time, in the course&apos;s local
              timezone. Independent of the relative windows above — an
              offer must satisfy both if both are set.
            </p>

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
                              {offer.available_from_clock_minutes != null && (
                                <>
                                  <span>·</span>
                                  <span>
                                    from clock{" "}
                                    {clockMinutesToLabel(
                                      offer.available_from_clock_minutes,
                                    )}
                                  </span>
                                </>
                              )}
                              {offer.available_until_clock_minutes != null && (
                                <>
                                  <span>·</span>
                                  <span>
                                    until clock{" "}
                                    {clockMinutesToLabel(
                                      offer.available_until_clock_minutes,
                                    )}
                                  </span>
                                </>
                              )}
                            </div>
                          </div>

                          <div className="flex shrink-0 gap-2">
                            <button
                              onClick={() => startEdit(offer)}
                              className="rounded-lg bg-neutral-800 px-3 py-1.5 text-xs font-semibold text-neutral-300 hover:bg-neutral-700"
                            >
                              Edit
                            </button>
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

                        {/* Edit panel */}
                        {editingOfferId === offer.id && (
                          <form
                            onSubmit={(e) => saveEdit(e, offer.id)}
                            className="space-y-4 border-t border-neutral-800 px-4 pb-4 pt-4"
                          >
                            <div className="grid gap-4 sm:grid-cols-2">
                              <div>
                                <label className="block text-sm text-neutral-300">
                                  Name
                                </label>
                                <input
                                  value={editName}
                                  onChange={(e) => setEditName(e.target.value)}
                                  required
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
                                  value={editPrice}
                                  onChange={(e) => setEditPrice(e.target.value)}
                                  required
                                  className="mt-2 block w-full rounded-lg border border-neutral-700 bg-neutral-950 px-4 py-2.5 text-base"
                                />
                              </div>
                            </div>

                            <div>
                              <label className="block text-sm text-neutral-300">
                                Description{" "}
                                <span className="text-neutral-500">
                                  (optional)
                                </span>
                              </label>
                              <input
                                value={editDescription}
                                onChange={(e) =>
                                  setEditDescription(e.target.value)
                                }
                                className="mt-2 block w-full rounded-lg border border-neutral-700 bg-neutral-950 px-4 py-2.5 text-base"
                              />
                            </div>

                            <div className="grid gap-4 sm:grid-cols-2">
                              <div>
                                <label className="block text-sm text-neutral-300">
                                  Category
                                </label>
                                <input
                                  value={editCategory}
                                  onChange={(e) =>
                                    setEditCategory(e.target.value)
                                  }
                                  required
                                  className="mt-2 block w-full rounded-lg border border-neutral-700 bg-neutral-950 px-4 py-2.5 text-base"
                                />
                              </div>
                              <div>
                                <label className="block text-sm text-neutral-300">
                                  Fulfillment
                                </label>
                                <select
                                  value={editFulfillmentType}
                                  onChange={(e) =>
                                    setEditFulfillmentType(e.target.value)
                                  }
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
                                  value={editAvailableFrom}
                                  onChange={(e) =>
                                    setEditAvailableFrom(e.target.value)
                                  }
                                  className="mt-2 block w-full rounded-lg border border-neutral-700 bg-neutral-950 px-4 py-2.5 text-base"
                                >
                                  {AVAILABILITY_OPTIONS[
                                    editFulfillmentType
                                  ]?.from.map((o) => (
                                    <option
                                      key={String(o.minutes)}
                                      value={String(o.minutes)}
                                    >
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
                                  value={editAvailableUntil}
                                  onChange={(e) =>
                                    setEditAvailableUntil(e.target.value)
                                  }
                                  className="mt-2 block w-full rounded-lg border border-neutral-700 bg-neutral-950 px-4 py-2.5 text-base"
                                >
                                  {AVAILABILITY_OPTIONS[
                                    editFulfillmentType
                                  ]?.until.map((o) => (
                                    <option
                                      key={String(o.minutes)}
                                      value={String(o.minutes)}
                                    >
                                      {o.label}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            </div>

                            <div className="grid gap-4 sm:grid-cols-2">
                              <div>
                                <label className="block text-sm text-neutral-300">
                                  Available from (clock time){" "}
                                  <span className="text-neutral-500">
                                    (optional)
                                  </span>
                                </label>
                                <input
                                  type="time"
                                  value={editAvailableFromClock}
                                  onChange={(e) =>
                                    setEditAvailableFromClock(e.target.value)
                                  }
                                  className="mt-2 block w-full rounded-lg border border-neutral-700 bg-neutral-950 px-4 py-2.5 text-base"
                                />
                              </div>
                              <div>
                                <label className="block text-sm text-neutral-300">
                                  Available until (clock time){" "}
                                  <span className="text-neutral-500">
                                    (optional)
                                  </span>
                                </label>
                                <input
                                  type="time"
                                  value={editAvailableUntilClock}
                                  onChange={(e) =>
                                    setEditAvailableUntilClock(e.target.value)
                                  }
                                  className="mt-2 block w-full rounded-lg border border-neutral-700 bg-neutral-950 px-4 py-2.5 text-base"
                                />
                              </div>
                            </div>

                            {editError && (
                              <p className="rounded-lg border border-red-800 bg-red-900/30 px-4 py-3 text-sm text-red-300">
                                {editError}
                              </p>
                            )}

                            <div className="flex gap-2">
                              <button
                                type="submit"
                                disabled={savingEdit}
                                className="rounded-lg bg-green-500 px-5 py-2.5 font-semibold text-black disabled:opacity-50"
                              >
                                {savingEdit ? "Saving..." : "Save changes"}
                              </button>
                              <button
                                type="button"
                                onClick={cancelEdit}
                                className="rounded-lg bg-neutral-800 px-5 py-2.5 font-semibold text-neutral-300 hover:bg-neutral-700"
                              >
                                Cancel
                              </button>
                            </div>
                          </form>
                        )}

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
