/**
 * Catalog of scrape jobs against the ABDM dashboard API.
 *
 * Endpoint + type reference was reverse-engineered from the Angular bundle at
 * https://dashboard.abdm.gov.in/abdm/main.js (see plan notes). All endpoints are
 * public JSON POST; most share the `StatedistReq` body shape.
 *
 * `scope: "per-state"` jobs are expanded over the state master (type SM) with
 * `state_code` set per state; they also run once nationally with state_code "".
 * `scope: "per-partner"` jobs run once per allowlisted partner name from
 * config/partners.yaml with the `partner` body field set.
 */
import type { StatedistReq } from "./client.ts";

export interface Job {
  /** Unique id — becomes the JSONL filename. */
  id: string;
  endpoint: string;
  body: StatedistReq;
  scope: "national" | "per-state" | "per-partner";
  description: string;
  /** Keep only rows whose partner name (row.text) is in the allowlist. */
  filterByAllowlist?: boolean;
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
  extra?: Partial<Job>,
): Job => ({ id, endpoint, body: { ...base, ...body }, scope, description, ...extra });

export const jobs: Job[] = [
  // ── Masters ────────────────────────────────────────────────────────────────
  job("states", "statedist/1.0", { type: "SM" }, "national", "State master (name → code)"),
  job("districts", "statedist/1.0", { type: "DM" }, "per-state", "District master per state"),

  // ── Partner name lists (allowlisted only) ──────────────────────────────────
  job("abha_partner_names", "healthh/1.0", { type: "HCT", rpttype: "P" }, "national",
    "Partner names that create ABHAs (allowlisted only)", { filterByAllowlist: true }),
  job("hrl_partner_names", "healthh/1.0", { type: "ABHALT", rpttype: "P" }, "national",
    "Partner names that link health records (allowlisted only)", { filterByAllowlist: true }),

  // ── Partner-wise totals (allowlisted partners only) ────────────────────────
  job("partners_abha", "adoption/linkage", { type: "TOPABHAPART" }, "per-state",
    "ABHA created per partner (allowlisted only)", { filterByAllowlist: true }),
  job("partners_hrl", "adoption/linkage", { type: "TOPHRLPART" }, "per-state",
    "Health records linked per partner (allowlisted only)", { filterByAllowlist: true }),

  // ── Per-partner trends (expanded over config/partners.yaml) ────────────────
  job("partner_abha_trend_daily", "healthh/1.0", { type: "HCT", rpttype: "T" }, "per-partner",
    "ABHA creation trend per partner, daily (last 30 days)"),
  job("partner_abha_trend_all", "healthh/1.0", { type: "HCT", rpttype: "A" }, "per-partner",
    "ABHA creation trend per partner, weekly full history"),
  job("partner_hrl_trend_daily", "healthh/1.0", { type: "ABHALT", rpttype: "T" }, "per-partner",
    "HRL trend per partner, daily (last 30 days): record_count + hid_count"),
  job("partner_hrl_trend_all", "healthh/1.0", { type: "ABHALT", rpttype: "A" }, "per-partner",
    "HRL trend per partner, weekly full history"),
];
