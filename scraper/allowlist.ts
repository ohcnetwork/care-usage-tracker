/**
 * Partner allowlist loader — config/partners.yaml.
 *
 * Shared by the scraper (limits which partner data is collected) and the
 * normalizer (filters/validates the artifacts fed to the site).
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parse } from "yaml";
import { z } from "zod";

const Config = z.object({
  partners: z.array(z.string().min(1)).min(1),
});

const CONFIG_PATH = join("config", "partners.yaml");

/** Allowlisted partner names, in config order (deduplicated). */
export function loadAllowlist(): string[] {
  const raw = parse(readFileSync(CONFIG_PATH, "utf8"));
  const { partners } = Config.parse(raw);
  return [...new Set(partners.map((p) => p.trim()))];
}

/** Case-insensitive membership set for filtering scraped rows. */
export function allowlistSet(names: string[] = loadAllowlist()): Set<string> {
  return new Set(names.map((n) => n.toLowerCase()));
}
