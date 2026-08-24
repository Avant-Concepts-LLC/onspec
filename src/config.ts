import fs from "node:fs";
import path from "node:path";
import { z } from "zod";

const configSchema = z.object({
  /** Directory containing *.spec.md files, relative to repo root. */
  specDir: z.string().default("specs"),
  /** Globs defining code that must be governed by a spec (drift scope). */
  code: z.array(z.string()).default(["src/**"]),
  /** Default base ref for diffs when none is passed. */
  base: z.string().default("HEAD~1"),
});

export type SpeccheckConfig = z.infer<typeof configSchema>;

export function loadConfig(repoRoot: string): SpeccheckConfig {
  const file = path.join(repoRoot, "speccheck.config.json");
  if (!fs.existsSync(file)) return configSchema.parse({});
  return configSchema.parse(JSON.parse(fs.readFileSync(file, "utf8")));
}
