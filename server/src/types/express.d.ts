import 'express';

export interface AuthenticatedUser {
  id: string;
  organizationId: string;
  email: string;
  name?: string;
  role?: string;
}

export interface TenantContext {
  id: string;
  name: string;
  slug?: string;
  plan?: string;
  status?: string;
}

declare module 'express-serve-static-core' {
  interface Request {
    user?: AuthenticatedUser;
    tenant?: TenantContext;
  }
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
      tenant?: TenantContext;
    }
  }
}
