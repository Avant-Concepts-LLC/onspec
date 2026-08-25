import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { z } from "zod";
import type { Spec, SpecParseError } from "./types.js";

const criterionSchema = z.object({
  id: z.string().regex(/^C\d+$/, "criterion id must look like C1, C2, …"),
  text: z.string().min(1),
  verify: z.enum(["test", "assertion", "manual"]),
  evidence: z.string().optional(),
});

const frontmatterSchema = z.object({
  id: z.string().regex(/^SPEC-\d{4}$/, "spec id must look like SPEC-0042"),
  title: z.string().min(1),
  status: z.enum(["draft", "approved", "superseded"]),
  covers: z.array(z.string()).min(1),
  criteria: z.array(criterionSchema).min(1),
  invariants: z.array(z.string()).optional().default([]),
  non_goals: z.array(z.string()).optional().default([]),
  refs: z.array(z.string()).optional().default([]),
});

export interface LoadResult {
  specs: Spec[];
  errors: SpecParseError[];
}

export function parseSpec(raw: string, specPath: string): Spec {
  const { data, content } = matter(raw);
  const fm = frontmatterSchema.parse(data);
  const seen = new Set<string>();
  for (const c of fm.criteria) {
    if (seen.has(c.id)) {
      throw new Error(`duplicate criterion id ${c.id}`);
    }
    seen.add(c.id);
  }
  return {
    id: fm.id,
    title: fm.title,
    status: fm.status,
    covers: fm.covers,
    criteria: fm.criteria,
    invariants: fm.invariants,
    nonGoals: fm.non_goals,
    refs: fm.refs,
    body: content.trim(),
    path: specPath,
  };
}

/**
 * Load every *.spec.md under specDir (recursively). Parse failures are
 * collected, not thrown — a broken spec must not take down verification
 * of the healthy ones.
 */
export function loadSpecs(repoRoot: string, specDir = "specs"): LoadResult {
  const specs: Spec[] = [];
  const errors: SpecParseError[] = [];
  const absDir = path.join(repoRoot, specDir);
  if (!fs.existsSync(absDir)) {
    return { specs, errors };
  }

  const walk = (dir: string): string[] =>
    fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) return walk(full);
      return entry.name.endsWith(".spec.md") ? [full] : [];
    });

  const ids = new Map<string, string>();
  for (const file of walk(absDir).sort()) {
    const rel = path.relative(repoRoot, file);
    try {
      const spec = parseSpec(fs.readFileSync(file, "utf8"), rel);
      const existing = ids.get(spec.id);
      if (existing) {
        errors.push({ path: rel, message: `duplicate spec id ${spec.id} (also in ${existing})` });
        continue;
      }
      ids.set(spec.id, rel);
      specs.push(spec);
    } catch (err) {
      const message =
        err instanceof z.ZodError
          ? err.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ")
          : err instanceof Error
            ? err.message
            : String(err);
      errors.push({ path: rel, message });
    }
  }
  return { specs, errors };
}
