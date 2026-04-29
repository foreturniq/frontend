"use client";

import { QRCodeCanvas } from "qrcode.react";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

export default function CourseQRPage() {
  const params = useParams();
  const courseId = params.courseId as string;

  const [orderUrl, setOrderUrl] = useState("");

  useEffect(() => {
    setOrderUrl(`${window.location.origin}/courses/${courseId}/order`);
  }, [courseId]);

  return (
    <main className="min-h-screen bg-white px-6 py-10 text-black">
      <div className="mx-auto max-w-lg rounded-3xl border-4 border-black p-8 text-center">
        <p className="text-sm font-bold uppercase tracking-[0.3em] text-green-700">
          Foreturn IQ
        </p>

        <h1 className="mt-5 text-5xl font-black uppercase leading-tight">
          Skip the Wait
          <br />
          at the Turn
        </h1>

        <p className="mt-5 text-xl font-semibold text-neutral-700">
          Order food & drinks from your phone
        </p>

        {orderUrl && (
          <div className="mt-8 inline-block rounded-3xl border-2 border-black bg-white p-5">
            <QRCodeCanvas value={orderUrl} size={330} marginSize={1} />
          </div>
        )}

        <p className="mt-6 text-lg font-bold">
          Pay ahead • Pick up at the turn
        </p>

        <p className="mt-2 text-sm font-medium text-neutral-500">
          No app required
        </p>

        <button
          onClick={() => window.print()}
          className="no-print mt-8 rounded-lg bg-green-500 px-5 py-3 font-bold text-black"
        >
          Print QR Sign
        </button>
      </div>
    </main>
  );
}
