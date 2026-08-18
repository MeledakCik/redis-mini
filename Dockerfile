FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Production stage
FROM node:20-alpine
WORKDIR /app
RUN apk add --no-cache dumb-init

COPY --from=builder /app/.next ./.next
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/public ./public
COPY --from=builder /app/node_modules ./node_modules

# FIX: copy lib & data biar DATA_DIR logic kebawa
COPY --from=builder /app/lib ./lib
COPY --from=builder /app/app ./app
COPY --from=builder /app/components ./components
COPY --from=builder /app/middleware.js ./middleware.js
COPY --from=builder /app/next.config.js ./next.config.js

# FIX: buat /app/data dengan permission nextjs (ini yang bikin EACCES hilang)
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nextjs -u 1001 && \
    mkdir -p /app/data && \
    chown -R nextjs:nodejs /app/data /app/.next && \
    chmod 755 /app/data

USER nextjs
EXPOSE 3000
ENV DATA_DIR=/app/data
ENV NODE_ENV=production

HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3000/api/auth/session', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

CMD ["dumb-init", "node_modules/.bin/next", "start"]