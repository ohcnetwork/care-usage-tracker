import type { Metadata } from "next";
import { meta } from "@/lib/abdm/data";
import { fmtDateLong } from "@/lib/format";

export const metadata: Metadata = {
  title: {
    default: "ABDM",
    template: "%s · ABDM · CARE Usage Tracker",
  },
  description:
    "Ayushman Bharat Digital Mission adoption metrics for tracked partners — ABHA numbers created, health records linked, and daily trends — mirrored from the official NHA dashboard.",
};

export default function AbdmLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <div className="mx-auto w-full max-w-6xl px-4 pb-8 sm:px-6">
        <p className="border-t border-border pt-4 text-xs text-placeholder-foreground">
          Unofficial, read-only mirror of public data from the{" "}
          <a
            href={meta.source}
            className="underline underline-offset-2 hover:text-foreground"
            target="_blank"
            rel="noreferrer"
          >
            ABDM dashboard
          </a>{" "}
          (National Health Authority). Snapshot taken {fmtDateLong(meta.snapshotDate)}.
        </p>
      </div>
    </>
  );
}
