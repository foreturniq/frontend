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

function minutesToTimeInput(minutes: number | undefined): string {
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

type CourseSettings = {
  name: string;
  timezone: string;
  open_time_minutes?: number;
  close_time_minutes?: number;
};

export default function CourseSettingsPage() {
  const params = useParams();
  const courseId = params.courseId as string;

  const [courseName, setCourseName] = useState("");
  const [loading, setLoading] = useState(true);
  const [timezone, setTimezone] = useState("America/Denver");
  const [openTime, setOpenTime] = useState("");
  const [closeTime, setCloseTime] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  const API = process.env.NEXT_PUBLIC_API_URL;

  const fetchCourse = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/courses/${courseId}`);
      const data: CourseSettings = await res.json();
      setCourseName(data.name);
      setTimezone(data.timezone || "America/Denver");
      setOpenTime(minutesToTimeInput(data.open_time_minutes));
      setCloseTime(minutesToTimeInput(data.close_time_minutes));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [courseId, API]);

  useEffect(() => {
    fetchCourse();
  }, [fetchCourse]);

  async function handleSave(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setError("");
    setSaved(false);

    const res = await fetch(`${API}/courses/${courseId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        timezone,
        open_time_minutes: timeInputToMinutes(openTime),
        close_time_minutes: timeInputToMinutes(closeTime),
      }),
    });

    const data = await res.json();
    setSaving(false);

    if (!res.ok) {
      setError(data.error || "Something went wrong");
      return;
    }

    setSaved(true);
  }

  return (
    <main className="min-h-screen bg-neutral-950 text-white px-6 py-10">
      <div className="mx-auto max-w-xl">
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
          <section className="mt-8 rounded-2xl border border-neutral-800 bg-neutral-900/60 p-6">
            <h2 className="text-lg font-semibold">Hours & timezone</h2>
            <p className="mt-1 text-sm text-neutral-500">
              Timezone determines what &quot;clock time&quot; availability
              windows on offers mean (e.g. an offer available until 11:00 AM
              uses this course&apos;s local time). Open/close hours are
              stored for reporting and future scheduling use.
            </p>

            <form onSubmit={handleSave} className="mt-5 space-y-4">
              <div>
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
                <p className="mt-1 text-xs text-neutral-500">
                  IANA timezone name, e.g. America/Denver
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm text-neutral-300">
                    Open time{" "}
                    <span className="text-neutral-500">(optional)</span>
                  </label>
                  <input
                    type="time"
                    value={openTime}
                    onChange={(e) => setOpenTime(e.target.value)}
                    className="mt-2 block w-full rounded-lg border border-neutral-700 bg-neutral-950 px-4 py-2.5 text-base"
                  />
                </div>
                <div>
                  <label className="block text-sm text-neutral-300">
                    Close time{" "}
                    <span className="text-neutral-500">(optional)</span>
                  </label>
                  <input
                    type="time"
                    value={closeTime}
                    onChange={(e) => setCloseTime(e.target.value)}
                    className="mt-2 block w-full rounded-lg border border-neutral-700 bg-neutral-950 px-4 py-2.5 text-base"
                  />
                </div>
              </div>

              {error && (
                <p className="rounded-lg border border-red-800 bg-red-900/30 px-4 py-3 text-sm text-red-300">
                  {error}
                </p>
              )}

              {saved && (
                <p className="rounded-lg border border-green-800 bg-green-900/30 px-4 py-3 text-sm text-green-300">
                  Saved.
                </p>
              )}

              <button
                type="submit"
                disabled={saving}
                className="rounded-lg bg-green-500 px-5 py-2.5 font-semibold text-black disabled:opacity-50"
              >
                {saving ? "Saving..." : "Save settings"}
              </button>
            </form>
          </section>
        )}
      </div>
    </main>
  );
}
