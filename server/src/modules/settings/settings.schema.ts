import { z } from 'zod';

export const updateSettingsSchema = z
  .object({
    defaultLowStockThreshold: z
      .number({
        required_error: 'defaultLowStockThreshold is required',
        invalid_type_error: 'defaultLowStockThreshold must be a number',
      })
      .int('defaultLowStockThreshold must be an integer')
      .min(0, 'defaultLowStockThreshold cannot be negative'),
  })
  .strict();

export type UpdateSettingsInput = z.infer<typeof updateSettingsSchema>;

