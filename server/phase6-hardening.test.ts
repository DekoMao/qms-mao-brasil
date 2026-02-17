import { describe, it, expect } from "vitest";
import { appRouter } from "./routers";
import {
  hasPermission,
  getAllRoles,
  getAllPermissions,
  getWorkflowDefinitions,
  getWorkflowDefinitionById,
  getTenants,
  getTenantById,
  getWebhookConfigs,
  getDocuments,
  getDocumentById,
  softDeleteDocument,
  signPayload,
} from "./db";

// Helper to create a caller with a mock user context
function createCaller(user?: { id: number; name: string; email: string; role: string; openId: string }) {
  return appRouter.createCaller({ user: user || null } as any);
}

const mockAdmin = { id: 1, name: "Test Admin", email: "admin@test.com", role: "admin", openId: "test-open-id" };
const mockUser = { id: 2, name: "Test User", email: "user@test.com", role: "user", openId: "test-user-id" };

// =====================================================
// RBAC AUTHORIZATION HARDENING
// =====================================================
describe("RBAC Authorization Hardening", () => {
  it("should allow admin to seed RBAC (admin bypass)", async () => {
    const caller = createCaller(mockAdmin);
    const result = await caller.rbac.seed();
    expect(result.success).toBe(true);
  }, 15000);

  it("should list roles excluding soft-deleted", async () => {
    const roles = await getAllRoles();
    expect(Array.isArray(roles)).toBe(true);
    // All returned roles should have no deletedAt
    for (const role of roles) {
      expect(role.deletedAt).toBeNull();
    }
  });

  it("should list all permissions", async () => {
    const perms = await getAllPermissions();
    expect(Array.isArray(perms)).toBe(true);
    expect(perms.length).toBeGreaterThan(0);
    // Each permission should have resource and action
    for (const p of perms) {
      expect(p.resource).toBeDefined();
      expect(p.action).toBeDefined();
    }
  });

  it("should check permission for non-existent user returns false", async () => {
    const result = await hasPermission(999999, "defects", "read");
    expect(result).toBe(false);
  });

  it("admin user should be able to access rbac.roles", async () => {
    const caller = createCaller(mockAdmin);
    const roles = await caller.rbac.roles();
    expect(Array.isArray(roles)).toBe(true);
  });

  it("admin user should be able to set role permissions (admin bypass)", async () => {
    const caller = createCaller(mockAdmin);
    const roles = await caller.rbac.roles();
    if (roles.length > 0) {
      const perms = await caller.rbac.permissions();
      const result = await caller.rbac.setRolePermissions({
        roleId: roles[0].id,
        permissionIds: perms.slice(0, 3).map((p: any) => p.id),
      });
      expect(result.success).toBe(true);
    }
  });

  it("admin user should be able to assign role", async () => {
    const caller = createCaller(mockAdmin);
    const roles = await caller.rbac.roles();
    if (roles.length > 0) {
      const result = await caller.rbac.assignRole({
        userId: mockUser.id,
        roleId: roles[0].id,
      });
      expect(result.success).toBe(true);
    }
  });

  it("should get user roles with permissions", async () => {
    const caller = createCaller(mockAdmin);
    const result = await caller.rbac.myRoles();
    expect(result).toBeDefined();
    expect(result.roles).toBeDefined();
    expect(result.permissions).toBeDefined();
    expect(Array.isArray(result.roles)).toBe(true);
    expect(Array.isArray(result.permissions)).toBe(true);
  });

  it("should check specific permission via rbac.check", async () => {
    const caller = createCaller(mockAdmin);
    const result = await caller.rbac.check({ resource: "defects", action: "read" });
    expect(result).toBeDefined();
    expect(typeof result.allowed).toBe("boolean");
  });

  it("should reject unauthenticated rbac.check", async () => {
    const caller = createCaller();
    await expect(caller.rbac.check({ resource: "defects", action: "read" })).rejects.toThrow();
  });

  it("admin user should be able to remove role", async () => {
    const caller = createCaller(mockAdmin);
    const roles = await caller.rbac.roles();
    if (roles.length > 0) {
      const result = await caller.rbac.removeRole({
        userId: mockUser.id,
        roleId: roles[0].id,
      });
      expect(result.success).toBe(true);
    }
  });
});

