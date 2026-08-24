import fs from "node:fs";
import path from "node:path";
import picomatch from "picomatch";
import type { LintFinding, Spec, SpecParseError } from "./types.js";
import { splitTestEvidence } from "./junit.js";

const AMBIGUOUS_WORDS = [
  "fast", "quickly", "appropriate", "appropriately", "properly", "correctly",
  "efficient", "efficiently", "robust", "gracefully", "user-friendly",
  "intuitive", "reasonable", "as needed", "etc", "should work", "handle",
  "seamless", "simply", "easy", "flexible",
];

export interface LintOptions {
  repoRoot: string;
  specs: Spec[];
  parseErrors: SpecParseError[];
  /** All tracked files, for covers-glob reachability checks. */
  repoFiles: string[];
}

export interface LintReport {
  findings: LintFinding[];
  /** Per-spec readiness grade, A–F. */
  grades: Map<string, string>;
}

/**
 * Spec linter / readiness grade: is this spec unambiguous and verifiable
 * enough to hand to a generator — and to be checked afterwards?
 */
export function lint(opts: LintOptions): LintReport {
  const findings: LintFinding[] = [];
  const grades = new Map<string, string>();

  for (const err of opts.parseErrors) {
    findings.push({ specPath: err.path, severity: "error", message: err.message });
  }

  for (const spec of opts.specs) {
    let penalty = 0;
    const add = (severity: LintFinding["severity"], message: string, weight: number) => {
      findings.push({ specPath: spec.path, specId: spec.id, severity, message });
      penalty += weight;
    };

    for (const glob of spec.covers) {
      const matches = opts.repoFiles.some((f) => picomatch.isMatch(f, glob, { dot: true }));
      if (!matches) {
        add("warning", `covers glob "${glob}" matches no file in the repo`, 15);
      }
    }

    for (const c of spec.criteria) {
      if (c.verify === "manual") {
        add("warning", `${c.id} is verify: manual — nothing will ever check it automatically`, 10);
      }
      if (c.verify !== "manual" && !c.evidence) {
        add("warning", `${c.id} (verify: ${c.verify}) has no evidence pointer — verdicts will rely on LLM assessment`, 10);
      }
      if (c.verify === "test" && c.evidence) {
        const [file] = splitTestEvidence(c.evidence);
        if (file && !fs.existsSync(path.join(opts.repoRoot, file))) {
          add("error", `${c.id} evidence points at missing file ${file}`, 20);
        }
      }
      const lower = c.text.toLowerCase();
      const vague = AMBIGUOUS_WORDS.filter((w) => lower.includes(w));
      if (vague.length > 0) {
        add("info", `${c.id} uses ambiguous wording (${vague.join(", ")}) — can a machine check this?`, 3 * vague.length);
      }
    }

    if (spec.nonGoals.length === 0) {
      add("info", "no non_goals declared — generators over-build without explicit boundaries", 5);
    }
    if (spec.invariants.length === 0) {
      add("info", "no invariants declared — consider what must never break", 2);
    }

    const grade =
      penalty === 0 ? "A" : penalty <= 10 ? "B" : penalty <= 25 ? "C" : penalty <= 45 ? "D" : "F";
    grades.set(spec.id, grade);
  }

  return { findings, grades };
}
