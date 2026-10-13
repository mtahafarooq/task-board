# syntax=docker/dockerfile:1

# --- dependencies ---------------------------------------------------------
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# --- build ----------------------------------------------------------------
FROM node:22-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate \
 && npm run build

# --- runtime --------------------------------------------------------------
FROM node:22-alpine AS runner
ENV NODE_ENV=production
WORKDIR /app
RUN addgroup -S -g 1001 api \
 && adduser -S -u 1001 -G api api
COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npm ci --omit=dev \
 && npx prisma generate \
 && npm cache clean --force
COPY --from=build --chown=api:api /app/dist ./dist
USER api
EXPOSE 3001
HEALTHCHECK --interval=15s --timeout=5s --start-period=20s --retries=5 \
  CMD wget -qO- http://127.0.0.1:3001/api/v1/health >/dev/null 2>&1 || exit 1
CMD ["node", "dist/main.js"]
