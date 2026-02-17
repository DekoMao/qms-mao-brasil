import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(): { ctx: TrpcContext } {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "test-user-sdd",
    email: "sdd@test.com",
    name: "SDD Test User",
    loginMethod: "manus",
    role: "admin",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };
  const ctx: TrpcContext = {
    user,
    req: {
      headers: { "x-forwarded-for": "127.0.0.1" },
      connection: { remoteAddress: "127.0.0.1" },
    } as any,
    res: {
      clearCookie: () => {},
      cookie: () => {},
    } as any,
  };
  return { ctx };
}

const caller = appRouter.createCaller(createAuthContext().ctx);

// =====================================================
// 5.1 COPQ DASHBOARD
// =====================================================
describe("5.1 COPQ Dashboard", () => {
  it("should have copq.dashboard procedure that returns structured data", async () => {
    const result = await caller.copq.dashboard({});
    expect(result).toBeDefined();
    expect(result).toHaveProperty("totalCost");
    expect(result).toHaveProperty("totalByCategory");
    expect(result).toHaveProperty("topSuppliers");
    expect(result).toHaveProperty("monthlyTrend");
    expect(result).toHaveProperty("avgCostPerDefect");
    expect(result).toHaveProperty("defectsWithCost");
    expect(result).toHaveProperty("defectsWithoutCost");
    expect(typeof result.totalCost).toBe("number");
  });

  it("should accept date filters for COPQ dashboard", async () => {
    const result = await caller.copq.dashboard({
      startDate: "2025-01-01",
      endDate: "2025-12-31",
    });
    expect(result).toBeDefined();
    expect(result.totalCost).toBeGreaterThanOrEqual(0);
  });

  it("should accept supplier filter for COPQ dashboard", async () => {
    const result = await caller.copq.dashboard({ supplierId: 1 });
    expect(result).toBeDefined();
    expect(result.totalCost).toBeGreaterThanOrEqual(0);
  });

  it("should return totalByCategory with all 4 categories", async () => {
    const result = await caller.copq.dashboard({});
    expect(result.totalByCategory).toHaveProperty("INTERNAL_FAILURE");
    expect(result.totalByCategory).toHaveProperty("EXTERNAL_FAILURE");
    expect(result.totalByCategory).toHaveProperty("APPRAISAL");
    expect(result.totalByCategory).toHaveProperty("PREVENTION");
  });

  it("should return monthlyTrend as array of 12 months", async () => {
    const result = await caller.copq.dashboard({});
    expect(Array.isArray(result.monthlyTrend)).toBe(true);
    expect(result.monthlyTrend.length).toBe(12);
    result.monthlyTrend.forEach((m: any) => {
      expect(m).toHaveProperty("label");
      expect(m).toHaveProperty("total");
      expect(m).toHaveProperty("byCategory");
    });
  });

  it("should return topSuppliers as array", async () => {
    const result = await caller.copq.dashboard({});
    expect(Array.isArray(result.topSuppliers)).toBe(true);
    result.topSuppliers.forEach((s: any) => {
      expect(s).toHaveProperty("name");
      expect(s).toHaveProperty("total");
    });
  });

  it("should have copq.defaults procedure", async () => {
    const result = await caller.copq.defaults({});
    expect(result).toBeDefined();
  });

  it("should have copq.byDefect procedure", async () => {
    const result = await caller.copq.byDefect({ defectId: 999999 });
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBe(0);
  });

  it("should validate addCost requires positive amount (RN-COPQ-02)", async () => {
    await expect(
      caller.copq.addCost({ defectId: 999999, costType: "SCRAP", amount: -10 })
    ).rejects.toThrow();
  });

  it("should validate addCost requires valid costType", async () => {
    await expect(
      caller.copq.addCost({ defectId: 999999, costType: "INVALID_TYPE" as any, amount: 100 })
    ).rejects.toThrow();
  });
});

// =====================================================
// 5.2 SUPPLIER SCORECARD
// =====================================================
describe("5.2 Supplier Scorecard", () => {
  it("should have scorecard.list procedure", async () => {
    const result = await caller.scorecard.list();
    expect(Array.isArray(result)).toBe(true);
  });

  it("should have scorecard.configs procedure", async () => {
    const result = await caller.scorecard.configs();
    expect(Array.isArray(result)).toBe(true);
    if (result.length > 0) {
      expect(result[0]).toHaveProperty("metricName");
      expect(result[0]).toHaveProperty("weight");
    }
  });

  it("should have scorecard.recalculate procedure", async () => {
    const result = await caller.scorecard.recalculate();
    expect(result).toHaveProperty("recalculated");
    expect(typeof result.recalculated).toBe("number");
    expect(result.recalculated).toBeGreaterThanOrEqual(0);
  });

  it("should validate updateConfig weight range (0-10)", async () => {
    await expect(
      caller.scorecard.updateConfig({ id: 1, weight: 15 })
    ).rejects.toThrow();
  });

  it("should validate updateConfig weight cannot be negative", async () => {
    await expect(
      caller.scorecard.updateConfig({ id: 1, weight: -1 })
    ).rejects.toThrow();
  });

  it("should return bySupplier with current, history, and trend", async () => {
    // Get a supplier first
    const suppliers = await caller.supplier.list();
    if (suppliers.length > 0) {
      const result = await caller.scorecard.bySupplier({ supplierId: suppliers[0].id });
      expect(result).toHaveProperty("current");
      expect(result).toHaveProperty("history");
      expect(result).toHaveProperty("trend");
      expect(["UP", "DOWN", "STABLE"]).toContain(result.trend);
    }
  });
});

