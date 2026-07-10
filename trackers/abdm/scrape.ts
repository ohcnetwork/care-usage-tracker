/**
 * Scrape all catalogued ABDM dashboard metrics into a dated JSONL snapshot.
 *
 * Usage: npm run scrape [-- --date 2026-07-08]
 *
 * Output: data/abdm/raw/<date>/<job_id>.jsonl — one line per record:
 *   { fetched_at, endpoint, params, row }
 * plus manifest.json summarising every request (ok / empty / failed).
 */
import { mkdirSync, writeFileSync, appendFileSync } from "node:fs";
import { join } from "node:path";
import { post, type ApiResponse, type StatedistReq } from "./client.ts";
import { jobs, type Job } from "./endpoints.ts";
import { loadAllowlist, allowlistSet } from "./allowlist.ts";

interface ManifestEntry {
  job: string;
  endpoint: string;
  params: StatedistReq;
  state?: string;
  outcome: "ok" | "empty" | "failed";
  rows: number;
  error?: string;
}

const dateArg = process.argv.indexOf("--date");
const snapshotDate =
  dateArg !== -1 ? process.argv[dateArg + 1] : new Date().toISOString().slice(0, 10);

const outDir = join("data", "abdm", "raw", snapshotDate);
mkdirSync(outDir, { recursive: true });

const allowlist = loadAllowlist();
const allowed = allowlistSet(allowlist);

const manifest: ManifestEntry[] = [];

/** Flatten an API response into JSONL rows. */
function toRows(res: ApiResponse): Record<string, unknown>[] {
  const rows: Record<string, unknown>[] = [];
  for (const item of res.list ?? []) rows.push(item);
  for (const item of res.list2 ?? []) rows.push({ ...item, _list: "list2" });
  if (rows.length === 0) {
    // Counter-style response: keep scalar fields as a single row.
    const { list, list2, ts, status, txnno, ...rest } = res;
    if (Object.values(rest).some((v) => v !== "" && v != null)) rows.push(rest);
  }
  return rows;
}

async function runRequest(job: Job, params: StatedistReq, label2?: string) {
  const file = join(outDir, `${job.id}.jsonl`);
  const label = `${job.id}${label2 ? ` [${label2}]` : ""}`;
  try {
    const res = await post(job.endpoint, params);
    if (res.status !== "true") {
      manifest.push({ job: job.id, endpoint: job.endpoint, params, state: label2, outcome: "empty", rows: 0 });
      console.warn(`  ∅ ${label}: status=${res.status}`);
      return;
    }
    let rows = toRows(res);
    if (job.filterByAllowlist) {
      rows = rows.filter((r) => allowed.has(String(r.text ?? "").toLowerCase()));
    }
    const fetched_at = new Date().toISOString();
    const lines = rows
      .map((row) => JSON.stringify({ fetched_at, endpoint: job.endpoint, params, row }))
      .join("\n");
    if (lines) appendFileSync(file, lines + "\n");
    manifest.push({ job: job.id, endpoint: job.endpoint, params, state: label2, outcome: "ok", rows: rows.length });
    console.log(`  ✓ ${label}: ${rows.length} rows`);
  } catch (err) {
    manifest.push({
      job: job.id, endpoint: job.endpoint, params, state: label2,
      outcome: "failed", rows: 0, error: String(err),
    });
    console.error(`  ✗ ${label}: ${err}`);
  }
}

async function main() {
  console.log(`Snapshot ${snapshotDate} → ${outDir}`);

  // Fetch state master first; it drives per-state expansion.
  const statesRes = await post("statedist/1.0", { type: "SM", district_code: "" });
  const states = (statesRes.list ?? []).map((s) => ({ name: s.text, code: s.value }));
  if (states.length === 0) throw new Error("State master returned no states — aborting");
  console.log(`${states.length} states/UTs; ${jobs.length} jobs; ${allowlist.length} allowlisted partners`);

  for (const job of jobs) {
    console.log(`▶ ${job.id} — ${job.description}`);
    if (job.scope === "per-partner") {
      const field = job.partnerField ?? "partner";
      for (const partner of allowlist) {
        await runRequest(job, { ...job.body, [field]: partner }, partner);
      }
      continue;
    }
    await runRequest(job, job.body);
    if (job.scope === "per-state") {
      for (const state of states) {
        await runRequest(job, { ...job.body, state_code: state.code }, state.name);
      }
    }
  }

  const counts = { ok: 0, empty: 0, failed: 0 };
  for (const m of manifest) counts[m.outcome]++;
  writeFileSync(
    join(outDir, "manifest.json"),
    JSON.stringify({ snapshotDate, counts, requests: manifest }, null, 2),
  );
  console.log(`Done: ${counts.ok} ok, ${counts.empty} empty, ${counts.failed} failed`);
  if (counts.failed > 0) process.exitCode = 1;
}

main();
