import { describe, expect, it } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { resolveEvidence } from "../src/evidence.js";
import type { Criterion, TestResult } from "../src/types.js";

function tmpRepo(files: Record<string, string>): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "speccheck-"));
  for (const [rel, content] of Object.entries(files)) {
    const full = path.join(dir, rel);
    fs.mkdirSync(path.dirname(full), { recursive: true });
    fs.writeFileSync(full, content);
  }
  return dir;
}

const testCriterion: Criterion = {
  id: "C1",
  text: "archived records included",
  verify: "test",
  evidence: "tests/export.test.ts::includes archived records",
};

const repoWithTest = () =>
  tmpRepo({ "tests/export.test.ts": 'it("includes archived records", () => {})' });

describe("test evidence", () => {
  it("passing test result yields met", () => {
    const results: TestResult[] = [
      { name: "export > includes archived records", status: "passed" },
    ];
    const outcome = resolveEvidence(repoWithTest(), testCriterion, results);
    expect(outcome.verdict).toBe("met");
    expect(outcome.source).toBe("test-result");
    expect(outcome.needsLlm).toBe(false);
  });

  it("failing test result yields unmet", () => {
    const results: TestResult[] = [
      { name: "export > includes archived records", status: "failed", message: "expected 3, got 2" },
    ];
    const outcome = resolveEvidence(repoWithTest(), testCriterion, results);
    expect(outcome.verdict).toBe("unmet");
    expect(outcome.reason).toContain("expected 3, got 2");
  });

  it("missing test file yields unmet", () => {
    const outcome = resolveEvidence(tmpRepo({}), testCriterion, []);
    expect(outcome.verdict).toBe("unmet");
    expect(outcome.reason).toContain("does not exist");
  });

  it("existing test without results yields uncertain", () => {
    const outcome = resolveEvidence(repoWithTest(), testCriterion, undefined);
    expect(outcome.verdict).toBe("uncertain");
    expect(outcome.reason).toContain("no test results");
  });
});

describe("assertion evidence", () => {
  it("assertion evidence is met when the file contains the snippet", () => {
    const repo = tmpRepo({ "src/config.ts": 'export const FORMAT = "RFC4180";' });
    const criterion: Criterion = {
      id: "C2",
      text: "export format is RFC 4180",
      verify: "assertion",
      evidence: 'src/config.ts#FORMAT = "RFC4180"',
    };
    expect(resolveEvidence(repo, criterion, undefined).verdict).toBe("met");
    const absent: Criterion = { ...criterion, evidence: "src/config.ts#FORMAT = 'CSV'" };
    expect(resolveEvidence(repo, absent, undefined).verdict).toBe("unmet");
  });
});

describe("manual and missing evidence", () => {
  it("manual criteria yield a manual verdict", () => {
    const criterion: Criterion = { id: "C3", text: "UX feels right", verify: "manual" };
    const outcome = resolveEvidence(tmpRepo({}), criterion, undefined);
    expect(outcome.verdict).toBe("manual");
    expect(outcome.needsLlm).toBe(false);
  });

  it("criteria without evidence are routed to LLM assessment", () => {
    const criterion: Criterion = { id: "C4", text: "errors are logged", verify: "test" };
    const outcome = resolveEvidence(tmpRepo({}), criterion, undefined);
    expect(outcome.verdict).toBe("uncertain");
    expect(outcome.needsLlm).toBe(true);
  });
});
