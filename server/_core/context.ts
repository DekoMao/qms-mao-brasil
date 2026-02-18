import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import { sdk } from "./sdk";
import { resolveTenantId } from "../tenantContext";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
  tenantId: number | null;
};

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  let user: User | null = null;

  try {
    user = await sdk.authenticateRequest(opts.req);
  } catch (error) {
    // Authentication is optional for public procedures.
    user = null;
  }

  // Resolve tenant from header or user preference
  const headerTenantId = opts.req.headers["x-tenant-id"] as string | undefined;
  const tenantId = await resolveTenantId(headerTenantId, user);

  return {
    req: opts.req,
    res: opts.res,
    user,
    tenantId,
  };
}
