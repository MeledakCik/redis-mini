import Redis from "ioredis";

// cache koneksi biar gak buka koneksi baru tiap request (pakai globalThis biar survive hot-reload di dev)
const pool = globalThis.__miniUpstashPool || (globalThis.__miniUpstashPool = new Map());

// Instance mode "external" (Railway/VPS tanpa Docker) nyimpen externalUrl (redis://... atau
// rediss://... dari Railway Redis plugin / Upstash / dst) — konek pakai itu langsung.
// Instance mode "docker" (default/lama) tetap konek ke 127.0.0.1:port dengan password lokal.
export function getRedisClient(instance) {
  const key = instance.id;
  let client = pool.get(key);
  if (!client) {
    const opts = { lazyConnect: false, maxRetriesPerRequest: 1, retryStrategy: () => null, connectTimeout: 3000 };
    client =
      instance.provider === "external" && instance.externalUrl
        ? new Redis(instance.externalUrl, opts)
        : new Redis({ host: instance.host || "127.0.0.1", port: instance.port, password: instance.password, ...opts });
    client.on("error", () => {}); // biar gak crash proses kalau redis mati sementara
    pool.set(key, client);
  }
  return client;
}

export function dropRedisClient(id) {
  const client = pool.get(id);
  if (client) {
    client.disconnect();
    pool.delete(id);
  }
}

// whitelist command yang boleh dieksekusi dari Data Browser / CLI (safety, biar gak disalahgunakan jadi RCE-ish)
export const ALLOWED_COMMANDS = new Set([
  "PING", "GET", "SET", "SETEX", "DEL", "EXISTS", "TTL", "PTTL", "EXPIRE",
  "KEYS", "SCAN", "TYPE", "DBSIZE", "FLUSHDB", "FLUSHALL", "INFO",
  "HGET", "HSET", "HGETALL", "HDEL", "HKEYS", "HLEN",
  "LPUSH", "RPUSH", "LRANGE", "LLEN", "LPOP", "RPOP",
  "SADD", "SMEMBERS", "SREM", "SCARD",
  "ZADD", "ZRANGE", "ZSCORE", "ZREM", "ZCARD",
  "INCR", "DECR", "INCRBY", "DECRBY",
  "STRLEN", "RENAME", "PERSIST", "ECHO", "TIME",
  "SLOWLOG", "CLIENT", "CONFIG", "COMMAND",
]);

export function isCommandAllowed(cmd) {
  return ALLOWED_COMMANDS.has(String(cmd).toUpperCase());
}
