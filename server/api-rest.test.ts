/**
 * P2 — API REST Pública Tests
 * Covers: API key creation, auth middleware, scope checks, CRUD operations
 */
import { describe, it, expect, beforeAll } from "vitest";
import crypto from "crypto";
import {
  createApiKey,
  getApiKeyByHash,
  listApiKeys,
  revokeApiKey,
  touchApiKeyLastUsed,
} from "./apiKeyDb";

describe("P2 — API REST Pública", () => {
  let testTenantId = 1;

  describe("API Key CRUD", () => {
    it("should create an API key with correct fields", async () => {
      const result = await createApiKey({
        tenantId: testTenantId,
        createdBy: 1,
        name: "Test Key REST",
        scopes: ["defects:read", "defects:write"],
      });

      expect(result).toBeDefined();
      expect(result.id).toBeGreaterThan(0);
      expect(result.rawKey).toBeDefined();
      expect(result.rawKey.startsWith("qk_")).toBe(true);
      expect(result.prefix.startsWith("qk_")).toBe(true);
      expect(result.name).toBe("Test Key REST");
      expect(result.scopes).toEqual(["defects:read", "defects:write"]);
    });

    it("should find API key by hash", async () => {
      const created = await createApiKey({
        tenantId: testTenantId,
        createdBy: 1,
        name: "Hash Lookup Test",
        scopes: ["*"],
      });

      const keyHash = crypto.createHash("sha256").update(created.rawKey).digest("hex");
      const found = await getApiKeyByHash(keyHash);

      expect(found).toBeDefined();
      expect(found!.id).toBe(created.id);
      expect(found!.name).toBe("Hash Lookup Test");
      expect(found!.tenantId).toBe(testTenantId);
    });

    it("should return null for invalid hash", async () => {
      const found = await getApiKeyByHash("invalid_hash_that_does_not_exist");
      expect(found).toBeNull();
    });

    it("should list API keys for a tenant (without hash)", async () => {
      const keys = await listApiKeys(testTenantId);
      expect(Array.isArray(keys)).toBe(true);
      expect(keys.length).toBeGreaterThan(0);

      // Should NOT expose keyHash
      const firstKey = keys[0];
      expect(firstKey).toHaveProperty("id");
      expect(firstKey).toHaveProperty("name");
      expect(firstKey).toHaveProperty("keyPrefix");
      expect(firstKey).toHaveProperty("scopes");
      expect(firstKey).not.toHaveProperty("keyHash");
    });

    it("should revoke an API key", async () => {
      const created = await createApiKey({
        tenantId: testTenantId,
        createdBy: 1,
        name: "To Be Revoked",
        scopes: ["defects:read"],
      });

      await revokeApiKey(created.id, testTenantId);

      const keyHash = crypto.createHash("sha256").update(created.rawKey).digest("hex");
      const found = await getApiKeyByHash(keyHash);
      expect(found).toBeDefined();
      expect(found!.revokedAt).not.toBeNull();
    });

    it("should touch lastUsedAt", async () => {
      const created = await createApiKey({
        tenantId: testTenantId,
        createdBy: 1,
        name: "Touch Test",
        scopes: ["defects:read"],
      });

      await touchApiKeyLastUsed(created.id);

      const keyHash = crypto.createHash("sha256").update(created.rawKey).digest("hex");
      const found = await getApiKeyByHash(keyHash);
      expect(found).toBeDefined();
      expect(found!.lastUsedAt).not.toBeNull();
    });

    it("should create API key with expiration", async () => {
      const expiresAt = new Date(Date.now() + 86400000 * 30); // 30 days
      const created = await createApiKey({
        tenantId: testTenantId,
        createdBy: 1,
        name: "Expiring Key",
        scopes: ["defects:read"],
        expiresAt,
      });

      const keyHash = crypto.createHash("sha256").update(created.rawKey).digest("hex");
      const found = await getApiKeyByHash(keyHash);
      expect(found).toBeDefined();
      expect(found!.expiresAt).not.toBeNull();
    });
  });

  describe("Auth Middleware Logic", () => {
    it("revoked key should have revokedAt set", async () => {
      const created = await createApiKey({
        tenantId: testTenantId,
        createdBy: 1,
        name: "Auth Test Revoked",
        scopes: ["defects:read"],
      });

      await revokeApiKey(created.id, testTenantId);

      const keyHash = crypto.createHash("sha256").update(created.rawKey).digest("hex");
      const found = await getApiKeyByHash(keyHash);
      expect(found!.revokedAt).not.toBeNull();
    });

    it("expired key should have expiresAt in the past", async () => {
      const expiresAt = new Date(Date.now() - 86400000); // yesterday
      const created = await createApiKey({
        tenantId: testTenantId,
        createdBy: 1,
        name: "Auth Test Expired",
        scopes: ["defects:read"],
        expiresAt,
      });

      const keyHash = crypto.createHash("sha256").update(created.rawKey).digest("hex");
      const found = await getApiKeyByHash(keyHash);
      expect(found!.expiresAt).not.toBeNull();
      expect(new Date(found!.expiresAt!).getTime()).toBeLessThan(Date.now());
    });
  });

  describe("Scope Validation Logic", () => {
    it("should store and retrieve scopes correctly", async () => {
      const scopes = ["defects:read", "reports:read", "suppliers:read"];
      const created = await createApiKey({
        tenantId: testTenantId,
        createdBy: 1,
        name: "Scope Test",
        scopes,
      });

      const keyHash = crypto.createHash("sha256").update(created.rawKey).digest("hex");
      const found = await getApiKeyByHash(keyHash);
      expect(found).toBeDefined();
      const storedScopes = found!.scopes as string[];
      expect(storedScopes).toEqual(scopes);
    });

    it("wildcard scope should be stored", async () => {
      const created = await createApiKey({
        tenantId: testTenantId,
        createdBy: 1,
        name: "Wildcard Test",
        scopes: ["*"],
      });

      const keyHash = crypto.createHash("sha256").update(created.rawKey).digest("hex");
      const found = await getApiKeyByHash(keyHash);
      const storedScopes = found!.scopes as string[];
      expect(storedScopes).toContain("*");
    });
  });

  describe("Tenant Isolation", () => {
    it("should not list keys from other tenants", async () => {
      // Create key for tenant 1
      await createApiKey({
        tenantId: 1,
        createdBy: 1,
        name: "Tenant 1 Key",
        scopes: ["defects:read"],
      });

      // List keys for tenant 999999 (should be empty or not contain tenant 1 keys)
      const keys = await listApiKeys(999999);
      const tenant1Keys = keys.filter(k => k.name === "Tenant 1 Key");
      expect(tenant1Keys.length).toBe(0);
    });

    it("should not revoke key from different tenant", async () => {
      const created = await createApiKey({
        tenantId: 1,
        createdBy: 1,
        name: "Cross Tenant Revoke Test",
        scopes: ["defects:read"],
      });

      // Try to revoke from different tenant
      await revokeApiKey(created.id, 999999);

      // Key should still be active
      const keyHash = crypto.createHash("sha256").update(created.rawKey).digest("hex");
      const found = await getApiKeyByHash(keyHash);
      expect(found!.revokedAt).toBeNull();
    });
  });

  describe("Key Format", () => {
    it("raw key should have correct format: qk_XXXX_<64hex>", async () => {
      const created = await createApiKey({
        tenantId: testTenantId,
        createdBy: 1,
        name: "Format Test",
        scopes: ["defects:read"],
      });

      expect(created.rawKey).toMatch(/^qk_[a-f0-9]{4}_[a-f0-9]{64}$/);
    });

    it("key prefix should be 7 chars (qk_ + 4 hex)", async () => {
      const created = await createApiKey({
        tenantId: testTenantId,
        createdBy: 1,
        name: "Prefix Test",
        scopes: ["defects:read"],
      });

      expect(created.prefix).toMatch(/^qk_[a-f0-9]{4}$/);
      expect(created.prefix.length).toBe(7);
    });

    it("SHA-256 hash of raw key should match stored hash", async () => {
      const created = await createApiKey({
        tenantId: testTenantId,
        createdBy: 1,
        name: "Hash Match Test",
        scopes: ["defects:read"],
      });

      const expectedHash = crypto.createHash("sha256").update(created.rawKey).digest("hex");
      const found = await getApiKeyByHash(expectedHash);
      expect(found).toBeDefined();
      expect(found!.id).toBe(created.id);
    });
  });
});
