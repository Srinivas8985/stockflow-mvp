import { prisma } from '../../config/database';
import { AppError } from '../../utils/appError';
import {
  CreateProductInput,
  UpdateProductInput,
  QueryProductsInput,
} from './inventory.schema';

export class InventoryService {
  /**
   * Creates a new product scoped to the authenticated organization.
   * Enforces SKU uniqueness within the organization.
   */
  async createProduct(organizationId: string, input: CreateProductInput) {
    const sku = input.sku.trim().toUpperCase();

    // Check composite uniqueness on organizationId and sku
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const existing = await (prisma as any).product.findUnique({
      where: {
        organizationId_sku: {
          organizationId,
          sku,
        },
      },
    });

    if (existing) {
      throw AppError.conflict(
        `A product with SKU "${sku}" already exists in your organization`
      );
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const product = await (prisma as any).product.create({
      data: {
        organizationId,
        name: input.name.trim(),
        sku,
        description: input.description ?? null,
        quantity: input.quantity ?? 0,
        costPrice: input.costPrice !== undefined ? input.costPrice : null,
        sellingPrice: input.sellingPrice !== undefined ? input.sellingPrice : null,
        lowStockThreshold: input.lowStockThreshold !== undefined ? input.lowStockThreshold : null,
      },
    });

    return product;
  }

  /**
   * Retrieves paginated products strictly belonging to the authenticated organization.
   * Supports search (by name and SKU) and low-stock filtering.
   */
  async getProducts(organizationId: string, query: QueryProductsInput) {
    const page = Math.max(1, query.page || 1);
    const limit = Math.max(1, Math.min(100, query.limit || 20));
    const skip = (page - 1) * limit;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {
      organizationId,
    };

    if (query.search && query.search.trim().length > 0) {
      const search = query.search.trim();
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { sku: { contains: search, mode: 'insensitive' } },
      ];
    }

    // If lowStock filter is requested, filter where quantity <= lowStockThreshold
    // Note: in Prisma we query items where lowStockThreshold is set and quantity <= lowStockThreshold
    if (query.lowStock) {
      // In PostgreSQL/Prisma, we can use a raw filter or query
      where.lowStockThreshold = { not: null };
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const productDelegate = (prisma as any).product;
    const [rawItems, total] = await Promise.all([
      productDelegate.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      productDelegate.count({ where }),
    ]);

    // Apply lowStock comparison if requested
    let items = rawItems;
    if (query.lowStock) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      items = rawItems.filter((item: any) =>
        item.lowStockThreshold !== null && item.quantity <= item.lowStockThreshold
      );
    }

    return {
      items,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  /**
   * Retrieves a single product by ID, enforcing organization ownership.
   */
  async getProductById(organizationId: string, id: string) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const product = await (prisma as any).product.findFirst({
      where: {
        id,
        organizationId,
      },
    });

    if (!product) {
      throw AppError.notFound('Product not found in your organization');
    }

    return product;
  }

  /**
   * Updates product details. Prevents changing organizationId and verifies SKU uniqueness if SKU changes.
   */
  async updateProduct(organizationId: string, id: string, input: UpdateProductInput) {
    // Verify product exists and belongs to the authenticated organization
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const existing = await (prisma as any).product.findFirst({
      where: {
        id,
        organizationId,
      },
    });

    if (!existing) {
      throw AppError.notFound('Product not found in your organization');
    }

    // Check SKU uniqueness if SKU is being updated to a new value
    if (input.sku) {
      const newSku = input.sku.trim().toUpperCase();
      if (newSku !== existing.sku) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const duplicate = await (prisma as any).product.findUnique({
          where: {
            organizationId_sku: {
              organizationId,
              sku: newSku,
            },
          },
        });

        if (duplicate) {
          throw AppError.conflict(
            `A product with SKU "${newSku}" already exists in your organization`
          );
        }
      }
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updateData: any = {};
    if (input.name !== undefined) updateData.name = input.name.trim();
    if (input.sku !== undefined) updateData.sku = input.sku.trim().toUpperCase();
    if (input.description !== undefined) updateData.description = input.description;
    if (input.costPrice !== undefined) updateData.costPrice = input.costPrice;
    if (input.sellingPrice !== undefined) updateData.sellingPrice = input.sellingPrice;
    if (input.lowStockThreshold !== undefined) updateData.lowStockThreshold = input.lowStockThreshold;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updated = await (prisma as any).product.update({
      where: { id },
      data: updateData,
    });

    return updated;
  }

  /**
   * Safely updates stock quantity with ownership verification.
   */
  async updateQuantity(organizationId: string, id: string, quantity: number) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const existing = await (prisma as any).product.findFirst({
      where: {
        id,
        organizationId,
      },
    });

    if (!existing) {
      throw AppError.notFound('Product not found in your organization');
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updated = await (prisma as any).product.update({
      where: { id },
      data: { quantity },
    });

    return updated;
  }

  /**
   * Deletes a product strictly if it belongs to the authenticated organization.
   */
  async deleteProduct(organizationId: string, id: string) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const existing = await (prisma as any).product.findFirst({
      where: {
        id,
        organizationId,
      },
    });

    if (!existing) {
      throw AppError.notFound('Product not found in your organization');
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (prisma as any).product.delete({
      where: { id },
    });

    return { id, deleted: true };
  }
}

export const inventoryService = new InventoryService();

