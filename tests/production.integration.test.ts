import { spawnSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import EmbeddedPostgres from 'embedded-postgres';
import { afterAll, beforeAll, describe, expect, test, vi } from 'vitest';

async function getAvailablePort() {
  return new Promise<number>((resolve, reject) => {
    const server = net.createServer();
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      if (!address || typeof address === 'string') {
        server.close();
        reject(new Error('Could not allocate a PostgreSQL test port'));
        return;
      }
      server.close(() => resolve(address.port));
    });
  });
}

function runMigrations(databaseUrl: string) {
  const prismaCli = path.resolve('node_modules/prisma/build/index.js');
  const result = spawnSync(process.execPath, [prismaCli, 'migrate', 'deploy'], {
    cwd: process.cwd(),
    env: { ...process.env, DATABASE_URL: databaseUrl },
    encoding: 'utf8',
  });

  if (result.status !== 0) {
    throw new Error(`prisma migrate deploy failed:\n${result.stdout}\n${result.stderr}`);
  }
}

function assertMigrationsMatchSchema(shadowDatabaseUrl: string) {
  const prismaCli = path.resolve('node_modules/prisma/build/index.js');
  const result = spawnSync(process.execPath, [
    prismaCli,
    'migrate',
    'diff',
    '--from-migrations',
    'prisma/migrations',
    '--to-schema-datamodel',
    'prisma/schema.prisma',
    '--shadow-database-url',
    shadowDatabaseUrl,
    '--exit-code',
  ], {
    cwd: process.cwd(),
    env: { ...process.env, DATABASE_URL: shadowDatabaseUrl },
    encoding: 'utf8',
  });

  if (result.status !== 0) {
    throw new Error(`Prisma migration/schema drift detected:\n${result.stdout}\n${result.stderr}`);
  }
}

