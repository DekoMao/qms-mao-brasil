import { usePermissions } from "@/hooks/usePermissions";
import { useAuth } from "@/_core/hooks/useAuth";
import type { ReactNode } from "react";

type CanProps = {
  /** Resource name (e.g., "defects", "rbac", "workflow") */
  resource: string;
  /** Action name (e.g., "read", "create", "manage", "delete") */
  action: string;
  /** Content to render when permission is granted */
  children: ReactNode;
  /** Optional fallback content when permission is denied */
  fallback?: ReactNode;
  /** If true, also allows admin users regardless of specific permissions */
  allowAdmin?: boolean;
};

/**
 * Declarative permission gate component.
 * Renders children only if the current user has the specified permission.
 * 
 * Usage:
 * ```tsx
 * <Can resource="rbac" action="manage">
 *   <Button>Manage Roles</Button>
 * </Can>
 * 
 * <Can resource="defects" action="delete" fallback={<span>No access</span>}>
 *   <Button variant="destructive">Delete</Button>
 * </Can>
 * ```
 */
export function Can({ resource, action, children, fallback = null, allowAdmin = true }: CanProps) {
  const { can, isAdmin, isLoading } = usePermissions();
  const { user } = useAuth();

  // While loading, don't render anything to avoid flicker
  if (isLoading) return null;

  // Admin bypass: admin users always have access
  if (allowAdmin && (isAdmin || user?.role === "admin")) {
    return <>{children}</>;
  }

  // Check specific permission
  if (can(resource, action)) {
    return <>{children}</>;
  }

  return <>{fallback}</>;
}

/**
 * Hook version for imperative permission checks.
 * Useful when you need to conditionally execute logic, not just render.
 */
export function useCan(resource: string, action: string): boolean {
  const { can, isAdmin } = usePermissions();
  const { user } = useAuth();
  
  if (isAdmin || user?.role === "admin") return true;
  return can(resource, action);
}