// =====================================================
// WORKFLOW ENGINE HARDENING
// =====================================================
describe("Workflow Engine Hardening", () => {
  it("should seed default workflow (admin bypass)", async () => {
    const caller = createCaller(mockAdmin);
    const result = await caller.workflow.seed();
    expect(result).toBeDefined();
  }, 15000);

  it("should list workflow definitions excluding soft-deleted", async () => {
    const defs = await getWorkflowDefinitions();
    expect(Array.isArray(defs)).toBe(true);
    for (const d of defs) {
      expect(d.deletedAt).toBeNull();
      expect(d.isActive).toBe(true);
    }
  });

  it("should get workflow definition by id", async () => {
    const defs = await getWorkflowDefinitions();
    if (defs.length > 0) {
      const def = await getWorkflowDefinitionById(defs[0].id);
      expect(def).toBeDefined();
      expect(def?.name).toBeDefined();
      expect(def?.steps).toBeDefined();
      expect(def?.transitions).toBeDefined();
    }
  });

  it("should create a new workflow definition (admin)", async () => {
    const caller = createCaller(mockAdmin);
    const result = await caller.workflow.create({
      name: "Test Workflow " + Date.now(),
      description: "Test workflow for hardening",
      steps: [
        { id: "step1", name: "Start", order: 1, responsible: "SQA", requiredFields: [], slaDefault: 3 },
        { id: "step2", name: "End", order: 2, responsible: "SUPPLIER", requiredFields: [], slaDefault: 5 },
      ],
      transitions: [
        { fromStepId: "step1", toStepId: "step2", conditions: [], actions: [] },
      ],
    });
    expect(result).toBeDefined();
    expect(result.id).toBeDefined();
  });

  it("should create new version of workflow (admin)", async () => {
    const caller = createCaller(mockAdmin);
    const defs = await caller.workflow.definitions();
    if (defs.length > 0) {
      const result = await caller.workflow.newVersion({
        definitionId: defs[0].id,
        steps: [
          { id: "s1", name: "Step 1", order: 1, responsible: "SQA", requiredFields: [], slaDefault: 2 },
          { id: "s2", name: "Step 2", order: 2, responsible: "BOTH", requiredFields: [], slaDefault: 4 },
        ],
        transitions: [
          { fromStepId: "s1", toStepId: "s2", conditions: [], actions: [] },
        ],
      });
      expect(result).toBeDefined();
    }
  });

  it("should reject unauthenticated workflow creation", async () => {
    const caller = createCaller();
    await expect(caller.workflow.create({
      name: "Unauthorized",
      steps: [{ id: "s1", name: "S", order: 1, responsible: "SQA", requiredFields: [], slaDefault: 1 }],
      transitions: [],
    })).rejects.toThrow();
  });
});

// =====================================================
// MULTI-TENANCY HARDENING
// =====================================================
describe("Multi-tenancy Hardening", () => {
  it("should seed default tenant (admin)", async () => {
    const caller = createCaller(mockAdmin);
    const result = await caller.tenant.seed();
    expect(result).toBeDefined();
  }, 15000);

  it("should list tenants excluding soft-deleted", async () => {
    const tenantList = await getTenants();
    expect(Array.isArray(tenantList)).toBe(true);
    for (const t of tenantList) {
      expect(t.deletedAt).toBeNull();
      expect(t.isActive).toBe(true);
    }
  });

  it("should create a tenant (admin)", async () => {
    const caller = createCaller(mockAdmin);
    const slug = "hardening-" + Date.now();
    const result = await caller.tenant.create({
      name: "Hardening Test Tenant",
      slug,
      plan: "PROFESSIONAL",
      maxUsers: 50,
      maxDefects: 1000,
    });
    expect(result).toBeDefined();
    expect(result.id).toBeDefined();
  });

  it("should get tenant by id", async () => {
    const tenantList = await getTenants();
    if (tenantList.length > 0) {
      const t = await getTenantById(tenantList[0].id);
      expect(t).toBeDefined();
      expect(t?.name).toBeDefined();
    }
  });

  it("should add and remove user from tenant (admin)", async () => {
    const caller = createCaller(mockAdmin);
    const tenantList = await caller.tenant.list();
    if (tenantList.length > 0) {
      const addResult = await caller.tenant.addUser({
        userId: mockUser.id,
        tenantId: tenantList[0].id,
        role: "member",
      });
      expect(addResult.success).toBe(true);

      const removeResult = await caller.tenant.removeUser({
        userId: mockUser.id,
        tenantId: tenantList[0].id,
      });
      expect(removeResult.success).toBe(true);
    }
  });

  it("should get user tenants", async () => {
    const caller = createCaller(mockAdmin);
    const result = await caller.tenant.myTenants();
    expect(Array.isArray(result)).toBe(true);
  });

  it("should reject unauthenticated tenant creation", async () => {
    const caller = createCaller();
    await expect(caller.tenant.create({
      name: "Unauthorized",
      slug: "unauthorized",
    })).rejects.toThrow();
  });
});

