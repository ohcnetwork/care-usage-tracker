/**
 * Tamil Nadu Government/Public Hospitals — one-shot numbers report.
 *
 * Unlike the ABDM tracker (partner allowlist), this is hardcoded to the
 * partners/bridges that power Tamil Nadu's government & public hospitals,
 * with every request scoped to state_code 33 (Tamil Nadu).
 *
 * Partner set (verified via adoption/linkage TOPHRLFACGOVT for TN — the
 * dashboard's own "government facilities" list only surfaces these):
 *   - C-DAC e-Sushrut            (TN Health dept HMIS in govt hospitals)
 *   - PMNDP                      (PM National Dialysis Programme, govt facilities)
 *   - E-Sushrut Railway Hospital (Railways public hospitals)
 *   - eSushrut@Clinic            (e-Sushrut clinic variant bridge)
 *
 * Usage: npx tsx trackers/tngh/report.ts
 * Prints numbers to the console only — nothing is written or committed.
 */
import { post as rawPost, type StatedistReq, type ApiResponse } from "../abdm/client.ts";

const STATE = "33"; // Tamil Nadu

// The API rejects bodies with absent fields — always send the full shape.
const base: StatedistReq = {
  state_code: STATE, district_code: "", rpttype: "", duration: "",
  fromDateHrl: "", toDateHrl: "", partner: "", profType: "", document: "", facility: "",
};
const post = (endpoint: string, body: StatedistReq): Promise<ApiResponse> =>
  rawPost(endpoint, { ...base, ...body });
const PARTNERS = [
  "C-DAC e-Sushrut",
  "PMNDP",
  "E-Sushrut Railway Hospital",
  "eSushrut@Clinic",
];

const num = (v: unknown) => Number(String(v ?? "0").replace(/,/g, "")) || 0;
const fmt = (n: number) => n.toLocaleString("en-IN");
const pad = (s: string, w: number) => s.padEnd(w);
const rpad = (s: string, w: number) => s.padStart(w);

/** Parse "24-Jul-2026" → ms epoch. */
const MONTHS: Record<string, number> = { Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5, Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11 };
function dateMs(d: string): number {
  const [dd, mon, yyyy] = d.split("-");
  return Date.UTC(Number(yyyy), MONTHS[mon] ?? 0, Number(dd));
}
const DAY = 86_400_000;
const nowMs = Date.now();

interface SeriesPoint { date: string; value: number; value2?: number }

function windowSum(series: SeriesPoint[], days: number, key: "value" | "value2" = "value"): number {
  const cutoff = nowMs - days * DAY;
  return series.filter((p) => dateMs(p.date) >= cutoff).reduce((a, p) => a + (p[key] ?? 0), 0);
}
const total = (series: SeriesPoint[], key: "value" | "value2" = "value") =>
  series.reduce((a, p) => a + (p[key] ?? 0), 0);

async function series(
  endpoint: string,
  body: Record<string, string>,
  map: (r: Record<string, string>) => SeriesPoint,
): Promise<SeriesPoint[]> {
  const res = await post(endpoint, body);
  if (res.status !== "true") return [];
  return (res.list ?? []).map(map).filter((p) => p.date);
}

const hct = (r: Record<string, string>): SeriesPoint => ({ date: r.text, value: num(r.value) });
const abhalt = (r: Record<string, string>): SeriesPoint => ({ date: r.name, value: num(r.record_count), value2: num(r.hid_count) });
const fgt = (r: Record<string, string>): SeriesPoint => ({ date: r.text, value: num(r.value) });

interface PartnerNums {
  partner: string;
  abhaTotal: number; abha30: number; abhaToday: number;
  recTotal: number; rec30: number; recToday: number;
  linkedTotal: number; linked30: number;
  sasTotal: number; sas30: number; sasToday: number;
  sasFacilities: number;
}

