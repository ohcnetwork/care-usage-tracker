/**
 * Tamil Nadu Government Hospitals tracker — scrape + normalize in one pass.
 *
 * Unlike the ABDM tracker (config-driven partner allowlist), this tracker is
 * hardcoded to Tamil Nadu (state_code 33) and the bridges that power its
 * government & public hospitals (the e-Sushrut family), plus the dashboard's
 * own government-facility lists (profType "govt").
 *
 * Usage: npm run scrape:tngh [-- --date 2026-07-24]
 *
 * Output:
 *   data/tngh/raw/<date>/<job>.json      — raw API responses (provenance)
 *   data/tngh/normalized/*.json          — artifacts consumed by the site
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { post as rawPost, type StatedistReq, type ApiResponse } from "../abdm/client.ts";

const STATE_CODE = "33";
const STATE_NAME = "Tamil Nadu";
const SOURCE = "https://dashboard.abdm.gov.in/abdm/";

/** Bridges powering TN government/public hospitals (verified against the
 * dashboard's own govt-facility lists — TOPHRLFACGOVT only surfaces these). */
const PARTNERS = [
  "C-DAC e-Sushrut",
  "PMNDP",
  "E-Sushrut Railway Hospital",
  "eSushrut@Clinic",
];

// ---------------------------------------------------------------------------
// Plumbing

const dateArg = process.argv.indexOf("--date");
const snapshotDate =
  dateArg !== -1 ? process.argv[dateArg + 1] : new Date().toISOString().slice(0, 10);

const rawDir = join("data", "tngh", "raw", snapshotDate);
const outDir = join("data", "tngh", "normalized");
mkdirSync(rawDir, { recursive: true });
mkdirSync(outDir, { recursive: true });

/** The API rejects bodies with absent fields — always send the full shape. */
const base: StatedistReq = {
  state_code: STATE_CODE, district_code: "", rpttype: "", duration: "",
  fromDateHrl: "", toDateHrl: "", partner: "", profType: "", document: "", facility: "",
};

async function fetchJob(id: string, endpoint: string, body: StatedistReq): Promise<ApiResponse> {
  const res = await rawPost(endpoint, { ...base, ...body });
  writeFileSync(join(rawDir, `${id}.json`), JSON.stringify(res, null, 2));
  const rows = res.list?.length ?? 0;
  console.log(`  ${res.status === "true" ? "✓" : "∅"} ${id}: ${rows} rows`);
  return res;
}

/** Quiet variant for high-volume per-facility calls (raw dumps go to a subdir). */
const facRawDir = join(rawDir, "facilities");
mkdirSync(facRawDir, { recursive: true });
async function rawFetchJob(id: string, endpoint: string, body: StatedistReq): Promise<ApiResponse> {
  const res = await rawPost(endpoint, { ...base, ...body });
  writeFileSync(join(facRawDir, `${id}.json`), JSON.stringify(res));
  return res;
}

const num = (v: unknown) => Number(String(v ?? "0").replace(/,/g, "")) || 0;

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const MONTH_IDX: Record<string, number> = Object.fromEntries(MONTHS.map((m, i) => [m, i]));

/** "24-Jul-2026" → "2026-07-24" (empty string if unparseable). */
function isoDate(d: string): string {
  const [dd, mon, yyyy] = (d ?? "").split("-");
  if (!dd || !(mon in MONTH_IDX) || !yyyy) return "";
  return `${yyyy}-${String(MONTH_IDX[mon] + 1).padStart(2, "0")}-${dd.padStart(2, "0")}`;
}

const DAY = 86_400_000;
const dayMs = (iso: string) => new Date(iso + "T00:00:00Z").getTime();
const todayIso = snapshotDate;

interface Point { date: string; value: number; value2?: number }

