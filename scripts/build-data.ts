/**
 * Normalize the latest raw JSONL snapshot into typed JSON artifacts for the site.
 *
 * Everything is scoped to the partner allowlist (config/partners.yaml) — no
 * aggregate metrics outside the tracked partners are ever emitted.
 *
 * Usage: npm run build-data [-- --date 2026-07-08]
 *
 * Reads  data/raw/<date>/*.jsonl
 * Writes data/normalized/{meta,summary,partners,partner-trends}.json
 */
import { readFileSync, readdirSync, existsSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { z } from "zod";
import { loadAllowlist } from "../scraper/allowlist.ts";

// ── Raw record envelope ───────────────────────────────────────────────────────

const Envelope = z.object({
  fetched_at: z.string(),
  endpoint: z.string(),
  params: z.record(z.string(), z.string().optional()),
  row: z.record(z.string(), z.unknown()),
});
type Envelope = z.infer<typeof Envelope>;

// ── Helpers ───────────────────────────────────────────────────────────────────

/** "93,79,63,585" | "" | undefined → number | null */
function num(v: unknown): number | null {
  if (v == null) return null;
  const s = String(v).replace(/,/g, "").trim();
  if (s === "") return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

const MONTHS: Record<string, string> = {
  Jan: "01", Feb: "02", Mar: "03", Apr: "04", May: "05", Jun: "06",
  Jul: "07", Aug: "08", Sep: "09", Oct: "10", Nov: "11", Dec: "12",
};

/** "08-Jun-2026" → "2026-06-08" (passthrough if already ISO or unknown). */
function isoDate(v: unknown): string {
  const s = String(v ?? "").trim();
  const m = s.match(/^(\d{2})-([A-Za-z]{3})-(\d{4})$/);
  if (m && MONTHS[m[2]]) return `${m[3]}-${MONTHS[m[2]]}-${m[1]}`;
  return s;
}

function readJsonl(dir: string, jobId: string): Envelope[] {
  const file = join(dir, `${jobId}.jsonl`);
  if (!existsSync(file)) {
    console.warn(`  (missing ${jobId}.jsonl)`);
    return [];
  }
  return readFileSync(file, "utf8")
    .split("\n")
    .filter(Boolean)
    .map((line) => Envelope.parse(JSON.parse(line)));
}

/** Group envelopes by state_code param ("" = national). */
function byState(records: Envelope[]): Map<string, Envelope[]> {
  const map = new Map<string, Envelope[]>();
  for (const r of records) {
    const code = r.params.state_code ?? "";
    if (!map.has(code)) map.set(code, []);
    map.get(code)!.push(r);
  }
  return map;
}

/** Group envelopes by partner param. */
function byPartner(records: Envelope[]): Map<string, Envelope[]> {
  const map = new Map<string, Envelope[]>();
  for (const r of records) {
    const partner = r.params.partner ?? "";
    if (!map.has(partner)) map.set(partner, []);
    map.get(partner)!.push(r);
  }
  return map;
}

// ── Main ──────────────────────────────────────────────────────────────────────

const dateArg = process.argv.indexOf("--date");
const rawRoot = join("data", "raw");
const snapshotDate =
  dateArg !== -1
    ? process.argv[dateArg + 1]
    : readdirSync(rawRoot).filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d)).sort().at(-1);
if (!snapshotDate) throw new Error("No raw snapshot found under data/raw/");

const dir = join(rawRoot, snapshotDate);
const outDir = join("data", "normalized");
rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });
console.log(`Normalizing ${dir} → ${outDir}`);

const allowlist = loadAllowlist();
const allowed = new Set(allowlist.map((n) => n.toLowerCase()));

// meta: states + districts
const states = readJsonl(dir, "states").map((r) => ({
  code: String(r.row.value),
  name: String(r.row.text),
}));

const districts: Record<string, { code: string; name: string }[]> = {};
for (const [code, rows] of byState(readJsonl(dir, "districts"))) {
  if (code === "") continue;
  districts[code] = rows.map((r) => ({ code: String(r.row.value), name: String(r.row.text) }));
}

// partner totals (allowlisted only), national + per state
function partnerTotals(jobId: string) {
  const national: { name: string; value: number | null }[] = [];
  const perState: Record<string, { name: string; value: number | null }[]> = {};
  for (const [code, rows] of byState(readJsonl(dir, jobId))) {
    const list = rows
      .map((r) => ({ name: String(r.row.text), value: num(r.row.value) }))
      .filter((r) => allowed.has(r.name.toLowerCase()))
      .sort((a, b) => (b.value ?? 0) - (a.value ?? 0));
    if (code === "") national.push(...list);
    else if (list.length > 0) perState[code] = list;
  }
  return { national, perState };
}

const partnersAbha = partnerTotals("partners_abha");
const partnersHrl = partnerTotals("partners_hrl");

