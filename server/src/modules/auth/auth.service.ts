import { prisma } from '../../config/database';
import {
  hashPassword,
  verifyPassword,
  generateAccessToken,
  generateRefreshToken,
  hashToken,
} from '../../utils/security';
import { AppError } from '../../utils/appError';
import { RegisterInput, LoginInput } from './auth.schema';

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export class AuthService {
  async register(input: RegisterInput) {
    const slug = input.organizationSlug ? slugify(input.organizationSlug) : slugify(input.organizationName);

    // Check slug collision
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const existingOrg = await (prisma as any).organization.findUnique({
      where: { slug },
    });

    if (existingOrg) {
      throw AppError.conflict('An organization with this slug/name already exists. Please choose a unique name.');
    }

    const passwordHash = await hashPassword(input.password);

    // Atomically create Organization and initial Owner
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await (prisma as any).$transaction(async (tx: any) => {
      const org = await tx.organization.create({
        data: {
          name: input.organizationName,
          slug,
          plan: 'FREE',
          status: 'ACTIVE',
        },
      });

      const user = await tx.user.create({
        data: {
          organizationId: org.id,
          email: input.email,
          passwordHash,
          firstName: input.firstName,
          lastName: input.lastName,
          role: 'OWNER',
          isActive: true,
        },
      });

      return { org, user };
    });

    // Issue tokens
    const tokenPayload = {
      userId: result.user.id,
      email: result.user.email,
      role: result.user.role,
      organizationId: result.org.id,
      organizationSlug: result.org.slug,
    };

    const accessToken = generateAccessToken(tokenPayload);
    const { rawToken, tokenHash, expiresAt } = generateRefreshToken();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (prisma as any).refreshToken.create({
      data: {
        userId: result.user.id,
        tokenHash,
        expiresAt,
      },
    });

    return {
      user: {
        id: result.user.id,
        email: result.user.email,
        firstName: result.user.firstName,
        lastName: result.user.lastName,
        role: result.user.role,
      },
      organization: {
        id: result.org.id,
        name: result.org.name,
        slug: result.org.slug,
        plan: result.org.plan,
      },
      tokens: {
        accessToken,
        refreshToken: rawToken,
      },
    };
  }

  async login(input: LoginInput) {
    let whereClause: Record<string, unknown> = { email: input.email };

    if (input.organizationSlug) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const org = await (prisma as any).organization.findUnique({
        where: { slug: input.organizationSlug },
      });
      if (!org) {
        throw AppError.unauthorized('Invalid organization or user credentials');
      }
      whereClause = {
        organizationId: org.id,
        email: input.email,
      };
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const user = await (prisma as any).user.findFirst({
      where: whereClause,
      include: {
        organization: true,
      },
    });

    if (!user) {
      throw AppError.unauthorized('Invalid email or password');
    }

    if (!user.isActive) {
      throw AppError.forbidden('User account is deactivated. Please contact your organization administrator.');
    }

    if (user.organization.status !== 'ACTIVE') {
      throw AppError.forbidden('Organization account is suspended.');
    }

    const isMatch = await verifyPassword(input.password, user.passwordHash);
    if (!isMatch) {
      throw AppError.unauthorized('Invalid email or password');
    }

    // Issue tokens
    const tokenPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
      organizationId: user.organization.id,
      organizationSlug: user.organization.slug,
    };

    const accessToken = generateAccessToken(tokenPayload);
    const { rawToken, tokenHash, expiresAt } = generateRefreshToken();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (prisma as any).refreshToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt,
      },
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
      },
      organization: {
        id: user.organization.id,
        name: user.organization.name,
        slug: user.organization.slug,
        plan: user.organization.plan,
      },
      tokens: {
        accessToken,
        refreshToken: rawToken,
      },
    };
  }

  async refreshToken(rawRefreshToken: string) {
    const hashed = hashToken(rawRefreshToken);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const storedToken = await (prisma as any).refreshToken.findUnique({
      where: { tokenHash: hashed },
      include: {
        user: {
          include: { organization: true },
        },
      },
    });

    if (!storedToken || storedToken.revoked || storedToken.expiresAt < new Date()) {
      throw AppError.unauthorized('Invalid or expired refresh token');
    }

    if (!storedToken.user.isActive || storedToken.user.organization.status !== 'ACTIVE') {
      throw AppError.forbidden('Account is no longer active');
    }

    // Token rotation: Revoke old token
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (prisma as any).refreshToken.update({
      where: { id: storedToken.id },
      data: { revoked: true },
    });

    // Issue new pair
    const tokenPayload = {
      userId: storedToken.user.id,
      email: storedToken.user.email,
      role: storedToken.user.role,
      organizationId: storedToken.user.organization.id,
      organizationSlug: storedToken.user.organization.slug,
    };

    const newAccessToken = generateAccessToken(tokenPayload);
    const { rawToken, tokenHash, expiresAt } = generateRefreshToken();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (prisma as any).refreshToken.create({
      data: {
        userId: storedToken.user.id,
        tokenHash,
        expiresAt,
      },
    });

    return {
      accessToken: newAccessToken,
      refreshToken: rawToken,
    };
  }

  async logout(rawRefreshToken: string) {
    const hashed = hashToken(rawRefreshToken);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (prisma as any).refreshToken.updateMany({
      where: { tokenHash: hashed },
      data: { revoked: true },
    });
  }

  async getMe(userId: string) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const user = await (prisma as any).user.findUnique({
      where: { id: userId },
      include: { organization: true },
    });

    if (!user) {
      throw AppError.notFound('User not found');
    }

    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      organization: {
        id: user.organization.id,
        name: user.organization.name,
        slug: user.organization.slug,
        plan: user.organization.plan,
        status: user.organization.status,
      },
    };
  }
}

export const authService = new AuthService();

