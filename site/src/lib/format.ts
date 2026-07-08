/** Indian-system number formatting helpers. */

export function fmtIN(n: number | null | undefined): string {
  if (n == null) return "—";
  return n.toLocaleString("en-IN");
}

/** Compact Indian units: 1.2 Cr / 34.5 L / 8.2 K. */
export function fmtCompact(n: number | null | undefined): string {
  if (n == null) return "—";
  const abs = Math.abs(n);
  if (abs >= 1e7) return `${(n / 1e7).toLocaleString("en-IN", { maximumFractionDigits: 2 })} Cr`;
  if (abs >= 1e5) return `${(n / 1e5).toLocaleString("en-IN", { maximumFractionDigits: 2 })} L`;
  if (abs >= 1e3) return `${(n / 1e3).toLocaleString("en-IN", { maximumFractionDigits: 1 })} K`;
  return n.toLocaleString("en-IN");
}

export function fmtDate(iso: string): string {
  const d = new Date(iso + "T00:00:00");
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

export function fmtDateLong(iso: string): string {
  const d = new Date(iso + "T00:00:00");
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

export function pct(part: number | null, whole: number | null): string {
  if (part == null || whole == null || whole === 0) return "—";
  return `${((part / whole) * 100).toLocaleString("en-IN", { maximumFractionDigits: 1 })}%`;
}
