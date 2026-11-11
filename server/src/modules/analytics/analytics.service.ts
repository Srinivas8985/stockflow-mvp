import { prisma } from '../../config/database';
import { AppError } from '../../utils/appError';

export interface DashboardProduct {
  id: string;
  organizationId: string;
  name: string;
  sku: string;
  description: string | null;
  quantity: number;
  costPrice: unknown;
  sellingPrice: unknown;
  lowStockThreshold: number | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface DashboardAnalyticsResponse {
  totalProducts: number;
  totalQuantity: number;
  lowStockCount: number;
  lowStockProducts: DashboardProduct[];
}

export class AnalyticsService {
  /**
   * Generates organization-scoped dashboard metrics:
   * - totalProducts: count of all products in organization
   * - totalQuantity: sum of all quantities
   * - lowStockCount: count of products where quantity <= effective threshold
   * - lowStockProducts: list of products at or below their effective threshold
   *
   * Effective threshold:
   * - product.lowStockThreshold if set
   * - organization.defaultLowStockThreshold otherwise
   */
  async getDashboardAnalytics(organizationId: string): Promise<DashboardAnalyticsResponse> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const org = await (prisma as any).organization.findUnique({
      where: { id: organizationId },
      select: { defaultLowStockThreshold: true },
    });

    if (!org) {
      throw AppError.notFound('Organization not found');
    }

    const defaultThreshold = org.defaultLowStockThreshold ?? 10;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const productDelegate = (prisma as any).product;

    const [aggregation, products] = await Promise.all([
      productDelegate.aggregate({
        where: { organizationId },
        _count: { id: true },
        _sum: { quantity: true },
      }),
      productDelegate.findMany({
        where: { organizationId },
        orderBy: [
          { quantity: 'asc' },
          { createdAt: 'desc' },
        ],
      }),
    ]);

    const totalProducts = aggregation._count?.id ?? 0;
    const totalQuantity = aggregation._sum?.quantity ?? 0;

    if (totalProducts === 0) {
      return {
        totalProducts: 0,
        totalQuantity: 0,
        lowStockCount: 0,
        lowStockProducts: [],
      };
    }

    const lowStockProducts = (products as DashboardProduct[]).filter((product: DashboardProduct) => {
      const effectiveThreshold =
        product.lowStockThreshold !== null && product.lowStockThreshold !== undefined
          ? product.lowStockThreshold
          : defaultThreshold;

      return product.quantity <= effectiveThreshold;
    });

    return {
      totalProducts,
      totalQuantity,
      lowStockCount: lowStockProducts.length,
      lowStockProducts,
    };
  }
}

export const analyticsService = new AnalyticsService();

