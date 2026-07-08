"use client";

import type { LabelValue } from "@/lib/data";
import { fmtCompact, fmtIN } from "@/lib/format";
import { cn } from "@/lib/utils";

const PALETTE = [
  "var(--chart-2)",
  "var(--chart-1)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
  "var(--color-stronger-border)",
];

/** Horizontal proportion bar + legend for small categorical distributions (age, gender). */
export function DistributionBars({ data, className }: { data: LabelValue[]; className?: string }) {
  const total = data.reduce((s, d) => s + (d.value ?? 0), 0);
  const rows = data.filter((d) => (d.value ?? 0) > 0);
  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <div className="flex h-3 w-full overflow-hidden rounded-full bg-muted-background">
        {rows.map((d, i) => (
          <div
            key={d.label}
            className="h-full"
            style={{
              width: `${((d.value ?? 0) / total) * 100}%`,
              background: PALETTE[i % PALETTE.length],
            }}
            title={`${d.label}: ${fmtIN(d.value)}`}
          />
        ))}
      </div>
      <ul className="grid grid-cols-2 gap-x-4 gap-y-1.5 sm:grid-cols-3">
        {rows.map((d, i) => (
          <li key={d.label} className="flex items-center gap-2 text-sm">
            <span
              className="size-2.5 shrink-0 rounded-[3px]"
              style={{ background: PALETTE[i % PALETTE.length] }}
              aria-hidden
            />
            <span className="truncate text-soft-foreground">{d.label}</span>
            <span className="ml-auto font-medium tabular-nums" title={fmtIN(d.value)}>
              {total > 0 ? `${(((d.value ?? 0) / total) * 100).toFixed(1)}%` : fmtCompact(d.value)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
