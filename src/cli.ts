#!/usr/bin/env node
import fs from "node:fs";
import { execFileSync } from "node:child_process";
import { Command } from "commander";
import pc from "picocolors";
import { loadConfig } from "./config.js";
import { loadSpecs } from "./spec.js";
import { changedFiles, diffText, refExists, repoRootFrom } from "./git.js";
import { parseJUnit } from "./junit.js";
import { verify } from "./verify.js";
import { detectDrift } from "./drift.js";
import { lint } from "./lint.js";
import { llmAvailable, DEFAULT_MODEL } from "./llm.js";
import {
  renderDrift,
  renderLint,
  renderVerifyMarkdown,
  renderVerifyTerminal,
} from "./report.js";

const program = new Command();

program
  .name("speccheck")
  .description("Git-native verification layer for spec-driven development. Specs that refuse to drift.")
  .version("0.1.0");

interface CommonOpts {
  base?: string;
  head?: string;
  format: string;
  output?: string;
  strict: boolean;
}

function setup(opts: { base?: string; head?: string }) {
  const repoRoot = repoRootFrom(process.cwd());
  const config = loadConfig(repoRoot);
  const base = opts.base ?? config.base;
  if (!refExists(repoRoot, base)) {
    console.error(pc.red(`base ref "${base}" does not exist in this repository`));
    process.exit(2);
  }
  const files = changedFiles(repoRoot, base, opts.head);
  const { specs, errors } = loadSpecs(repoRoot, config.specDir);
  for (const err of errors) {
    console.error(pc.red(`spec parse error in ${err.path}: ${err.message}`));
  }
  return { repoRoot, config, base, files, specs, errors };
}

function emit(text: string, opts: CommonOpts) {
  if (opts.output) {
    fs.writeFileSync(opts.output, text);
    console.log(pc.dim(`report written to ${opts.output}`));
  } else {
    console.log(text);
  }
}

program
  .command("verify")
  .description("Check the current change against its governing specs, criterion by criterion")
  .option("-b, --base <ref>", "base git ref to diff against (default: config or HEAD~1)")
  .option("--head <ref>", "head ref (default: working tree)")
  .option("-t, --test-results <junit.xml>", "JUnit XML report to anchor test-evidence verdicts")
  .option("--all", "verify every spec, not just those governing the diff", false)
  .option("--no-llm", "skip LLM assessment for criteria without deterministic evidence")
  .option("-m, --model <model>", "model for LLM assessment", DEFAULT_MODEL)
  .option("-f, --format <fmt>", "terminal | markdown", "terminal")
  .option("-o, --output <file>", "write report to a file instead of stdout")
  .option("--strict", "exit 1 when any criterion is unmet", false)
  .action(async (opts) => {
    const { repoRoot, files, specs } = setup(opts);
    const testResults = opts.testResults ? parseJUnit(opts.testResults) : undefined;
    if (opts.llm && !llmAvailable()) {
      console.error(
        pc.dim("note: no ANTHROPIC_API_KEY found — criteria without deterministic evidence will be uncertain"),
      );
    }
    const diff = diffText(repoRoot, opts.base ?? loadConfig(repoRoot).base, opts.head);
    const report = await verify({
      repoRoot,
      specs,
      changedFiles: files,
      diff,
      testResults,
      useLlm: opts.llm,
      model: opts.model,
      all: opts.all,
    });
    emit(
      opts.format === "markdown" ? renderVerifyMarkdown(report) : renderVerifyTerminal(report),
      opts,
    );
    const unmet = report.verdicts.filter((v) => v.verdict === "unmet").length;
    if (opts.strict && unmet > 0) process.exit(1);
  });

program
  .command("drift")
  .description("Flag changed code with no approved governing spec")
  .option("-b, --base <ref>", "base git ref to diff against (default: config or HEAD~1)")
  .option("--head <ref>", "head ref (default: working tree)")
  .option("-f, --format <fmt>", "terminal | markdown", "terminal")
  .option("-o, --output <file>", "write report to a file instead of stdout")
  .option("--strict", "exit 1 when drift is found", false)
  .action((opts) => {
    const { config, files, specs } = setup(opts);
    const findings = detectDrift({ specs, changedFiles: files, codeGlobs: config.code });
    emit(renderDrift(findings, opts.format === "markdown"), opts);
    if (opts.strict && findings.length > 0) process.exit(1);
  });

program
  .command("lint")
  .description("Grade specs for agent-executability and verifiability")
  .option("-f, --format <fmt>", "terminal | markdown", "terminal")
  .option("-o, --output <file>", "write report to a file instead of stdout")
  .option("--strict", "exit 1 on any lint error", false)
  .action((opts) => {
    const repoRoot = repoRootFrom(process.cwd());
    const config = loadConfig(repoRoot);
    const { specs, errors } = loadSpecs(repoRoot, config.specDir);
    const repoFiles = execFileSync("git", ["ls-files"], { cwd: repoRoot, encoding: "utf8" })
      .split("\n")
      .filter(Boolean);
    const report = lint({ repoRoot, specs, parseErrors: errors, repoFiles });
    emit(renderLint(report, opts.format === "markdown"), opts);
    const hasErrors = report.findings.some((f) => f.severity === "error");
    if (opts.strict && hasErrors) process.exit(1);
  });

program.parseAsync().catch((err) => {
  console.error(pc.red(err instanceof Error ? err.message : String(err)));
  process.exit(2);
});
