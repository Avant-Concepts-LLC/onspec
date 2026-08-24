import picomatch from "picomatch";
import type { Spec } from "./types.js";

export function coversFile(spec: Spec, file: string): boolean {
  return spec.covers.some((glob) => picomatch.isMatch(file, glob, { dot: true }));
}

/** Specs whose `covers` globs match at least one of the changed files. */
export function governingSpecs(specs: Spec[], changedFiles: string[]): Map<Spec, string[]> {
  const result = new Map<Spec, string[]>();
  for (const spec of specs) {
    const matched = changedFiles.filter((f) => coversFile(spec, f));
    if (matched.length > 0) result.set(spec, matched);
  }
  return result;
}

/** Changed files not covered by any spec in the list. */
export function uncoveredFiles(specs: Spec[], changedFiles: string[]): string[] {
  return changedFiles.filter((f) => !specs.some((s) => coversFile(s, f)));
}
