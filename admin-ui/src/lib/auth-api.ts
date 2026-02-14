/**
 * Auth API Client
 * Handles all authentication-related API calls
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001';

export interface User {
  id: string;
  email: string;
  fullName: string;
  role: 'super_admin' | 'admin' | 'dba' | 'developer' | 'viewer';
  tenantId: string;
  avatarUrl: string | null;
  emailVerified: boolean;
  lastLoginAt: string | null;
  createdAt: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface RegisterCredentials {
  email: string;
  password: string;
  fullName: string;
}

export interface LoginResponse {
  success: boolean;
  accessToken: string;
  refreshToken: string;
  user: User;
  expiresIn: number;
}

export interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: string[];
  };
}

class AuthAPI {
  private baseURL: string;

  constructor(baseURL: string = API_BASE_URL) {
    this.baseURL = baseURL;
  }

  /**
   * Login with email and password
   */
  async login(credentials: LoginCredentials): Promise<LoginResponse> {
    const response = await fetch(`${this.baseURL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include', // Include cookies
      body: JSON.stringify(credentials),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error?.message || 'Login failed');
    }

    return data;
  }

  /**
   * Register with email and password
   */
  async register(credentials: RegisterCredentials): Promise<LoginResponse> {
    const response = await fetch(`${this.baseURL}/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify(credentials),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error?.message || 'Registration failed');
    }

    return data;
  }

  /**
   * Get Google OAuth URL
   */
  getGoogleAuthUrl(): string {
    return `${this.baseURL}/auth/google`;
  }

  /**
   * Logout
   */
  async logout(): Promise<void> {
    const response = await fetch(`${this.baseURL}/auth/logout`, {
      method: 'POST',
      credentials: 'include',
    });

    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error?.message || 'Logout failed');
    }
  }

  /**
   * Get current user profile
   */
  async getCurrentUser(): Promise<User> {
    const response = await fetch(`${this.baseURL}/auth/me`, {
      method: 'GET',
      credentials: 'include',
    });

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('UNAUTHORIZED');
      }
      const data = await response.json();
      throw new Error(data.error?.message || 'Failed to get user');
    }

    const data = await response.json();
    return data.user;
  }

  /**
   * Refresh access token
   */
  async refreshToken(): Promise<{ accessToken: string; expiresIn: number }> {
    const response = await fetch(`${this.baseURL}/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error('REFRESH_FAILED');
    }

    const data = await response.json();
    return {
      accessToken: data.accessToken,
      expiresIn: data.expiresIn,
    };
  }

  /**
   * Change password
   */
  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    const response = await fetch(`${this.baseURL}/auth/change-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({ currentPassword, newPassword }),
    });

    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error?.message || 'Failed to change password');
    }
  }

  /**
   * Get active sessions
   */
  async getSessions(): Promise<any[]> {
    const response = await fetch(`${this.baseURL}/auth/sessions`, {
      method: 'GET',
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error('Failed to get sessions');
    }

    const data = await response.json();
    return data.sessions;
  }

  /**
   * Revoke all other sessions
   */
  async revokeAllOtherSessions(): Promise<number> {
    const response = await fetch(`${this.baseURL}/auth/sessions/revoke-all`, {
      method: 'POST',
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error('Failed to revoke sessions');
    }

    const data = await response.json();
    return data.revokedCount;
  }
}

export const authAPI = new AuthAPI();
