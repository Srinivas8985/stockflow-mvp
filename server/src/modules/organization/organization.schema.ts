import { z } from 'zod';

export const updateOrganizationSchema = z.object({
  name: z
    .string({ required_error: 'Organization name is required' })
    .trim()
    .min(1, 'Organization name cannot be empty')
    .max(100, 'Organization name must be 100 characters or fewer'),
});

export type UpdateOrganizationInput = z.infer<typeof updateOrganizationSchema>;
