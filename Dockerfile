# Dockerfile — Mini Upstash Pro
#
# Dipakai di 2 tempat (satu image yang sama):
#   - VPS Ubuntu: docker-compose.yml build & jalanin image ini sebagai service "app".
#   - Railway: Railway otomatis detect Dockerfile ini (lihat railway.json) dan build+deploy
#     tanpa perlu Docker daemon di sisi Railway sendiri — build-nya jalan di infra Railway,
#     hasil container-nya yang dijalankan. Di runtime, DEPLOYMENT_MODE=external bikin app
#     TIDAK butuh /var/run/docker.sock sama sekali (lihat lib/env.js).

# ---- Stage 1: builder ----
FROM node:18-alpine AS builder
WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci

COPY . .
# next.config.mjs -> output: 'standalone', jadi build ini hasilin .next/standalone yang
# udah include node_modules minimal (gak perlu npm ci lagi di stage runner).
RUN npm run build

# ---- Stage 2: runner ----
FROM node:18-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV HOSTNAME=0.0.0.0
ENV PORT=3000
ENV DATA_DIR=/app/data

# Data persisten (instances.json, vector-instances.json, users.json) — mount volume Railway
# atau bind mount VPS di /app/data supaya SURVIVE tiap redeploy/restart (lihat lib/paths.js).
RUN mkdir -p /app/data

COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

EXPOSE 3000
CMD ["node", "server.js"]