function windowSum(series: Point[], days: number, key: "value" | "value2" = "value"): number {
  const cutoff = dayMs(todayIso) - (days - 1) * DAY;
  return series.filter((p) => dayMs(p.date) >= cutoff).reduce((a, p) => a + (p[key] ?? 0), 0);
}
function rangeSum(series: Point[], fromDaysAgo: number, toDaysAgo: number, key: "value" | "value2" = "value"): number {
  const from = dayMs(todayIso) - fromDaysAgo * DAY;
  const to = dayMs(todayIso) - toDaysAgo * DAY;
  return series
    .filter((p) => dayMs(p.date) >= from && dayMs(p.date) < to)
    .reduce((a, p) => a + (p[key] ?? 0), 0);
}
const seriesTotal = (series: Point[], key: "value" | "value2" = "value") =>
  series.reduce((a, p) => a + (p[key] ?? 0), 0);

/** Sum multiple sparse series into one, by date. */
function combine(seriesList: Point[][], key: "value" | "value2" = "value"): Point[] {
  const map = new Map<string, number>();
  for (const s of seriesList) {
    for (const p of s) map.set(p.date, (map.get(p.date) ?? 0) + (p[key] ?? 0));
  }
  return [...map.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([date, value]) => ({ date, value }));
}
/** Combine two-valued series (records + abhas). */
function combine2(seriesList: Point[][]): { date: string; recordsLinked: number; abhasLinked: number }[] {
  const map = new Map<string, { r: number; a: number }>();
  for (const s of seriesList) {
    for (const p of s) {
      const cur = map.get(p.date) ?? { r: 0, a: 0 };
      cur.r += p.value ?? 0;
      cur.a += p.value2 ?? 0;
      map.set(p.date, cur);
    }
  }
  return [...map.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, v]) => ({ date, recordsLinked: v.r, abhasLinked: v.a }));
}
function cumulative(series: { date: string; value: number }[]): { date: string; value: number }[] {
  let acc = 0;
  return series.map((p) => ({ date: p.date, value: (acc += p.value) }));
}

interface MetricSummary {
  total: number; today: number; last30d: number; last7d: number; prev7d: number;
  weekGrowthPct: number | null; perDay7d: number; perDay30d: number;
}
function metricSummary(total: number, daily: Point[], key: "value" | "value2" = "value"): MetricSummary {
  const last7d = windowSum(daily, 7, key);
  const prev7d = rangeSum(daily, 13, 6, key);
  return {
    total,
    today: windowSum(daily, 1, key),
    last30d: windowSum(daily, 30, key),
    last7d,
    prev7d,
    weekGrowthPct: prev7d > 0 ? Math.round(((last7d - prev7d) / prev7d) * 1000) / 10 : null,
    perDay7d: Math.round((last7d / 7) * 10) / 10,
    perDay30d: Math.round((windowSum(daily, 30, key) / 30) * 10) / 10,
  };
}

// ---------------------------------------------------------------------------
// Facility classification (derived from facility names — the public API
// exposes no class/type field for facilities).

const CLASS_RULES: [RegExp, string][] = [
  [/medical college|\bgmkmch\b|\bgmch\b/i, "Medical College Hospital"],
  [/railway/i, "Railway Hospital"],
  [/\bcrpf\b|\bbsf\b|\bcisf\b|air force|army|military|navy|\besic?\b|composite hospital/i, "Central Govt Hospital"],
  [/head\s?quarters|\bhq\b/i, "District HQ Hospital"],
  [/taluk/i, "Taluk Hospital"],
  [/urban primary he?a?l?a?th|\buphc\b|urban phc/i, "Urban PHC"],
  [/primary he?a?l?a?th|\bphc\b/i, "PHC"],
  [/community health|\bchc\b/i, "CHC"],
  [/health and wellness|\bhwc\b|sub ?centre|health sub/i, "HWC / Sub Centre"],
  [/women|maternity|child(ren)?\b|\bwch\b/i, "Women & Children Hospital"],
  [/siddha|ayurved|unani|homoeo|yoga|ayush/i, "AYUSH"],
  [/dispensary/i, "Dispensary"],
  [/nursing home/i, "Nursing Home"],
  [/diagnostic|\blabs?\b|laborator|scan centre|scans\b|x ?ray/i, "Diagnostics / Lab"],
  [/medicals\b|pharmacy|drug/i, "Pharmacy"],
  [/\bden(t|tal)\b/i, "Dental Clinic"],
  [/\bclinic\b/i, "Clinic"],
  [/government|govt|\bgh\b|corporation|municipal|general hospital|district hospital|peripheral hospital/i, "Government Hospital"],
  [/hospital|institute/i, "Hospital (other)"],
];
function classify(name: string): string {
  for (const [re, cls] of CLASS_RULES) if (re.test(name)) return cls;
  return "Unclassified";
}

