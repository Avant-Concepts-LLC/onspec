import { describe, expect, it } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { lint } from "../src/lint.js";
import type { Criterion, Spec } from "../src/types.js";

function spec(id: string, overrides: Partial<Spec> = {}): Spec {
  return {
    id,
    title: id,
    status: "approved",
    covers: ["src/**"],
    criteria: [
      {
        id: "C1",
        text: "records are exported",
        verify: "test",
        evidence: "tests/a.test.ts::exports records",
      },
    ],
    invariants: ["x"],
    nonGoals: ["y"],
    body: "",
    path: `specs/${id}.spec.md`,
    ...overrides,
  };
}

function run(specs: Spec[], repoFiles = ["src/a.ts", "tests/a.test.ts"]) {
  const repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), "onspec-lint-"));
  for (const f of repoFiles) {
    fs.mkdirSync(path.dirname(path.join(repoRoot, f)), { recursive: true });
    fs.writeFileSync(path.join(repoRoot, f), "// stub");
  }
  return lint({ repoRoot, specs, parseErrors: [], repoFiles });
}

describe("lint", () => {
  it("warns on manual criteria", () => {
    const manual: Criterion = { id: "C2", text: "looks right", verify: "manual" };
    const report = run([spec("SPEC-0001", { criteria: [manual] })]);
    expect(report.findings.some((f) => f.severity === "warning" && f.message.includes("manual"))).toBe(true);
  });

  it("warns on dead covers globs", () => {
    const report = run([spec("SPEC-0001", { covers: ["packages/nothing/**"] })]);
    expect(report.findings.some((f) => f.message.includes("matches no file"))).toBe(true);
  });

  it("grades every spec", () => {
    const report = run([spec("SPEC-0001"), spec("SPEC-0002")]);
    expect(report.grades.get("SPEC-0001")).toBe("A");
    expect(report.grades.get("SPEC-0002")).toBe("A");
  });

  it("flags ambiguous wording", () => {
    const vague: Criterion = {
      id: "C1",
      text: "the export should work quickly and handle errors gracefully",
      verify: "test",
      evidence: "tests/a.test.ts::exports records",
    };
    const report = run([spec("SPEC-0001", { criteria: [vague] })]);
    expect(report.findings.some((f) => f.severity === "info" && f.message.includes("ambiguous"))).toBe(true);
  });

  it("errors when test evidence points at a missing file", () => {
    const broken: Criterion = {
      id: "C1",
      text: "records are exported",
      verify: "test",
      evidence: "tests/missing.test.ts::whatever",
    };
    const report = run([spec("SPEC-0001", { criteria: [broken] })]);
    expect(report.findings.some((f) => f.severity === "error")).toBe(true);
    expect(report.grades.get("SPEC-0001")).not.toBe("A");
  });
});
