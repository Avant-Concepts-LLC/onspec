export type VerifyMethod = "test" | "assertion" | "manual";
export type SpecStatus = "draft" | "approved" | "superseded";
export type Verdict = "met" | "unmet" | "uncertain" | "manual";

export interface Criterion {
  id: string;
  text: string;
  verify: VerifyMethod;
  /**
   * Evidence pointer. Format depends on `verify`:
   *  - test:      "path/to/test.file::test name"
   *  - assertion: "path/to/file#literal snippet the file must contain"
   *  - manual:    free text (who checks, how)
   * May be absent — the criterion then falls through to LLM assessment.
   */
  evidence?: string;
}

export interface Spec {
  id: string;
  title: string;
  status: SpecStatus;
  covers: string[];
  criteria: Criterion[];
  invariants: string[];
  nonGoals: string[];
  /**
   * External references this spec traces to: issue-tracker keys
   * (PROJ-123), ticket URLs, RFC links. Surfaced in reports so the
   * spec ↔ ticket ↔ code trace is visible on every PR.
   */
  refs?: string[];
  /** Free-form markdown body below the frontmatter. */
  body: string;
  /** Repo-relative path of the spec file. */
  path: string;
}

export interface SpecParseError {
  path: string;
  message: string;
}

export interface CriterionVerdict {
  spec: Spec;
  criterion: Criterion;
  verdict: Verdict;
  /** Human-readable explanation of how the verdict was reached. */
  reason: string;
  /** Where the evidence lives (test result, file match, LLM citation). */
  evidenceRef?: string;
  /** "test-result" | "assertion" | "llm" | "manual" | "missing" */
  source: string;
}

export interface DriftFinding {
  kind: "unspecced-change" | "stale-approval" | "superseded-coverage";
  file: string;
  specId?: string;
  message: string;
}

export interface LintFinding {
  specPath: string;
  specId?: string;
  severity: "error" | "warning" | "info";
  message: string;
}

export interface TestResult {
  /** Full test name as reported by the runner (may include describe prefixes). */
  name: string;
  /** classname / file attribute, when the runner provides one. */
  classname?: string;
  file?: string;
  status: "passed" | "failed" | "skipped";
  message?: string;
}
