import type { FastifyRequest } from 'fastify';
import jwt from 'jsonwebtoken';
import { getJwtSecret } from './env.js';

const demoUser = {
  id: 'dev-user-001',
  email: 'teste@backforge.local',
  name: 'Usuario Teste',
};

const demoProject = {
  id: 'dev-project-001',
  name: 'Projeto Teste',
  slug: 'projeto-teste',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const demoApiKey = 'bf_dev_1234567890abcdef1234567890abcdef';
const demoMaskedApiKey = 'bf_dev_1234...cdef';
const now = () => new Date().toISOString();

export function isDevFallbackEnabled() {
  return process.env.NODE_ENV === 'development' && process.env.ENABLE_DEV_AUTH_FALLBACK === 'true';
}

function signDemoAccessToken() {
  return jwt.sign({ sub: demoUser.id }, getJwtSecret(), {
    algorithm: 'HS256',
    expiresIn: '15m',
  });
}

function buildDemoSession() {
  return {
    user: demoUser,
    accessToken: signDemoAccessToken(),
    refreshToken: 'dev-refresh-token',
    project: demoProject,
    apiKey: demoApiKey,
    onboarding: {
      project: demoProject,
      apiKey: demoApiKey,
      apiKeyMasked: demoMaskedApiKey,
      endpointPath: '/public/sample_items',
      apiKeyHeader: 'x-api-key',
    },
  };
}

function buildDemoSubscription() {
  return {
    plan: 'free',
    status: 'active',
    requestsLimit: 1000,
    requestsUsed: 12,
    rateLimitPerMinute: 60,
    stripeCustomerId: null,
    stripeSubscriptionId: null,
    stripePriceId: null,
    currentPeriodStart: new Date().toISOString(),
    currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    cancelAtPeriodEnd: false,
  };
}

function buildDemoProjectSummary() {
  return {
    ...demoProject,
    role: 'OWNER',
    apiKeysCount: 1,
    tablesCount: 1,
    subscription: buildDemoSubscription(),
  };
}

function buildDemoTable() {
  return {
    id: 'dev-table-001',
    name: 'sample_items',
    projectId: demoProject.id,
    schema: [
      { name: 'name', type: 'string' },
      { name: 'category', type: 'string' },
      { name: 'active', type: 'boolean' },
    ],
    rowsCount: 2,
    createdAt: now(),
    updatedAt: now(),
  };
}

function buildDemoRows() {
  const items = [
    {
      id: 'dev-row-001',
      createdAt: now(),
      data: {
        name: 'Backforge Demo',
        category: 'quickstart',
        active: true,
      },
      preview: {
        name: 'Backforge Demo',
        category: 'quickstart',
        active: true,
      },
    },
    {
      id: 'dev-row-002',
      createdAt: now(),
      data: {
        name: 'Activation Engine',
        category: 'dashboard',
        active: true,
      },
      preview: {
        name: 'Activation Engine',
        category: 'dashboard',
        active: true,
      },
    },
  ];

  return {
    table: {
      id: 'dev-table-001',
      name: 'sample_items',
      schema: buildDemoTable().schema,
    },
    items,
    pagination: {
      page: 1,
      pageSize: 20,
      total: items.length,
      totalPages: 1,
    },
  };
}

function buildDemoAnalytics() {
  const days = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(Date.now() - (6 - index) * 24 * 60 * 60 * 1000);
    return date.toISOString().slice(0, 10);
  });

  return {
    funnel: {
      visitors: 1280,
      signups: 96,
      activatedUsers: 41,
      activationRate: 43,
      paidUsers: 4,
      conversionRate: 4,
      mrr: 316,
    },
    product: {
      totalProjects: 18,
      activeProjects: 12,
      totalApiCalls: 7420,
      apiCalls7d: 1820,
      requestsPerUser: 77,
      requestsPerProject: 412,
      dau: 19,
      wau: 64,
      churnRiskProjects: 2,
    },
    timeline: {
      signups: days.map((day, index) => ({ day, count: [7, 10, 9, 14, 16, 18, 22][index] })),
      projects: days.map((day, index) => ({ day, count: [1, 2, 2, 3, 4, 3, 5][index] })),
      apiCalls: days.map((day, index) => ({ day, count: [120, 180, 240, 260, 310, 330, 380][index] })),
    },
  };
}

function buildDemoOnboarding() {
  return {
    user: {
      ...demoUser,
      createdAt: new Date().toISOString(),
    },
    activation: {
      accountCreated: true,
      projectCreated: true,
      apiKeyReady: true,
      apiCalled: false,
      activated: false,
    },
    quickstart: {
      endpointPath: '/public/sample_items',
      apiKeyHeader: 'x-api-key',
      valuePromise: 'Usuario teste pronto para explorar o BACKFORGE.',
    },
    primaryProject: {
      ...demoProject,
      requestUsage: 12,
      apiKeysCount: 1,
      requestCount: 0,
      recentApiKeys: [
        {
          id: 'dev-key-001',
          name: 'Dev Test Key',
          maskedKey: demoMaskedApiKey,
          createdAt: new Date().toISOString(),
        },
      ],
      recentRequests: [],
      subscription: buildDemoSubscription(),
    },
  };
}

