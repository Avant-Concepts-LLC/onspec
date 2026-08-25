import { describe, expect, it } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { findTestResult, parseJUnit, splitTestEvidence } from "../src/junit.js";

const JUNIT = `<?xml version="1.0" encoding="UTF-8"?>
<testsuites name="vitest" tests="3" failures="1">
  <testsuite name="tests/export.test.ts" tests="3" failures="1">
    <testcase classname="tests/export.test.ts" name="export &gt; includes archived records" time="0.01"/>
    <testcase classname="tests/export.test.ts" name="export &gt; default excludes archived" time="0.01">
      <failure message="expected [] to have length 0">assertion failed</failure>
    </testcase>
    <testcase classname="tests/export.test.ts" name="export &gt; skipped case" time="0">
      <skipped/>
    </testcase>
  </testsuite>
</testsuites>
`;

function writeJUnit(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "onspec-junit-"));
  const file = path.join(dir, "results.xml");
  fs.writeFileSync(file, JUNIT);
  return file;
}

describe("parseJUnit", () => {
  it("parses statuses from a junit report", () => {
    const results = parseJUnit(writeJUnit());
    expect(results).toHaveLength(3);
    expect(results[0]).toMatchObject({ status: "passed" });
    expect(results[1]).toMatchObject({ status: "failed", message: "expected [] to have length 0" });
    expect(results[2]).toMatchObject({ status: "skipped" });
  });
});

describe("findTestResult", () => {
  it("matches evidence pointers to results by name containment and file", () => {
    const results = parseJUnit(writeJUnit());
    const hit = findTestResult(results, "tests/export.test.ts::includes archived records");
    expect(hit?.status).toBe("passed");
    const miss = findTestResult(results, "tests/export.test.ts::does not exist");
    expect(miss).toBeUndefined();
  });
});

describe("splitTestEvidence", () => {
  it("splits file and test name on ::", () => {
    expect(splitTestEvidence("a/b.test.ts::name with :: inside")).toEqual([
      "a/b.test.ts",
      "name with :: inside",
    ]);
    expect(splitTestEvidence("just a name")).toEqual(["", "just a name"]);
  });
});
