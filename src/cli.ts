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
  buildPrompt,
  draftWithLlm,
  draftsSchema,
  gatherFiles,
  materializeDrafts,
} from "./reverse.js";
import {
  renderDrift,
  renderLint,
  renderVerifyMarkdown,
  renderVerifyTerminal,
} from "./report.js";

const program = new Command();

program
  .name("onspec")
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

program
  .command("reverse")
  .description("Reverse-generate draft specs from existing code and tests (the brownfield on-ramp)")
  .option("--code <globs...>", "source globs to spec (default: config code globs)")
  .option("--tests <globs...>", "test globs to mine for evidence anchors", ["test/**", "tests/**", "src/**/*.test.*", "src/**/*.spec.*"])
  .option("--from-json <file>", "skip the built-in LLM call; read drafts (JSON, draftsSchema shape) produced by an outside agent")
  .option("--prompt-only", "print the drafting prompt and exit (for driving an outside agent)", false)
  .option("-m, --model <model>", "model for the built-in drafting call", DEFAULT_MODEL)
  .action(async (opts) => {
    const repoRoot = repoRootFrom(process.cwd());
    const config = loadConfig(repoRoot);
    const codeFiles = gatherFiles(repoRoot, opts.code ?? config.code);
    const testFiles = gatherFiles(repoRoot, opts.tests);
    if (codeFiles.length === 0) {
      console.error(pc.red("no source files matched — pass --code <globs...>"));
      process.exit(2);
    }
    if (opts.promptOnly) {
      console.log(buildPrompt(codeFiles, testFiles));
      return;
    }
    let drafts;
    if (opts.fromJson) {
      drafts = draftsSchema.parse(JSON.parse(fs.readFileSync(opts.fromJson, "utf8"))).specs;
    } else {
      if (!llmAvailable()) {
        console.error(
          pc.red(
            "no ANTHROPIC_API_KEY found. Either set one, or drive an agent with `onspec reverse --prompt-only` and feed its JSON back via --from-json.",
          ),
        );
        process.exit(2);
      }
      drafts = await draftWithLlm(codeFiles, testFiles, opts.model);
    }
    const { specs: existing } = loadSpecs(repoRoot, config.specDir);
    const result = materializeDrafts(repoRoot, drafts, existing, config.specDir);
    for (const file of result.written) console.log(`${pc.green("✔")} wrote ${file}`);
    for (const issue of result.issues) {
      console.log(
        pc.yellow(`⚠ stripped unverifiable evidence "${issue.evidence}" (${issue.problem}) — criterion kept as a test gap`),
      );
    }
    console.log(
      pc.bold(
        `${result.written.length} draft spec(s), ${result.criteria} criteria, ${result.anchored} anchored to existing tests, ${result.issues.length} hallucinated pointer(s) stripped`,
      ),
    );
    console.log(pc.dim("drafts are status: draft — review and approve via a normal PR, then run onspec verify"));
  });

program.parseAsync().catch((err) => {
  console.error(pc.red(err instanceof Error ? err.message : String(err)));
  process.exit(2);
});
