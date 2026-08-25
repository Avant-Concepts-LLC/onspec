import { describe, expect, it } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { loadConfig } from "../src/config.js";

describe("loadConfig", () => {
  it("defaults apply when config file is absent", () => {
    const repo = fs.mkdtempSync(path.join(os.tmpdir(), "onspec-cfg-"));
    expect(loadConfig(repo)).toEqual({ specDir: "specs", code: ["src/**"], base: "HEAD~1" });
  });

  it("merges partial config with defaults", () => {
    const repo = fs.mkdtempSync(path.join(os.tmpdir(), "onspec-cfg-"));
    fs.writeFileSync(
      path.join(repo, "onspec.config.json"),
      JSON.stringify({ code: ["lib/**", "app/**"] }),
    );
    expect(loadConfig(repo)).toEqual({ specDir: "specs", code: ["lib/**", "app/**"], base: "HEAD~1" });
  });
});
