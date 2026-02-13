import { useAuth } from '@/contexts/AuthContext';

export type Resource =
  | 'users'
  | 'connections'
  | 'recommendations'
  | 'executions'
  | 'kill_switch'
  | 'audit_logs'
  | 'dashboard';

export type Action = 'create' | 'read' | 'update' | 'delete' | 'execute' | 'approve';

/**
 * Hook to check user permissions
 */
export function usePermission() {
  const { hasPermission: can, hasRole, isSuperAdmin } = useAuth();

  /**
   * Check if user can perform specific action on resource
   */
  const canPerform = (resource: Resource, action: Action): boolean => {
    return can(resource, action);
  };

  /**
   * Check if user can perform any of the specified actions
   */
  const canAny = (checks: Array<{ resource: Resource; action: Action }>): boolean => {
    return checks.some(({ resource, action }) => can(resource, action));
  };

  /**
   * Check if user can perform all of the specified actions
   */
  const canAll = (checks: Array<{ resource: Resource; action: Action }>): boolean => {
    return checks.every(({ resource, action }) => can(resource, action));
  };

  /**
   * Check if user has specific role(s)
   */
  const hasAnyRole = (...roles: string[]): boolean => {
    return hasRole(...roles);
  };

  return {
    can: canPerform,
    canAny,
    canAll,
    hasRole: hasAnyRole,
    isSuperAdmin,
  };
}
