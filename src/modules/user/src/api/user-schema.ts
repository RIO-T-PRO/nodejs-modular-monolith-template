import { z } from 'zod';

// SignUp schemas
export const SignUpSchema = z.object({
  email: z.email({ error: 'Invalid email address format' }),
  fullName: z.string().min(2, { error: 'Full name must be at least 2 characters long' }),
  password: z.string().min(8, { error: 'Password must be at least 8 characters long' }),
});

export type SignUpDto = z.infer<typeof SignUpSchema>;

export const GetUserByIdParamSchema = z.object({
  id: z.uuid({ error: 'Invalid user ID format' }),
});

export type GetUserByIdParams = z.infer<typeof GetUserByIdParamSchema>;