// =====================================================
// WEBHOOKS HARDENING
// =====================================================
describe("Webhooks Hardening", () => {
  it("should list webhooks excluding soft-deleted", async () => {
    const configs = await getWebhookConfigs();
    expect(Array.isArray(configs)).toBe(true);
    for (const c of configs) {
      expect(c.deletedAt).toBeNull();
      expect(c.isActive).toBe(true);
    }
  });

  it("should create a webhook (admin)", async () => {
    const caller = createCaller(mockAdmin);
    const result = await caller.webhook.create({
      name: "Hardening Webhook " + Date.now(),
      url: "https://httpbin.org/post",
      events: ["defect.created", "defect.updated"],
    });
    expect(result).toBeDefined();
    expect(result.id).toBeDefined();
  });

  it("should get webhook logs", async () => {
    const caller = createCaller(mockAdmin);
    const configs = await caller.webhook.list();
    if (configs.length > 0) {
      const logs = await caller.webhook.logs({ configId: configs[0].id });
      expect(Array.isArray(logs)).toBe(true);
    }
  });

  it("should sign payload with HMAC", () => {
    const payload = JSON.stringify({ test: true });
    const secret = "test-secret-key";
    const signature = signPayload(payload, secret);
    expect(signature).toBeDefined();
    expect(typeof signature).toBe("string");
    expect(signature.length).toBe(64); // SHA-256 hex = 64 chars
  });

  it("should delete (soft) a webhook (admin)", async () => {
    const caller = createCaller(mockAdmin);
    const created = await caller.webhook.create({
      name: "To Delete " + Date.now(),
      url: "https://httpbin.org/post",
      events: ["test.event"],
    });
    const result = await caller.webhook.delete({ id: created.id });
    expect(result.success).toBe(true);

    // Should not appear in list
    const configs = await caller.webhook.list();
    const found = configs.find((c: any) => c.id === created.id);
    expect(found).toBeUndefined();
  });

  it("should reject unauthenticated webhook creation", async () => {
    const caller = createCaller();
    await expect(caller.webhook.create({
      name: "Unauthorized",
      url: "https://example.com",
      events: ["test"],
    })).rejects.toThrow();
  });
});

// =====================================================
// DOCUMENT CONTROL HARDENING
// =====================================================
describe("Document Control Hardening", () => {
  it("should list documents excluding soft-deleted", async () => {
    const docs = await getDocuments({});
    expect(Array.isArray(docs)).toBe(true);
    for (const d of docs) {
      expect(d.deletedAt).toBeNull();
    }
  });

  it("should create a document with auto-generated number (admin)", async () => {
    const caller = createCaller(mockAdmin);
    const result = await caller.document.create({
      title: "Hardening Test Doc " + Date.now(),
      category: "PROCEDURE",
      tags: ["test", "hardening"],
    });
    expect(result).toBeDefined();
    expect(result.id).toBeDefined();
    expect(result.documentNumber).toBeDefined();
    expect(result.documentNumber).toMatch(/^DOC-/);
  });

  it("should get document by id", async () => {
    const caller = createCaller(mockAdmin);
    const created = await caller.document.create({
      title: "Get By Id Test",
      category: "FORM",
    });
    const doc = await getDocumentById(created.id);
    expect(doc).toBeDefined();
    expect(doc?.title).toBe("Get By Id Test");
    expect(doc?.status).toBe("DRAFT");
    expect(doc?.ownerId).toBe(mockAdmin.id);
  });

  it("should update document status through workflow", async () => {
    const caller = createCaller(mockAdmin);
    const created = await caller.document.create({
      title: "Workflow Status Test",
      category: "WORK_INSTRUCTION",
    });

    // DRAFT → IN_REVIEW
    await caller.document.updateStatus({ id: created.id, status: "IN_REVIEW" });
    let doc = await getDocumentById(created.id);
    expect(doc?.status).toBe("IN_REVIEW");

    // IN_REVIEW → APPROVED
    await caller.document.updateStatus({ id: created.id, status: "APPROVED" });
    doc = await getDocumentById(created.id);
    expect(doc?.status).toBe("APPROVED");
  });

  it("should add multiple versions to a document", async () => {
    const caller = createCaller(mockAdmin);
    const created = await caller.document.create({
      title: "Multi Version Test",
      category: "SPECIFICATION",
    });

    await caller.document.addVersion({
      documentId: created.id,
      fileUrl: "https://example.com/v1.pdf",
      changeDescription: "Initial version",
    });

    await caller.document.addVersion({
      documentId: created.id,
      fileUrl: "https://example.com/v2.pdf",
      changeDescription: "Updated formatting",
    });

    const versions = await caller.document.versions({ documentId: created.id });
    expect(versions.length).toBeGreaterThanOrEqual(2);
    // Versions should be sequential
    const versionNumbers = versions.map((v: any) => v.version).sort((a: number, b: number) => a - b);
    expect(versionNumbers[1] - versionNumbers[0]).toBe(1);
  });

  it("should soft-delete document and exclude from list", async () => {
    const caller = createCaller(mockAdmin);
    const created = await caller.document.create({
      title: "Soft Delete Hardening Test",
      category: "REPORT",
    });

    await caller.document.delete({ id: created.id });

    const docs = await getDocuments({});
    const found = docs.find((d: any) => d.id === created.id);
    expect(found).toBeUndefined();
  });

  it("should filter documents by status", async () => {
    const docs = await getDocuments({ status: "DRAFT" });
    expect(Array.isArray(docs)).toBe(true);
    for (const d of docs) {
      expect(d.status).toBe("DRAFT");
    }
  });

  it("should filter documents by category", async () => {
    const docs = await getDocuments({ category: "PROCEDURE" });
    expect(Array.isArray(docs)).toBe(true);
    for (const d of docs) {
      expect(d.category).toBe("PROCEDURE");
    }
  });

  it("should reject unauthenticated document creation", async () => {
    const caller = createCaller();
    await expect(caller.document.create({
      title: "Unauthorized",
      category: "OTHER",
    })).rejects.toThrow();
  });
});