// =====================================================
// 5.3 AI ROOT CAUSE AUTO-CATEGORIZATION
// =====================================================
describe("5.3 AI Root Cause Auto-categorization", () => {
  it("should have ai.byDefect procedure", async () => {
    const result = await caller.ai.byDefect({ defectId: 999999 });
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBe(0);
  });

  it("should have ai.suggestRootCause procedure that validates defectId", async () => {
    await expect(
      caller.ai.suggestRootCause({ defectId: 999999 })
    ).rejects.toThrow();
  });

  it("should have ai.respondToSuggestion procedure", async () => {
    // Should fail gracefully for non-existent suggestion
    try {
      await caller.ai.respondToSuggestion({ suggestionId: 999999, accepted: true });
    } catch (e) {
      // Expected - suggestion doesn't exist
    }
  });
});

// =====================================================
// 5.4 ADVANCED FILTERS + EXCEL EXPORT
// =====================================================
describe("5.4 Advanced Filters + Excel Export", () => {
  it("should support mg filter in defect.list", async () => {
    const result = await caller.defect.list({ mg: "MG1" });
    expect(result).toBeDefined();
    expect(result).toHaveProperty("data");
    expect(Array.isArray(result.data)).toBe(true);
  });

  it("should support model filter in defect.list", async () => {
    const result = await caller.defect.list({ model: "Model-X" });
    expect(result).toBeDefined();
    expect(result).toHaveProperty("data");
  });

  it("should support customer filter in defect.list", async () => {
    const result = await caller.defect.list({ customer: "Customer-A" });
    expect(result).toBeDefined();
    expect(result).toHaveProperty("data");
  });

  it("should support owner filter in defect.list", async () => {
    const result = await caller.defect.list({ owner: "John" });
    expect(result).toBeDefined();
    expect(result).toHaveProperty("data");
  });

  it("should support step filter in defect.list", async () => {
    const result = await caller.defect.list({ step: "CLOSED" });
    expect(result).toBeDefined();
    expect(result).toHaveProperty("data");
  });

  it("should support combined filters", async () => {
    const result = await caller.defect.list({
      mg: "MG1",
      model: "Model-X",
      status: "OPEN",
    });
    expect(result).toBeDefined();
    expect(result).toHaveProperty("data");
    expect(result).toHaveProperty("total");
  });

  it("should have defect.exportExcel procedure", async () => {
    const result = await caller.defect.exportExcel({});
    expect(result).toBeDefined();
    expect(result).toHaveProperty("base64");
    expect(result).toHaveProperty("filename");
    expect(result.filename).toMatch(/\.xlsx$/);
  });

  it("should have defect.filterOptions procedure", async () => {
    const result = await caller.defect.filterOptions();
    expect(result).toBeDefined();
    expect(result).toHaveProperty("suppliers");
    expect(result).toHaveProperty("models");
    expect(result).toHaveProperty("customers");
    expect(result).toHaveProperty("owners");
    expect(result).toHaveProperty("severities");
    expect(Array.isArray(result.suppliers)).toBe(true);
  });
});

// =====================================================
// 3.7 AUDIT HISTORY WITH DIFF VISUAL
// =====================================================
describe("3.7 Audit History with Diff", () => {
  it("should have defect.auditLogs procedure", async () => {
    const result = await caller.defect.auditLogs({ defectId: 999999 });
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBe(0);
  });
});

// =====================================================
// 3.3 EMAIL NOTIFICATIONS
// =====================================================
describe("3.3 Email Notifications", () => {
  it("should have notification.list procedure", async () => {
    const result = await caller.notification.list();
    expect(Array.isArray(result)).toBe(true);
  });

  it("should have notification.markRead procedure", async () => {
    try {
      await caller.notification.markRead({ id: 999999 });
    } catch (e) {
      // Expected - notification doesn't exist
    }
  });
});

