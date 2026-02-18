import { NOT_ADMIN_ERR_MSG, UNAUTHED_ERR_MSG } from '@shared/const';
import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import type { TrpcContext } from "./context";

const t = initTRPC.context<TrpcContext>().create({
  transformer: superjson,
});

export const router = t.router;
export const publicProcedure = t.procedure;

const requireUser = t.middleware(async opts => {
  const { ctx, next } = opts;

  if (!ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
  }

  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
    },
  });
});

export const protectedProcedure = t.procedure.use(requireUser);

/**
 * Tenant-aware procedure: requires auth + resolves and validates tenant access.
 * Injects ctx.tenantId (guaranteed non-null).
 */
const requireTenant = t.middleware(async (opts) => {
  const { ctx, next } = opts;
  if (!ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
  }
  if (!ctx.tenantId) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Nenhum tenant ativo. Selecione uma organização.",
    });
  }
  // Validate access
  const { assertTenantAccess } = await import("../tenantContext");
  await assertTenantAccess(ctx.user.id, ctx.tenantId);

  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
      tenantId: ctx.tenantId,
    },
  });
});

export const tenantProcedure = t.procedure.use(requireTenant);

/**
 * RBAC-aware procedure: checks if user has a specific permission.
 * Usage: authorizedProcedure("defects", "delete").mutation(...)
 */
export const authorizedProcedure = (resource: string, action: string) =>
  t.procedure.use(
    t.middleware(async (opts) => {
      const { ctx, next } = opts;
      if (!ctx.user) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
      }
      // Dynamic import to avoid circular dependency
      const { hasPermission } = await import("../db");
      const allowed = await hasPermission(ctx.user.id, resource, action);
      if (!allowed) {
        // Fallback: admin always has access
        if (ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: `Permissão negada: ${resource}:${action}` });
        }
      }
      return next({ ctx: { ...ctx, user: ctx.user } });
    })
  );

export const adminProcedure = t.procedure.use(
  t.middleware(async opts => {
    const { ctx, next } = opts;

    if (!ctx.user || ctx.user.role !== 'admin') {
      throw new TRPCError({ code: "FORBIDDEN", message: NOT_ADMIN_ERR_MSG });
    }

    return next({
      ctx: {
        ...ctx,
        user: ctx.user,
      },
    });
  }),
);
