import {
  ApiResponse,
  HealthCheckData,
  ApiWelcomeData,
  AuthResponseData,
  RegisterInput,
  LoginInput,
  User,
  Organization,
} from '@/types';

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';

export class ApiClientError extends Error {
  public statusCode?: number;
  public details?: unknown;

  constructor(message: string, statusCode?: number, details?: unknown) {
    super(message);
    this.name = 'ApiClientError';
    this.statusCode = statusCode;
    this.details = details;
  }
}

function getStoredToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('stockflow_access_token');
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
  const url = `${API_BASE_URL}${endpoint}`;
  
  const token = getStoredToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers as Record<string, string>),
  };

  try {
    const response = await fetch(url, {
      ...options,
      headers,
    });

    const data: ApiResponse<T> = await response.json();

    if (!response.ok && !data.data) {
      throw new ApiClientError(
        data.message || `Request failed with status ${response.status}`,
        response.status,
        data.error
      );
    }

    return data;
  } catch (err) {
    if (err instanceof ApiClientError) {
      throw err;
    }
    throw new ApiClientError(
      err instanceof Error ? err.message : 'Network request failed'
    );
  }
}

export const api = {
  baseUrl: API_BASE_URL,
  getHealth: () => request<HealthCheckData>('/health'),
  getWelcome: () => request<ApiWelcomeData>('/'),

  auth: {
    register: (input: RegisterInput) =>
      request<AuthResponseData>('/auth/register', {
        method: 'POST',
        body: JSON.stringify(input),
      }),
    login: (input: LoginInput) =>
      request<AuthResponseData>('/auth/login', {
        method: 'POST',
        body: JSON.stringify(input),
      }),
    refreshToken: (refreshToken: string) =>
      request<{ accessToken: string; refreshToken: string }>('/auth/refresh', {
        method: 'POST',
        body: JSON.stringify({ refreshToken }),
      }),
    logout: (refreshToken?: string) =>
      request<null>('/auth/logout', {
        method: 'POST',
        body: JSON.stringify({ refreshToken }),
      }),
    getMe: () => request<{ user: User; organization: Organization }>('/auth/me'),
  },

  organization: {
    getCurrent: () => request<Organization>('/organization/current'),
    updateCurrent: (data: Partial<Organization>) =>
      request<Organization>('/organization/current', {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    getMembers: () => request<User[]>('/organization/members'),
  },
};
