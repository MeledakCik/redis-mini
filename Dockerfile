FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine
WORKDIR /app
RUN apk add --no-cache dumb-init

COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/lib ./lib
COPY --from=builder /app/app ./app
COPY --from=builder /app/components ./components

# FIX: copy pakai wildcard biar .js/.mjs dua-duanya ke-copy, gak error not found
COPY --from=builder /app/next.config.* ./
COPY --from=builder /app/middleware.* ./

RUN addgroup -g 1001 -S nodejs && adduser -S nextjs -u 1001 && mkdir -p /app/data && chown -R nextjs:nodejs /app && chmod 755 /app/data

USER nextjs
EXPOSE 3000
ENV DATA_DIR=/app/data
ENV NODE_ENV=production
ENV PORT=3000

CMD ["dumb-init", "node_modules/.bin/next", "start"]