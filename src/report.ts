import pc from "picocolors";
import type { CriterionVerdict, DriftFinding, LintFinding, Verdict } from "./types.js";
import type { VerifyReport } from "./verify.js";
import type { LintReport } from "./lint.js";

const VERDICT_ICON: Record<Verdict, string> = {
  met: "✅",
  unmet: "❌",
  uncertain: "❓",
  manual: "👁️",
};

function color(verdict: Verdict, text: string): string {
  switch (verdict) {
    case "met": return pc.green(text);
    case "unmet": return pc.red(text);
    case "uncertain": return pc.yellow(text);
    case "manual": return pc.magenta(text);
  }
}

export function renderVerifyTerminal(report: VerifyReport): string {
  if (report.verdicts.length === 0) {
    return pc.dim("No governing specs for this change.");
  }
  const lines: string[] = [];
  let currentSpec = "";
  for (const v of report.verdicts) {
    if (v.spec.id !== currentSpec) {
      currentSpec = v.spec.id;
      const files = report.governed.get(v.spec) ?? [];
      lines.push("");
      lines.push(pc.bold(`${v.spec.id} — ${v.spec.title}`) + pc.dim(` (${v.spec.path})`));
      if (files.length > 0) lines.push(pc.dim(`  governs: ${files.join(", ")}`));
    }
    lines.push(
      `  ${VERDICT_ICON[v.verdict]} ${color(v.verdict, v.verdict.padEnd(9))} ${v.criterion.id}  ${v.criterion.text}`,
    );
    lines.push(pc.dim(`     ${v.reason}${v.evidenceRef ? `  [${v.evidenceRef}]` : ""}`));
  }
  lines.push("");
  lines.push(summaryLine(report.verdicts));
  return lines.join("\n");
}

export function renderVerifyMarkdown(report: VerifyReport): string {
  const lines: string[] = ["## Spec conformance", ""];
  if (report.verdicts.length === 0) {
    lines.push("No governing specs for this change.");
    return lines.join("\n");
  }
  for (const [spec, files] of report.governed) {
    lines.push(`### ${spec.id} — ${spec.title}`);
    if (files.length > 0) lines.push(`_Governs: ${files.map((f) => `\`${f}\``).join(", ")}_`);
    lines.push("");
    lines.push("| Criterion | Verdict | Evidence |");
    lines.push("|---|---|---|");
    for (const v of report.verdicts.filter((x) => x.spec === spec)) {
      const evidence = v.evidenceRef ? `\`${v.evidenceRef}\`` : "—";
      lines.push(
        `| **${v.criterion.id}** ${escapeCell(v.criterion.text)} | ${VERDICT_ICON[v.verdict]} ${v.verdict}<br>${escapeCell(v.reason)} | ${evidence} |`,
      );
    }
    lines.push("");
  }
  lines.push(summaryLine(report.verdicts, false));
  return lines.join("\n");
}

function summaryLine(verdicts: CriterionVerdict[], colored = true): string {
  const count = (v: Verdict) => verdicts.filter((x) => x.verdict === v).length;
  const parts = [
    `${count("met")} met`,
    `${count("unmet")} unmet`,
    `${count("uncertain")} uncertain`,
    `${count("manual")} manual`,
  ];
  const text = `Summary: ${parts.join(" · ")} (${verdicts.length} criteria)`;
  if (!colored) return `**${text}**`;
  return count("unmet") > 0 ? pc.red(pc.bold(text)) : pc.bold(text);
}

export function renderDrift(findings: DriftFinding[], markdown = false): string {
  if (findings.length === 0) {
    return markdown ? "## Drift check\n\nNo drift detected." : pc.green("No drift detected.");
  }
  const lines: string[] = markdown ? ["## Drift check", ""] : [];
  for (const f of findings) {
    const tag = `[${f.kind}]`;
    lines.push(markdown ? `- ⚠️ **${tag}** ${f.message}` : `${pc.yellow("⚠")} ${pc.bold(tag)} ${f.message}`);
  }
  if (!markdown) lines.push(pc.red(pc.bold(`${findings.length} drift finding(s)`)));
  return lines.join("\n");
}

export function renderLint(report: LintReport, markdown = false): string {
  const lines: string[] = markdown ? ["## Spec lint", ""] : [];
  for (const [specId, grade] of report.grades) {
    const label = `${specId}: readiness ${grade}`;
    lines.push(markdown ? `- **${label}**` : pc.bold(gradeColor(grade, label)));
    for (const f of report.findings.filter((x) => x.specId === specId)) {
      lines.push(markdown ? `  - ${f.severity}: ${f.message}` : `  ${severityColor(f)}`);
    }
  }
  const orphans = report.findings.filter((f) => !f.specId);
  for (const f of orphans) {
    lines.push(markdown ? `- error in ${f.specPath}: ${f.message}` : pc.red(`✖ ${f.specPath}: ${f.message}`));
  }
  if (lines.length === (markdown ? 2 : 0)) lines.push(markdown ? "No specs found." : pc.dim("No specs found."));
  return lines.join("\n");
}

function gradeColor(grade: string, text: string): string {
  if (grade === "A" || grade === "B") return pc.green(text);
  if (grade === "C") return pc.yellow(text);
  return pc.red(text);
}

function severityColor(f: LintFinding): string {
  switch (f.severity) {
    case "error": return pc.red(`✖ ${f.message}`);
    case "warning": return pc.yellow(`⚠ ${f.message}`);
    case "info": return pc.dim(`ℹ ${f.message}`);
  }
}

function escapeCell(text: string): string {
  return text.replace(/\|/g, "\\|").replace(/\n/g, " ");
}
