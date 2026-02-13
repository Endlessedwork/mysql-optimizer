'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { authAPI, User, LoginCredentials } from '@/lib/auth-api';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  hasPermission: (resource: string, action: string) => boolean;
  hasRole: (...roles: string[]) => boolean;
  isSuperAdmin: () => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  /**
   * Load user from API on mount
   */
  const loadUser = useCallback(async () => {
    try {
      const currentUser = await authAPI.getCurrentUser();
      setUser(currentUser);
    } catch (error: any) {
      if (error.message === 'UNAUTHORIZED') {
        setUser(null);
        // Redirect to login if not already there
        if (pathname !== '/login') {
          router.push('/login');
        }
      }
    } finally {
      setIsLoading(false);
    }
  }, [pathname, router]);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  /**
   * Login handler
   */
  const login = useCallback(
    async (credentials: LoginCredentials) => {
      try {
        const response = await authAPI.login(credentials);
        setUser(response.user);
        router.push('/admin');
      } catch (error: any) {
        throw error;
      }
    },
    [router]
  );

  /**
   * Logout handler
   */
  const logout = useCallback(async () => {
    try {
      await authAPI.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setUser(null);
      router.push('/login');
    }
  }, [router]);

  /**
   * Refresh user data
   */
  const refreshUser = useCallback(async () => {
    try {
      const currentUser = await authAPI.getCurrentUser();
      setUser(currentUser);
    } catch (error) {
      console.error('Refresh user error:', error);
      setUser(null);
    }
  }, []);

  /**
   * Check if user has specific permission
   */
  const hasPermission = useCallback(
    (resource: string, action: string): boolean => {
      if (!user) return false;

      // Permission matrix (matches backend)
      const PERMISSIONS: Record<string, Record<string, string[]>> = {
        super_admin: {
          users: ['create', 'read', 'update', 'delete'],
          connections: ['create', 'read', 'update', 'delete'],
          recommendations: ['read', 'approve', 'execute'],
          executions: ['read', 'execute'],
          kill_switch: ['execute'],
          audit_logs: ['read'],
          dashboard: ['read'],
        },
        admin: {
          users: ['create', 'read', 'update', 'delete'],
          connections: ['create', 'read', 'update', 'delete'],
          recommendations: ['read', 'approve', 'execute'],
          executions: ['read', 'execute'],
          kill_switch: ['execute'],
          audit_logs: ['read'],
          dashboard: ['read'],
        },
        dba: {
          users: [],
          connections: ['create', 'read', 'update', 'delete'],
          recommendations: ['read', 'approve', 'execute'],
          executions: ['read', 'execute'],
          kill_switch: ['execute'],
          audit_logs: ['read'],
          dashboard: ['read'],
        },
        developer: {
          users: [],
          connections: ['read'],
          recommendations: ['read'],
          executions: ['read'],
          kill_switch: [],
          audit_logs: ['read'],
          dashboard: ['read'],
        },
        viewer: {
          users: [],
          connections: ['read'],
          recommendations: ['read'],
          executions: ['read'],
          kill_switch: [],
          audit_logs: ['read'],
          dashboard: ['read'],
        },
      };

      const rolePermissions = PERMISSIONS[user.role];
      if (!rolePermissions) return false;

      const resourcePermissions = rolePermissions[resource];
      if (!resourcePermissions) return false;

      return resourcePermissions.includes(action);
    },
    [user]
  );

  /**
   * Check if user has specific role(s)
   */
  const hasRole = useCallback(
    (...roles: string[]): boolean => {
      if (!user) return false;
      return roles.includes(user.role);
    },
    [user]
  );

  /**
   * Check if user is super admin
   */
  const isSuperAdmin = useCallback((): boolean => {
    return user?.role === 'super_admin';
  }, [user]);

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated: !!user,
    login,
    logout,
    refreshUser,
    hasPermission,
    hasRole,
    isSuperAdmin,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/**
 * Hook to use auth context
 */
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
