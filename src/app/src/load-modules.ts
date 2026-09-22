import type { Express } from 'express';
import type { AwilixContainer } from 'awilix';
import type { SharedCradle } from '@template/shared';
import { logger } from '@template/shared';
import type { AppModule, LoadedModule } from '@template/shared';

const orderByDependencies = (modules: AppModule[]): AppModule[] => {
  const byName = new Map(modules.map((m) => [m.name, m]));
  const ordered: AppModule[] = [];
  const visited = new Set<string>();
  const visiting = new Set<string>();

  const visit = (mod: AppModule) => {
    if (visited.has(mod.name)) return;
    if (visiting.has(mod.name)) {
      throw new Error(`Circular module dependency detected at "${mod.name}"`);
    }
    visiting.add(mod.name);
    for (const depName of mod.dependsOn ?? []) {
      const dep = byName.get(depName);
      if (!dep) {
        throw new Error(`Module "${mod.name}" depends on unknown module "${depName}"`);
      }
      visit(dep);
    }
    visiting.delete(mod.name);
    visited.add(mod.name);
    ordered.push(mod);
  };

  for (const mod of modules) visit(mod);
  return ordered;
};

/**
 * Boots every module against the same Express app + root container, in
 * dependency order. To add a module: implement AppModule in its package,
 * add it to the `modules` array in bootstrap.ts. Nothing else in the shell
 * changes.
 */
export const loadModules = async (
  app: Express,
  root: AwilixContainer<SharedCradle>,
  modules: AppModule[],
): Promise<LoadedModule[]> => {
  const ordered = orderByDependencies(modules);
  const loaded: LoadedModule[] = [];

  for (const mod of ordered) {
    const result = await mod.register(root);
    app.use(result.basePath, result.router);
    loaded.push(result);
    logger.info({ module: result.name, basePath: result.basePath }, 'Module loaded');
  }

  return loaded;
};

export const disposeModules = async (loaded: LoadedModule[]): Promise<void> => {
  for (const mod of [...loaded].reverse()) {
    await mod.dispose();
    logger.info({ module: mod.name }, 'Module disposed');
  }
};
