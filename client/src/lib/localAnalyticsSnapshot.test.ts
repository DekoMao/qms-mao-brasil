import { describe, expect, it } from "vitest";
import { createLocalAnalyticsSnapshot } from "./localAnalyticsSnapshot";

describe("local analytics snapshot", () => {
  it("keeps the same key for the same tenant, filters and aggregates", () => {
    const input = { tenantId: 1, dateFrom: "2026-09-01", dateTo: "2026-09-30", stats: { total: 10 }, capturedAt: "2026-09-25T12:00:00.000Z" };
    expect(createLocalAnalyticsSnapshot(input).id).toBe(createLocalAnalyticsSnapshot(input).id);
  });

  it("changes the key when tenant or period changes", () => {
    const base = { tenantId: 1, dateFrom: "2026-09-01", stats: { total: 10 }, capturedAt: "2026-09-25T12:00:00.000Z" };
    expect(createLocalAnalyticsSnapshot(base).id).not.toBe(createLocalAnalyticsSnapshot({ ...base, tenantId: 2 }).id);
    expect(createLocalAnalyticsSnapshot(base).id).not.toBe(createLocalAnalyticsSnapshot({ ...base, dateFrom: "2026-08-01" }).id);
  });
});
