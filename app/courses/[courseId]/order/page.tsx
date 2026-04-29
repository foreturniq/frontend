"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";

export default function CourseOrderEntryPage() {
  const router = useRouter();
  const params = useParams();

  const courseId = params.courseId as string;
  const [courseName, setCourseName] = useState<string>("");

  const [golferName, setGolferName] = useState("");
  const [golferPhone, setGolferPhone] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [playerCount, setPlayerCount] = useState(1);
  const [loading, setLoading] = useState(false);

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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/courses/${courseId}/golfer-tee-times`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          starts_at: new Date(startsAt).toISOString(),
          player_count: playerCount,
          golfer_name: golferName,
          golfer_phone: golferPhone,
        }),
      },
    );

    const data = await res.json();

    if (!res.ok) {
      alert(data.error || "Something went wrong");
      setLoading(false);
      return;
    }

    router.push(`/tee-times/${data.tee_time_id}/order-page`);
  }

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

  return (
    <main className="min-h-screen bg-neutral-950 text-white px-6 py-10">
      <div className="mx-auto max-w-md">
        <p className="text-sm text-green-400 font-medium">Foreturn IQ</p>

        <h1 className="mt-3 text-3xl font-bold">{courseName}</h1>
        <h1 className="mt-1 text-3xl font-bold">Order ahead for your round</h1>

        <p className="mt-3 text-neutral-400">
          Enter your tee time and we’ll show what’s available before or during
          your round.
        </p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-5">
          <div>
            <label className="block text-sm text-neutral-300">Name</label>
            <input
              value={golferName}
              onChange={(e) => setGolferName(e.target.value)}
              required
              className="mt-2 w-full rounded-lg bg-neutral-900 border border-neutral-700 px-4 py-3"
              placeholder="Full Name"
            />
          </div>

          <div>
            <label className="block text-sm text-neutral-300">Phone</label>
            <input
              value={golferPhone}
              onChange={(e) => setGolferPhone(e.target.value)}
              required
              className="mt-2 w-full rounded-lg bg-neutral-900 border border-neutral-700 px-4 py-3"
              placeholder="111-111-1111"
            />
          </div>

          <div>
            <label className="block text-sm text-neutral-300">Tee time</label>
            <input
              type="datetime-local"
              value={startsAt}
              onChange={(e) => setStartsAt(e.target.value)}
              required
              className="mt-2 w-full rounded-lg bg-neutral-900 border border-neutral-700 px-4 py-3"
            />
          </div>

          <div>
            <label className="block text-sm text-neutral-300">
              Player count
            </label>
            <input
              type="number"
              min={1}
              max={8}
              value={playerCount}
              onChange={(e) => setPlayerCount(Number(e.target.value))}
              required
              className="mt-2 w-full rounded-lg bg-neutral-900 border border-neutral-700 px-4 py-3"
            />
          </div>

          <button
            disabled={loading}
            className="w-full rounded-lg bg-green-500 px-4 py-3 font-semibold text-black disabled:opacity-50"
          >
            {loading ? "Loading..." : "See available offers"}
          </button>
        </form>
      </div>
    </main>
  );
}
