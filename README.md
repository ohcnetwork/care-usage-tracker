# CARE Usage Tracker

Track [CARE](https://ohc.network) ecosystem adoption across public health
dashboards. A scraper mirrors upstream metrics for tracked partners into dated
JSONL snapshots, a normalizer derives compact JSON artifacts, and a static
Next.js site (built with [care·ui](https://careui.ohc.network)) presents them.

**Live site:** https://usage.ohc.network

## Trackers

| Tracker | Source | Metrics |
| --- | --- | --- |
| [ABDM](https://usage.ohc.network/abdm/) | [NHA ABDM dashboard](https://dashboard.abdm.gov.in/abdm/) | ABHA numbers created, health records linked, daily/weekly trends, statewise splits |

Only data for partners listed in `config/<tracker>/partners.yaml` is collected
and published — nothing else is scraped or aggregated.

## How it works

```
trackers/abdm/scrape.ts      →  data/abdm/raw/<date>/*.jsonl   (dated snapshot + manifest)
trackers/abdm/build-data.ts  →  data/abdm/normalized/*.json    (summary, partners, trends, meta)
site/ (Next.js static export)→  site/out/                      (reads normalized JSON at build)
```

A GitHub Actions workflow ([`scrape.yml`](.github/workflows/scrape.yml)) runs
the pipeline daily at 02:00 IST and commits the snapshot; Cloudflare Pages
rebuilds the site on push.

## Development

Requires Node 22+.

```sh
# pipeline (repo root)
npm ci
npm run scrape:abdm                      # scrape today's snapshot
npm run scrape:abdm -- --date 2026-07-09 # or a specific date
npm run build-data:abdm                  # normalize latest snapshot

# site
cd site
npm ci
npm run dev     # dev server (syncs data first)
npm run build   # static export to site/out/
```

### Adding a partner

Append the partner's exact upstream name to
`config/abdm/partners.yaml`. The next scrape picks it up.

### Adding a tracker

1. Create `trackers/<name>/` with a `scrape.ts` and `build-data.ts` following
   `trackers/abdm/`, plus `config/<name>/partners.yaml`.
2. Add `scrape:<name>` / `build-data:<name>` scripts to the root
   `package.json` and a job to the scrape workflow.
3. Register it in `site/src/lib/trackers.ts` and add routes under
   `site/src/app/<name>/`.

## Data notes

- Raw snapshots are append-only under `data/<tracker>/raw/<date>/`; each JSONL
  line is `{ fetched_at, endpoint, params, row }` with a `manifest.json`
  summarizing every request.
- Upstream daily series are sparse (only dates with activity), so derived
  window metrics use date arithmetic rather than last-N points.
- This is an unofficial, read-only mirror of publicly accessible dashboard
  data, refreshed once a day.

## License

MIT
