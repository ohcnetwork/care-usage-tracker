/**
 * Normalize the latest raw JSONL snapshot into typed JSON artifacts for the site.
 *
 * Usage: npm run build-data [-- --date 2026-07-08]
 *
 * Reads  data/raw/<date>/*.jsonl
 * Writes data/normalized/{meta,summary,abha,hrl,partners}.json
 */
import { readFileSync, readdirSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { z } from "zod";

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
mkdirSync(outDir, { recursive: true });
console.log(`Normalizing ${dir} → ${outDir}`);

// meta: states + districts
const states = readJsonl(dir, "states").map((r) => ({
  code: String(r.row.value),
  name: String(r.row.text),
}));
const stateNameByCode = new Map(states.map((s) => [s.code, s.name]));

const districts: Record<string, { code: string; name: string }[]> = {};
for (const [code, rows] of byState(readJsonl(dir, "districts"))) {
  if (code === "") continue;
  districts[code] = rows.map((r) => ({ code: String(r.row.value), name: String(r.row.text) }));
}

// counters helper: healthdata/hrlCount style rows keyed by state
function counters(jobId: string, fields: Record<string, string>) {
  const out: Record<string, Record<string, number | null>> = {};
  for (const [code, rows] of byState(readJsonl(dir, jobId))) {
    const row = rows.at(-1)?.row ?? {};
    out[code || "IN"] = Object.fromEntries(
      Object.entries(fields).map(([key, src]) => [key, num(row[src])]),
    );
  }
  return out;
}

const abhaCounters = counters("abha_counters", { today: "today", total: "total1", currentMonth: "total2" });
const hrlCounters = counters("hrl_counters", { today: "today", total: "total1", currentMonth: "total2" });
const facilityCounters = counters("facility_counters", { today: "today", approved: "total1", registered: "total2", currentMonth: "total3" });
const professionalCounters = counters("professional_counters", { today: "today", approved: "total1", registered: "total2", currentMonth: "total3" });

// distributions per state
function distribution(jobId: string) {
  const out: Record<string, { label: string; value: number | null }[]> = {};
  for (const [code, rows] of byState(readJsonl(dir, jobId))) {
    out[code || "IN"] = rows.map((r) => ({ label: String(r.row.text), value: num(r.row.value) }));
  }
  return out;
}

const abhaAge = distribution("abha_age");
const abhaGender = distribution("abha_gender");

// statewise totals
function statewise(jobId: string) {
  return readJsonl(dir, jobId).map((r) => {
    const name = String(r.row.text);
    const code = states.find((s) => s.name === name)?.code ?? null;
    return { state: name, stateCode: code, value: num(r.row.value) };
  });
}

// trends
function abhaTrend(jobId: string) {
  const out: Record<string, { date: string; value: number | null }[]> = {};
  for (const [code, rows] of byState(readJsonl(dir, jobId))) {
    out[code || "IN"] = rows
      .map((r) => ({ date: isoDate(r.row.text), value: num(r.row.value) }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }
  return out;
}

function hrlTrend(jobId: string) {
  const out: Record<string, { date: string; recordsLinked: number | null; abhasLinked: number | null }[]> = {};
  for (const [code, rows] of byState(readJsonl(dir, jobId))) {
    out[code || "IN"] = rows
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

function quarterly(jobId: string) {
  return readJsonl(dir, jobId).map((r) => ({
    fyStartYear: num(r.row.text),
    q1: num(r.row.value),
    q2: num(r.row.value2),
    q3: num(r.row.value3),
    q4: num(r.row.origin),
  }));
}

// partners
function partnerTotals(jobId: string) {
  const national: { name: string; value: number | null }[] = [];
  const perState: Record<string, { name: string; value: number | null }[]> = {};
  for (const [code, rows] of byState(readJsonl(dir, jobId))) {
    const list = rows
      .map((r) => ({ name: String(r.row.text), value: num(r.row.value) }))
      .sort((a, b) => (b.value ?? 0) - (a.value ?? 0));
    if (code === "") national.push(...list);
    else perState[code] = list;
  }
  return { national, perState };
}

const partnersAbha = partnerTotals("partners_abha");
const partnersHrl = partnerTotals("partners_hrl");

// simple national trend (monthly facility/professional)
const facilityTrend = abhaTrend("facility_trend_monthly")["IN"] ?? [];
const professionalTrend = abhaTrend("professional_trend_monthly")["IN"] ?? [];

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
  states,
  districts,
});

write("summary.json", {
  abha: abhaCounters["IN"],
  hrl: hrlCounters["IN"],
  facilities: facilityCounters["IN"],
  professionals: professionalCounters["IN"],
});

write("abha.json", {
  counters: abhaCounters,
  ageGroups: abhaAge,
  gender: abhaGender,
  statewise: statewise("abha_statewise"),
  trendDaily: abhaTrend("abha_trend_daily"),
  trendWeeklyAll: abhaTrend("abha_trend_all")["IN"] ?? [],
  quarterly: quarterly("abha_quarterly"),
});

write("hrl.json", {
  counters: hrlCounters,
  trendDaily: hrlTrend("hrl_trend_daily"),
  trendWeeklyAll: hrlTrend("hrl_trend_all")["IN"] ?? [],
  quarterly: quarterly("hrl_quarterly"),
});

write("partners.json", {
  abha: partnersAbha,
  hrl: partnersHrl,
});

write("extras.json", {
  facilityStatewise: statewise("facility_statewise"),
  professionalStatewise: statewise("professional_statewise"),
  facilityTrendMonthly: facilityTrend,
  professionalTrendMonthly: professionalTrend,
});

// sanity summary
console.log(
  `ABHA total: ${abhaCounters["IN"]?.total?.toLocaleString("en-IN")}, ` +
    `HRL total: ${hrlCounters["IN"]?.total?.toLocaleString("en-IN")}, ` +
    `partners (ABHA): ${partnersAbha.national.length}, partners (HRL): ${partnersHrl.national.length}`,
);
