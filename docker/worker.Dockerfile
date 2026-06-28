FROM node:22-bookworm-slim AS deps
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml* pnpm-workspace.yaml ./
COPY apps/web/package.json apps/web/package.json
COPY packages/core/package.json packages/core/package.json
COPY packages/worker/package.json packages/worker/package.json
RUN pnpm install --frozen-lockfile=false

FROM node:22-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=development
RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates curl file tar \
  && rm -rf /var/lib/apt/lists/*
RUN corepack enable
COPY docker/install-photomatixcl.sh /usr/local/bin/install-photomatixcl
RUN chmod +x /usr/local/bin/install-photomatixcl
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages/core/node_modules ./packages/core/node_modules
COPY --from=deps /app/packages/worker/node_modules ./packages/worker/node_modules
COPY . .
CMD ["pnpm", "worker:smoke:fake"]
