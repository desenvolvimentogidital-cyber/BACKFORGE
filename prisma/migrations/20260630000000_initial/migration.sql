-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('OWNER', 'ADMIN', 'DEVELOPER');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "name" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "projects" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "projects_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "memberships" (
    "id" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'DEVELOPER',
    "userId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "memberships_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "sessions" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "isRevoked" BOOLEAN NOT NULL DEFAULT false,
    "replacedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "api_keys" (
    "id" TEXT NOT NULL,
    "key" TEXT,
    "keyHash" TEXT,
    "keyPreview" TEXT,
    "name" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "api_keys_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "request_logs" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "method" TEXT NOT NULL,
    "status" INTEGER NOT NULL,
    "latency" INTEGER NOT NULL DEFAULT 0,
    "requestBody" JSONB,
    "responseBody" JSONB,
    "headers" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "request_logs_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "database_tables" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "schema" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "database_tables_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "database_columns" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "required" BOOLEAN NOT NULL DEFAULT false,
    "tableId" TEXT NOT NULL,
    CONSTRAINT "database_columns_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "database_rows" (
    "id" TEXT NOT NULL,
    "tableId" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "database_rows_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "stored_files" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "url" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "stored_files_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "subscriptions" (
    "id" TEXT NOT NULL,
    "plan" TEXT NOT NULL DEFAULT 'free',
    "status" TEXT NOT NULL DEFAULT 'active',
    "requestsLimit" INTEGER NOT NULL DEFAULT 1000,
    "requestsUsed" INTEGER NOT NULL DEFAULT 0,
    "rateLimitPerMinute" INTEGER NOT NULL DEFAULT 60,
    "billingUserId" TEXT,
    "stripeCustomerId" TEXT,
    "stripeSubscriptionId" TEXT,
    "stripePriceId" TEXT,
    "currentPeriodStart" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "currentPeriodEnd" TIMESTAMP(3),
    "cancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT false,
    "projectId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "stripe_webhook_events" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'processing',
    "attempts" INTEGER NOT NULL DEFAULT 1,
    "payload" JSONB,
    "lastError" TEXT,
    "userId" TEXT,
    "processedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "stripe_webhook_events_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "growth_events" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sessionId" TEXT,
    "path" TEXT,
    "metadata" JSONB,
    "userId" TEXT,
    "projectId" TEXT,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "growth_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");
CREATE UNIQUE INDEX "projects_slug_key" ON "projects"("slug");
CREATE UNIQUE INDEX "memberships_userId_projectId_key" ON "memberships"("userId", "projectId");
CREATE UNIQUE INDEX "sessions_token_key" ON "sessions"("token");
CREATE UNIQUE INDEX "api_keys_key_key" ON "api_keys"("key");
CREATE UNIQUE INDEX "api_keys_keyHash_key" ON "api_keys"("keyHash");
CREATE INDEX "api_keys_projectId_idx" ON "api_keys"("projectId");
CREATE INDEX "api_keys_projectId_createdAt_idx" ON "api_keys"("projectId", "createdAt");
CREATE INDEX "request_logs_projectId_idx" ON "request_logs"("projectId");
CREATE INDEX "request_logs_createdAt_idx" ON "request_logs"("createdAt");
CREATE INDEX "request_logs_projectId_createdAt_idx" ON "request_logs"("projectId", "createdAt");
CREATE INDEX "request_logs_projectId_status_createdAt_idx" ON "request_logs"("projectId", "status", "createdAt");
CREATE INDEX "request_logs_projectId_path_createdAt_idx" ON "request_logs"("projectId", "path", "createdAt");
CREATE INDEX "database_tables_projectId_idx" ON "database_tables"("projectId");
CREATE INDEX "database_tables_createdAt_idx" ON "database_tables"("createdAt");
CREATE UNIQUE INDEX "database_tables_projectId_name_key" ON "database_tables"("projectId", "name");
CREATE INDEX "database_rows_tableId_idx" ON "database_rows"("tableId");
CREATE INDEX "database_rows_createdAt_idx" ON "database_rows"("createdAt");
CREATE INDEX "database_rows_tableId_createdAt_idx" ON "database_rows"("tableId", "createdAt");
CREATE UNIQUE INDEX "stored_files_filename_key" ON "stored_files"("filename");
CREATE INDEX "stored_files_projectId_idx" ON "stored_files"("projectId");
CREATE INDEX "stored_files_createdAt_idx" ON "stored_files"("createdAt");
CREATE INDEX "stored_files_projectId_createdAt_idx" ON "stored_files"("projectId", "createdAt");
CREATE UNIQUE INDEX "subscriptions_projectId_key" ON "subscriptions"("projectId");
CREATE UNIQUE INDEX "stripe_webhook_events_eventId_key" ON "stripe_webhook_events"("eventId");
CREATE INDEX "stripe_webhook_events_type_status_idx" ON "stripe_webhook_events"("type", "status");
CREATE INDEX "growth_events_name_occurredAt_idx" ON "growth_events"("name", "occurredAt");
CREATE INDEX "growth_events_sessionId_occurredAt_idx" ON "growth_events"("sessionId", "occurredAt");
CREATE INDEX "growth_events_userId_occurredAt_idx" ON "growth_events"("userId", "occurredAt");
CREATE INDEX "growth_events_projectId_occurredAt_idx" ON "growth_events"("projectId", "occurredAt");

-- AddForeignKey
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "api_keys" ADD CONSTRAINT "api_keys_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "request_logs" ADD CONSTRAINT "request_logs_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "database_tables" ADD CONSTRAINT "database_tables_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "database_columns" ADD CONSTRAINT "database_columns_tableId_fkey" FOREIGN KEY ("tableId") REFERENCES "database_tables"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "database_rows" ADD CONSTRAINT "database_rows_tableId_fkey" FOREIGN KEY ("tableId") REFERENCES "database_tables"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "stored_files" ADD CONSTRAINT "stored_files_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_billingUserId_fkey" FOREIGN KEY ("billingUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "stripe_webhook_events" ADD CONSTRAINT "stripe_webhook_events_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "growth_events" ADD CONSTRAINT "growth_events_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "growth_events" ADD CONSTRAINT "growth_events_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;
