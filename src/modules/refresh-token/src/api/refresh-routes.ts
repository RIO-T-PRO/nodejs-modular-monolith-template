import { Router } from 'express';
import type { RefreshController } from './refresh-controller.js';

export const createRefreshRoutes = (refreshController: RefreshController): Router => {
  const router = Router();

  // POST /auth/logout
  router.post('/logout', refreshController.logout);

  router.post('/refresh', refreshController.refresh);

  return router;
};
