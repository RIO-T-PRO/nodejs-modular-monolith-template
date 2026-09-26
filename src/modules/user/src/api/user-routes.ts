import { Router } from 'express';
import { Validate } from '@template/shared';
import { SignUpSchema, GetUserByIdParamSchema, SignInSchema } from './user-schema.js';
import type { UserController } from './user-controller.js';

export const createUserRoutes = (userController: UserController): Router => {
  const router = Router();

  router.post('/signup', Validate.body(SignUpSchema), userController.signUp);

  router.post('/signin', Validate.body(SignInSchema), userController.signIn);

  router.get('/:id', Validate.params(GetUserByIdParamSchema), userController.getUserById);

  return router;
};
