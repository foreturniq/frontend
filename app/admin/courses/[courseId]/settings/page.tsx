"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";

const COMMON_TIMEZONES = [
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Phoenix",
  "America/Los_Angeles",
  "America/Anchorage",
  "Pacific/Honolulu",
];

const DAY_LABELS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

function minutesToTimeInput(minutes: number | null | undefined): string {
  if (minutes == null) return "";
  const h = Math.floor(minutes / 60)
    .toString()
    .padStart(2, "0");
  const m = (minutes % 60).toString().padStart(2, "0");
  return `${h}:${m}`;
}

function timeInputToMinutes(value: string): number | null {
  if (!value) return null;
  const [h, m] = value.split(":").map(Number);
  return h * 60 + m;
}

type CourseHourEntry = {
  day_of_week: number;
  open_time_minutes: number | null;
  close_time_minutes: number | null;
};

// Local editable form of a day's hours, always one row per day of week (0-6).
type DayRow = { open: string; close: string };

function emptyWeek(): DayRow[] {
  return DAY_LABELS.map(() => ({ open: "", close: "" }));
}

export default function CourseSettingsPage() {
  const params = useParams();
  const courseId = params.courseId as string;

  const [courseName, setCourseName] = useState("");
  const [loading, setLoading] = useState(true);
  const [timezone, setTimezone] = useState("America/Denver");
  const [week, setWeek] = useState<DayRow[]>(emptyWeek());
  const [savingTimezone, setSavingTimezone] = useState(false);
  const [savingHours, setSavingHours] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  // Bulk-apply helper: set hours once, apply to a chosen set of days.
  const [bulkOpen, setBulkOpen] = useState("");
  const [bulkClose, setBulkClose] = useState("");
  const [bulkDays, setBulkDays] = useState<boolean[]>(
    DAY_LABELS.map(() => false),
  );

  const API = process.env.NEXT_PUBLIC_API_URL;

  const fetchCourse = useCallback(async () => {
    setLoading(true);
    try {
      const [courseRes, hoursRes] = await Promise.all([
        fetch(`${API}/courses/${courseId}`),
        fetch(`${API}/courses/${courseId}/hours`),
      ]);
      const courseData = await courseRes.json();
      const hoursData: CourseHourEntry[] = await hoursRes.json();

      setCourseName(courseData.name);
      setTimezone(courseData.timezone || "America/Denver");

      const next = emptyWeek();
      for (const entry of hoursData) {
        next[entry.day_of_week] = {
          open: minutesToTimeInput(entry.open_time_minutes),
          close: minutesToTimeInput(entry.close_time_minutes),
        };
      }
      setWeek(next);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [courseId, API]);

  useEffect(() => {
    fetchCourse();
  }, [fetchCourse]);

  async function handleSaveTimezone(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    setSavingTimezone(true);
    setError("");
    setSaved(false);

    const res = await fetch(`${API}/courses/${courseId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ timezone }),
    });

    const data = await res.json();
    setSavingTimezone(false);

    if (!res.ok) {
      setError(data.error || "Something went wrong");
      return;
    }

    setSaved(true);
  }

  function setDay(day: number, field: "open" | "close", value: string) {
    setWeek((prev) => {
      const next = [...prev];
      next[day] = { ...next[day], [field]: value };
      return next;
    });
  }

  function applyBulkHours() {
    setWeek((prev) => {
      const next = [...prev];
      for (let day = 0; day < 7; day++) {
        if (bulkDays[day]) {
          next[day] = { open: bulkOpen, close: bulkClose };
        }
      }
      return next;
    });
  }

  function toggleBulkDay(day: number) {
    setBulkDays((prev) => {
      const next = [...prev];
      next[day] = !next[day];
      return next;
    });
  }

  async function handleSaveHours() {
    setSavingHours(true);
    setError("");
    setSaved(false);

    const entries: CourseHourEntry[] = week.map((row, day) => ({
      day_of_week: day,
      open_time_minutes: timeInputToMinutes(row.open),
      close_time_minutes: timeInputToMinutes(row.close),
    }));

    const res = await fetch(`${API}/courses/${courseId}/hours`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(entries),
    });

    setSavingHours(false);

    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Something went wrong");
      return;
    }

    setSaved(true);
  }

  return (
    <main className="min-h-screen bg-neutral-950 text-white px-6 py-10">
      <div className="mx-auto max-w-2xl">
        <a
          href={`/admin/courses/${courseId}/offers`}
          className="text-sm text-neutral-500 hover:text-neutral-300"
        >
          ← Back to offers
        </a>

        <p className="mt-4 text-sm font-medium text-green-400">
          Foreturn IQ — Admin
        </p>
        <h1 className="mt-1 text-3xl font-bold">
          {courseName || "Loading..."}
        </h1>
        <p className="mt-1 text-neutral-400">Course settings</p>

        {loading ? (
          <p className="mt-8 text-sm text-neutral-500">Loading...</p>
        ) : (
          <>
            <section className="mt-8 rounded-2xl border border-neutral-800 bg-neutral-900/60 p-6">
              <h2 className="text-lg font-semibold">Timezone</h2>
              <p className="mt-1 text-sm text-neutral-500">
                Determines what &quot;clock time&quot; means for offer
                availability windows and the hours below.
              </p>

              <form
                onSubmit={handleSaveTimezone}
                className="mt-5 flex items-end gap-3"
              >
                <div className="flex-1">
                  <label className="block text-sm text-neutral-300">
                    Timezone
                  </label>
                  <input
                    list="timezone-options"
                    value={timezone}
                    onChange={(e) => setTimezone(e.target.value)}
                    required
                    placeholder="America/Denver"
                    className="mt-2 block w-full rounded-lg border border-neutral-700 bg-neutral-950 px-4 py-2.5 text-base"
                  />
                  <datalist id="timezone-options">
                    {COMMON_TIMEZONES.map((tz) => (
                      <option key={tz} value={tz} />
                    ))}
                  </datalist>
                </div>
                <button
                  type="submit"
                  disabled={savingTimezone}
                  className="rounded-lg bg-green-500 px-5 py-2.5 font-semibold text-black disabled:opacity-50"
                >
                  {savingTimezone ? "Saving..." : "Save"}
                </button>
              </form>
            </section>

            <section className="mt-8 rounded-2xl border border-neutral-800 bg-neutral-900/60 p-6">
              <h2 className="text-lg font-semibold">Hours</h2>
              <p className="mt-1 text-sm text-neutral-500">
                Set per day of week — e.g. Sunday–Thursday one set of hours,
                Friday–Saturday another. Leave a day blank for no
                restriction (open all day); this doesn&apos;t yet block
                ordering, it&apos;s used for reporting.
              </p>

              {/* Bulk apply helper */}
              <div className="mt-5 rounded-xl border border-neutral-800 bg-neutral-950 p-4">
                <p className="text-sm font-medium text-neutral-300">
                  Apply hours to multiple days
                </p>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="block text-xs text-neutral-500">
                      Open
                    </label>
                    <input
                      type="time"
                      value={bulkOpen}
                      onChange={(e) => setBulkOpen(e.target.value)}
                      className="mt-1 block w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-neutral-500">
                      Close
                    </label>
                    <input
                      type="time"
                      value={bulkClose}
                      onChange={(e) => setBulkClose(e.target.value)}
                      className="mt-1 block w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm"
                    />
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {DAY_LABELS.map((label, day) => (
                    <button
                      key={label}
                      type="button"
                      onClick={() => toggleBulkDay(day)}
                      className={`rounded-full px-3 py-1 text-xs font-medium ${
                        bulkDays[day]
                          ? "bg-green-500/20 text-green-400"
                          : "bg-neutral-800 text-neutral-400"
                      }`}
                    >
                      {label.slice(0, 3)}
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={applyBulkHours}
                  disabled={!bulkDays.some(Boolean)}
                  className="mt-3 rounded-lg bg-neutral-800 px-4 py-2 text-sm font-semibold text-neutral-200 hover:bg-neutral-700 disabled:opacity-50"
                >
                  Apply to selected days
                </button>
              </div>

              {/* Per-day grid */}
              <div className="mt-5 space-y-2">
                {DAY_LABELS.map((label, day) => (
                  <div
                    key={label}
                    className="grid grid-cols-[100px_1fr_1fr] items-center gap-3"
                  >
                    <span className="text-sm text-neutral-300">{label}</span>
                    <input
                      type="time"
                      value={week[day].open}
                      onChange={(e) => setDay(day, "open", e.target.value)}
                      className="rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm"
                    />
                    <input
                      type="time"
                      value={week[day].close}
                      onChange={(e) => setDay(day, "close", e.target.value)}
                      className="rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm"
                    />
                  </div>
                ))}
              </div>

              {error && (
                <p className="mt-4 rounded-lg border border-red-800 bg-red-900/30 px-4 py-3 text-sm text-red-300">
                  {error}
                </p>
              )}

              {saved && (
                <p className="mt-4 rounded-lg border border-green-800 bg-green-900/30 px-4 py-3 text-sm text-green-300">
                  Saved.
                </p>
              )}

              <button
                type="button"
                onClick={handleSaveHours}
                disabled={savingHours}
                className="mt-5 rounded-lg bg-green-500 px-5 py-2.5 font-semibold text-black disabled:opacity-50"
              >
                {savingHours ? "Saving..." : "Save hours"}
              </button>
            </section>
          </>
        )}
      </div>
    </main>
  );
}
