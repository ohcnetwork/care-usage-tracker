/** Typed access to the normalized snapshot artifacts (synced from ../data/normalized). */
import metaJson from "@/data/meta.json";
import summaryJson from "@/data/summary.json";
import abhaJson from "@/data/abha.json";
import hrlJson from "@/data/hrl.json";
import partnersJson from "@/data/partners.json";
import partnerTrendsJson from "@/data/partner-trends.json";
import extrasJson from "@/data/extras.json";

export interface Counters {
  today: number | null;
  total: number | null;
  currentMonth: number | null;
}

export interface LabelValue {
  label: string;
  value: number | null;
}

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

export interface QuarterRow {
  fyStartYear: number | null;
  q1: number | null;
  q2: number | null;
  q3: number | null;
  q4: number | null;
}

export interface PartnerRow {
  name: string;
  value: number | null;
}

export const meta = metaJson as {
  snapshotDate: string;
  generatedAt: string;
  source: string;
  states: { code: string; name: string }[];
  districts: Record<string, { code: string; name: string }[]>;
};

export const summary = summaryJson as {
  abha: Counters;
  hrl: Counters;
  facilities: { today: number | null; approved: number | null; registered: number | null; currentMonth: number | null };
  professionals: { today: number | null; approved: number | null; registered: number | null; currentMonth: number | null };
};

export const abha = abhaJson as {
  counters: Record<string, Counters>;
  ageGroups: Record<string, LabelValue[]>;
  gender: Record<string, LabelValue[]>;
  statewise: StatewiseRow[];
  trendDaily: Record<string, TrendPoint[]>;
  trendWeeklyAll: TrendPoint[];
  quarterly: QuarterRow[];
};

export const hrl = hrlJson as {
  counters: Record<string, Counters>;
  trendDaily: Record<string, HrlTrendPoint[]>;
  trendWeeklyAll: HrlTrendPoint[];
  quarterly: QuarterRow[];
};

export const partners = partnersJson as {
  /** Config-driven allowlist (config/partners.yaml) — the only partners tracked. */
  allowlist: string[];
  abha: { national: PartnerRow[]; perState: Record<string, PartnerRow[]> };
  hrl: { national: PartnerRow[]; perState: Record<string, PartnerRow[]> };
};

export const partnerTrends = partnerTrendsJson as {
  abhaDaily: Record<string, TrendPoint[]>;
  abhaWeeklyAll: Record<string, TrendPoint[]>;
  hrlDaily: Record<string, HrlTrendPoint[]>;
  hrlWeeklyAll: Record<string, HrlTrendPoint[]>;
};

export const extras = extrasJson as {
  facilityStatewise: StatewiseRow[];
  professionalStatewise: StatewiseRow[];
  facilityTrendMonthly: TrendPoint[];
  professionalTrendMonthly: TrendPoint[];
};

/** "IN" key = national scope; state codes otherwise. */
export const NATIONAL = "IN";

export function scopeName(code: string): string {
  if (code === NATIONAL) return "India";
  return meta.states.find((s) => s.code === code)?.name ?? code;
}