export function getDevDatabaseFallbackResponse(request: FastifyRequest) {
  if (!isDevFallbackEnabled()) {
    return null;
  }

  const path = request.url.split('?')[0];
  const method = request.method.toUpperCase();

  if (method === 'POST' && path === '/growth/events') {
    return {
      statusCode: 202,
      payload: { ok: true },
    };
  }

  if (method === 'POST' && (path === '/auth/login' || path === '/auth/register')) {
    return {
      statusCode: path === '/auth/register' ? 201 : 200,
      payload: buildDemoSession(),
    };
  }

  if (method === 'GET' && path === '/auth/me') {
    return {
      statusCode: 200,
      payload: {
        ...demoUser,
        memberships: [
          {
            role: 'OWNER',
            project: demoProject,
          },
        ],
      },
    };
  }

  if (method === 'GET' && path === '/growth/onboarding') {
    return {
      statusCode: 200,
      payload: buildDemoOnboarding(),
    };
  }

  if (method === 'GET' && path === '/analytics') {
    return {
      statusCode: 200,
      payload: buildDemoAnalytics(),
    };
  }

  if (method === 'GET' && path === '/projects') {
    return {
      statusCode: 200,
      payload: [buildDemoProjectSummary()],
    };
  }

  if (method === 'GET' && path === `/projects/${demoProject.id}`) {
    return {
      statusCode: 200,
      payload: {
        ...buildDemoProjectSummary(),
        apiKeys: [
          {
            id: 'dev-key-001',
            name: 'Dev Test Key',
            maskedKey: demoMaskedApiKey,
            createdAt: new Date().toISOString(),
          },
        ],
        tables: [
          {
            id: 'dev-table-001',
            name: 'sample_items',
            createdAt: new Date().toISOString(),
          },
        ],
      },
    };
  }

  if (method === 'GET' && path === `/projects/${demoProject.id}/keys`) {
    return {
      statusCode: 200,
      payload: [
        {
          id: 'dev-key-001',
          name: 'Dev Test Key',
          maskedKey: demoMaskedApiKey,
          createdAt: new Date().toISOString(),
        },
      ],
    };
  }

  if (method === 'POST' && path === `/projects/${demoProject.id}/keys`) {
    return {
      statusCode: 201,
      payload: {
        id: `dev-key-${Date.now()}`,
        name: 'Quickstart Key',
        key: demoApiKey,
        maskedKey: demoMaskedApiKey,
        createdAt: new Date().toISOString(),
      },
    };
  }

  if (method === 'GET' && path === `/projects/${demoProject.id}/billing`) {
    return {
      statusCode: 200,
      payload: {
        ...demoProject,
        subscription: buildDemoSubscription(),
      },
    };
  }

  if (method === 'GET' && path === '/requests') {
    return {
      statusCode: 200,
      payload: {
        data: [],
        pagination: {
          page: 1,
          limit: 20,
          total: 0,
          totalPages: 1,
        },
      },
    };
  }

  if (method === 'GET' && path === '/tables') {
    return {
      statusCode: 200,
      payload: [buildDemoTable()],
    };
  }

  if (method === 'POST' && path === '/tables') {
    return {
      statusCode: 201,
      payload: {
        ...buildDemoTable(),
        id: `dev-table-${Date.now()}`,
      },
    };
  }

  if (method === 'GET' && path === '/tables/dev-table-001/rows') {
    return {
      statusCode: 200,
      payload: buildDemoRows(),
    };
  }

  if (method === 'POST' && path === '/tables/dev-table-001/rows') {
    return {
      statusCode: 201,
      payload: {
        id: `dev-row-${Date.now()}`,
        createdAt: now(),
        data: request.body,
        preview: request.body,
      },
    };
  }

  if (method === 'DELETE' && path.startsWith('/rows/')) {
    return {
      statusCode: 204,
      payload: null,
    };
  }

  if (method === 'GET' && path === '/files') {
    return {
      statusCode: 200,
      payload: [
        {
          id: 'dev-file-001',
          projectId: demoProject.id,
          filename: 'backforge-demo.json',
          originalName: 'backforge-demo.json',
          mimeType: 'application/json',
          size: 312,
          url: '/public/files/backforge-demo.json',
          createdAt: now(),
        },
      ],
    };
  }

  if (method === 'DELETE' && path.startsWith('/files/')) {
    return {
      statusCode: 204,
      payload: null,
    };
  }

  if (method === 'GET' && path === '/public/sample_items') {
    return {
      statusCode: 200,
      payload: [
        {
          id: 'dev-row-001',
          name: 'Backforge Demo',
          category: 'quickstart',
          active: true,
        },
        {
          id: 'dev-row-002',
          name: 'Activation Engine',
          category: 'dashboard',
          active: true,
        },
      ],
    };
  }

  if (method === 'GET' && path === '/billing-api/plans') {
    return {
      statusCode: 200,
      payload: [
        { key: 'free', name: 'Free', requests: 1000, rateLimitPerMinute: 60, priceId: null, checkoutEnabled: false },
        { key: 'basic', name: 'Basic', requests: 10000, rateLimitPerMinute: 180, priceId: null, checkoutEnabled: false },
        { key: 'pro', name: 'Pro', requests: 100000, rateLimitPerMinute: 600, priceId: null, checkoutEnabled: false },
      ],
    };
  }

  return null;
}
