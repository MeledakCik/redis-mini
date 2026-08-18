# Dockerfile — Mini Upstash Pro

# ---- Stage 1: builder ----
FROM node:18-alpine AS builder
WORKDIR /app

# WAJIB: biar build gak throw AUTH_SECRET
ARG AUTH_SECRET
ARG AUTH_URL
ENV AUTH_SECRET=${AUTH_SECRET:-dummy-build-secret-for-railway-build-only-123456}
ENV AUTH_URL=${AUTH_URL:-http://localhost:3000}
ENV NEXT_TELEMETRY_DISABLED=1

COPY package.json package-lock.json* ./
RUN npm ci

COPY . .
RUN npm run build

# ---- Stage 2: runner ----
FROM node:18-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV HOSTNAME="0.0.0.0"
ENV PORT=8080
ENV DATA_DIR=/app/data

RUN mkdir -p /app/data

COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

EXPOSE 3000
CMD ["node", "server.js"]