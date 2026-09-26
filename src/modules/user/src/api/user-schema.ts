import { z } from 'zod';

export const GetUserByIdParamSchema = z.object({
  id: z.uuid(),
});

export const SignUpSchema = z.object({
  email: z.email(),
  fullName: z.string().min(2),
  password: z.string().min(8),
});

export const SignInSchema = z.object({
  email: z.email(),
  password: z.string(),
});

export const UpdateUserSchema = z.object({
  fullName: z.string().min(2).optional(),
  email: z.email().optional(),
  status: z.enum(['ACTIVE', 'INACTIVE', 'SUSPENDED']).optional(),
});

export type GetUserByIdParams = z.infer<typeof GetUserByIdParamSchema>;
export type SignUpDto = z.infer<typeof SignUpSchema>;
export type SignInDto = z.infer<typeof SignInSchema>;
export type UpdateUserDto = z.infer<typeof UpdateUserSchema>;
