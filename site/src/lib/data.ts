/**
 * Typed access to the normalized snapshot artifacts (synced from ../data/normalized).
 *
 * All data is scoped to the partner allowlist (config/partners.yaml) — there are
 * no aggregates outside the tracked partners anywhere in these artifacts.
 */
import metaJson from "@/data/meta.json";
import summaryJson from "@/data/summary.json";
import partnersJson from "@/data/partners.json";
import partnerTrendsJson from "@/data/partner-trends.json";

export interface TrendPoint {
  date: string;
  value: number | null;
}

export interface HrlTrendPoint {
  date: string;
  recordsLinked: number | null;
  abhasLinked: number | null;
}

export interface StatewiseRow {
  state: string;
  stateCode: string | null;
  value: number | null;
}

export interface PartnerRow {
  name: string;
  value: number | null;
}

export const meta = metaJson as {
  snapshotDate: string;
  generatedAt: string;
  source: string;
  allowlist: string[];
  states: { code: string; name: string }[];
  districts: Record<string, { code: string; name: string }[]>;
};

export const summary = summaryJson as {
  abha: { total: number; today: number; last30d: number };
  hrl: { total: number; today: number; last30d: number };
  partnersTracked: number;
  statesActive: number;
};

export const partners = partnersJson as {
  /** Config-driven allowlist (config/partners.yaml) — the only partners tracked. */
  allowlist: string[];
  abha: { national: PartnerRow[]; perState: Record<string, PartnerRow[]> };
  hrl: { national: PartnerRow[]; perState: Record<string, PartnerRow[]> };
  statewiseAbha: StatewiseRow[];
  statewiseHrl: StatewiseRow[];
};

export const partnerTrends = partnerTrendsJson as {
  abhaDaily: Record<string, TrendPoint[]>;
  abhaWeeklyAll: Record<string, TrendPoint[]>;
  hrlDaily: Record<string, HrlTrendPoint[]>;
  hrlWeeklyAll: Record<string, HrlTrendPoint[]>;
  combined: {
    abhaDaily: TrendPoint[];
    abhaWeeklyAll: TrendPoint[];
    hrlDaily: HrlTrendPoint[];
    hrlWeeklyAll: HrlTrendPoint[];
  };
};

/** "IN" key = national scope; state codes otherwise. */
export const NATIONAL = "IN";

export function scopeName(code: string): string {
  if (code === NATIONAL) return "India";
  return meta.states.find((s) => s.code === code)?.name ?? code;
}
