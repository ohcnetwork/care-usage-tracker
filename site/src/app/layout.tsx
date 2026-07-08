import type { Metadata } from "next";
import Link from "next/link";
import { Activity } from "lucide-react";
import { meta } from "@/lib/data";
import { fmtDateLong } from "@/lib/format";
import { NavLinks } from "@/components/nav-links";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "ABDM Stats — Ayushman Bharat Digital Mission metrics",
    template: "%s · ABDM Stats",
  },
  description:
    "Open, static mirror of Ayushman Bharat Digital Mission (ABDM) metrics — ABHA numbers created, health records linked, partner-wise adoption — scraped from the official NHA dashboard.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-dvh flex flex-col">
        <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-md">
          <div className="mx-auto flex h-14 w-full max-w-6xl items-center gap-6 px-4 sm:px-6">
            <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
              <span className="flex size-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
                <Activity className="size-4" aria-hidden />
              </span>
              ABDM Stats
            </Link>
            <NavLinks />
            <span className="ml-auto hidden text-xs text-placeholder-foreground sm:block">
              snapshot · {fmtDateLong(meta.snapshotDate)}
            </span>
          </div>
        </header>
        <main className="flex-1">{children}</main>
        <footer className="border-t border-border py-6">
          <div className="mx-auto flex w-full max-w-6xl flex-col gap-1 px-4 text-xs text-placeholder-foreground sm:px-6">
            <p>
              Unofficial, read-only mirror of public data from the{" "}
              <a href={meta.source} className="underline underline-offset-2 hover:text-foreground" target="_blank" rel="noreferrer">
                ABDM dashboard
              </a>{" "}
              (National Health Authority). Snapshot taken {fmtDateLong(meta.snapshotDate)}.
            </p>
            <p>
              Built with{" "}
              <a href="https://careui.ohc.network" className="underline underline-offset-2 hover:text-foreground" target="_blank" rel="noreferrer">
                care·ui
              </a>{" "}
              · Open Healthcare Network
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
