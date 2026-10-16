"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@clerk/nextjs";
import OperatorBar from "@/app/components/OperatorBar";
import { useApiFetch, useIsManager } from "@/lib/useApiFetch";

type Course = {
  id: string;
  name: string;
  stripe_account_id: string;
  created_at: string;
};

export default function AdminPage() {
  const apiFetch = useApiFetch();
  const isManager = useIsManager();
  const { orgId } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loadingCourses, setLoadingCourses] = useState(true);

  const [name, setName] = useState("");
  const [stripeAccountId, setStripeAccountId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [successId, setSuccessId] = useState("");

  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL || "https://api.foreturniq.com";

  const fetchCourses = useCallback(() => {
    // No active org while signing out; the API would 401.
    if (!orgId) return;
    return apiFetch("/courses")
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => setCourses(data))
      .catch((err) => console.error(err))
      .finally(() => setLoadingCourses(false));
  }, [apiFetch, orgId]);

  useEffect(() => {
    fetchCourses();
  }, [fetchCourses]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    setSuccessId("");

    const res = await apiFetch("/courses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, stripe_account_id: stripeAccountId }),
    });

    const data = await res.json();
    setSubmitting(false);

    if (!res.ok) {
      setError(data.error || "Something went wrong");
      return;
    }

    setSuccessId(data.id);
    setName("");
    setStripeAccountId("");
    fetchCourses();
  }

  return (
    <main className="min-h-screen bg-neutral-950 text-white px-6 py-10">
      <div className="mx-auto max-w-3xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-green-400">Foreturn IQ — Admin</p>
            <h1 className="mt-2 text-3xl font-bold">Courses</h1>
          </div>
          <OperatorBar />
        </div>

        {/* Create form */}
        {isManager && (
          <section className="mt-8 rounded-2xl border border-neutral-800 bg-neutral-900/60 p-6">
            <h2 className="text-lg font-semibold">Add a course</h2>

            <form onSubmit={handleSubmit} className="mt-5 space-y-4">
              <div>
                <label className="block text-sm text-neutral-300">Course name</label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  placeholder="Pebble Beach Golf Links"
                  className="mt-2 block w-full rounded-lg border border-neutral-700 bg-neutral-950 px-4 py-3 text-base"
                />
              </div>

              <div>
                <label className="block text-sm text-neutral-300">
                  Stripe account ID
                </label>
                <p className="mt-1 text-xs text-neutral-500">
                  Stripe Dashboard → Connect → Accounts. Starts with{" "}
                  <span className="font-mono">acct_</span>
                </p>
                <input
                  value={stripeAccountId}
                  onChange={(e) => setStripeAccountId(e.target.value)}
                  placeholder="acct_1234567890"
                  className="mt-2 block w-full rounded-lg border border-neutral-700 bg-neutral-950 px-4 py-3 font-mono text-base"
                />
              </div>

              {error && (
                <p className="rounded-lg border border-red-800 bg-red-900/30 px-4 py-3 text-sm text-red-300">
                  {error}
                </p>
              )}

              {successId && (
                <p className="rounded-lg border border-green-800 bg-green-900/30 px-4 py-3 text-sm text-green-300">
                  Course created — see below for links.
                </p>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="rounded-lg bg-green-500 px-5 py-2.5 font-semibold text-black disabled:opacity-50"
              >
                {submitting ? "Creating..." : "Create course"}
              </button>
            </form>
          </section>
        )}

        {/* Course list */}
        <section className="mt-8">
          <h2 className="text-lg font-semibold">
            All courses{" "}
            <span className="ml-1 text-sm font-normal text-neutral-500">
              ({courses.length})
            </span>
          </h2>

          {loadingCourses ? (
            <p className="mt-4 text-sm text-neutral-500">Loading...</p>
          ) : courses.length === 0 ? (
            <p className="mt-4 text-sm text-neutral-500">No courses yet.</p>
          ) : (
            <div className="mt-4 space-y-4">
              {courses.map((course) => (
                <CourseCard key={course.id} course={course} appUrl={appUrl} highlight={course.id === successId} isManager={isManager} />
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function CourseCard({
  course,
  appUrl,
  highlight,
  isManager,
}: {
  course: Course;
  appUrl: string;
  highlight: boolean;
  isManager: boolean;
}) {
  const links = [
    { label: "Dashboard", url: `${appUrl}/courses/${course.id}/orders` },
    { label: "QR Code", url: `${appUrl}/courses/${course.id}/qr` },
    { label: "Order URL", url: `${appUrl}/courses/${course.id}/order` },
  ];

  const adminLinks = isManager
    ? [{ label: "Manage Offers", url: `/admin/courses/${course.id}/offers` }]
    : [];

  return (
    <div
      className={`rounded-2xl border p-5 ${
        highlight ? "border-green-600 bg-green-900/10" : "border-neutral-800 bg-neutral-900/60"
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="font-semibold">{course.name}</h3>
          <p className="mt-0.5 font-mono text-xs text-neutral-500">{course.id}</p>
        </div>
        {course.stripe_account_id && (
          <span className="shrink-0 rounded-full bg-green-900/40 px-2.5 py-1 text-xs text-green-400">
            Stripe connected
          </span>
        )}
      </div>

      <div className="mt-4 flex flex-wrap gap-3">
        {adminLinks.map((link) => (
          <a
            key={link.label}
            href={link.url}
            className="rounded-lg bg-neutral-800 px-3 py-1.5 text-sm font-medium text-neutral-200 hover:bg-neutral-700"
          >
            {link.label}
          </a>
        ))}
        {links.map((link) => (
          <a
            key={link.label}
            href={link.url}
            target="_blank"
            rel="noreferrer"
            className="rounded-lg border border-neutral-700 px-3 py-1.5 text-sm text-neutral-300 hover:border-neutral-500"
          >
            {link.label} ↗
          </a>
        ))}
      </div>
    </div>
  );
}
