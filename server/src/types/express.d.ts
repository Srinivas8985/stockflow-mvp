export interface AuthenticatedUser {
  id: string;
  email: string;
  role: string;
  organizationId: string;
  organizationSlug: string;
}

export interface TenantContext {
  id: string;
  name: string;
  slug: string;
  plan: string;
  status: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
      tenant?: TenantContext;
    }
  }
}

