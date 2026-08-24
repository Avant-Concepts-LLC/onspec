import { describe, expect, it } from "vitest";
import { detectDrift } from "../src/drift.js";
import type { Spec, SpecStatus } from "../src/types.js";

function spec(id: string, covers: string[], status: SpecStatus = "approved"): Spec {
  return {
    id,
    title: id,
    status,
    covers,
    criteria: [{ id: "C1", text: "x", verify: "manual" }],
    invariants: [],
    nonGoals: [],
    body: "",
    path: `specs/${id}.spec.md`,
  };
}

describe("detectDrift", () => {
  it("flags unspecced changes", () => {
    const findings = detectDrift({
      specs: [spec("SPEC-0001", ["src/export/**"])],
      changedFiles: ["src/billing/invoice.ts"],
      codeGlobs: ["src/**"],
    });
    expect(findings).toHaveLength(1);
    expect(findings[0]).toMatchObject({ kind: "unspecced-change", file: "src/billing/invoice.ts" });
  });

  it("flags stale approvals", () => {
    const findings = detectDrift({
      specs: [spec("SPEC-0001", ["src/export/**"], "draft")],
      changedFiles: ["src/export/csv.ts"],
      codeGlobs: ["src/**"],
    });
    expect(findings).toHaveLength(1);
    expect(findings[0]).toMatchObject({ kind: "stale-approval", specId: "SPEC-0001" });
  });

  it("flags coverage that is only superseded", () => {
    const findings = detectDrift({
      specs: [spec("SPEC-0001", ["src/export/**"], "superseded")],
      changedFiles: ["src/export/csv.ts"],
      codeGlobs: ["src/**"],
    });
    expect(findings[0]).toMatchObject({ kind: "superseded-coverage" });
  });

  it("ignores files outside code globs", () => {
    const findings = detectDrift({
      specs: [],
      changedFiles: ["README.md", "docs/notes.md"],
      codeGlobs: ["src/**"],
    });
    expect(findings).toEqual([]);
  });

  it("stays quiet when an approved spec covers the change", () => {
    const findings = detectDrift({
      specs: [spec("SPEC-0001", ["src/export/**"])],
      changedFiles: ["src/export/csv.ts"],
      codeGlobs: ["src/**"],
    });
    expect(findings).toEqual([]);
  });
});