async function partnerNumbers(partner: string): Promise<PartnerNums> {
  const abhaAll = await series("healthh/1.0", { type: "HCT", rpttype: "A", partner }, hct);
  const hrlAll = await series("healthh/1.0", { type: "ABHALT", rpttype: "A", partner }, abhalt);
  const sasAll = await series("facilitytoken/1.0", { type: "FGT", rpttype: "A", profType: partner }, fgt);
  const fn = await post("facilitytoken/1.0", { type: "FN", profType: partner });
  // healthh A-series are weekly buckets; use daily last-30d endpoints for
  // precise recent windows.
  const abha30d = await series("healthh/1.0", { type: "HCT", rpttype: "T", partner }, hct);
  const hrl30d = await series("healthh/1.0", { type: "ABHALT", rpttype: "T", partner }, abhalt);
  const sas30d = await series("facilitytoken/1.0", { type: "FGT", rpttype: "M", profType: partner }, fgt);
  return {
    partner,
    abhaTotal: total(abhaAll), abha30: windowSum(abha30d, 30), abhaToday: windowSum(abha30d, 1),
    recTotal: total(hrlAll), rec30: windowSum(hrl30d, 30), recToday: windowSum(hrl30d, 1),
    linkedTotal: total(hrlAll, "value2"), linked30: windowSum(hrl30d, 30, "value2"),
    sasTotal: total(sasAll), sas30: windowSum(sas30d, 30), sasToday: windowSum(sas30d, 1),
    sasFacilities: (fn.status === "true" ? fn.list ?? [] : []).length,
  };
}

async function topGovtFacilities(rpttype: string) {
  const res = await post("adoption/linkage", { type: "TOPHRLFACGOVT", rpttype });
  return (res.list ?? []).map((r) => ({
    name: r.text, district: r.districtName, partner: r.partnerName, records: num(r.value),
  }));
}

function printTable(headers: string[], rows: string[][], widths: number[]) {
  const line = (cells: string[]) =>
    cells.map((c, i) => (i === 0 ? pad(c, widths[i]) : rpad(c, widths[i]))).join("  ");
  console.log(line(headers));
  console.log(widths.map((w) => "─".repeat(w)).join("  "));
  for (const r of rows) console.log(line(r));
}

async function main() {
  console.log("Tamil Nadu — Government/Public Hospitals (state_code 33)");
  console.log(`Partners: ${PARTNERS.join(", ")}`);
  console.log(`Fetched: ${new Date().toISOString()}\n`);

  const nums: PartnerNums[] = [];
  for (const p of PARTNERS) {
    process.stderr.write(`fetching ${p}...\n`);
    nums.push(await partnerNumbers(p));
  }

  const sum = (k: keyof Omit<PartnerNums, "partner">) => nums.reduce((a, n) => a + (n[k] as number), 0);

  console.log("── Totals (all TN govt partners combined) ──────────────────────");
  printTable(
    ["Metric", "All-time", "Last 30d", "Today"],
    [
      ["ABHAs created", fmt(sum("abhaTotal")), fmt(sum("abha30")), fmt(sum("abhaToday"))],
      ["Health records linked", fmt(sum("recTotal")), fmt(sum("rec30")), fmt(sum("recToday"))],
      ["ABHAs linked to records", fmt(sum("linkedTotal")), fmt(sum("linked30")), "—"],
      ["Scan & Share tokens", fmt(sum("sasTotal")), fmt(sum("sas30")), fmt(sum("sasToday"))],
      ["Scan & Share facilities", fmt(sum("sasFacilities")), "", ""],
    ],
    [26, 14, 12, 10],
  );

  console.log("\n── Per partner ─────────────────────────────────────────────────");
  printTable(
    ["Partner", "ABHA", "ABHA 30d", "Records", "Rec 30d", "S&S", "S&S 30d", "S&S fac"],
    nums.map((n) => [
      n.partner, fmt(n.abhaTotal), fmt(n.abha30), fmt(n.recTotal), fmt(n.rec30),
      fmt(n.sasTotal), fmt(n.sas30), fmt(n.sasFacilities),
    ]),
    [28, 12, 10, 12, 10, 10, 9, 8],
  );

  const allTime = await topGovtFacilities("A");
  const last30 = await topGovtFacilities("M");
  const today = await topGovtFacilities("TDY");

  console.log("\n── Top govt facilities by health records (all-time) ───────────");
  printTable(
    ["Facility", "District", "Records"],
    allTime.map((f) => [f.name.slice(0, 52), f.district, fmt(f.records)]),
    [54, 16, 10],
  );

  console.log("\n── Top govt facilities by health records (last 30 days) ───────");
  printTable(
    ["Facility", "District", "Records"],
    last30.map((f) => [f.name.slice(0, 52), f.district, fmt(f.records)]),
    [54, 16, 10],
  );

  console.log("\n── Top govt facilities by health records (today) ──────────────");
  printTable(
    ["Facility", "District", "Records"],
    today.map((f) => [f.name.slice(0, 52), f.district, fmt(f.records)]),
    [54, 16, 10],
  );
}

main();
