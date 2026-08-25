import { describe, expect, it } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { loadSpecs, parseSpec } from "../src/spec.js";

const VALID = `---
id: SPEC-0042
title: CSV export includes archived records
status: approved
covers:
  - src/export/**
criteria:
  - id: C1
    text: Archived records appear when include_archived=true
    verify: test
    evidence: tests/export.test.ts::includes archived
invariants:
  - Export stays RFC 4180 compliant
non_goals:
  - Bulk archive operations
---
Context body here.
`;

function tmpRepo(files: Record<string, string>): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "onspec-"));
  for (const [rel, content] of Object.entries(files)) {
    const full = path.join(dir, rel);
    fs.mkdirSync(path.dirname(full), { recursive: true });
    fs.writeFileSync(full, content);
  }
  return dir;
}

describe("parseSpec", () => {
  it("parses a valid spec file", () => {
    const spec = parseSpec(VALID, "specs/export.spec.md");
    expect(spec.id).toBe("SPEC-0042");
    expect(spec.status).toBe("approved");
    expect(spec.covers).toEqual(["src/export/**"]);
    expect(spec.criteria).toHaveLength(1);
    expect(spec.criteria[0]).toMatchObject({ id: "C1", verify: "test" });
    expect(spec.invariants).toEqual(["Export stays RFC 4180 compliant"]);
    expect(spec.nonGoals).toEqual(["Bulk archive operations"]);
    expect(spec.body).toBe("Context body here.");
  });

  it("rejects duplicate criterion ids", () => {
    const dup = VALID.replace(
      "evidence: tests/export.test.ts::includes archived",
      `evidence: tests/export.test.ts::includes archived
  - id: C1
    text: Something else
    verify: manual`,
    );
    expect(() => parseSpec(dup, "specs/export.spec.md")).toThrow(/duplicate criterion id C1/);
  });

  it("rejects malformed spec ids", () => {
    expect(() => parseSpec(VALID.replace("SPEC-0042", "SPEC42"), "s.spec.md")).toThrow();
  });
});

describe("loadSpecs", () => {
  it("collects parse errors without throwing", () => {
    const repo = tmpRepo({
      "specs/good.spec.md": VALID,
      "specs/bad.spec.md": "---\nid: nope\n---\nbroken",
    });
    const { specs, errors } = loadSpecs(repo);
    expect(specs).toHaveLength(1);
    expect(specs[0].id).toBe("SPEC-0042");
    expect(errors).toHaveLength(1);
    expect(errors[0].path).toContain("bad.spec.md");
  });

  it("rejects duplicate spec ids across files", () => {
    const repo = tmpRepo({
      "specs/a.spec.md": VALID,
      "specs/b.spec.md": VALID,
    });
    const { specs, errors } = loadSpecs(repo);
    expect(specs).toHaveLength(1);
    expect(errors).toHaveLength(1);
    expect(errors[0].message).toMatch(/duplicate spec id SPEC-0042/);
  });

  it("returns empty for a repo without a specs directory", () => {
    const repo = tmpRepo({});
    const { specs, errors } = loadSpecs(repo);
    expect(specs).toEqual([]);
    expect(errors).toEqual([]);
  });
});
