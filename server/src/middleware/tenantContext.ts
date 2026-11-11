import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/database';
import { AppError } from '../utils/appError';

export async function tenantContext(req: Request, _res: Response, next: NextFunction): Promise<void> {
  try {
    let tenantId = req.user?.organizationId;

    // Optional header override for multi-tenant admins or unauthenticated tenant lookups
    const headerTenantId = req.headers['x-tenant-id'] as string | undefined;
    const headerTenantSlug = req.headers['x-tenant-slug'] as string | undefined;

    if (!tenantId && headerTenantId) {
      tenantId = headerTenantId;
    }

    if (!tenantId && !headerTenantSlug) {
      return next(AppError.badRequest('Tenant context required (X-Tenant-ID or authenticated session)'));
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const org = await (prisma as any).organization.findFirst({
      where: tenantId ? { id: tenantId } : { slug: headerTenantSlug },
    });

    if (!org) {
      return next(AppError.notFound('Organization / Tenant not found'));
    }

    if (org.status !== 'ACTIVE') {
      return next(AppError.forbidden(`Organization account is currently ${org.status.toLowerCase()}`));
    }

    // If authenticated user belongs to another organization, block access
    if (req.user && req.user.organizationId !== org.id) {
      return next(AppError.forbidden('Access denied: cross-tenant access is prohibited'));
    }

    req.tenant = {
      id: org.id,
      name: org.name,
      slug: org.slug,
      plan: org.plan,
      status: org.status,
    };

    next();
  } catch (error) {
    next(error);
  }
}

