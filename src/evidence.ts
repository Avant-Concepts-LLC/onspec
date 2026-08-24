import fs from "node:fs";
import path from "node:path";
import type { Criterion, TestResult, Verdict } from "./types.js";
import { findTestResult, splitTestEvidence } from "./junit.js";

export interface EvidenceOutcome {
  verdict: Verdict;
  reason: string;
  evidenceRef?: string;
  source: "test-result" | "assertion" | "manual" | "missing";
  /** True when the deterministic layer couldn't decide and the LLM should try. */
  needsLlm: boolean;
}

/**
 * Deterministic evidence resolution — the first layer of the conformance
 * engine. If a criterion names a test and we have its result, that IS the
 * verdict; no LLM opinion involved.
 */
export function resolveEvidence(
  repoRoot: string,
  criterion: Criterion,
  testResults: TestResult[] | undefined,
): EvidenceOutcome {
  if (criterion.verify === "manual") {
    return {
      verdict: "manual",
      reason: criterion.evidence
        ? `manual verification: ${criterion.evidence}`
        : "manual verification with no procedure recorded",
      source: "manual",
      needsLlm: false,
    };
  }

  if (!criterion.evidence) {
    return {
      verdict: "uncertain",
      reason: "no evidence pointer on criterion",
      source: "missing",
      needsLlm: true,
    };
  }

  if (criterion.verify === "assertion") {
    return resolveAssertion(repoRoot, criterion.evidence);
  }

  // verify: test
  const [file, testName] = splitTestEvidence(criterion.evidence);
  const testFile = path.join(repoRoot, file);
  if (file && !fs.existsSync(testFile)) {
    return {
      verdict: "unmet",
      reason: `evidence test file ${file} does not exist`,
      evidenceRef: criterion.evidence,
      source: "missing",
      needsLlm: false,
    };
  }
  if (file && !fs.readFileSync(testFile, "utf8").includes(testName)) {
    return {
      verdict: "unmet",
      reason: `test "${testName}" not found in ${file}`,
      evidenceRef: criterion.evidence,
      source: "missing",
      needsLlm: false,
    };
  }

  if (testResults) {
    const result = findTestResult(testResults, criterion.evidence);
    if (!result) {
      return {
        verdict: "uncertain",
        reason: `test "${testName}" exists but is absent from the test results report`,
        evidenceRef: criterion.evidence,
        source: "test-result",
        needsLlm: false,
      };
    }
    if (result.status === "passed") {
      return {
        verdict: "met",
        reason: `test passed: ${result.name}`,
        evidenceRef: criterion.evidence,
        source: "test-result",
        needsLlm: false,
      };
    }
    if (result.status === "failed") {
      return {
        verdict: "unmet",
        reason: `test failed: ${result.name}${result.message ? ` — ${result.message}` : ""}`,
        evidenceRef: criterion.evidence,
        source: "test-result",
        needsLlm: false,
      };
    }
    return {
      verdict: "uncertain",
      reason: `test skipped: ${result.name}`,
      evidenceRef: criterion.evidence,
      source: "test-result",
      needsLlm: false,
    };
  }

  return {
    verdict: "uncertain",
    reason: `test "${testName}" exists but no test results were provided (pass --test-results <junit.xml>)`,
    evidenceRef: criterion.evidence,
    source: "test-result",
    needsLlm: false,
  };
}

/**
 * Assertion evidence: "path/to/file#literal snippet". Met iff the file
 * contains the snippet — a deterministic grep-anchor for criteria that a
 * test doesn't naturally cover (config values, exported constants, flags).
 */
function resolveAssertion(repoRoot: string, evidence: string): EvidenceOutcome {
  const idx = evidence.indexOf("#");
  if (idx === -1) {
    return {
      verdict: "uncertain",
      reason: `assertion evidence "${evidence}" is missing a #snippet part`,
      evidenceRef: evidence,
      source: "assertion",
      needsLlm: true,
    };
  }
  const file = evidence.slice(0, idx);
  const snippet = evidence.slice(idx + 1);
  const abs = path.join(repoRoot, file);
  if (!fs.existsSync(abs)) {
    return {
      verdict: "unmet",
      reason: `assertion file ${file} does not exist`,
      evidenceRef: evidence,
      source: "assertion",
      needsLlm: false,
    };
  }
  const found = fs.readFileSync(abs, "utf8").includes(snippet);
  return {
    verdict: found ? "met" : "unmet",
    reason: found
      ? `${file} contains "${snippet}"`
      : `${file} does not contain "${snippet}"`,
    evidenceRef: evidence,
    source: "assertion",
    needsLlm: false,
  };
}
