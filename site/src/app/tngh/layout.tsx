import type { Metadata } from "next";
import { meta } from "@/lib/tngh/data";
import { fmtDateLong } from "@/lib/format";

export const metadata: Metadata = {
  title: {
    default: "TN Govt Hospitals",
    template: "%s · TN Govt Hospitals · CARE Usage Tracker",
  },
  description:
    "Digital health adoption in Tamil Nadu's government & public hospitals — ABHA numbers created, health records linked, and Scan & Share activity per facility — mirrored from the official NHA dashboard.",
};

export default function TnghLayout({ children }: { children: React.ReactNode }) {
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
          (National Health Authority), scoped to Tamil Nadu&apos;s government
          facilities. Facility classes are derived from facility names.
          Snapshot taken {fmtDateLong(meta.snapshotDate)}.
        </p>
      </div>
    </>
  );
}
