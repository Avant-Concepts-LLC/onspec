import { execFileSync } from "node:child_process";

function git(repoRoot: string, args: string[]): string {
  return execFileSync("git", args, {
    cwd: repoRoot,
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
  });
}

/**
 * Files changed between base and head. head defaults to the working tree
 * (committed + staged + unstaged), which is what you want locally; CI passes
 * explicit SHAs.
 */
export function changedFiles(repoRoot: string, base: string, head?: string): string[] {
  const range = head ? [`${base}...${head}`] : [base];
  const out = git(repoRoot, ["diff", "--name-only", "--diff-filter=ACMRD", ...range]);
  const files = new Set(out.split("\n").filter(Boolean));
  if (!head) {
    // Working-tree comparison: `git diff` can't see brand-new untracked
    // files, and the 2 a.m. hotfix is exactly the kind of change that
    // shows up as one. Include them.
    const untracked = git(repoRoot, ["ls-files", "--others", "--exclude-standard"]);
    for (const f of untracked.split("\n").filter(Boolean)) files.add(f);
  }
  return [...files];
}

/** Unified diff text between base and head (or working tree). */
export function diffText(repoRoot: string, base: string, head?: string, paths?: string[]): string {
  const range = head ? [`${base}...${head}`] : [base];
  const args = ["diff", ...range];
  if (paths && paths.length > 0) args.push("--", ...paths);
  return git(repoRoot, args);
}

export function repoRootFrom(cwd: string): string {
  return git(cwd, ["rev-parse", "--show-toplevel"]).trim();
}

export function refExists(repoRoot: string, ref: string): boolean {
  try {
    git(repoRoot, ["rev-parse", "--verify", "--quiet", `${ref}^{commit}`]);
    return true;
  } catch {
    return false;
  }
}
