# Como usar o BACKFORGE

BACKFORGE e uma plataforma backend com dashboard para criar projetos, tabelas, API keys, storage, billing, analytics e endpoints publicos.

## Requisitos

- Node.js 20+
- npm
- Docker Desktop, se quiser rodar Postgres/Redis via compose
- PostgreSQL, se nao for usar Docker

## Rodar local com modo demo rapido

Use este modo quando quiser abrir o sistema sem banco local rodando.

```bash
npm install
npm run dev
```

Acesse:

```txt
http://localhost:3000
```

Usuario de teste:

```txt
Email: teste@backforge.local
Senha: 12345678
```

No `.env`, o modo demo depende de:

```env
NODE_ENV=development
ENABLE_DEV_AUTH_FALLBACK=true
REDIS_URL=""
```

Esse modo responde dados fake para o dashboard, analytics, database, storage e API publica sem esperar Postgres/Redis.

## Rodar local com banco real

1. Suba os servicos:

```bash
docker compose up -d db redis
```

2. Instale dependencias:

```bash
npm install
```

3. Rode as migrations:

```bash
npx prisma migrate dev
```

4. Inicie a aplicacao:

```bash
npm run dev
```

5. Opcional: inicie o worker:

```bash
npm run dev:worker
```

Para usar banco real, desligue o fallback:

```env
ENABLE_DEV_AUTH_FALLBACK=false
REDIS_URL="redis://localhost:6379"
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/backforge?schema=public"
```

## Telas principais

```txt
/                 Landing page
/login            Login
/register         Cadastro
/overview         Dashboard principal
/projects         Projetos
/database         Tabelas e linhas
/storage          Upload e arquivos
/api              API keys e logs
/analytics        Growth analytics
/billing          Planos e cobranca
```

## Scripts npm

```bash
npm run dev              # inicia API + frontend Vite no servidor Fastify
npm run dev:worker       # inicia worker BullMQ
npm run typecheck        # valida tipos TypeScript
npm run lint             # executa ESLint
npm test                 # testes integrados com PostgreSQL descartavel
npm run build            # build completo para producao
npm run start            # roda dist/server.js
npm run start:worker     # roda worker compilado
npm run prisma:generate  # gera Prisma Client
npm run prisma:dev       # migrations em desenvolvimento
npm run prisma:deploy    # migrations em producao
```

## Variaveis de ambiente principais

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/backforge?schema=public"
REDIS_URL=""

JWT_SECRET="troque-por-um-segredo-forte"
NODE_ENV=development
PORT=3000
APP_URL="http://localhost:3000"
CORS_ORIGIN="http://localhost:3000"

ENABLE_GRAPHQL=false
ENABLE_DEV_AUTH_FALLBACK=true

STRIPE_SECRET_KEY=""
STRIPE_WEBHOOK_SECRET=""
STRIPE_PRICE_BASIC=""
STRIPE_PRICE_PRO=""

STORAGE_DRIVER="local"
S3_REGION="us-east-1"
S3_ENDPOINT=""
S3_ACCESS_KEY=""
S3_SECRET_KEY=""
S3_BUCKET="backforge-storage"
S3_FORCE_PATH_STYLE=false
```

Em producao:

```env
NODE_ENV=production
ENABLE_DEV_AUTH_FALLBACK=false
JWT_SECRET="valor-real-forte"
DATABASE_URL="postgresql://..."
REDIS_URL="redis://..."
CORS_ORIGIN="https://seu-dominio.com"
APP_URL="https://seu-dominio.com"
STORAGE_DRIVER="s3"
```

Para Railway, consulte `docs/railway-deploy.md`. Em producao, uploads ficam
desabilitados com resposta 503 enquanto `STORAGE_DRIVER=s3` e as credenciais do
Bucket nao estiverem configurados.

## Fluxo basico de uso

1. Crie uma conta em `/register` ou entre com o usuario demo.
2. Abra `/overview` para ver onboarding, API key e quickstart.
3. Abra `/projects` para criar ou editar projetos.
4. Abra `/database` para criar tabelas e inserir linhas.
5. Abra `/api` para criar API keys e ver logs de requests.
6. Teste o endpoint publico:

```bash
curl -H "x-api-key: SUA_API_KEY" http://localhost:3000/public/sample_items
```

7. Abra `/storage` para enviar arquivos.
8. Abra `/analytics` para acompanhar funil, ativacao e uso.
9. Abra `/billing` para planos e checkout Stripe.

## Endpoints principais

Auth:

```txt
POST /auth/register
POST /auth/login
POST /auth/refresh
POST /auth/logout
GET  /auth/me
```

Projetos:

```txt
GET    /projects
POST   /projects
GET    /projects/:id
PATCH  /projects/:id
DELETE /projects/:id
GET    /projects/:id/keys
POST   /projects/:id/keys
GET    /projects/:id/billing
```

Database:

```txt
GET    /tables
POST   /tables
GET    /tables/:id/rows
POST   /tables/:id/rows
DELETE /rows/:id
```

Storage:

```txt
POST   /upload
GET    /files
DELETE /files/:id
GET    /public/files/:filename
```

API publica:

```txt
GET  /public/:tableName
GET  /api/:table
POST /api/:table
```

Analytics e growth:

```txt
GET  /analytics
POST /growth/events
GET  /growth/summary
GET  /growth/onboarding
```

Billing:

```txt
GET  /billing-api/plans
POST /billing-api/projects/:projectId/checkout
POST /billing-api/projects/:projectId/portal
```

Saude e observabilidade:

```txt
GET /health
GET /readyz
GET /livez
GET /metrics
```

## Docker local

Para rodar app, Postgres e Redis juntos:

```bash
docker compose up --build
```

Para parar:

```bash
docker compose down
```

Para apagar volumes do banco local:

```bash
docker compose down -v
```

## Build de producao

```bash
npm ci
npm run lint
npm run build
npm run prisma:deploy
npm run start
```

Importante:

- Desenvolvimento usa `prisma migrate dev`.
- Producao usa `prisma migrate deploy`.
- Nao use `prisma db push` em producao.

## Docker producao

Build:

```bash
docker build -t backforge:latest .
```

Run:

```bash
docker run --env-file .env -p 3000:3000 backforge:latest
```

Healthcheck:

```txt
http://localhost:3000/health
```

## Kubernetes

Antes do deploy, crie os secrets reais no cluster:

```bash
kubectl create secret generic backforge-secrets \
  --from-literal=DATABASE_URL="postgresql://..." \
  --from-literal=JWT_SECRET="segredo-forte" \
  --from-literal=STRIPE_SECRET_KEY="sk_live_..." \
  --from-literal=S3_ACCESS_KEY="..." \
  --from-literal=S3_SECRET_KEY="..."
```

Aplicar manifests:

```bash
kubectl apply -k k8s/production
```

Rodar migrations:

```bash
kubectl apply -f k8s/production/migration-job.yaml
```

Ver status:

```bash
kubectl get pods
kubectl get svc
kubectl get hpa
```

## Checklist antes de publicar

```bash
npm install
npm audit --audit-level=high
npm run lint
npm run build
npm run prisma:deploy
```

Verifique tambem:

- `ENABLE_DEV_AUTH_FALLBACK=false` em producao
- `JWT_SECRET` forte e secreto
- `DATABASE_URL` real
- `REDIS_URL` real
- `CORS_ORIGIN` apontando para seu dominio
- Secrets no Kubernetes sem placeholder
- `/health`, `/readyz` e `/livez` respondendo
