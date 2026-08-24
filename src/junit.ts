import fs from "node:fs";
import { XMLParser } from "fast-xml-parser";
import type { TestResult } from "./types.js";

/**
 * Parse a JUnit XML report (the lingua franca every CI test runner can emit)
 * into a flat list of test results. Handles single <testsuite> roots,
 * <testsuites> wrappers, and nested suites.
 */
export function parseJUnit(xmlPath: string): TestResult[] {
  const xml = fs.readFileSync(xmlPath, "utf8");
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "@_",
    isArray: (name) => name === "testsuite" || name === "testcase",
  });
  const doc = parser.parse(xml);
  const suites: any[] = [
    ...(doc.testsuites?.testsuite ?? []),
    ...(doc.testsuite ?? []),
  ];
  const results: TestResult[] = [];
  const visit = (suite: any) => {
    for (const tc of suite.testcase ?? []) {
      const status: TestResult["status"] =
        tc.failure !== undefined || tc.error !== undefined
          ? "failed"
          : tc.skipped !== undefined
            ? "skipped"
            : "passed";
      const failure = tc.failure ?? tc.error;
      results.push({
        name: String(tc["@_name"] ?? ""),
        classname: tc["@_classname"] ? String(tc["@_classname"]) : undefined,
        file: tc["@_file"] ? String(tc["@_file"]) : undefined,
        status,
        message:
          typeof failure === "object" && failure !== null
            ? String((Array.isArray(failure) ? failure[0] : failure)?.["@_message"] ?? "")
            : undefined,
      });
    }
    for (const nested of suite.testsuite ?? []) visit(nested);
  };
  for (const suite of suites) visit(suite);
  return results;
}

/**
 * Find the result for a `path/to/test.file::test name` evidence pointer.
 * Matching is deliberately lenient: runners prefix test names with describe
 * blocks and report file paths differently, so we match on name
 * containment plus (when available) file/classname containment.
 */
export function findTestResult(results: TestResult[], evidence: string): TestResult | undefined {
  const [file, testName] = splitTestEvidence(evidence);
  const candidates = results.filter((r) => r.name === testName || r.name.endsWith(testName) || r.name.includes(testName));
  if (candidates.length === 0) return undefined;
  if (!file) return candidates[0];
  const fileMatch = candidates.filter(
    (r) =>
      (r.file && (r.file.endsWith(file) || file.endsWith(r.file))) ||
      (r.classname && (r.classname.endsWith(file) || file.endsWith(r.classname))),
  );
  return fileMatch[0] ?? candidates[0];
}

export function splitTestEvidence(evidence: string): [string, string] {
  const idx = evidence.indexOf("::");
  if (idx === -1) return ["", evidence];
  return [evidence.slice(0, idx), evidence.slice(idx + 2)];
}
