# BACKFORGE

BACKFORGE is a backend platform starter for SaaS teams that need authentication, multi-tenant projects, API keys, billing, quotas, storage, observability, Redis-backed scale primitives, and a deploy path already shaped for production.

## Platform

- `Fastify` API with `Prisma` and PostgreSQL
- `React + Vite` dashboard and public landing page
- `Redis + BullMQ` for distributed cache, rate limiting, and event-driven jobs
- `Stripe` checkout, billing portal, quotas, and webhook processing
- `Prometheus` metrics, structured logs, readiness/liveness probes, and health snapshots
- `Docker`, Kubernetes manifests, GitHub Actions CI/CD, and rollout overlays for canary and blue/green delivery

## Local Development

1. Copy `.env.example` to `.env`.
2. Start dependencies with `docker compose up -d`.
3. Install dependencies with `npm install`.
4. Run migrations with `npx prisma migrate dev`.
5. Run the API with `npm run dev`.
6. Run the worker with `npm run dev:worker`.

## Production Assets

- Kubernetes platform guide: `docs/kubernetes-platform.md`
- Oracle Cloud / VPS guide: `docs/oracle-cloud-deploy.md`
- Scaling and multi-region notes: `docs/scaling-architecture.md`
- Launch and go-to-market playbook: `docs/launch-playbook.md`
- PM2 ecosystem file: `ecosystem.config.cjs`
- NGINX template: `deploy/oracle-cloud/backforge.nginx.conf`

## Delivery Model

- Pull requests run CI validation with `lint` and `build`.
- Production migrations run with `npm run prisma:deploy`.
- Pushes to `main` build and publish the production image, then deploy a canary or blue/green overlay to Kubernetes.
- Rollouts are designed around Argo Rollouts, Prometheus analysis, and Redis-backed application primitives that already exist in the app runtime.
