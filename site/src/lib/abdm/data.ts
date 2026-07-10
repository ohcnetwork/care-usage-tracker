/**
 * Typed access to the normalized snapshot artifacts (synced from ../data/abdm/normalized).
 *
 * All data is scoped to the partner allowlist (config/abdm/partners.yaml) — there are
 * no aggregates outside the tracked partners anywhere in these artifacts.
 */
import metaJson from "@/data/abdm/meta.json";
import summaryJson from "@/data/abdm/summary.json";
import partnersJson from "@/data/abdm/partners.json";
import partnerTrendsJson from "@/data/abdm/partner-trends.json";

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
  abha: MetricSummary;
  hrl: MetricSummary;
  abhaLinked: MetricSummary;
  sas: MetricSummary & { facilities: number; activePartners: number };
  partnersTracked: number;
  statesActive: number;
  activePartners7d: number;
  activePartners30d: number;
  linkageDepth30d: number | null;
  partnerLinkageDepth: { name: string; depth: number }[];
};

export interface MetricSummary {
  total: number;
  today: number;
  last30d: number;
  last7d: number;
  prev7d: number;
  weekGrowthPct: number | null;
  perDay7d: number;
  perDay30d: number;
}

export interface PartnerSasRow {
  name: string;
  total: number;
  last30d: number;
  today: number;
  states: number;
  facilities: number;
  since: string | null;
}

export const partners = partnersJson as {
  /** Config-driven allowlist (config/abdm/partners.yaml) — the only partners tracked. */
  allowlist: string[];
  abha: { national: PartnerRow[]; perState: Record<string, PartnerRow[]> };
  hrl: { national: PartnerRow[]; perState: Record<string, PartnerRow[]> };
  statewiseAbha: StatewiseRow[];
  statewiseHrl: StatewiseRow[];
  sas: PartnerSasRow[];
};

export const partnerTrends = partnerTrendsJson as {
  abhaDaily: Record<string, TrendPoint[]>;
  abhaWeeklyAll: Record<string, TrendPoint[]>;
  hrlDaily: Record<string, HrlTrendPoint[]>;
  hrlWeeklyAll: Record<string, HrlTrendPoint[]>;
  sasDaily: Record<string, TrendPoint[]>;
  sasAll: Record<string, TrendPoint[]>;
  combined: {
    abhaDaily: TrendPoint[];
    abhaWeeklyAll: TrendPoint[];
    hrlDaily: HrlTrendPoint[];
    hrlWeeklyAll: HrlTrendPoint[];
    sasDaily: TrendPoint[];
    sasAll: TrendPoint[];
    abhaCumulative: TrendPoint[];
    hrlCumulative: TrendPoint[];
    abhaLinkedCumulative: TrendPoint[];
    sasCumulative: TrendPoint[];
  };
};

/** "IN" key = national scope; state codes otherwise. */
export const NATIONAL = "IN";

export function scopeName(code: string): string {
  if (code === NATIONAL) return "India";
  return meta.states.find((s) => s.code === code)?.name ?? code;
}
