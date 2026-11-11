import { prisma } from '../../config/database';
import { AppError } from '../../utils/appError';
import { UpdateOrganizationInput } from './organization.schema';

export class OrganizationService {
  /**
   * Retrieves organization details strictly using the authenticated user's organizationId.
   */
  async getOrganizationDetails(organizationId: string) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const org = await (prisma as any).organization.findUnique({
      where: { id: organizationId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            createdAt: true,
          },
        },
      },
    });

    if (!org) {
      throw AppError.notFound('Organization not found');
    }

    return org;
  }

  /**
   * Updates organization details ensuring tenant isolation.
   */
  async updateOrganization(organizationId: string, input: UpdateOrganizationInput) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const org = await (prisma as any).organization.findUnique({
      where: { id: organizationId },
    });

    if (!org) {
      throw AppError.notFound('Organization not found');
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updated = await (prisma as any).organization.update({
      where: { id: organizationId },
      data: {
        name: input.name,
      },
    });

    return updated;
  }
}

export const organizationService = new OrganizationService();
