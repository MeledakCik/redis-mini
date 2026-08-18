import Redis from "ioredis";
import { redisClientForUser, purgeTenantKeys } from "@/lib/tenant";

// cache koneksi biar gak buka koneksi baru tiap request (pakai globalThis biar survive hot-reload di dev)
const pool = globalThis.__miniUpstashPool || (globalThis.__miniUpstashPool = new Map());

// Adapter yang bikin akun ACL per-database (provider "acl", lihat lib/infra.js) kompatibel
// dengan pemanggil di app/api/redis/[id]/* yang sudah terbiasa pakai method gaya ioredis
// (.call, .scan, .type, .ttl, .info, .dbsize, .flushdb). Di balik layar semua operasi lewat
// SATU koneksi admin (lib/redis-admin.js) + prefixing otomatis per tenant (lib/tenant.js),
// BUKAN raw koneksi ACL — supaya SCAN/KEYS tetap ke-scope ke prefix tenant-nya sendiri (Redis
// ACL key-pattern native gak otomatis membatasi command tanpa argumen key eksplisit seperti
// SCAN/KEYS, makanya app ini gak bisa cuma ngandelin ACL server buat data browsing internal).
class AclRedisAdapter {
  constructor(username) {
    this.username = username;
    this.proxy = redisClientForUser(username);
  }
  call(cmd, ...args) {
    return this.proxy.call(cmd, ...args);
  }
  scan(...args) {
    return this.proxy.call("SCAN", ...args);
  }
  type(key) {
    return this.proxy.call("TYPE", key);
  }
  ttl(key) {
    return this.proxy.call("TTL", key);
  }
  info(section) {
    return this.proxy.call("INFO", section);
  }
  dbsize() {
    return this.proxy.call("DBSIZE");
  }
  // FLUSHDB asli diblok (dangerous command, lihat lib/tenant.js) karena keyspace-nya SHARED
  // sama semua tenant lain — flush "punya sendiri" di sini artinya hapus semua key dengan
  // prefix tenant ini aja, bukan FLUSHDB beneran ke server.
  flushdb() {
    return purgeTenantKeys(this.username);
  }
  // Koneksi admin di-share semua tenant, jadi "disconnect" per instance harus no-op — gak
  // boleh matiin koneksi yang lagi dipakai tenant lain.
  disconnect() {}
}

// Instance provider "acl" (Task: Redis-as-a-Service, lihat lib/infra.js) -> lewat proxy
// prefixed di atas. Provider "external" (legacy) nyimpen externalUrl -> konek pakai itu
// langsung. Provider "docker" (legacy/local dev) tetap konek ke 127.0.0.1:port.
export function getRedisClient(instance) {
  const key = instance.id;
  let client = pool.get(key);
  if (!client) {
    if (instance.provider === "acl" && instance.username) {
      client = new AclRedisAdapter(instance.username);
    } else {
      const opts = { lazyConnect: false, maxRetriesPerRequest: 1, retryStrategy: () => null, connectTimeout: 3000 };
      client =
        instance.provider === "external" && instance.externalUrl
          ? new Redis(instance.externalUrl, opts)
          : new Redis({ host: instance.host || "127.0.0.1", port: instance.port, password: instance.password, ...opts });
      client.on("error", () => {}); // biar gak crash proses kalau redis mati sementara
    }
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
