import { trpc } from "@/lib/trpc";
import { useMemo } from "react";

/**
 * Hook to get the current user's RBAC permissions.
 * Returns a set of "resource:action" strings for fast lookup.
 */
export function usePermissions() {
  const { data, isLoading, error } = trpc.rbac.myRoles.useQuery(undefined, {
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    refetchOnWindowFocus: false,
  });

  const permissionSet = useMemo(() => {
    const set = new Set<string>();
    if (data?.permissions) {
      for (const p of data.permissions) {
        set.add(`${p.resource}:${p.action}`);
      }
    }
    return set;
  }, [data?.permissions]);

  const roles = useMemo(() => {
    return data?.roles?.map((r: any) => r.roleName) || [];
  }, [data?.roles]);

  const can = (resource: string, action: string): boolean => {
    return permissionSet.has(`${resource}:${action}`);
  };

  const hasRole = (roleName: string): boolean => {
    return roles.includes(roleName);
  };

  const isAdmin = roles.includes("Administrador") || roles.includes("SQA Manager");

  return {
    permissions: permissionSet,
    roles,
    can,
    hasRole,
    isAdmin,
    isLoading,
    error,
  };
}
