import { prisma } from '../../config/database';
import { AppError } from '../../utils/appError';
import { hashPassword } from '../../utils/security';
import { UpdateOrganizationInput, InviteMemberInput } from './organization.schema';

export class OrganizationService {
  async getOrganizationDetails(organizationId: string) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const org = await (prisma as any).organization.findUnique({
      where: { id: organizationId },
      include: {
        _count: {
          select: { users: true },
        },
      },
    });

    if (!org) {
      throw AppError.notFound('Organization not found');
    }

    return {
      id: org.id,
      name: org.name,
      slug: org.slug,
      plan: org.plan,
      status: org.status,
      memberCount: org._count.users,
      createdAt: org.createdAt,
    };
  }

  async updateOrganization(organizationId: string, input: UpdateOrganizationInput) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updated = await (prisma as any).organization.update({
      where: { id: organizationId },
      data: input,
    });

    return {
      id: updated.id,
      name: updated.name,
      slug: updated.slug,
      plan: updated.plan,
      status: updated.status,
    };
  }

  async getMembers(organizationId: string) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const members = await (prisma as any).user.findMany({
      where: { organizationId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    return members;
  }

  async addMember(organizationId: string, input: InviteMemberInput) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const existing = await (prisma as any).user.findUnique({
      where: {
        organizationId_email: {
          organizationId,
          email: input.email,
        },
      },
    });

    if (existing) {
      throw AppError.conflict('A user with this email already exists in your organization');
    }

    const passwordHash = await hashPassword(input.temporaryPassword);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const newUser = await (prisma as any).user.create({
      data: {
        organizationId,
        email: input.email,
        passwordHash,
        firstName: input.firstName,
        lastName: input.lastName,
        role: input.role,
        isActive: true,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        createdAt: true,
      },
    });

    return newUser;
  }
}

export const organizationService = new OrganizationService();

