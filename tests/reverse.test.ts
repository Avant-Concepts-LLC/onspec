import { describe, expect, it } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  materializeDrafts,
  nextSpecNumber,
  slugify,
  validateDraftEvidence,
  type DraftSpec,
} from "../src/reverse.js";
import { parseSpec } from "../src/spec.js";
import type { Spec } from "../src/types.js";

function tmpRepo(files: Record<string, string>): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "onspec-rev-"));
  for (const [rel, content] of Object.entries(files)) {
    const full = path.join(dir, rel);
    fs.mkdirSync(path.dirname(full), { recursive: true });
    fs.writeFileSync(full, content);
  }
  return dir;
}

function draft(overrides: Partial<DraftSpec> = {}): DraftSpec {
  return {
    title: "Export behavior",
    covers: ["src/**"],
    rationale: "Because reasons.",
    criteria: [
      {
        text: "exports records",
        verify: "test",
        evidence: "test/export.test.ts::exports records",
      },
    ],
    invariants: [],
    non_goals: [],
    ...overrides,
  };
}

const repoFiles = { "test/export.test.ts": 'it("exports records", () => {})' };

describe("validateDraftEvidence", () => {
  it("keeps evidence that resolves against the repo", () => {
    const d = draft();
    const issues = validateDraftEvidence(tmpRepo(repoFiles), d);
    expect(issues).toEqual([]);
    expect(d.criteria[0].evidence).toBeDefined();
  });

  it("strips evidence pointing at a nonexistent test", () => {
    const d = draft({
      criteria: [
        { text: "x", verify: "test", evidence: "test/export.test.ts::hallucinated test" },
      ],
    });
    const issues = validateDraftEvidence(tmpRepo(repoFiles), d);
    expect(issues).toHaveLength(1);
    expect(issues[0].problem).toContain("not found");
    expect(d.criteria[0].evidence).toBeUndefined();
  });

  it("strips evidence pointing at a nonexistent file", () => {
    const d = draft({
      criteria: [{ text: "x", verify: "test", evidence: "test/nope.test.ts::whatever" }],
    });
    const issues = validateDraftEvidence(tmpRepo(repoFiles), d);
    expect(issues[0].problem).toContain("does not exist");
    expect(d.criteria[0].evidence).toBeUndefined();
  });

  it("strips assertion evidence whose snippet is absent", () => {
    const d = draft({
      criteria: [{ text: "x", verify: "assertion", evidence: "test/export.test.ts#no such snippet" }],
    });
    expect(validateDraftEvidence(tmpRepo(repoFiles), d)).toHaveLength(1);
  });
});

describe("nextSpecNumber", () => {
  const spec = (id: string): Spec => ({
    id,
    title: id,
    status: "approved",
    covers: ["x"],
    criteria: [{ id: "C1", text: "x", verify: "manual" }],
    invariants: [],
    nonGoals: [],
    body: "",
    path: "specs/x.spec.md",
  });

  it("continues after the highest existing id", () => {
    expect(nextSpecNumber([spec("SPEC-0002"), spec("SPEC-0011")])).toBe(12);
    expect(nextSpecNumber([])).toBe(1);
  });
});

describe("slugify", () => {
  it("builds filesystem-safe slugs", () => {
    expect(slugify("Custom mergers & function-merge variants!")).toBe(
      "custom-mergers-function-merge-variants",
    );
    expect(slugify("???")).toBe("spec");
  });
});

describe("materializeDrafts", () => {
  it("writes drafts that round-trip through the spec parser with status draft", () => {
    const repo = tmpRepo(repoFiles);
    const result = materializeDrafts(repo, [draft()], []);
    expect(result.written).toEqual([path.join("specs", "export-behavior.spec.md")]);
    expect(result.anchored).toBe(1);
    const parsed = parseSpec(fs.readFileSync(path.join(repo, result.written[0]), "utf8"), result.written[0]);
    expect(parsed.id).toBe("SPEC-0001");
    expect(parsed.status).toBe("draft");
    expect(parsed.criteria[0]).toMatchObject({
      id: "C1",
      evidence: "test/export.test.ts::exports records",
    });
  });

  it("counts stripped pointers and keeps the criterion as a test gap", () => {
    const repo = tmpRepo(repoFiles);
    const bad = draft({
      criteria: [{ text: "x", verify: "test", evidence: "test/export.test.ts::hallucinated" }],
    });
    const result = materializeDrafts(repo, [bad], []);
    expect(result.issues).toHaveLength(1);
    expect(result.anchored).toBe(0);
    expect(result.criteria).toBe(1);
    const parsed = parseSpec(fs.readFileSync(path.join(repo, result.written[0]), "utf8"), result.written[0]);
    expect(parsed.criteria[0].evidence).toBeUndefined();
  });
});
