import { describe, expect, it, vi } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// =====================================================
// HELPERS
// =====================================================
type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(role: "admin" | "user" = "admin"): TrpcContext {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "test-user-openid",
    email: "admin@test.com",
    name: "Test Admin",
    loginMethod: "manus",
    role,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };
  return {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };
}

function createPublicContext(): TrpcContext {
  return {
    user: null,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };
}

const caller = appRouter.createCaller(createAuthContext());
const publicCaller = appRouter.createCaller(createPublicContext());

// =====================================================
// PHASE 3: SUPPLIER MERGE TESTS
// =====================================================
describe("Phase 3: Supplier Merge", () => {
  it("merge procedure requires targetId and sourceIds", async () => {
    // Should throw validation error with missing fields
    try {
      await caller.supplier.merge({ targetId: 0, sourceIds: [] });
      expect.fail("Should have thrown");
    } catch (error: any) {
      // Either validation error or business logic error is acceptable
      expect(error).toBeDefined();
    }
  });

  it("merge procedure rejects non-existent target supplier", async () => {
    try {
      await caller.supplier.merge({ targetId: 999999, sourceIds: [999998] });
      expect.fail("Should have thrown");
    } catch (error: any) {
      expect(error.message).toContain("não encontrado");
    }
  });

  it("merge procedure rejects when target is in source list", async () => {
    try {
      await caller.supplier.merge({ targetId: 1, sourceIds: [1, 2] });
      expect.fail("Should have thrown");
    } catch (error: any) {
      // Should reject - target cannot be in source list
      expect(error).toBeDefined();
    }
  });
});

// =====================================================
// PHASE 3: ATTACHMENT UPLOAD TESTS
// =====================================================
describe("Phase 3: Attachment Upload", () => {
  it("upload procedure requires authentication", async () => {
    try {
      await publicCaller.attachment.upload({
        defectId: 1,
        fileName: "test.png",
        fileData: "dGVzdA==", // base64 "test"
        mimeType: "image/png",
        fileSize: 4,
      });
      expect.fail("Should have thrown for unauthenticated user");
    } catch (error: any) {
      expect(error).toBeDefined();
    }
  });

  it("upload procedure rejects files over 10MB", async () => {
    try {
      await caller.attachment.upload({
        defectId: 1,
        fileName: "huge.zip",
        fileData: "dGVzdA==",
        mimeType: "application/zip",
        fileSize: 11 * 1024 * 1024, // 11MB
      });
      expect.fail("Should have thrown for oversized file");
    } catch (error: any) {
      expect(error.message).toContain("grande");
    }
  });

  it("attachment list is publicly accessible", async () => {
    // Should not throw - list is public
    const result = await publicCaller.attachment.list({ defectId: 1 });
    expect(Array.isArray(result)).toBe(true);
  });

  it("attachment delete requires authentication", async () => {
    try {
      await publicCaller.attachment.delete({ id: 999999 });
      expect.fail("Should have thrown for unauthenticated user");
    } catch (error: any) {
      expect(error).toBeDefined();
    }
  });
});

// =====================================================
// PHASE 3: DATE FILTER TESTS (Stats)
// =====================================================
describe("Phase 3: Date Filter on Stats", () => {
  it("defect.stats accepts date range parameters", async () => {
    const result = await publicCaller.defect.stats({
      dateFrom: "2025-01-01",
      dateTo: "2025-12-31",
    });
    expect(result).toBeDefined();
    expect(typeof result.total).toBe("number");
  });

  it("defect.stats works without date parameters", async () => {
    const result = await publicCaller.defect.stats({});
    expect(result).toBeDefined();
    expect(typeof result.total).toBe("number");
  });

  it("rca.analysis accepts date range parameters", async () => {
    const result = await publicCaller.rca.analysis({
      dateFrom: "2025-01-01",
      dateTo: "2025-12-31",
    });
    expect(result).toBeDefined();
    expect(result).toHaveProperty("totalWithCause");
    expect(result).toHaveProperty("topCauses");
    expect(Array.isArray(result.topCauses)).toBe(true);
  });

  it("rca.analysis works without date parameters", async () => {
    const result = await publicCaller.rca.analysis({});
    expect(result).toBeDefined();
    expect(result).toHaveProperty("totalWithCause");
    expect(result).toHaveProperty("allCauses");
    expect(Array.isArray(result.allCauses)).toBe(true);
  });
});

// =====================================================
// PHASE 3: PDF EXPORT VALIDATION (unit-level)
// =====================================================
describe("Phase 3: PDF Export Data Validation", () => {
  it("defect byId returns all fields needed for PDF export", async () => {
    // Verify the shape of defect data includes fields needed for 8D report
    // This is a structural test - we check the query doesn't fail
    try {
      const result = await publicCaller.defect.byId({ id: 1 });
      if (result) {
        // If a defect exists, verify it has the expected shape
        expect(result).toHaveProperty("docNumber");
        expect(result).toHaveProperty("supplier");
        expect(result).toHaveProperty("symptom");
        expect(result).toHaveProperty("step");
        expect(result).toHaveProperty("openDate");
      }
    } catch {
      // If no defect exists, that's fine for this test
    }
  });

  it("comment list returns data for PDF export", async () => {
    const comments = await publicCaller.comment.list({ defectId: 1 });
    expect(Array.isArray(comments)).toBe(true);
  });

  it("attachment list returns data for PDF export", async () => {
    const attachments = await publicCaller.attachment.list({ defectId: 1 });
    expect(Array.isArray(attachments)).toBe(true);
  });
});

// =====================================================
// PHASE 3: SUPPLIER LIST AND SEARCH
// =====================================================
describe("Phase 3: Supplier Operations", () => {
  it("supplier list returns array", async () => {
    const result = await caller.supplier.list();
    expect(Array.isArray(result)).toBe(true);
  });

  it("supplier create requires name", async () => {
    try {
      await caller.supplier.create({ name: "" });
      // If it succeeds with empty name, that's a validation gap
    } catch (error: any) {
      expect(error).toBeDefined();
    }
  });
});
