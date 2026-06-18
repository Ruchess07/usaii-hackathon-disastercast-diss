import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Nav } from "@/components/nav";
import { Suspense } from "react";
import { DataFreshnessFooter } from "@/components/data-freshness-badge";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "DisasterCast — Disaster Intervention Strategy Simulator",
  description: "AI-powered cost of inaction simulator for flood and wildfire prevention policy. USAII Global AI Hackathon 2026.",
};

function FreshnessWrapper() {
  return (
    <Suspense fallback={null}>
      <DataFreshnessFooter />
    </Suspense>
  );
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body className="min-h-dvh flex flex-col">
        <Nav />
        <main className="flex-1 w-full max-w-6xl mx-auto px-4 md:px-8 py-8 md:py-12">
          {children}
        </main>
        <FreshnessWrapper />
      </body>
    </html>
  );
}