describe('production baseline', () => {
  let postgres: EmbeddedPostgres;
  let app: Awaited<ReturnType<(typeof import('../src/app.js'))['buildApp']>>;
  let prisma: InstanceType<(typeof import('../src/generated/prisma-client/index.js'))['PrismaClient']>;
  let accessToken = '';
  let projectId = '';
  let baseUrl = '';
  let postgresStopped = false;

  beforeAll(async () => {
    const port = await getAvailablePort();
    const password = `test-${randomUUID()}`;
    postgres = new EmbeddedPostgres({
      databaseDir: path.join(os.tmpdir(), `backforge-postgres-${randomUUID()}`),
      port,
      user: 'postgres',
      password,
      persistent: false,
      onLog: () => undefined,
      onError: () => undefined,
    });

    await postgres.initialise();
    await postgres.start();
    await postgres.createDatabase('backforge_test');
    await postgres.createDatabase('backforge_shadow');

    const databaseUrl = `postgresql://postgres:${encodeURIComponent(password)}@127.0.0.1:${port}/backforge_test?schema=public`;
    const shadowDatabaseUrl = `postgresql://postgres:${encodeURIComponent(password)}@127.0.0.1:${port}/backforge_shadow?schema=public`;
    process.env.NODE_ENV = 'test';
    process.env.DATABASE_URL = databaseUrl;
    process.env.JWT_SECRET = 'integration-test-secret-with-at-least-32-characters';
    process.env.APP_URL = 'http://localhost:3000';
    process.env.CORS_ORIGIN = 'http://localhost:3000';
    process.env.REDIS_URL = '';
    process.env.STORAGE_DRIVER = 'local';
    process.env.STRIPE_SECRET_KEY = '';
    process.env.STRIPE_PRICE_BASIC = '';
    process.env.STRIPE_PRICE_PRO = '';
    process.env.FEATURE_FLAGS = '{}';

    runMigrations(databaseUrl);
    runMigrations(databaseUrl);
    assertMigrationsMatchSchema(shadowDatabaseUrl);

    const prismaModule = await import('../src/generated/prisma-client/index.js');
    prisma = new prismaModule.PrismaClient({ datasourceUrl: databaseUrl });
    const appModule = await import('../src/app.js');
    app = await appModule.buildApp();
    baseUrl = await app.listen({ port: 0, host: '127.0.0.1' });
  });

  afterAll(async () => {
    await app?.close();
    await prisma?.$disconnect();
    if (!postgresStopped) {
      await postgres?.stop();
    }
  });

  test('migration deploy creates every Prisma model table in an empty PostgreSQL database', async () => {
    const tables = await prisma.$queryRaw<Array<{ table_name: string }>>`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    `;
    const tableNames = new Set(tables.map((table) => table.table_name));

    expect([...tableNames]).toEqual(expect.arrayContaining([
      'users', 'projects', 'memberships', 'sessions', 'api_keys', 'request_logs',
      'database_tables', 'database_columns', 'database_rows', 'stored_files',
      'subscriptions', 'stripe_webhook_events', 'growth_events', '_prisma_migrations',
    ]));
  });

  test('registration creates one starter API key and login does not create another', async () => {
    const email = `user-${randomUUID()}@example.com`;
    const registration = await fetch(`${baseUrl}/auth/register`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: 'Integration User', email, password: 'strong-password-123' }),
    });

    const registrationBody = await registration.json() as any;
    expect(registration.status).toBe(201);
    expect(registration.headers.get('set-cookie')).toContain('HttpOnly');
    expect(registrationBody.refreshToken).toBeUndefined();
    expect(registrationBody.apiKey).toBeTruthy();
    accessToken = registrationBody.accessToken;
    projectId = registrationBody.project.id;

    const refreshCookie = registration.headers.get('set-cookie')?.split(';')[0];
    const refreshed = await fetch(`${baseUrl}/auth/refresh`, {
      method: 'POST',
      headers: { cookie: refreshCookie ?? '' },
    });
    const refreshedBody = await refreshed.json() as any;
    expect(refreshed.status).toBe(200);
    expect(refreshed.headers.get('set-cookie')).toContain('HttpOnly');
    expect(refreshedBody.accessToken).toBeTruthy();
    expect(refreshedBody.refreshToken).toBeUndefined();

    const beforeLogin = await prisma.apiKey.count({ where: { projectId } });
    const login = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email, password: 'strong-password-123' }),
    });
    const loginBody = await login.json() as any;
    const afterLogin = await prisma.apiKey.count({ where: { projectId } });

    expect(login.status).toBe(200);
    expect(loginBody.apiKey).toBeUndefined();
    expect(afterLogin).toBe(beforeLogin);

    const loginCookie = login.headers.get('set-cookie')?.split(';')[0];
    expect(login.headers.get('set-cookie')).toContain('HttpOnly');
    const logout = await fetch(`${baseUrl}/auth/logout`, {
      method: 'POST',
      headers: { cookie: loginCookie ?? '' },
    });
    expect(logout.status).toBe(204);
    expect(logout.headers.get('set-cookie')).toMatch(/Expires=Thu, 01 Jan 1970|Max-Age=0/i);

    const refreshAfterLogout = await fetch(`${baseUrl}/auth/refresh`, {
      method: 'POST',
      headers: { cookie: loginCookie ?? '' },
    });
    expect(refreshAfterLogout.status).toBe(401);
  });

  test('authenticated project CRUD works', async () => {
    const authorization = { authorization: `Bearer ${accessToken}` };
    const auth = { ...authorization, 'content-type': 'application/json' };
    const created = await fetch(`${baseUrl}/projects`, {
      method: 'POST', headers: auth, body: JSON.stringify({ name: 'CRUD Project' }),
    });
    expect(created.status).toBe(201);
    const id = ((await created.json()) as any).id;

    const listed = await fetch(`${baseUrl}/projects`, { headers: auth });
    expect(listed.status).toBe(200);
    expect(((await listed.json()) as Array<{ id: string }>).some((project) => project.id === id)).toBe(true);

    const updated = await fetch(`${baseUrl}/projects/${id}`, {
      method: 'PATCH', headers: auth, body: JSON.stringify({ name: 'CRUD Updated' }),
    });
    expect(updated.status).toBe(200);

    const deleted = await fetch(`${baseUrl}/projects/${id}`, { method: 'DELETE', headers: authorization });
    expect(deleted.status).toBe(204);
  });

  test('upload works locally and billing is explicitly disabled without Stripe', async () => {
    const form = new FormData();
    form.append('file', new Blob(['hello backforge'], { type: 'text/plain' }), 'test.txt');
    const upload = await fetch(`${baseUrl}/upload`, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${accessToken}`,
        'x-project-id': projectId,
      },
      body: form,
    });
    expect(upload.status).toBe(201);

    const { storageService } = await import('../src/modules/storage/storage.service.js');
    const uploadEnabledSpy = vi.spyOn(storageService, 'isUploadEnabled').mockReturnValue(false);
    const disabledForm = new FormData();
    disabledForm.append('file', new Blob(['disabled'], { type: 'text/plain' }), 'disabled.txt');
    const disabledUpload = await fetch(`${baseUrl}/upload`, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${accessToken}`,
        'x-project-id': projectId,
      },
      body: disabledForm,
    });
    const disabledUploadBody = await disabledUpload.json() as any;
    uploadEnabledSpy.mockRestore();
    expect(disabledUpload.status).toBe(503);
    expect(disabledUploadBody.error).toContain('external storage is not configured');

    const plans = await fetch(`${baseUrl}/billing-api/plans`, {
      headers: { authorization: `Bearer ${accessToken}` },
    });
    expect(plans.status).toBe(200);
    const plansBody = await plans.json() as Array<{ key: string; hasCheckout: boolean }>;
    expect(plansBody.filter((plan) => plan.key !== 'free').every((plan) => !plan.hasCheckout)).toBe(true);
  });

  test('billing advertises checkout only when Stripe and price IDs are configured', async () => {
    process.env.STRIPE_SECRET_KEY = 'sk_test_integration';
    process.env.STRIPE_PRICE_BASIC = 'price_basic_integration';
    process.env.STRIPE_PRICE_PRO = 'price_pro_integration';
    const { billingService } = await import('../src/modules/billing/billing.service.js');
    const incompletelyConfiguredPlans = billingService.getPlans().filter((plan) => plan.key !== 'free');
    expect(incompletelyConfiguredPlans.every((plan) => !plan.hasCheckout)).toBe(true);

    process.env.STRIPE_WEBHOOK_SECRET = 'whsec_integration';
    const paidPlans = billingService.getPlans().filter((plan) => plan.key !== 'free');
    expect(paidPlans.every((plan) => plan.hasCheckout)).toBe(true);
    process.env.STRIPE_SECRET_KEY = '';
    process.env.STRIPE_WEBHOOK_SECRET = '';
    process.env.STRIPE_PRICE_BASIC = '';
    process.env.STRIPE_PRICE_PRO = '';
  });

  test('readiness returns 200 only while PostgreSQL is reachable', async () => {
    const ready = await fetch(`${baseUrl}/readyz`);
    expect(ready.status).toBe(200);
    expect(((await ready.json()) as any).checks.database).toBe('up');

    await postgres.stop();
    postgresStopped = true;
    const notReady = await fetch(`${baseUrl}/readyz`);
    expect(notReady.status).toBe(503);
    expect(((await notReady.json()) as any).checks.database).toBe('down');
  });
});