// =====================================================
// AI PREDICTION HARDENING
// =====================================================
describe("AI Prediction Hardening", () => {
  it("should return recurrence patterns as array", async () => {
    const caller = createCaller(mockAdmin);
    const result = await caller.prediction.recurrencePatterns();
    expect(Array.isArray(result)).toBe(true);
  });

  it("should return heatmap data as array", async () => {
    const caller = createCaller(mockAdmin);
    const result = await caller.prediction.heatmap();
    expect(Array.isArray(result)).toBe(true);
  });

  it("should accept optional supplierId filter", async () => {
    const caller = createCaller(mockAdmin);
    const result = await caller.prediction.recurrencePatterns({ supplierId: 1 });
    expect(Array.isArray(result)).toBe(true);
  });

  it("should reject unauthenticated prediction access", async () => {
    const caller = createCaller();
    await expect(caller.prediction.heatmap()).rejects.toThrow();
  });
});

// =====================================================
// CROSS-CUTTING CONCERNS
// =====================================================
describe("Cross-cutting Concerns", () => {
  it("should have Can component exported", async () => {
    const canModule = await import("../client/src/components/Can");
    expect(canModule.Can).toBeDefined();
    expect(canModule.useCan).toBeDefined();
  });

  it("should have usePermissions hook exported", async () => {
    const permModule = await import("../client/src/hooks/usePermissions");
    expect(permModule.usePermissions).toBeDefined();
  });

  it("should have authorizedProcedure in trpc exports", async () => {
    const trpcModule = await import("./_core/trpc");
    expect(trpcModule.authorizedProcedure).toBeDefined();
    expect(typeof trpcModule.authorizedProcedure).toBe("function");
  });

  it("schema should have deletedAt on roles table", async () => {
    const schema = await import("../drizzle/schema");
    expect(schema.roles.deletedAt).toBeDefined();
  });

  it("schema should have deletedAt on workflowDefinitions table", async () => {
    const schema = await import("../drizzle/schema");
    expect(schema.workflowDefinitions.deletedAt).toBeDefined();
  });

  it("schema should have deletedAt on tenants table", async () => {
    const schema = await import("../drizzle/schema");
    expect(schema.tenants.deletedAt).toBeDefined();
  });

  it("schema should have deletedAt on webhookConfigs table", async () => {
    const schema = await import("../drizzle/schema");
    expect(schema.webhookConfigs.deletedAt).toBeDefined();
  });

  it("schema should have deletedAt on documents table", async () => {
    const schema = await import("../drizzle/schema");
    expect(schema.documents.deletedAt).toBeDefined();
  });
});
