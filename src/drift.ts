import picomatch from "picomatch";
import type { DriftFinding, Spec } from "./types.js";
import { coversFile } from "./covers.js";

export interface DriftOptions {
  specs: Spec[];
  changedFiles: string[];
  /** Globs defining what counts as "code that should be specced". */
  codeGlobs: string[];
}

/**
 * Drift detection: the part that refuses.
 *
 * - A changed code file covered by no spec at all → unspecced change.
 *   Either the spec catalog is incomplete or the change shouldn't happen.
 * - A changed code file whose only coverage is a non-approved spec →
 *   stale approval: someone is shipping against a draft, or the spec was
 *   edited and never re-approved.
 */
export function detectDrift(opts: DriftOptions): DriftFinding[] {
  const findings: DriftFinding[] = [];
  const isCode = picomatch(opts.codeGlobs, { dot: true });

  for (const file of opts.changedFiles) {
    if (!isCode(file)) continue;

    const covering = opts.specs.filter((s) => coversFile(s, file));
    if (covering.length === 0) {
      findings.push({
        kind: "unspecced-change",
        file,
        message: `${file} changed but no spec covers it — write a spec or reconsider the change`,
      });
      continue;
    }

    const approved = covering.filter((s) => s.status === "approved");
    if (approved.length === 0) {
      const spec = covering[0];
      findings.push({
        kind: spec.status === "superseded" ? "superseded-coverage" : "stale-approval",
        file,
        specId: spec.id,
        message:
          spec.status === "superseded"
            ? `${file} is covered only by superseded ${spec.id} — write or approve a successor spec`
            : `${file} is covered by ${spec.id} which is still ${spec.status} — approve the spec before shipping against it`,
      });
    }
  }
  return findings;
}
