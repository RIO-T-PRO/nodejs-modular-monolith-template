import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// 1. Prevent dotenv from loading local .env files that leak variables (like REDIS_URL) into tests
vi.mock('dotenv/config', () => ({}));

describe('Environment Variables Validation', () => {
  const originalConsoleError = console.error;

  // Store original NODE_ENV to restore it later
  const originalNodeEnv = process.env.NODE_ENV;

  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
    console.error = vi.fn();
  });

  afterEach(() => {
    console.error = originalConsoleError;

    // Restore the Vitest default NODE_ENV
    if (originalNodeEnv !== undefined) {
      process.env.NODE_ENV = originalNodeEnv;
    }
  });

  it('should parse successfully with minimum required variables and apply defaults', async () => {
    vi.stubEnv('DATABASE_URL', 'postgres://user:pass@localhost:5432/db');

    // 2. Explicitly remove Vitest's NODE_ENV='test' to trigger the Zod default
    delete process.env.NODE_ENV;

    // Notice we use the .js extension if you have "type": "module" in package.json
    const { env } = await import('./env.js');

    expect(env.DATABASE_URL).toBe('postgres://user:pass@localhost:5432/db');
    expect(env.NODE_ENV).toBe('development');
    expect(env.PORT).toBe(4001);
    expect(env.MESSAGE_DISPATCHER).toBe('memory');
    expect(env.REDIS_URL).toBeUndefined();
  });

  it('should parse successfully when overriding defaults', async () => {
    vi.stubEnv('DATABASE_URL', 'postgres://user:pass@localhost:5432/db');
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('PORT', '8080');

    const { env } = await import('./env.js');

    expect(env.NODE_ENV).toBe('production');
    expect(env.PORT).toBe(8080);
  });

  it('should throw an error when DATABASE_URL is missing', async () => {
    await expect(import('./env.js')).rejects.toThrow('Invalid environment variables');
    expect(console.error).toHaveBeenCalled();
  });

  it('should throw an error when PORT is invalid', async () => {
    vi.stubEnv('DATABASE_URL', 'postgres://user:pass@localhost:5432/db');
    vi.stubEnv('PORT', 'not-a-number');

    await expect(import('./env.js')).rejects.toThrow('Invalid environment variables');
  });

  it('should throw an error when MESSAGE_DISPATCHER is redis but REDIS_URL is missing', async () => {
    vi.stubEnv('DATABASE_URL', 'postgres://user:pass@localhost:5432/db');
    vi.stubEnv('MESSAGE_DISPATCHER', 'redis');

    // Ensure REDIS_URL isn't lingering from the OS environment
    delete process.env.REDIS_URL;

    await expect(import('./env.js')).rejects.toThrow('Invalid environment variables');

    expect(console.error).toHaveBeenCalledWith(
      'Invalid environment variables:',
      expect.objectContaining({ REDIS_URL: expect.any(Array) }),
    );
  });

  it('should parse successfully when MESSAGE_DISPATCHER is redis and valid REDIS_URL is provided', async () => {
    vi.stubEnv('DATABASE_URL', 'postgres://user:pass@localhost:5432/db');
    vi.stubEnv('MESSAGE_DISPATCHER', 'redis');
    vi.stubEnv('REDIS_URL', 'redis://localhost:6379');

    const { env } = await import('./env.js');

    expect(env.MESSAGE_DISPATCHER).toBe('redis');
    expect(env.REDIS_URL).toBe('redis://localhost:6379');
  });

  it('should throw an error when REDIS_URL is provided but is an invalid URL format', async () => {
    vi.stubEnv('DATABASE_URL', 'postgres://user:pass@localhost:5432/db');
    vi.stubEnv('MESSAGE_DISPATCHER', 'redis');
    vi.stubEnv('REDIS_URL', 'not-a-valid-url');

    await expect(import('./env.js')).rejects.toThrow('Invalid environment variables');
  });
});
