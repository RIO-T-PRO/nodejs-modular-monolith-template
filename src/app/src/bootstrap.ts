import express, { type Express, type Request, type Response, type NextFunction } from 'express';
import cookieParser from 'cookie-parser';
import type { AwilixContainer } from 'awilix';
import type { SharedCradle, LoadedModule, RootResources } from '@template/shared';
import { Api, AppError, createRootContainer } from '@template/shared';
import { buildModules } from './composition-root.js';
import { loadModules } from './load-modules.js';

export interface CreatedApp {
  app: Express;
  container: AwilixContainer<SharedCradle>;
  loadedModules: LoadedModule[];
  resources: RootResources;
}

const createApp = async (): Promise<CreatedApp> => {
  const app = express();
  const { container, resources } = await createRootContainer();

  app.use(express.json());
  app.use(cookieParser());

  app.get('/health', (_req, res) => res.json({ status: 'ok' }));

  const loadedModules = await loadModules(app, container, buildModules());

  app.use((req: Request, _res: Response, next: NextFunction) => {
    next(AppError.notFound(`Route not found: ${req.method} ${req.originalUrl}`));
  });

  app.use(Api.errorMiddleware());

  return { app, container, loadedModules, resources };
};

export { createApp };
