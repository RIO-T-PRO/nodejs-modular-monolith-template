import express, { type Express, type Request, type Response } from 'express';
import cookieParser from 'cookie-parser';
import type { AwilixContainer } from 'awilix';
import type { AppModule, SharedCradle, LoadedModule, RootResources } from '@template/shared';
import { Api, createRootContainer } from '@template/shared';
import { usersModule } from '@template/users-module';
import { loadModules } from './load-modules.js';

const modules: AppModule[] = [usersModule];

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

  const loadedModules = await loadModules(app, container, modules);

  app.use((req: Request, res: Response) => {
    Api.fail(
      { code: 'NOT_FOUND', message: `Route not found: ${req.method} ${req.originalUrl}` },
      { status: 404 },
    ).send(res);
  });

  app.use(Api.errorMiddleware());

  return { app, container, loadedModules, resources };
};

export { createApp };
