import { Router } from 'express';
import { Validate } from '@template/shared';
import {
  SignUpSchema,
  // GetUserByIdParamSchema
} from './user-schema.js';
import type { UserController } from './user-controller.js';

export const createUserRoutes = (userController: UserController): Router => {
  const router = Router();

  router.post('/signup', Validate.body(SignUpSchema), userController.signUp);

  //    router.get(
  //     '/:id',
  //     Validate.params(GetUserByIdParamSchema),
  //     userController.getById,
  //   );

  return router;
};