// per-partner trends (daily 30-day + weekly full history)
function partnerAbhaTrend(jobId: string) {
  const out: Record<string, { date: string; value: number | null }[]> = {};
  for (const [partner, rows] of byPartner(readJsonl(dir, jobId))) {
    if (!partner) continue;
    out[partner] = rows
      .map((r) => ({ date: isoDate(r.row.text), value: num(r.row.value) }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }
  return out;
}

function partnerHrlTrend(jobId: string) {
  const out: Record<string, { date: string; recordsLinked: number | null; abhasLinked: number | null }[]> = {};
  for (const [partner, rows] of byPartner(readJsonl(dir, jobId))) {
    if (!partner) continue;
    out[partner] = rows
      .filter((r) => r.row._list !== "list2")
      .map((r) => ({
        date: isoDate(r.row.name),
        recordsLinked: num(r.row.record_count),
        abhasLinked: num(r.row.hid_count),
      }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }
  return out;
}

const partnerAbhaDaily = partnerAbhaTrend("partner_abha_trend_daily");
const partnerAbhaWeekly = partnerAbhaTrend("partner_abha_trend_all");
const partnerHrlDaily = partnerHrlTrend("partner_hrl_trend_daily");
const partnerHrlWeekly = partnerHrlTrend("partner_hrl_trend_all");

// combined trends: sum across all tracked partners per date
function combineAbha(series: Record<string, { date: string; value: number | null }[]>) {
  const sums = new Map<string, number>();
  for (const points of Object.values(series)) {
    for (const p of points) sums.set(p.date, (sums.get(p.date) ?? 0) + (p.value ?? 0));
  }
  return [...sums.entries()]
    .map(([date, value]) => ({ date, value }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

function combineHrl(
  series: Record<string, { date: string; recordsLinked: number | null; abhasLinked: number | null }[]>,
) {
  const sums = new Map<string, { recordsLinked: number; abhasLinked: number }>();
  for (const points of Object.values(series)) {
    for (const p of points) {
      const cur = sums.get(p.date) ?? { recordsLinked: 0, abhasLinked: 0 };
      cur.recordsLinked += p.recordsLinked ?? 0;
      cur.abhasLinked += p.abhasLinked ?? 0;
      sums.set(p.date, cur);
    }
  }
  return [...sums.entries()]
    .map(([date, v]) => ({ date, ...v }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

const combinedAbhaDaily = combineAbha(partnerAbhaDaily);
const combinedAbhaWeekly = combineAbha(partnerAbhaWeekly);
const combinedHrlDaily = combineHrl(partnerHrlDaily);
const combinedHrlWeekly = combineHrl(partnerHrlWeekly);

// cumulative growth curves from the weekly full-history series
function cumulative<T extends { date: string }>(points: T[], key: keyof T) {
  let running = 0;
  return points.map((p) => {
    running += (p[key] as number | null) ?? 0;
    return { date: p.date, value: running };
  });
}

const cumulativeAbha = cumulative(combinedAbhaWeekly, "value");
const cumulativeHrl = cumulative(combinedHrlWeekly, "recordsLinked");

// statewise totals across tracked partners
function statewiseTotals(perState: Record<string, { name: string; value: number | null }[]>) {
  const nameByCode = new Map(states.map((s) => [s.code, s.name]));
  return Object.entries(perState)
    .map(([code, list]) => ({
      state: nameByCode.get(code) ?? code,
      stateCode: code,
      value: list.reduce((s, r) => s + (r.value ?? 0), 0),
    }))
    .filter((r) => r.value > 0)
    .sort((a, b) => b.value - a.value);
}

// summary counters derived purely from tracked partners
const sum = (rows: { value: number | null }[]) => rows.reduce((s, r) => s + (r.value ?? 0), 0);
const seriesSum = (points: { value?: number | null; recordsLinked?: number | null }[], key: "value" | "recordsLinked") =>
  points.reduce((s, p) => s + ((p[key] as number | null) ?? 0), 0);
const onDate = <T extends { date: string }>(points: T[], date: string) =>
  points.find((p) => p.date === date);

/** ISO date `days` before the snapshot date (inclusive-window helper). */
function daysAgo(days: number): string {
  const d = new Date(`${snapshotDate}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString().slice(0, 10);
}

/** Sum a numeric field over points with from <= date <= to (series are sparse). */
function windowSum<T extends { date: string }>(
  points: T[],
  key: keyof T,
  from: string,
  to: string,
): number {
  return points.reduce(
    (s, p) => (p.date >= from && p.date <= to ? s + ((p[key] as number | null) ?? 0) : s),
    0,
  );
}

/** % change of cur vs prev; null when prev is 0 (avoids ∞). */
const growthPct = (cur: number, prev: number) =>
  prev > 0 ? ((cur - prev) / prev) * 100 : null;

function metricInsights<T extends { date: string }>(daily: T[], key: keyof T) {
  const last7d = windowSum(daily, key, daysAgo(6), snapshotDate);
  const prev7d = windowSum(daily, key, daysAgo(13), daysAgo(7));
  const last30d = windowSum(daily, key, daysAgo(29), snapshotDate);
  return {
    last7d,
    prev7d,
    weekGrowthPct: growthPct(last7d, prev7d),
    perDay7d: last7d / 7,
    perDay30d: last30d / 30,
  };
}

/** Partners with any activity in the window, across both metrics. */
function activePartners(from: string, to: string): number {
  const active = new Set<string>();
  for (const [name, points] of Object.entries(partnerAbhaDaily)) {
    if (points.some((p) => p.date >= from && p.date <= to && (p.value ?? 0) > 0)) active.add(name);
  }
  for (const [name, points] of Object.entries(partnerHrlDaily)) {
    if (points.some((p) => p.date >= from && p.date <= to && (p.recordsLinked ?? 0) > 0))
      active.add(name);
  }
  return active.size;
}

// linkage depth: records linked per ABHA linked, over the last 30 days combined
const linkageRecords30d = windowSum(combinedHrlDaily, "recordsLinked", daysAgo(29), snapshotDate);
const linkageAbhas30d = windowSum(combinedHrlDaily, "abhasLinked", daysAgo(29), snapshotDate);

// per-partner linkage depth (30 days), only where there is signal
const partnerLinkageDepth = Object.entries(partnerHrlDaily)
  .map(([name, points]) => {
    const records = windowSum(points, "recordsLinked", daysAgo(29), snapshotDate);
    const abhas = windowSum(points, "abhasLinked", daysAgo(29), snapshotDate);
    return { name, records, abhas, depth: abhas > 0 ? records / abhas : null };
  })
  .filter((p) => p.depth != null && p.abhas >= 10)
  .sort((a, b) => (b.depth ?? 0) - (a.depth ?? 0))
  .map(({ name, depth }) => ({ name, depth }));

const summary = {
  abha: {
    total: sum(partnersAbha.national),
    today: onDate(combinedAbhaDaily, snapshotDate)?.value ?? 0,
    last30d: seriesSum(combinedAbhaDaily, "value"),
    ...metricInsights(combinedAbhaDaily, "value"),
  },
  hrl: {
    total: sum(partnersHrl.national),
    today: onDate(combinedHrlDaily, snapshotDate)?.recordsLinked ?? 0,
    last30d: seriesSum(combinedHrlDaily, "recordsLinked"),
    ...metricInsights(combinedHrlDaily, "recordsLinked"),
  },
  partnersTracked: allowlist.length,
  statesActive: new Set([
    ...Object.keys(partnersAbha.perState),
    ...Object.keys(partnersHrl.perState),
  ]).size,
  activePartners7d: activePartners(daysAgo(6), snapshotDate),
  activePartners30d: activePartners(daysAgo(29), snapshotDate),
  linkageDepth30d: linkageAbhas30d > 0 ? linkageRecords30d / linkageAbhas30d : null,
  partnerLinkageDepth,
};

// typo detection: every allowlisted name should surface somewhere
{
  const seen = new Set(
    [
      ...partnersAbha.national.map((p) => p.name),
      ...partnersHrl.national.map((p) => p.name),
      ...Object.keys(partnerAbhaDaily),
      ...Object.keys(partnerHrlDaily),
    ].map((n) => n.toLowerCase()),
  );
  for (const name of allowlist) {
    if (!seen.has(name.toLowerCase())) {
      console.warn(`  ⚠ allowlisted partner has NO data in this snapshot: "${name}" (typo?)`);
    }
  }
}

// ── Write artifacts ───────────────────────────────────────────────────────────

const write = (name: string, data: unknown) => {
  const file = join(outDir, name);
  writeFileSync(file, JSON.stringify(data));
  console.log(`  wrote ${file}`);
};

write("meta.json", {
  snapshotDate,
  generatedAt: new Date().toISOString(),
  source: "https://dashboard.abdm.gov.in/abdm/",
  allowlist,
  states,
  districts,
});

write("summary.json", summary);

write("partners.json", {
  allowlist,
  abha: partnersAbha,
  hrl: partnersHrl,
  statewiseAbha: statewiseTotals(partnersAbha.perState),
  statewiseHrl: statewiseTotals(partnersHrl.perState),
});

write("partner-trends.json", {
  abhaDaily: partnerAbhaDaily,
  abhaWeeklyAll: partnerAbhaWeekly,
  hrlDaily: partnerHrlDaily,
  hrlWeeklyAll: partnerHrlWeekly,
  combined: {
    abhaDaily: combinedAbhaDaily,
    abhaWeeklyAll: combinedAbhaWeekly,
    hrlDaily: combinedHrlDaily,
    hrlWeeklyAll: combinedHrlWeekly,
    abhaCumulative: cumulativeAbha,
    hrlCumulative: cumulativeHrl,
  },
});

// sanity summary
console.log(
  `Tracked partners: ${allowlist.length} · ABHA total: ${summary.abha.total.toLocaleString("en-IN")} · ` +
    `HRL total: ${summary.hrl.total.toLocaleString("en-IN")} · states active: ${summary.statesActive}`,
);
