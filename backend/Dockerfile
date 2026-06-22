# syntax=docker/dockerfile:1

# ---- Build stage: install all deps, generate Prisma client, compile TS ----
FROM node:20-slim AS build
WORKDIR /app

# OpenSSL is required by Prisma's query engine.
RUN apt-get update && apt-get install -y --no-install-recommends openssl \
    && rm -rf /var/lib/apt/lists/*

# Install deps first (cached unless lockfile changes). prisma/ is copied before
# `npm ci` so the postinstall `prisma generate` can find the schema.
COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npm ci

# Compile to dist/
COPY . .
RUN npm run build

# ---- Runtime stage ----
FROM node:20-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production

RUN apt-get update && apt-get install -y --no-install-recommends openssl \
    && rm -rf /var/lib/apt/lists/*

# Copy the built app, deps (incl. the Prisma CLI used by `migrate deploy` at
# startup), the generated client, and the migration files.
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/prisma ./prisma
COPY package.json ./

# Run as the built-in non-root user.
USER node

EXPOSE 4000

# Liveness check against the cheap /health endpoint (Node 20 has global fetch).
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://localhost:'+(process.env.PORT||4000)+'/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

# `npm start` runs `prisma migrate deploy && node dist/server.js`.
CMD ["npm", "start"]
