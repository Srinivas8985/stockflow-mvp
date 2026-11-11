import { prisma } from '../../config/database';
import { hashPassword, comparePassword } from '../../utils/password';
import { signJwt } from '../../utils/jwt';
import { AppError } from '../../utils/appError';
import { SignupInput, LoginInput } from './auth.schema';

export class AuthService {
  /**
   * Registers a new organization and its initial administrator user in a single atomic transaction.
   */
  async signup(input: SignupInput) {
    const normalizedEmail = input.email.trim().toLowerCase();

    // Check if an account with this email already exists
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const existingUser = await (prisma as any).user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existingUser) {
      throw AppError.conflict('An account with this email already exists');
    }

    // Hash password securely with bcrypt
    const passwordHash = await hashPassword(input.password);

    // Create Organization and initial User atomically in a single Prisma transaction
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await (prisma as any).$transaction(async (tx: any) => {
      const organization = await tx.organization.create({
        data: {
          name: input.organizationName.trim(),
        },
      });

      const user = await tx.user.create({
        data: {
          organizationId: organization.id,
          name: input.name.trim(),
          email: normalizedEmail,
          passwordHash,
        },
      });

      return { organization, user };
    });

    // Generate JWT token containing trusted user and organization identifiers
    const token = signJwt({
      userId: result.user.id,
      organizationId: result.organization.id,
      email: result.user.email,
      name: result.user.name,
    });

    return {
      user: {
        id: result.user.id,
        organizationId: result.organization.id,
        name: result.user.name,
        email: result.user.email,
        createdAt: result.user.createdAt,
      },
      organization: {
        id: result.organization.id,
        name: result.organization.name,
        createdAt: result.organization.createdAt,
      },
      token,
    };
  }

  /**
   * Authenticates user credentials and issues a JWT token.
   * Returns a generic invalid-credentials response to avoid email enumeration.
   */
  async login(input: LoginInput) {
    const normalizedEmail = input.email.trim().toLowerCase();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const user = await (prisma as any).user.findUnique({
      where: { email: normalizedEmail },
      include: {
        organization: true,
      },
    });

    // Use generic error response whether user does not exist or password fails
    if (!user) {
      throw AppError.unauthorized('Invalid email or password');
    }

    const isPasswordValid = await comparePassword(input.password, user.passwordHash);
    if (!isPasswordValid) {
      throw AppError.unauthorized('Invalid email or password');
    }

    const token = signJwt({
      userId: user.id,
      organizationId: user.organization.id,
      email: user.email,
      name: user.name,
    });

    return {
      user: {
        id: user.id,
        organizationId: user.organization.id,
        name: user.name,
        email: user.email,
        createdAt: user.createdAt,
      },
      organization: {
        id: user.organization.id,
        name: user.organization.name,
        createdAt: user.organization.createdAt,
      },
      token,
    };
  }

  /**
   * Returns the authenticated user profile and associated organization.
   * Strictly enforces organization boundary check using authenticated context.
   */
  async getMe(userId: string, organizationId: string) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const user = await (prisma as any).user.findFirst({
      where: {
        id: userId,
        organizationId,
      },
      include: {
        organization: true,
      },
    });

    if (!user) {
      throw AppError.notFound('User profile not found');
    }

    return {
      id: user.id,
      organizationId: user.organization.id,
      name: user.name,
      email: user.email,
      createdAt: user.createdAt,
      organization: {
        id: user.organization.id,
        name: user.organization.name,
        createdAt: user.organization.createdAt,
      },
    };
  }
}

export const authService = new AuthService();
