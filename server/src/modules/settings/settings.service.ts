import { prisma } from '../../config/database';
import { AppError } from '../../utils/appError';
import { UpdateSettingsInput } from './settings.schema';

export class SettingsService {
  /**
   * Retrieves organization settings strictly scoped to the authenticated tenant.
   */
  async getSettings(organizationId: string) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const org = await (prisma as any).organization.findUnique({
      where: { id: organizationId },
      select: {
        id: true,
        name: true,
        defaultLowStockThreshold: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!org) {
      throw AppError.notFound('Organization not found');
    }

    return org;
  }

  /**
   * Updates organization settings ensuring tenant isolation and preserving existing fields.
   */
  async updateSettings(organizationId: string, input: UpdateSettingsInput) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const existing = await (prisma as any).organization.findUnique({
      where: { id: organizationId },
    });

    if (!existing) {
      throw AppError.notFound('Organization not found');
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updated = await (prisma as any).organization.update({
      where: { id: organizationId },
      data: {
        defaultLowStockThreshold: input.defaultLowStockThreshold,
      },
      select: {
        id: true,
        name: true,
        defaultLowStockThreshold: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return updated;
  }
}

export const settingsService = new SettingsService();

