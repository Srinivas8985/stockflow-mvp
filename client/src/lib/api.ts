import {
  ApiResponse,
  HealthCheckData,
  ApiWelcomeData,
  AuthResponseData,
  SignupInput,
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
  return localStorage.getItem('stockflow_token');
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
    signup: (input: SignupInput) =>
      request<AuthResponseData>('/auth/signup', {
        method: 'POST',
        body: JSON.stringify(input),
      }),
    login: (input: LoginInput) =>
      request<AuthResponseData>('/auth/login', {
        method: 'POST',
        body: JSON.stringify(input),
      }),
    getMe: () =>
      request<{
        id: string;
        organizationId: string;
        name: string;
        email: string;
        organization: Organization;
      }>('/auth/me'),
  },

  organization: {
    getCurrent: () => request<Organization>('/organization/current'),
    updateCurrent: (data: { name: string }) =>
      request<Organization>('/organization/current', {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
  },
};
