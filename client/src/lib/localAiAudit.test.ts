import { describe, expect, it } from "vitest";
import { formatFilterLabel } from "./localAiAudit";

describe("local AI audit", () => {
  it("formats an unfiltered snapshot without content", () => {
    expect(formatFilterLabel({})).toBe("Todo o período");
  });

  it("formats the active date range", () => {
    expect(formatFilterLabel({ dateFrom: "2026-01-01", dateTo: "2026-01-31" })).toBe("2026-01-01 → 2026-01-31");
  });
});
