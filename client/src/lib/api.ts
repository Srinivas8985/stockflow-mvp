import {
  ApiResponse,
  HealthCheckData,
  ApiWelcomeData,
  AuthResponseData,
  SignupInput,
  LoginInput,
  Organization,
  Product,
  CreateProductInput,
  UpdateProductInput,
  ProductsQuery,
  DashboardAnalytics,
  OrganizationSettings,
  UpdateSettingsInput,
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

    if (!response.ok) {
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

  products: {
    list: (query?: ProductsQuery) => {
      const params = new URLSearchParams();
      if (query?.page) params.append('page', String(query.page));
      if (query?.limit) params.append('limit', String(query.limit));
      if (query?.search && query.search.trim()) params.append('search', query.search.trim());
      if (query?.lowStock !== undefined) params.append('lowStock', String(query.lowStock));

      const qs = params.toString();
      return request<Product[]>(`/products${qs ? `?${qs}` : ''}`);
    },
    getById: (id: string) => request<Product>(`/products/${id}`),
    create: (input: CreateProductInput) =>
      request<Product>('/products', {
        method: 'POST',
        body: JSON.stringify(input),
      }),
    update: (id: string, input: UpdateProductInput) =>
      request<Product>(`/products/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(input),
      }),
    updateQuantity: (id: string, quantity: number) =>
      request<Product>(`/products/${id}/quantity`, {
        method: 'PATCH',
        body: JSON.stringify({ quantity }),
      }),
    delete: (id: string) =>
      request<{ id: string; deleted: boolean }>(`/products/${id}`, {
        method: 'DELETE',
      }),
  },

  analytics: {
    getDashboard: () => request<DashboardAnalytics>('/analytics/dashboard'),
  },

  settings: {
    get: () => request<OrganizationSettings>('/settings'),
    update: (input: UpdateSettingsInput) =>
      request<OrganizationSettings>('/settings', {
        method: 'PATCH',
        body: JSON.stringify(input),
      }),
  },
};
