import { describe, expect, it } from "vitest";
import { renderVerifyMarkdown } from "../src/report.js";
import type { CriterionVerdict, Spec } from "../src/types.js";
import type { VerifyReport } from "../src/verify.js";

const spec: Spec = {
  id: "SPEC-0042",
  title: "CSV export includes archived records",
  status: "approved",
  covers: ["src/export/**"],
  criteria: [],
  invariants: [],
  nonGoals: [],
  body: "",
  path: "specs/export.spec.md",
};

describe("renderVerifyMarkdown", () => {
  it("markdown report includes a row per criterion", () => {
    const verdicts: CriterionVerdict[] = [
      {
        spec,
        criterion: { id: "C1", text: "archived included", verify: "test", evidence: "t.ts::a" },
        verdict: "met",
        reason: "test passed",
        evidenceRef: "t.ts::a",
        source: "test-result",
      },
      {
        spec,
        criterion: { id: "C2", text: "default excludes", verify: "test", evidence: "t.ts::b" },
        verdict: "unmet",
        reason: "test failed",
        evidenceRef: "t.ts::b",
        source: "test-result",
      },
    ];
    const report: VerifyReport = {
      verdicts,
      governed: new Map([[spec, ["src/export/csv.ts"]]]),
    };
    const md = renderVerifyMarkdown(report);
    expect(md).toContain("SPEC-0042");
    expect(md).toContain("| **C1**");
    expect(md).toContain("| **C2**");
    expect(md).toContain("✅ met");
    expect(md).toContain("❌ unmet");
    expect(md).toContain("1 met · 1 unmet");
  });
});