/** Title-case a district name ("CHENNAI" → "Chennai"). */
const titleCase = (s: string) =>
  s.toLowerCase().replace(/(^|[\s(-])([a-z])/g, (_, sep, ch) => sep + ch.toUpperCase());

// ---------------------------------------------------------------------------
// Row mappers

const hctPoint = (r: Record<string, string>): Point => ({ date: isoDate(r.text), value: num(r.value) });
const abhaltPoint = (r: Record<string, string>): Point => ({
  date: isoDate(r.name), value: num(r.record_count), value2: num(r.hid_count),
});
const fgtPoint = (r: Record<string, string>): Point => ({ date: isoDate(r.text), value: num(r.value) });

const points = (res: ApiResponse, map: (r: Record<string, string>) => Point): Point[] =>
  (res.status === "true" ? res.list ?? [] : []).map(map).filter((p) => p.date);

/** Split "FACILITY NAME, DISTRICT" into name + canonical district. */
function splitFacility(hospitalName: string, districts: string[]): { name: string; district: string } {
  const idx = hospitalName.lastIndexOf(",");
  if (idx === -1) return { name: hospitalName.trim(), district: "" };
  const name = hospitalName.slice(0, idx).trim();
  const rawDist = hospitalName.slice(idx + 1).trim();
  const canon = districts.find((d) => d.toLowerCase() === rawDist.toLowerCase());
  return { name, district: canon ?? titleCase(rawDist) };
}

// ---------------------------------------------------------------------------

async function main() {
  console.log(`TNGH snapshot ${snapshotDate} → ${rawDir}`);

  // District master (drives the district filter + name canonicalisation).
  const dmRes = await fetchJob("districts", "statedist/1.0", { type: "DM" });
  const districts = (dmRes.list ?? [])
    .map((d) => ({ code: d.value, name: titleCase(d.text) }))
    .sort((a, b) => a.name.localeCompare(b.name));
  const districtNames = districts.map((d) => d.name);

  // Per-partner series + facility counts.
  interface PartnerData {
    name: string;
    abhaWeeklyAll: Point[]; abhaDaily: Point[];
    hrlWeeklyAll: Point[]; hrlDaily: Point[];
    sasAll: Point[]; sasDaily: Point[];
    sasFacilities: number;
  }
  const partnerData: PartnerData[] = [];
  for (const partner of PARTNERS) {
    console.log(`▶ ${partner}`);
    const id = partner.replace(/[^a-z0-9]+/gi, "-").toLowerCase();
    const abhaWeeklyAll = points(await fetchJob(`${id}__abha-all`, "healthh/1.0", { type: "HCT", rpttype: "A", partner }), hctPoint);
    const abhaDaily = points(await fetchJob(`${id}__abha-30d`, "healthh/1.0", { type: "HCT", rpttype: "T", partner }), hctPoint);
    const hrlWeeklyAll = points(await fetchJob(`${id}__hrl-all`, "healthh/1.0", { type: "ABHALT", rpttype: "A", partner }), abhaltPoint);
    const hrlDaily = points(await fetchJob(`${id}__hrl-30d`, "healthh/1.0", { type: "ABHALT", rpttype: "T", partner }), abhaltPoint);
    const sasAll = points(await fetchJob(`${id}__sas-all`, "facilitytoken/1.0", { type: "FGT", rpttype: "A", profType: partner }), fgtPoint);
    const sasDaily = points(await fetchJob(`${id}__sas-30d`, "facilitytoken/1.0", { type: "FGT", rpttype: "M", profType: partner }), fgtPoint);
    const fn = await fetchJob(`${id}__sas-facilities`, "facilitytoken/1.0", { type: "FN", profType: partner });
    partnerData.push({
      name: partner, abhaWeeklyAll, abhaDaily, hrlWeeklyAll, hrlDaily, sasAll, sasDaily,
      sasFacilities: fn.status === "true" ? (fn.list ?? []).length : 0,
    });
  }

  // Government Scan & Share facilities (upstream's own govt ownership flag).
  console.log("▶ govt facilities (Scan & Share)");
  const monthStr = `${MONTHS[new Date().getMonth()]}-${new Date().getFullYear()}`;
  const sasAllTime = await fetchJob("fac-sas-all", "facilitytoken/1.0", { type: "YSTDTOPTENFAC", profType: "govt" });
  const sasMonth = await fetchJob("fac-sas-month", "facilitytoken/1.0", { type: "MONTHLYTOPTENFAC", profType: "govt", month: monthStr });
  const sasToday = await fetchJob("fac-sas-today", "facilitytoken/1.0", { type: "TOPTENFAC", profType: "govt" });

  interface FacilityRow {
    name: string; district: string; class: string;
    total: number; month: number; today: number;
  }
  const facMap = new Map<string, FacilityRow>();
  const addFac = (res: ApiResponse, key: "total" | "month" | "today") => {
    for (const r of res.status === "true" ? res.list ?? [] : []) {
      const { name, district } = splitFacility(r.hospitalName ?? "", districtNames);
      if (!name) continue;
      const mapKey = `${name}|${district}`.toLowerCase();
      const row = facMap.get(mapKey) ?? { name, district, class: classify(name), total: 0, month: 0, today: 0 };
      row[key] += num(r.value);
      facMap.set(mapKey, row);
    }
  };
  addFac(sasAllTime, "total"); // up to yesterday
  addFac(sasMonth, "month");
  addFac(sasToday, "today");
  for (const row of facMap.values()) row.total += row.today; // YSTD excludes today
  const facilities = [...facMap.values()].sort((a, b) => b.total - a.total);
  // NOTE: no per-facility Scan & Share time-series exists upstream — the
  // MONTHLYTOPTENFAC month param and modelabdm/ScanShare facility param are
  // both ignored server-side; only today/month/all-time totals are available.

  // Top govt facilities by health records linked (top-10 per window upstream).
  console.log("▶ govt facilities (records linked, top 10)");
  const topHrlRows = async (id: string, rpttype: string) => {
    const res = await fetchJob(id, "adoption/linkage", { type: "TOPHRLFACGOVT", rpttype });
    return (res.status === "true" ? res.list ?? [] : []).map((r) => ({
      name: r.text,
      class: classify(r.text ?? ""),
      district: titleCase(r.districtName ?? ""),
      partner: r.partnerName ?? "",
      records: num(r.value),
    }));
  };
  const topHrl = {
    allTime: await topHrlRows("fac-hrl-all", "A"),
    last30d: await topHrlRows("fac-hrl-30d", "M"),
    today: await topHrlRows("fac-hrl-today", "TDY"),
  };

  // Per-facility health-record linkage. HRLFAC lists every facility with any
  // HRL activity for a partner; ABHALT accepts a quoted facility-name filter,
  // giving per-facility records-linked + ABHAs-linked series. (There is no
  // facility-level ABHA-creation endpoint upstream — HCT is partner-only.)
  console.log("▶ per-facility record linkage (HRLFAC + ABHALT per facility)");
  interface HrlFacilityRow {
    name: string; district: string; class: string; partner: string;
    records: number; records30d: number; recordsToday: number;
    abhasLinked: number; abhasLinked30d: number; abhasLinkedToday: number;
  }

  // District lookup by facility name, sourced from lists that do carry
  // districts (S&S govt facilities + top-HRL tables).
  const districtByName = new Map<string, string>();
  for (const f of facilities) districtByName.set(f.name.toLowerCase(), f.district);
  for (const rows of [topHrl.allTime, topHrl.last30d, topHrl.today]) {
    for (const r of rows) {
      if (r.district) districtByName.set(r.name.toLowerCase(), r.district);
    }
  }

  const hrlFacilities: HrlFacilityRow[] = [];
  const facSeries = new Map<string, { name: string; all: Point[][]; daily: Point[][] }>();
  for (const partner of PARTNERS) {
    const id = partner.replace(/[^a-z0-9]+/gi, "-").toLowerCase();
    const listRes = await fetchJob(`${id}__hrl-facility-list`, "healthh/1.0", {
      type: "HRLFAC", partner, phase: "1000",
    });
    const names = (listRes.status === "true" ? listRes.list ?? [] : [])
      .map((r) => String(r.hospitalName ?? "").trim())
      .filter(Boolean);
    console.log(`  ${partner}: ${names.length} facilities with linkage activity`);
    for (const [i, name] of names.entries()) {
      const facility = `'${name.replace(/'/g, "''")}'`;
      const fid = `${id}__fac-${String(i).padStart(3, "0")}`;
      const allSeries = points(
        await rawFetchJob(`${fid}-all`, "healthh/1.0", { type: "ABHALT", rpttype: "A", partner, facility }),
        abhaltPoint,
      );
      const records = seriesTotal(allSeries);
      const abhasLinked = seriesTotal(allSeries, "value2");
      // Skip the 30d call when the full history clearly predates the window.
      const lastDate = allSeries.at(-1)?.date ?? "";
      let daily: Point[] = [];
      if (lastDate && dayMs(lastDate) >= dayMs(todayIso) - 40 * DAY) {
        daily = points(
          await rawFetchJob(`${fid}-30d`, "healthh/1.0", { type: "ABHALT", rpttype: "T", partner, facility }),
          abhaltPoint,
        );
      }
      const fs = facSeries.get(name.toLowerCase()) ?? { name, all: [], daily: [] };
      fs.all.push(allSeries);
      if (daily.length) fs.daily.push(daily);
      facSeries.set(name.toLowerCase(), fs);
      hrlFacilities.push({
        name,
        district: districtByName.get(name.toLowerCase()) ?? "",
        class: classify(name),
        partner,
        records,
        records30d: windowSum(daily, 30),
        recordsToday: windowSum(daily, 1),
        abhasLinked,
        abhasLinked30d: windowSum(daily, 30, "value2"),
        abhasLinkedToday: windowSum(daily, 1, "value2"),
      });
      if ((i + 1) % 25 === 0) console.log(`    …${i + 1}/${names.length}`);
    }
  }
  // A facility can appear under multiple partners — merge by name.
  const hrlMerged = new Map<string, HrlFacilityRow>();
  for (const r of hrlFacilities) {
    const key = r.name.toLowerCase();
    const prev = hrlMerged.get(key);
    if (!prev) {
      hrlMerged.set(key, { ...r });
    } else {
      prev.records += r.records;
      prev.records30d += r.records30d;
      prev.recordsToday += r.recordsToday;
      prev.abhasLinked += r.abhasLinked;
      prev.abhasLinked30d += r.abhasLinked30d;
      prev.abhasLinkedToday += r.abhasLinkedToday;
      if (!prev.district) prev.district = r.district;
      if (!prev.partner.includes(r.partner)) prev.partner += `, ${r.partner}`;
    }
  }
  const hrlRows = [...hrlMerged.values()].sort((a, b) => b.records - a.records);
  console.log(`  ${hrlRows.length} facilities profiled (${hrlFacilities.length} partner-facility pairs)`);

  // Per-facility linkage trend series (records + ABHAs linked), keyed by
  // facility display name; duplicate partner entries merged per date.
  const facilityTrends = Object.fromEntries(
    [...facSeries.values()].map((f) => [
      f.name,
      { all: combine2(f.all), daily: combine2(f.daily) },
    ]),
  );

  // -------------------------------------------------------------------------
  // Normalize → artifacts

  const all = <K extends keyof PartnerData>(k: K) => partnerData.map((p) => p[k] as Point[]);

  const combined = {
    abhaDaily: combine(all("abhaDaily")),
    abhaWeeklyAll: combine(all("abhaWeeklyAll")),
    hrlDaily: combine2(all("hrlDaily")),
    hrlWeeklyAll: combine2(all("hrlWeeklyAll")),
    sasDaily: combine(all("sasDaily")),
    sasAll: combine(all("sasAll")),
    abhaCumulative: cumulative(combine(all("abhaWeeklyAll"))),
    hrlCumulative: cumulative(combine(all("hrlWeeklyAll"))),
    abhaLinkedCumulative: cumulative(combine(all("hrlWeeklyAll"), "value2")),
    sasCumulative: cumulative(combine(all("sasAll"))),
  };

  const sum = (fn: (p: PartnerData) => number) => partnerData.reduce((a, p) => a + fn(p), 0);
  const allDaily = { abha: combine(all("abhaDaily")), hrl: all("hrlDaily").flat(), sas: combine(all("sasDaily")) };
  const hrlDailyCombined = all("hrlDaily").flat();

  const summary = {
    abha: metricSummary(sum((p) => seriesTotal(p.abhaWeeklyAll)), allDaily.abha),
    hrl: metricSummary(sum((p) => seriesTotal(p.hrlWeeklyAll)), hrlDailyCombined),
    abhaLinked: metricSummary(sum((p) => seriesTotal(p.hrlWeeklyAll, "value2")), hrlDailyCombined, "value2"),
    sas: {
      ...metricSummary(sum((p) => seriesTotal(p.sasAll)), allDaily.sas),
      facilities: facilities.length,
      activePartners: partnerData.filter((p) => seriesTotal(p.sasAll) > 0).length,
    },
    partnersTracked: PARTNERS.length,
    districtsCovered: new Set(facilities.map((f) => f.district).filter(Boolean)).size,
    facilityClasses: new Set(facilities.map((f) => f.class)).size,
  };

  const partners = partnerData.map((p) => ({
    name: p.name,
    abhaTotal: seriesTotal(p.abhaWeeklyAll),
    abhaLast30d: windowSum(p.abhaDaily, 30),
    hrlTotal: seriesTotal(p.hrlWeeklyAll),
    hrlLast30d: windowSum(p.hrlDaily, 30),
    abhaLinkedTotal: seriesTotal(p.hrlWeeklyAll, "value2"),
    sasTotal: seriesTotal(p.sasAll),
    sasLast30d: windowSum(p.sasDaily, 30),
    sasFacilities: p.sasFacilities,
  }));

  const perPartnerTrends = Object.fromEntries(
    partnerData.map((p) => [
      p.name,
      {
        abhaDaily: p.abhaDaily,
        abhaWeeklyAll: p.abhaWeeklyAll,
        hrlDaily: p.hrlDaily.map((x) => ({ date: x.date, recordsLinked: x.value, abhasLinked: x.value2 ?? 0 })),
        hrlWeeklyAll: p.hrlWeeklyAll.map((x) => ({ date: x.date, recordsLinked: x.value, abhasLinked: x.value2 ?? 0 })),
        sasDaily: p.sasDaily,
        sasAll: p.sasAll,
      },
    ]),
  );

  const meta = {
    snapshotDate,
    generatedAt: new Date().toISOString(),
    source: SOURCE,
    state: { code: STATE_CODE, name: STATE_NAME },
    partners: PARTNERS,
    districts,
  };

  const write = (name: string, data: unknown) => {
    writeFileSync(join(outDir, `${name}.json`), JSON.stringify(data, null, 1) + "\n");
    console.log(`  → ${join(outDir, `${name}.json`)}`);
  };
  write("meta", meta);
  write("summary", summary);
  write("partners", partners);
  write("trends", { combined, perPartner: perPartnerTrends });
  write("facilities", { sas: facilities, topHrl, hrl: hrlRows });
  write("facility-trends", facilityTrends);

  console.log(
    `Done: ABHA ${summary.abha.total.toLocaleString("en-IN")} · HRL ${summary.hrl.total.toLocaleString("en-IN")} · S&S ${summary.sas.total.toLocaleString("en-IN")} across ${facilities.length} govt facilities`,
  );
}

main();
