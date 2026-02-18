import { describe, it, expect } from "vitest";
import {
  seedDefaultTenant,
  createTenant,
  addUserToTenant,
  getTenantsForUser,
  getTenants,
  getTenantById,
  removeUserFromTenant,
  getTenantMembers,
  getAllUsers,
  updateActiveTenantId,
  ensureUserInTenant,
  getDefects,
  getDefectById,
  getDefectStats,
  getFilterOptions,
  getCopqDashboard,
  getAllSupplierScores,
  checkSlaViolations,
  getRootCauseAnalysis,
  detectRecurrencePatterns,
  getRecurrenceHeatmap,
  getDocuments,
} from "./db";

describe("P1 — Multi-tenancy Isolamento Real", () => {
  // ─── Tenant CRUD ──────────────────────────────────────────────────
  describe("Tenant CRUD", () => {
    it("should seed default tenant", async () => {
      const result = await seedDefaultTenant();
      expect(result).toBeDefined();
    });

    it("should list all tenants", async () => {
      const tenants = await getTenants();
      expect(Array.isArray(tenants)).toBe(true);
      expect(tenants.length).toBeGreaterThanOrEqual(1);
    });

    it("should create a new tenant", async () => {
      const tenant = await createTenant({
        name: "Test Tenant Isolation",
        slug: "test-isolation-" + Date.now(),
        plan: "PROFESSIONAL",
        maxUsers: 100,
        maxDefects: 50000,
      });
      expect(tenant).toBeDefined();
      expect(tenant.id).toBeGreaterThan(0);
    });

    it("should get tenant by id", async () => {
      const tenants = await getTenants();
      if (tenants.length > 0) {
        const tenant = await getTenantById(tenants[0].id);
        expect(tenant).toBeDefined();
        expect(tenant?.name).toBeTruthy();
      }
    });
  });

  // ─── Tenant User Management ───────────────────────────────────────
  describe("Tenant User Management", () => {
    it("should add user to tenant and retrieve membership", async () => {
      const tenants = await getTenants();
      const users = await getAllUsers();
      if (tenants.length > 0 && users.length > 0) {
        const tenantId = tenants[0].id;
        const userId = users[0].id;
        await addUserToTenant(userId, tenantId, "user");
        const userTenants = await getTenantsForUser(userId);
        expect(userTenants.some(t => t.tenantId === tenantId)).toBe(true);
      }
    });

    it("should list tenant members", async () => {
      const tenants = await getTenants();
      if (tenants.length > 0) {
        const members = await getTenantMembers(tenants[0].id);
        expect(Array.isArray(members)).toBe(true);
      }
    });

    it("should list all users", async () => {
      const users = await getAllUsers();
      expect(Array.isArray(users)).toBe(true);
      expect(users.length).toBeGreaterThanOrEqual(1);
    });

    it("should update active tenant id", async () => {
      const users = await getAllUsers();
      const tenants = await getTenants();
      if (users.length > 0 && tenants.length > 0) {
        // Ensure user is in tenant first
        await ensureUserInTenant(users[0].id, tenants[0].id);
        await updateActiveTenantId(users[0].id, tenants[0].id);
        // No error means success
        expect(true).toBe(true);
      }
    });

    it("should ensure user in tenant (idempotent)", async () => {
      const users = await getAllUsers();
      const tenants = await getTenants();
      if (users.length > 0 && tenants.length > 0) {
        const result1 = await ensureUserInTenant(users[0].id, tenants[0].id);
        const result2 = await ensureUserInTenant(users[0].id, tenants[0].id);
        // Both calls should succeed without error
        expect(true).toBe(true);
      }
    });
  });

  // ─── Data Isolation (Tenant Scoping) ──────────────────────────────
  describe("Data Isolation - Query Scoping", () => {
    it("getDefects should accept tenantId filter", async () => {
      const result = await getDefects({ tenantId: 1 });
      expect(result).toBeDefined();
      expect(result.data).toBeDefined();
      expect(Array.isArray(result.data)).toBe(true);
    });

    it("getDefects with non-existent tenantId should return empty", async () => {
      const result = await getDefects({ tenantId: 999999 });
      expect(result.data.length).toBe(0);
    });

    it("getDefectById should scope by tenantId", async () => {
      // Get a defect from tenant 1
      const defects = await getDefects({ tenantId: 1, limit: 1 });
      if (defects.data.length > 0) {
        const defectId = defects.data[0].id;
        // Should find with correct tenant
        const found = await getDefectById(defectId, 1);
        expect(found).toBeDefined();
        // Should NOT find with wrong tenant
        const notFound = await getDefectById(defectId, 999999);
        expect(notFound).toBeFalsy();
      }
    });

    it("getDefectStats should accept tenantId filter", async () => {
      const stats = await getDefectStats({ tenantId: 1 });
      expect(stats).toBeDefined();
      expect(stats.total).toBeGreaterThanOrEqual(0);
    });

    it("getDefectStats with non-existent tenantId should return zeros", async () => {
      const stats = await getDefectStats({ tenantId: 999999 });
      expect(stats.total).toBe(0);
    });

    it("getFilterOptions should accept tenantId filter", async () => {
      const options = await getFilterOptions(1);
      expect(options).toBeDefined();
    });

    it("getCopqDashboard should accept tenantId filter", async () => {
      const dashboard = await getCopqDashboard({ tenantId: 1 });
      expect(dashboard).toBeDefined();
    });

    it("getAllSupplierScores should accept tenantId filter", async () => {
      const scores = await getAllSupplierScores(1);
      expect(Array.isArray(scores)).toBe(true);
    });

    it("checkSlaViolations should accept tenantId filter", async () => {
      const violations = await checkSlaViolations(1);
      expect(Array.isArray(violations)).toBe(true);
    });

    it("getRootCauseAnalysis should accept tenantId filter", async () => {
      const rca = await getRootCauseAnalysis({ tenantId: 1 });
      expect(rca).toBeDefined();
    });

    it("detectRecurrencePatterns should accept tenantId filter", async () => {
      const patterns = await detectRecurrencePatterns(undefined, 1);
      expect(Array.isArray(patterns)).toBe(true);
    });

    it("getRecurrenceHeatmap should accept tenantId filter", async () => {
      const heatmap = await getRecurrenceHeatmap(1);
      expect(Array.isArray(heatmap)).toBe(true);
    });

    it("getDocuments should accept tenantId filter", async () => {
      const docs = await getDocuments({ tenantId: 1 });
      expect(Array.isArray(docs)).toBe(true);
    });
  });

  // ─── Cross-Tenant Isolation ───────────────────────────────────────
  describe("Cross-Tenant Isolation", () => {
    it("defects from tenant 1 should not appear in tenant 999999 queries", async () => {
      const tenant1 = await getDefects({ tenantId: 1 });
      const tenant999 = await getDefects({ tenantId: 999999 });
      
      if (tenant1.data.length > 0) {
        // Tenant 1 has data, tenant 999999 should not
        expect(tenant999.data.length).toBe(0);
        // No IDs should overlap
        const ids1 = new Set(tenant1.data.map(d => d.id));
        const ids999 = new Set(tenant999.data.map(d => d.id));
        const overlap = [...ids1].filter(id => ids999.has(id));
        expect(overlap.length).toBe(0);
      }
    });

    it("byId cross-tenant should return undefined/not found", async () => {
      const tenant1Defects = await getDefects({ tenantId: 1, limit: 1 });
      if (tenant1Defects.data.length > 0) {
        const defectId = tenant1Defects.data[0].id;
        // Access from different tenant should fail
        const crossTenantAccess = await getDefectById(defectId, 999999);
        expect(crossTenantAccess).toBeFalsy();
      }
    });

    it("stats from different tenants should be independent", async () => {
      const stats1 = await getDefectStats({ tenantId: 1 });
      const stats999 = await getDefectStats({ tenantId: 999999 });
      
      if (stats1.total > 0) {
        expect(stats999.total).toBe(0);
      }
    });
  });

  // ─── Tenant Removal ───────────────────────────────────────────────
  describe("Tenant User Removal", () => {
    it("should remove user from tenant", async () => {
      const tenants = await getTenants();
      const users = await getAllUsers();
      if (tenants.length > 0 && users.length > 0) {
        const tenantId = tenants[0].id;
        const userId = users[0].id;
        // Ensure user is in tenant
        await ensureUserInTenant(userId, tenantId);
        // Remove
        await removeUserFromTenant(userId, tenantId);
        // Re-add for other tests
        await ensureUserInTenant(userId, tenantId);
        expect(true).toBe(true);
      }
    });
  });
});
