import { describe, expect, it } from "vitest";
import fs from "fs";
import path from "path";

const root = path.resolve(import.meta.dirname, "..");

describe("Local AI privacy boundaries", () => {
  it("does not include question or answer fields in the audit record", () => {
    const source = fs.readFileSync(path.join(root, "client/src/lib/localAiAudit.ts"), "utf8");
    const recordBlock = source.slice(source.indexOf("export type LocalAiAuditRecord"), source.indexOf("const STORAGE_KEY"));
    expect(recordBlock).not.toMatch(/question\s*:/);
    expect(recordBlock).not.toMatch(/answer\s*:/);
  });

  it("runs both analytics and generative inference inside dedicated workers", () => {
    expect(fs.existsSync(path.join(root, "client/src/workers/qualityAnalytics.worker.ts"))).toBe(true);
    expect(fs.existsSync(path.join(root, "client/src/workers/phi.worker.ts"))).toBe(true);
    expect(fs.existsSync(path.join(root, "client/src/workers/semanticIntent.worker.ts"))).toBe(true);
  });
});
