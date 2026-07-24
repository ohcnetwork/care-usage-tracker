/**
 * Typed access to the TNGH (Tamil Nadu Government Hospitals) snapshot
 * artifacts (synced from ../data/tngh/normalized).
 *
 * Scoped to Tamil Nadu (state 33) and the e-Sushrut bridge family that powers
 * its government/public hospitals, plus the upstream dashboard's own
 * government-facility lists.
 */
import metaJson from "@/data/tngh/meta.json";
import summaryJson from "@/data/tngh/summary.json";
import partnersJson from "@/data/tngh/partners.json";
import trendsJson from "@/data/tngh/trends.json";
import facilitiesJson from "@/data/tngh/facilities.json";
import type { MetricSummary, TrendPoint, HrlTrendPoint } from "@/lib/abdm/data";

export const meta = metaJson as {
  snapshotDate: string;
  generatedAt: string;
  source: string;
  state: { code: string; name: string };
  partners: string[];
  districts: { code: string; name: string }[];
};

export const summary = summaryJson as {
  abha: MetricSummary;
  hrl: MetricSummary;
  abhaLinked: MetricSummary;
  sas: MetricSummary & { facilities: number; activePartners: number };
  partnersTracked: number;
  districtsCovered: number;
  facilityClasses: number;
};

export interface PartnerTotals {
  name: string;
  abhaTotal: number;
  abhaLast30d: number;
  hrlTotal: number;
  hrlLast30d: number;
  abhaLinkedTotal: number;
  sasTotal: number;
  sasLast30d: number;
  sasFacilities: number;
}

export const partners = partnersJson as PartnerTotals[];

export interface CombinedTrends {
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
}

export const trends = trendsJson as unknown as {
  combined: CombinedTrends;
  perPartner: Record<
    string,
    Pick<CombinedTrends, "abhaDaily" | "abhaWeeklyAll" | "hrlDaily" | "hrlWeeklyAll" | "sasDaily" | "sasAll">
  >;
};

export interface FacilityRow {
  name: string;
  district: string;
  /** Derived from the facility name — the upstream API exposes no type field. */
  class: string;
  total: number;
  month: number;
  today: number;
}

export interface TopHrlFacilityRow {
  name: string;
  class: string;
  district: string;
  partner: string;
  records: number;
}

export const facilities = facilitiesJson as {
  sas: FacilityRow[];
  topHrl: {
    allTime: TopHrlFacilityRow[];
    last30d: TopHrlFacilityRow[];
    today: TopHrlFacilityRow[];
  };
};
