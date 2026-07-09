import type { Metadata } from "next";
import Link from "next/link";
import { Activity } from "lucide-react";
import { NavLinks } from "@/components/nav-links";
import { SITE_URL } from "@/lib/site";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "CARE Usage Tracker",
    template: "%s · CARE Usage Tracker",
  },
  description:
    "Usage metrics for the CARE ecosystem across public health dashboards — static mirrors of adoption data for a curated allowlist of partners.",
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
              CARE Usage Tracker
            </Link>
            <NavLinks />
          </div>
        </header>
        <main className="flex-1">{children}</main>
        <footer className="border-t border-border py-6">
          <div className="mx-auto flex w-full max-w-6xl flex-col gap-1 px-4 text-xs text-placeholder-foreground sm:px-6">
            <p>
              Unofficial, read-only mirrors of public dashboard data. Only data
              for tracked partners (config/&lt;tracker&gt;/partners.yaml) is
              collected and shown.
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
