import { describe, expect, it } from "vitest";
import { governingSpecs, uncoveredFiles } from "../src/covers.js";
import type { Spec } from "../src/types.js";

function spec(id: string, covers: string[]): Spec {
  return {
    id,
    title: id,
    status: "approved",
    covers,
    criteria: [{ id: "C1", text: "x", verify: "manual" }],
    invariants: [],
    nonGoals: [],
    body: "",
    path: `specs/${id}.spec.md`,
  };
}

describe("covers", () => {
  it("maps changed files to governing specs", () => {
    const exportSpec = spec("SPEC-0001", ["src/export/**"]);
    const authSpec = spec("SPEC-0002", ["src/auth/**"]);
    const governed = governingSpecs(
      [exportSpec, authSpec],
      ["src/export/csv.ts", "src/export/json.ts", "README.md"],
    );
    expect(governed.get(exportSpec)).toEqual(["src/export/csv.ts", "src/export/json.ts"]);
    expect(governed.has(authSpec)).toBe(false);
  });

  it("reports files no spec covers", () => {
    const uncovered = uncoveredFiles([spec("SPEC-0001", ["src/export/**"])], [
      "src/export/csv.ts",
      "src/billing/invoice.ts",
    ]);
    expect(uncovered).toEqual(["src/billing/invoice.ts"]);
  });
});
