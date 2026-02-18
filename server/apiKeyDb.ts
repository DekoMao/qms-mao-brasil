/**
 * API Key database helpers for the public REST API
 */
import { eq, and, isNull } from "drizzle-orm";
import { apiKeys } from "../drizzle/schema";
import crypto from "crypto";

// Re-use the same getDb pattern from db.ts
async function getDb() {
  const { getDb: getDbCore } = await import("./db");
  return getDbCore();
}

/**
 * Generate a new API key with prefix for identification
 * Returns the raw key (only shown once) and the stored record
 */
export async function createApiKey(data: {
  tenantId: number;
  createdBy: number;
  name: string;
  scopes: string[];
  expiresAt?: Date;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Generate a secure random key with prefix
  const prefix = "qk_" + crypto.randomBytes(2).toString("hex");
  const rawKey = prefix + "_" + crypto.randomBytes(32).toString("hex");
  const keyHash = crypto.createHash("sha256").update(rawKey).digest("hex");

  const [result] = await db.insert(apiKeys).values({
    tenantId: data.tenantId,
    createdBy: data.createdBy,
    name: data.name,
    keyPrefix: prefix,
    keyHash,
    scopes: data.scopes,
    expiresAt: data.expiresAt,
  }).$returningId();

  return {
    id: result.id,
    rawKey, // Only returned once!
    prefix,
    name: data.name,
    scopes: data.scopes,
  };
}

/**
 * Find an API key by its hash (for auth middleware)
 */
export async function getApiKeyByHash(keyHash: string) {
  const db = await getDb();
  if (!db) return null;

  const [key] = await db
    .select()
    .from(apiKeys)
    .where(eq(apiKeys.keyHash, keyHash))
    .limit(1);

  return key || null;
}

/**
 * List all API keys for a tenant (without revealing the hash)
 */
export async function listApiKeys(tenantId: number) {
  const db = await getDb();
  if (!db) return [];

  return db
    .select({
      id: apiKeys.id,
      name: apiKeys.name,
      keyPrefix: apiKeys.keyPrefix,
      scopes: apiKeys.scopes,
      expiresAt: apiKeys.expiresAt,
      lastUsedAt: apiKeys.lastUsedAt,
      revokedAt: apiKeys.revokedAt,
      createdAt: apiKeys.createdAt,
    })
    .from(apiKeys)
    .where(eq(apiKeys.tenantId, tenantId));
}

/**
 * Revoke an API key
 */
export async function revokeApiKey(id: number, tenantId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db
    .update(apiKeys)
    .set({ revokedAt: new Date() })
    .where(and(eq(apiKeys.id, id), eq(apiKeys.tenantId, tenantId)));
}

/**
 * Touch lastUsedAt timestamp
 */
export async function touchApiKeyLastUsed(id: number) {
  const db = await getDb();
  if (!db) return;

  await db
    .update(apiKeys)
    .set({ lastUsedAt: new Date() })
    .where(eq(apiKeys.id, id));
}
