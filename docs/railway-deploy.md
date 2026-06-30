# Deploy do BACKFORGE no Railway

## 1. Servicos

Crie no mesmo projeto Railway:

1. um servico da aplicacao conectado a este repositorio;
2. um PostgreSQL;
3. um Redis (recomendado para producao);
4. um Bucket (necessario para habilitar uploads persistentes);
5. opcionalmente um segundo servico do mesmo repositorio para o worker.

O `railway.json` executa `npm run build`, depois `npm run prisma:deploy`, inicia com
`npm run start` e so libera trafego quando `/readyz` confirmar acesso ao PostgreSQL.

Se o PostgreSQL de uma tentativa anterior contiver a migration antiga como falha e
ainda nao tiver dados reais, recrie o servico PostgreSQL antes do primeiro deploy
com esta migration inicial. Nao use reset em um banco que ja contenha dados reais;
nesse caso, faca um baseline assistido e backup primeiro.

## 2. Variaveis do servico web

Use referencias de variaveis do Railway em vez de copiar credenciais:

```env
NODE_ENV=production
DATABASE_URL=${{Postgres.DATABASE_URL}}
JWT_SECRET=<valor aleatorio com pelo menos 32 caracteres>
ENABLE_DEV_AUTH_FALLBACK=false
REDIS_URL=${{Redis.REDIS_URL}}
STORAGE_DRIVER=s3
S3_ENDPOINT=${{Bucket.ENDPOINT}}
S3_ACCESS_KEY=${{Bucket.ACCESS_KEY_ID}}
S3_SECRET_KEY=${{Bucket.SECRET_ACCESS_KEY}}
S3_BUCKET=${{Bucket.BUCKET}}
S3_REGION=${{Bucket.REGION}}
S3_FORCE_PATH_STYLE=false
```

O nome antes do ponto (`Postgres`, `Redis` e `Bucket`) precisa corresponder ao nome
do servico no seu projeto Railway. Use o autocomplete da tela Variables.

`RAILWAY_PUBLIC_DOMAIN` e injetado automaticamente. Quando `APP_URL` e
`CORS_ORIGIN` nao forem definidos, o BACKFORGE usa
`https://${RAILWAY_PUBLIC_DOMAIN}`. Se usar dominio proprio, configure ambos com
a URL HTTPS publica completa.

Sele o `JWT_SECRET`, as credenciais S3 e os segredos Stripe na interface do Railway.
Nunca envie o arquivo `.env` para o Git.

## 3. Stripe opcional

Sem Stripe, os planos pagos retornam `hasCheckout: false` e a interface informa que
o upgrade nao esta habilitado. Para ativar cobranca:

```env
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_BASIC=price_...
STRIPE_PRICE_PRO=price_...
```

Cadastre no Stripe o webhook publico:

```txt
https://SEU_DOMINIO/webhooks/stripe
```

Habilite os eventos de checkout e subscription usados pelo servico de billing.

## 4. Worker

Crie outro servico a partir do mesmo repositorio, compartilhe `REDIS_URL`,
`DATABASE_URL` e `NODE_ENV`, remova dominio publico e configure:

```txt
Config File Path: /railway.worker.json
```

Esse arquivo inicia `npm run start:worker` e nao configura healthcheck HTTP nem
executa migrations novamente.

`REDIS_URL` e obrigatoria no worker de producao. Sem ela, o processo encerra com erro
para que o Railway nao marque um worker inativo como concluido.

```env
NODE_ENV=production
DATABASE_URL=${{Postgres.DATABASE_URL}}
REDIS_URL=${{Redis.REDIS_URL}}
```

Variaveis opcionais:

```env
QUEUE_NAME=jobs
QUEUE_CONCURRENCY=4
```

Sem Redis, desenvolvimento local continua funcionando, mas filas sao ignoradas e
rate limiting/cache ficam locais a cada instancia.

## 5. Validacao antes do deploy

```bash
npm ci
npm run prisma:generate
npm run typecheck
npm run lint
npm test
npm run build
```

O teste de producao inicia um PostgreSQL descartavel, executa `prisma migrate deploy`
em banco vazio e valida cadastro, login, CRUD, upload local, billing desabilitado e
readiness.

## 6. Checklist

- PostgreSQL criado e `DATABASE_URL` referenciado no servico web.
- Migration inicial versionada e pre-deploy concluindo com status zero.
- Dominio publico gerado antes de validar a aplicacao.
- `JWT_SECRET` forte e selado.
- `/readyz` configurado como healthcheck.
- Bucket e `STORAGE_DRIVER=s3` configurados se uploads forem necessarios.
- Redis e worker configurados para filas e escala horizontal.
- Stripe e webhook configurados apenas quando cobranca real for ativada.
- Backups do PostgreSQL habilitados antes de trafego de producao.
