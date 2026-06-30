FROM node:20-alpine AS deps

WORKDIR /app

RUN apk add --no-cache openssl ca-certificates libc6-compat

COPY package*.json ./
COPY prisma ./prisma

RUN npm ci

FROM deps AS builder

ARG VITE_FEATURE_FLAGS="{}"
ENV VITE_FEATURE_FLAGS=${VITE_FEATURE_FLAGS}

COPY . .

RUN npm run build

FROM node:20-alpine AS runner

WORKDIR /app

RUN apk add --no-cache openssl ca-certificates libc6-compat wget

ENV NODE_ENV=production
ENV PORT=3000

COPY --chown=node:node package*.json ./
COPY --chown=node:node prisma ./prisma

RUN npm ci --omit=dev \
 && npm run prisma:generate \
 && npm cache clean --force

COPY --from=builder --chown=node:node /app/dist ./dist

# Copia o cliente Prisma gerado e os engines
COPY --from=builder --chown=node:node /app/src/generated ./src/generated

USER node

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=3s --start-period=20s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:3000/readyz || exit 1

CMD ["npm", "run", "start"]