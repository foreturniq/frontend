"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import OperatorBar from "@/app/components/OperatorBar";
import { useApiFetch, useIsInternal } from "@/lib/useApiFetch";

type Course = { id: string; name: string };

// Sign-in landing. One course goes straight to its order queue; a
// management company with several courses picks one.
export default function DashboardPage() {
  const apiFetch = useApiFetch();
  const router = useRouter();
  const { orgId } = useAuth();
  const internal = useIsInternal();
  const [courses, setCourses] = useState<Course[] | null>(null);

  useEffect(() => {
    if (!orgId) return;
    if (internal) {
      router.replace("/admin");
      return;
    }
    apiFetch("/courses")
      .then((res) => (res.ok ? res.json() : []))
      .then((data: Course[]) => {
        if (data.length === 1) {
          router.replace(`/courses/${data[0].id}/orders`);
          return;
        }
        setCourses(data);
      })
      .catch((err) => {
        console.error(err);
        setCourses([]);
      });
  }, [apiFetch, orgId, internal, router]);

  return (
    <main className="min-h-screen bg-neutral-950 text-white px-6 py-10">
      <div className="mx-auto max-w-3xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-green-400">Foreturn IQ</p>
            <h1 className="mt-2 text-3xl font-bold">Your courses</h1>
          </div>
          <OperatorBar />
        </div>

        {courses === null ? (
          <p className="mt-8 text-sm text-neutral-500">Loading...</p>
        ) : courses.length === 0 ? (
          <p className="mt-8 text-neutral-400">
            No course is set up for this organization yet. Contact Foreturn IQ
            to get your course connected.
          </p>
        ) : (
          <div className="mt-8 space-y-3">
            {courses.map((course) => (
              <a
                key={course.id}
                href={`/courses/${course.id}/orders`}
                className="block rounded-2xl border border-neutral-800 bg-neutral-900/60 p-5 font-semibold hover:border-neutral-600"
              >
                {course.name}
              </a>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
