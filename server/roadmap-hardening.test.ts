import { describe, expect, it } from "vitest";
import fs from "fs";
import path from "path";

const root = path.join(__dirname, "..");
const read = (relativePath: string) => fs.readFileSync(path.join(root, relativePath), "utf-8");

describe("Roadmap hardening deliverables", () => {
  it("exposes recurrenceAnalysis and a dedicated page route", () => {
    const routers = read("server/routers.ts");
    const app = read("client/src/App.tsx");
    expect(routers).toContain("recurrenceAnalysis:");
    expect(app).toContain("RecurrenceAnalysis");
    expect(fs.existsSync(path.join(root, "client/src/pages/RecurrenceAnalysis.tsx"))).toBe(true);
  });

  it("associates image URLs and data URIs from Evidence during import", () => {
    const routers = read("server/routers.ts");
    const importPage = read("client/src/pages/Import.tsx");
    expect(routers).toContain("attachImportedImageEvidence");
    expect(routers).toContain("evidenceCount");
    expect(routers).toContain("data:image/");
    expect(importPage).toContain("evidências associadas");
  });

  it("keeps explicit score trend sparkline coverage in the supplier scorecard", () => {
    const scorecard = read("client/src/pages/SupplierScorecard.tsx");
    expect(scorecard).toContain("function SupplierScoreSparkline");
    expect(scorecard).toContain("<SupplierScoreSparkline");
    expect(scorecard).toContain("dataKey=\"score\"");
  });

  it("ships the four enterprise documentation pages", () => {
    for (const file of ["docs/tenancy.md", "docs/integrations/rest-api.md", "docs/push.md", "docs/bi.md"]) {
      expect(fs.existsSync(path.join(root, file))).toBe(true);
      expect(fs.readFileSync(path.join(root, file), "utf-8").length).toBeGreaterThan(200);
    }
  });
});