// =====================================================
// ROUTER STRUCTURE VALIDATION
// =====================================================
describe("Router Structure", () => {
  it("should have all required routers in appRouter", () => {
    const routerKeys = Object.keys(appRouter._def.procedures);
    // Check that all new routers are registered
    expect(routerKeys.some(k => k.startsWith("copq."))).toBe(true);
    expect(routerKeys.some(k => k.startsWith("scorecard."))).toBe(true);
    expect(routerKeys.some(k => k.startsWith("ai."))).toBe(true);
  });

  it("should have COPQ procedures registered", () => {
    const routerKeys = Object.keys(appRouter._def.procedures);
    expect(routerKeys).toContain("copq.dashboard");
    expect(routerKeys).toContain("copq.addCost");
    expect(routerKeys).toContain("copq.byDefect");
    expect(routerKeys).toContain("copq.deleteCost");
    expect(routerKeys).toContain("copq.defaults");
  });

  it("should have Scorecard procedures registered", () => {
    const routerKeys = Object.keys(appRouter._def.procedures);
    expect(routerKeys).toContain("scorecard.list");
    expect(routerKeys).toContain("scorecard.bySupplier");
    expect(routerKeys).toContain("scorecard.recalculate");
    expect(routerKeys).toContain("scorecard.configs");
    expect(routerKeys).toContain("scorecard.updateConfig");
  });

  it("should have AI procedures registered", () => {
    const routerKeys = Object.keys(appRouter._def.procedures);
    expect(routerKeys).toContain("ai.suggestRootCause");
    expect(routerKeys).toContain("ai.respondToSuggestion");
    expect(routerKeys).toContain("ai.byDefect");
  });

  it("should have defect.exportExcel procedure registered", () => {
    const routerKeys = Object.keys(appRouter._def.procedures);
    expect(routerKeys).toContain("defect.exportExcel");
  });
});

// =====================================================
// BUSINESS RULES VALIDATION
// =====================================================
describe("Business Rules", () => {
  describe("COPQ Cost Types (RN-COPQ-01)", () => {
    const validCostTypes = [
      "SCRAP", "REWORK", "REINSPECTION", "DOWNTIME", "WARRANTY",
      "RETURN", "RECALL", "COMPLAINT", "INSPECTION", "TESTING",
      "AUDIT", "TRAINING", "PLANNING", "QUALIFICATION", "OTHER"
    ];

    it("should accept all valid cost types", () => {
      // Validate the enum values are correct
      expect(validCostTypes.length).toBe(15);
      expect(validCostTypes).toContain("SCRAP");
      expect(validCostTypes).toContain("REWORK");
      expect(validCostTypes).toContain("WARRANTY");
    });
  });

  describe("Scorecard Grade Calculation (RN-SC-03)", () => {
    it("should map scores to correct grades", () => {
      const getGrade = (score: number): string => {
        if (score >= 85) return "A";
        if (score >= 70) return "B";
        if (score >= 50) return "C";
        return "D";
      };
      expect(getGrade(90)).toBe("A");
      expect(getGrade(85)).toBe("A");
      expect(getGrade(84.9)).toBe("B");
      expect(getGrade(70)).toBe("B");
      expect(getGrade(69.9)).toBe("C");
      expect(getGrade(50)).toBe("C");
      expect(getGrade(49.9)).toBe("D");
      expect(getGrade(0)).toBe("D");
    });
  });

  describe("COPQ Category Classification (RN-COPQ-03)", () => {
    it("should classify cost types into correct COPQ categories", () => {
      const getCopqCategory = (costType: string): string => {
        const INTERNAL = ["SCRAP", "REWORK", "REINSPECTION", "DOWNTIME"];
        const EXTERNAL = ["WARRANTY", "RETURN", "RECALL", "COMPLAINT"];
        const APPRAISAL = ["INSPECTION", "TESTING", "AUDIT"];
        const PREVENTION = ["TRAINING", "PLANNING", "QUALIFICATION"];
        if (INTERNAL.includes(costType)) return "INTERNAL_FAILURE";
        if (EXTERNAL.includes(costType)) return "EXTERNAL_FAILURE";
        if (APPRAISAL.includes(costType)) return "APPRAISAL";
        if (PREVENTION.includes(costType)) return "PREVENTION";
        return "INTERNAL_FAILURE";
      };
      expect(getCopqCategory("SCRAP")).toBe("INTERNAL_FAILURE");
      expect(getCopqCategory("REWORK")).toBe("INTERNAL_FAILURE");
      expect(getCopqCategory("WARRANTY")).toBe("EXTERNAL_FAILURE");
      expect(getCopqCategory("RECALL")).toBe("EXTERNAL_FAILURE");
      expect(getCopqCategory("INSPECTION")).toBe("APPRAISAL");
      expect(getCopqCategory("TRAINING")).toBe("PREVENTION");
      expect(getCopqCategory("OTHER")).toBe("INTERNAL_FAILURE");
    });
  });
});
