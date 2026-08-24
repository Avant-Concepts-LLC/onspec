import type { CriterionVerdict, Spec, TestResult } from "./types.js";
import { coversFile, governingSpecs } from "./covers.js";
import { resolveEvidence } from "./evidence.js";
import { assessCriterion, llmAvailable } from "./llm.js";

export interface VerifyOptions {
  repoRoot: string;
  specs: Spec[];
  changedFiles: string[];
  /** Unified diff for LLM assessment of evidence-less criteria. */
  diff: string;
  testResults?: TestResult[];
  /** When false, criteria needing LLM assessment come back uncertain. */
  useLlm: boolean;
  model?: string;
  /** Verify every approved spec regardless of the diff. */
  all?: boolean;
}

export interface VerifyReport {
  verdicts: CriterionVerdict[];
  /** Specs that govern the change. */
  governed: Map<Spec, string[]>;
}

export async function verify(opts: VerifyOptions): Promise<VerifyReport> {
  const active = opts.specs.filter((s) => s.status !== "superseded");
  const governed = opts.all
    ? new Map(active.map((s) => [s, opts.changedFiles.filter((f) => coversFile(s, f))]))
    : governingSpecs(active, opts.changedFiles);

  const verdicts: CriterionVerdict[] = [];
  for (const [spec] of governed) {
    for (const criterion of spec.criteria) {
      const outcome = resolveEvidence(opts.repoRoot, criterion, opts.testResults);
      if (outcome.needsLlm && opts.useLlm && llmAvailable() && opts.diff.trim()) {
        try {
          const llm = await assessCriterion(opts.repoRoot, spec, criterion, opts.diff, opts.model);
          verdicts.push({
            spec,
            criterion,
            verdict: llm.verdict,
            reason: llm.reason,
            evidenceRef: llm.evidenceRef,
            source: "llm",
          });
          continue;
        } catch (err) {
          verdicts.push({
            spec,
            criterion,
            verdict: "uncertain",
            reason: `LLM assessment failed: ${err instanceof Error ? err.message : String(err)}`,
            source: "llm",
          });
          continue;
        }
      }
      verdicts.push({
        spec,
        criterion,
        verdict: outcome.verdict,
        reason: outcome.reason,
        evidenceRef: outcome.evidenceRef,
        source: outcome.source,
      });
    }
  }
  return { verdicts, governed };
}
