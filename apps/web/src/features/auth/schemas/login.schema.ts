import { z } from 'zod';

export const loginSchema = z.object({
  identifier: z
    .string()
    .min(1, 'Email or username is required')
    .trim(),
  password: z
    .string()
    .min(1, 'Password is required'),
  twoFactorCode: z
    .string()
    .optional()
    .transform(val => val && val.length === 6 ? val : undefined),
});

export type LoginFormData = z.infer<typeof loginSchema>;
