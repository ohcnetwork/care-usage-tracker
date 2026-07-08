/**
 * Catalog of scrape jobs against the ABDM dashboard API.
 *
 * Endpoint + type reference was reverse-engineered from the Angular bundle at
 * https://dashboard.abdm.gov.in/abdm/main.js (see plan notes). All endpoints are
 * public JSON POST; most share the `StatedistReq` body shape.
 *
 * `scope: "per-state"` jobs are expanded over the state master (type SM) with
 * `state_code` set per state; they also run once nationally with state_code "".
 */
import type { StatedistReq } from "./client.ts";

export interface Job {
  /** Unique id — becomes the JSONL filename. */
  id: string;
  endpoint: string;
  body: StatedistReq;
  scope: "national" | "per-state";
  description: string;
}

const base: StatedistReq = {
  state_code: "",
  district_code: "",
  rpttype: "",
  duration: "",
  fromDateHrl: "",
  toDateHrl: "",
  partner: "",
  profType: "",
  document: "",
  facility: "",
};

const job = (
  id: string,
  endpoint: string,
  body: StatedistReq,
  scope: Job["scope"],
  description: string,
): Job => ({ id, endpoint, body: { ...base, ...body }, scope, description });

export const jobs: Job[] = [
  // ── Masters ────────────────────────────────────────────────────────────────
  job("states", "statedist/1.0", { type: "SM" }, "national", "State master (name → code)"),
  job("districts", "statedist/1.0", { type: "DM" }, "per-state", "District master per state"),

  // ── ABHA (Ayushman Bharat Health Account) ─────────────────────────────────
  job("abha_counters", "healthdata/1.0", { type: "HI" }, "per-state",
    "ABHA created: today / total / current month"),
  job("abha_age", "healthh/1.0", { type: "HA" }, "per-state", "ABHA by age group"),
  job("abha_gender", "healthh/1.0", { type: "HG" }, "per-state", "ABHA by gender"),
  job("abha_statewise", "healthstatewise/1.0", { type: "HITS" }, "national",
    "ABHA totals per state"),
  job("abha_trend_daily", "healthh/1.0", { type: "HCT", rpttype: "T" }, "per-state",
    "ABHA creation trend, daily (last 30 days)"),
  job("abha_trend_all", "healthh/1.0", { type: "HCT", rpttype: "A" }, "national",
    "ABHA creation trend, weekly since Aug 2020"),
  job("abha_partner_names", "healthh/1.0", { type: "HCT", rpttype: "P" }, "national",
    "Partner names that create ABHAs (trend filter list)"),
  job("abha_quarterly", "reports", { type: "ABHAQ" }, "national", "ABHA per quarter per FY"),

  // ── Health Records Linked (HRL) ────────────────────────────────────────────
  job("hrl_counters", "hrlCount/1.0", {}, "per-state",
    "Health records linked: today / total / current month"),
  job("hrl_trend_daily", "healthh/1.0", { type: "ABHALT", rpttype: "T" }, "per-state",
    "HRL trend, daily (last 30 days): record_count + hid_count"),
  job("hrl_trend_all", "healthh/1.0", { type: "ABHALT", rpttype: "A" }, "national",
    "HRL trend, weekly full history"),
  job("hrl_partner_names", "healthh/1.0", { type: "ABHALT", rpttype: "P" }, "national",
    "Partner names that link health records (trend filter list)"),
  job("hrl_quarterly", "reports", { type: "HRLQ" }, "national", "HRL per quarter per FY"),

  // ── Partner-wise totals ────────────────────────────────────────────────────
  job("partners_abha", "adoption/linkage", { type: "TOPABHAPART" }, "per-state",
    "ABHA created per partner (full list)"),
  job("partners_hrl", "adoption/linkage", { type: "TOPHRLPART" }, "per-state",
    "Health records linked per partner (full list)"),

  // ── Facilities & professionals (cheap national extras) ─────────────────────
  job("facility_counters", "healthdata/1.0", { type: "HF" }, "national",
    "Health facilities: today / approved / registered / month"),
  job("professional_counters", "healthdata/1.0", { type: "HP" }, "national",
    "Healthcare professionals: today / approved / registered / month"),
  job("facility_statewise", "healthstatewise/1.0", { type: "HFTS" }, "national",
    "Facilities per state"),
  job("professional_statewise", "healthstatewise/1.0", { type: "HPTS" }, "national",
    "Professionals per state"),
  job("facility_trend_monthly", "healthh/1.0", { type: "FCT", rpttype: "M" }, "national",
    "Facility registration trend, monthly"),
  job("professional_trend_monthly", "healthh/1.0", { type: "PCT", rpttype: "M" }, "national",
    "Professional registration trend, monthly"),
];
