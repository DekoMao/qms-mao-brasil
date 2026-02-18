/**
 * Tenant Context — resolves the active tenant for the current request.
 *
 * Resolution order:
 *   1. X-Tenant-Id header (API / programmatic)
 *   2. user.activeTenantId (persisted preference)
 *   3. First tenant the user belongs to
 *   4. null (no tenant — legacy / unauthenticated)
 *
 * Exports a tRPC middleware that injects `ctx.tenantId`.
 */
import { TRPCError } from "@trpc/server";
import type { User } from "../drizzle/schema";
import { getTenantsForUser } from "./db";

export interface TenantContext {
  tenantId: number | null;
}

/**
 * Resolve the active tenantId for a given request + user.
 */
export async function resolveTenantId(
  headerTenantId: string | undefined,
  user: User | null,
): Promise<number | null> {
  // 1. Explicit header
  if (headerTenantId) {
    const parsed = parseInt(headerTenantId, 10);
    if (!isNaN(parsed) && parsed > 0) return parsed;
  }

  if (!user) return null;

  // 2. User's persisted preference
  if (user.activeTenantId) return user.activeTenantId;

  // 3. First tenant the user belongs to
  const userTenants = await getTenantsForUser(user.id);
  if (userTenants.length > 0) return userTenants[0].tenantId;

  // 4. Fallback — no tenant
  return null;
}

/**
 * Assert that the user has access to the resolved tenant.
 * Throws FORBIDDEN if not.
 */
export async function assertTenantAccess(
  userId: number,
  tenantId: number,
): Promise<void> {
  const userTenants = await getTenantsForUser(userId);
  const hasAccess = userTenants.some((t) => t.tenantId === tenantId);
  if (!hasAccess) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: `Acesso negado ao tenant ${tenantId}`,
    });
  }
}
