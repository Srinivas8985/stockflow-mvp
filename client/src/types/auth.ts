export type OrganizationRole = 'OWNER' | 'ADMIN' | 'MANAGER' | 'MEMBER';
export type OrganizationPlan = 'FREE' | 'STARTER' | 'PRO' | 'ENTERPRISE';

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: OrganizationRole;
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
  plan: OrganizationPlan;
  status: string;
  memberCount?: number;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthResponseData {
  user: User;
  organization: Organization;
  tokens: AuthTokens;
}

export interface RegisterInput {
  organizationName: string;
  organizationSlug?: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

export interface LoginInput {
  email: string;
  password: string;
  organizationSlug?: string;
}

