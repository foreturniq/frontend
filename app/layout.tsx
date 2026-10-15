import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Foreturn IQ",
  description: "Pre Order Food and Drinks on the Course",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {process.env.NEXT_PUBLIC_APP_ENV === "staging" && (
          <div className="bg-amber-400 py-1 text-center text-xs font-semibold tracking-wide text-black">
            STAGING: Stripe test mode, not real orders
          </div>
        )}
        {children}
      </body>
    </html>
  );
}
