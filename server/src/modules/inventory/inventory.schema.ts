import { z } from 'zod';

export const createProductSchema = z.object({
  name: z
    .string({ required_error: 'Product name is required' })
    .trim()
    .min(1, 'Product name cannot be empty')
    .max(200, 'Product name must be 200 characters or fewer'),
  sku: z
    .string({ required_error: 'SKU is required' })
    .trim()
    .min(1, 'SKU cannot be empty')
    .max(100, 'SKU must be 100 characters or fewer')
    .toUpperCase(),
  description: z.string().trim().max(2000).optional().nullable(),
  quantity: z
    .number({ invalid_type_error: 'Quantity must be a number' })
    .int('Quantity must be an integer')
    .min(0, 'Quantity cannot be negative')
    .default(0),
  costPrice: z
    .number({ invalid_type_error: 'Cost price must be a number' })
    .min(0, 'Cost price cannot be negative')
    .optional()
    .nullable(),
  sellingPrice: z
    .number({ invalid_type_error: 'Selling price must be a number' })
    .min(0, 'Selling price cannot be negative')
    .optional()
    .nullable(),
  lowStockThreshold: z
    .number({ invalid_type_error: 'Low stock threshold must be a number' })
    .int('Low stock threshold must be an integer')
    .min(0, 'Low stock threshold cannot be negative')
    .optional()
    .nullable(),
});

export const updateProductSchema = z
  .object({
    name: z.string().trim().min(1, 'Product name cannot be empty').max(200).optional(),
    sku: z.string().trim().min(1, 'SKU cannot be empty').max(100).toUpperCase().optional(),
    description: z.string().trim().max(2000).optional().nullable(),
    costPrice: z.number().min(0, 'Cost price cannot be negative').optional().nullable(),
    sellingPrice: z.number().min(0, 'Selling price cannot be negative').optional().nullable(),
    lowStockThreshold: z
      .number()
      .int('Low stock threshold must be an integer')
      .min(0, 'Low stock threshold cannot be negative')
      .optional()
      .nullable(),
  })
  .strict(); // Rejects unallowed properties like organizationId

export const updateQuantitySchema = z.object({
  quantity: z
    .number({ required_error: 'Quantity is required', invalid_type_error: 'Quantity must be a number' })
    .int('Quantity must be an integer')
    .min(0, 'Quantity cannot be negative'),
});

export const queryProductsSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().optional(),
  lowStock: z
    .union([z.boolean(), z.enum(['true', 'false'])])
    .transform((val) => val === true || val === 'true')
    .optional(),
});

export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
export type UpdateQuantityInput = z.infer<typeof updateQuantitySchema>;
export type QueryProductsInput = z.infer<typeof queryProductsSchema>;

