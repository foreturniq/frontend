"use client";

import { QRCodeCanvas } from "qrcode.react";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

export default function CourseQRPage() {
  const params = useParams();
  const courseId = params.courseId as string;

  const [orderUrl, setOrderUrl] = useState("");
  const [qrSize, setQrSize] = useState(280);

  useEffect(() => {
    const base =
      process.env.NEXT_PUBLIC_APP_URL || "https://api.foreturniq.com";
    setOrderUrl(`${base}/courses/${courseId}/order`);
  }, [courseId]);

  useEffect(() => {
    const update = () => {
      // subtract main px-6 (48) + outer border-4+p-8 (72) + inner border-2+p-5 (44) = 164px overhead
      const size = Math.min(280, window.innerWidth - 164);
      setQrSize(Math.max(size, 160));
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  return (
    <main className="min-h-screen bg-white px-6 py-10 text-black">
      <div className="mx-auto max-w-lg rounded-3xl border-4 border-black p-6 text-center sm:p-8">
        <p className="text-sm font-bold uppercase tracking-[0.3em] text-green-700">
          Foreturn IQ
        </p>

        <h1 className="mt-5 text-3xl font-black uppercase leading-tight sm:text-5xl">
          Skip the Wait
          <br />
          at the Turn
        </h1>

        <p className="mt-5 text-lg font-semibold text-neutral-700 sm:text-xl">
          Order food & drinks from your phone
        </p>

        {orderUrl && (
          <div className="mt-8 inline-block rounded-3xl border-2 border-black bg-white p-4 sm:p-5">
            <QRCodeCanvas value={orderUrl} size={qrSize} marginSize={1} />
          </div>
        )}

        <p className="mt-6 text-base font-bold sm:text-lg">
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
