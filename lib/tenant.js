import crypto from "crypto";
import { getAdminRedis } from "@/lib/redis-admin";
import { resolvePublicRedisEndpoint } from "@/lib/redis-public-host";
import { getTenantByOwnerId, upsertTenant, removeTenantByOwnerId } from "@/lib/tenant-store";

// ---------------------------------------------------------------------------
// Kredensial
// ---------------------------------------------------------------------------

export function generatePassword(len = 16) {
  // base64url -> aman dipakai di connection string URL & sebagai argumen ACL SETUSER apa
  // adanya (ioredis .call() kirim tiap argumen terpisah ke Redis, BUKAN gabung jadi 1 string
  // command, jadi walau passwordnya kebetulan ngandung karakter aneh gak ada risiko command
  // injection ke Redis).
  return crypto.randomBytes(len).toString("base64url").slice(0, len);
}

// Generik: bisa dipakai buat username per-owner (mode /connect lama, 1 akun ACL per user)
// ATAU per-database (mode /databases baru, 1 akun ACL per instance) — tinggal beda seed-nya.
export function buildUsername(seed) {
  const clean = String(seed || "")
    .replace(/[^a-zA-Z0-9]/g, "")
    .toLowerCase();
  const base = clean ? clean.slice(0, 12) : crypto.randomBytes(4).toString("hex");
  return `user_${base}`;
}

// ---------------------------------------------------------------------------
// Command safety — dipakai DUA tempat: (a) validasi command yg dikirim customer lewat
// redisClientForUser proxy internal kita, (b) dokumentasi command yang sama-sama diblok
// lewat ACL "-@dangerous" di Redis-nya sendiri buat customer yang connect LANGSUNG pakai
// redis:// url mereka. Dua lapis, independen satu sama lain.
// ---------------------------------------------------------------------------

export const DANGEROUS_COMMANDS = new Set([
  "FLUSHALL", "FLUSHDB", "CONFIG", "ACL", "SHUTDOWN", "DEBUG", "SCRIPT", "MODULE",
  "CLUSTER", "REPLICAOF", "SLAVEOF", "MONITOR", "SAVE", "BGSAVE", "BGREWRITEAOF",
  "LASTSAVE", "SWAPDB", "FAILOVER", "RESET", "LATENCY", "SLOWLOG",
]);

export function isDangerousCommand(cmd) {
  return DANGEROUS_COMMANDS.has(String(cmd).toUpperCase());
}

// Command yang argumen pertamanya (index 0) adalah 1 key tunggal -> di-prefix.
const SINGLE_KEY_COMMANDS = new Set([
  "GET", "SET", "SETEX", "PSETEX", "SETNX", "GETSET", "GETDEL", "APPEND", "STRLEN",
  "TTL", "PTTL", "EXPIRE", "PEXPIRE", "EXPIREAT", "PERSIST", "TYPE",
  "INCR", "DECR", "INCRBY", "DECRBY", "INCRBYFLOAT",
  "HGET", "HSET", "HSETNX", "HGETALL", "HDEL", "HKEYS", "HVALS", "HLEN", "HEXISTS",
  "HINCRBY", "HINCRBYFLOAT", "HMGET", "HMSET",
  "LPUSH", "RPUSH", "LPUSHX", "RPUSHX", "LRANGE", "LLEN", "LPOP", "RPOP", "LINDEX", "LSET", "LTRIM", "LREM",
  "SADD", "SMEMBERS", "SREM", "SCARD", "SISMEMBER", "SPOP", "SRANDMEMBER",
  "ZADD", "ZRANGE", "ZSCORE", "ZREM", "ZCARD", "ZRANK", "ZINCRBY", "ZRANGEBYSCORE",
]);

// Command yang SEMUA argumennya adalah key -> semua di-prefix.
const MULTI_KEY_COMMANDS = new Set(["DEL", "UNLINK", "EXISTS", "TOUCH", "MGET"]);

// ---------------------------------------------------------------------------
// Prefixing proxy — dipakai INTERNAL oleh app (Data Browser/CLI/REST route) supaya gak
// perlu buka koneksi ioredis baru per tenant. Semua lewat 1 admin connection yang sama,
// dan enforcement isolasinya murni di layer app ini (prefix key + block command bahaya).
//
// Ini BUKAN pengganti ACL — customer yang connect LANGSUNG pakai redis://username:password@host
// tetap dibatasi oleh Redis ACL di levelnya sendiri (~{username}:*), independen dari proxy ini.
// ---------------------------------------------------------------------------

class TenantRedisClient {
  constructor(username) {
    this.prefix = `${username}:`;
    this.admin = getAdminRedis();
  }

  _prefixKey(key) {
    return `${this.prefix}${key}`;
  }

  _stripPrefix(key) {
    return key.startsWith(this.prefix) ? key.slice(this.prefix.length) : key;
  }

  // Generic escape hatch — command apa pun, dengan aturan prefixing otomatis untuk command
  // umum di atas. Untuk command di luar daftar itu, key HARUS sudah di-prefix manual oleh
  // caller (dan caller SENDIRI yang tanggung jawab jangan bocorin akses ke prefix tenant lain).
  async call(command, ...args) {
    const cmd = String(command).toUpperCase();

    if (isDangerousCommand(cmd)) {
      throw new Error(`Command "${cmd}" tidak diizinkan untuk akun customer.`);
    }

    if (cmd === "KEYS") {
      const pattern = args[0] ?? "*";
      const results = await this.admin.call("KEYS", this._prefixKey(pattern));
      return results.map((k) => this._stripPrefix(k));
    }

    if (cmd === "SCAN") {
      // args: [cursor, "MATCH", pattern, "COUNT", n, ...]
      const newArgs = [...args];
      const matchIdx = newArgs.findIndex((a) => String(a).toUpperCase() === "MATCH");
      if (matchIdx >= 0 && newArgs[matchIdx + 1] != null) {
        newArgs[matchIdx + 1] = this._prefixKey(newArgs[matchIdx + 1]);
      } else {
        newArgs.push("MATCH", this._prefixKey("*"));
      }
      const [cursor, keys] = await this.admin.call("SCAN", ...newArgs);
      return [cursor, keys.map((k) => this._stripPrefix(k))];
    }

    if (cmd === "RENAME" || cmd === "RENAMENX") {
      const [src, dst, ...rest] = args;
      return this.admin.call(cmd, this._prefixKey(src), this._prefixKey(dst), ...rest);
    }

    if (MULTI_KEY_COMMANDS.has(cmd)) {
      return this.admin.call(cmd, ...args.map((k) => this._prefixKey(k)));
    }

    if (SINGLE_KEY_COMMANDS.has(cmd)) {
      const [key, ...rest] = args;
      return this.admin.call(cmd, this._prefixKey(key), ...rest);
    }

    if (cmd === "DBSIZE") {
      // DBSIZE itu ukuran seluruh keyspace shared Redis, bukan punya 1 tenant — gak relevan
      // ditampilkan ke customer. Hitung manual pakai KEYS scoped ke prefix mereka sendiri.
      const keys = await this.admin.call("KEYS", this._prefixKey("*"));
      return keys.length;
    }

    // Command tanpa key (PING, ECHO, TIME, dst) — dikirim apa adanya.
    return this.admin.call(cmd, ...args);
  }

  get(key) { return this.call("GET", key); }
  set(key, value, ...rest) { return this.call("SET", key, value, ...rest); }
  del(...keys) { return this.call("DEL", ...keys); }
  exists(...keys) { return this.call("EXISTS", ...keys); }
  keys(pattern = "*") { return this.call("KEYS", pattern); }
  ttl(key) { return this.call("TTL", key); }
  expire(key, seconds) { return this.call("EXPIRE", key, seconds); }
}

// Cache instance per username (bukan per koneksi — semua share admin connection yang sama).
const clientCache = globalThis.__miniUpstashTenantClients || (globalThis.__miniUpstashTenantClients = new Map());

export function redisClientForUser(username) {
  if (!clientCache.has(username)) {
    clientCache.set(username, new TenantRedisClient(username));
  }
  return clientCache.get(username);
}

// ---------------------------------------------------------------------------
// Provisioning — create / delete tenant di Redis utama (ACL) + tenant-store.json
// ---------------------------------------------------------------------------

export function buildPublicRedisUrl({ username, password }) {
  const { host, port, scheme } = resolvePublicRedisEndpoint();
  return `${scheme}://${username}:${password}@${host}:${port}`;
}

// Jalanin ACL SETUSER di Redis utama. Return true kalau berhasil (ACL didukung & permission
// admin cukup), false kalau ACL gak tersedia/gak diizinkan — CALLER (createTenant) yang
// memutuskan fallback-nya, bukan fungsi ini.
export async function applyAclUser({ username, password }) {
  const admin = getAdminRedis();
  try {
    // "reset" dulu biar idempotent kalau username kebetulan udah pernah ada sebelumnya
    // (mis. retry create setelah error parsial) — baru apply rule fresh.
    await admin.call(
      "ACL", "SETUSER", username,
      "reset",
      "on",
      `>${password}`,
      `~${username}:*`,
      "+@all",
      "-@dangerous"
    );
    // Best-effort — banyak Redis managed (Railway plugin, dst) gak izinin ACL SAVE tanpa
    // aclfile dikonfigurasi. Kalau gagal, ACL rule tetap aktif di memory, cuma gak persist
    // lintas restart Redis server-nya sendiri (beda dari restart app kita).
    await admin.call("ACL", "SAVE").catch(() => {});
    return true;
  } catch (err) {
    console.error(`[tenant] ACL SETUSER gagal untuk ${username}:`, err.message);
    return false;
  }
}

export async function removeAclUser(username) {
  try {
    const admin = getAdminRedis();
    await admin.call("ACL", "DELUSER", username);
    await admin.call("ACL", "SAVE").catch(() => {});
    return true;
  } catch (err) {
    // "no such user" atau ACL emang gak didukung -> gak masalah, ini best-effort cleanup
    console.error(`[tenant] ACL DELUSER gagal untuk ${username}:`, err.message);
    return false;
  }
}

// Hapus semua key milik tenant (dipakai waktu deleteTenant, opsional). Pakai SCAN, bukan
// KEYS+DEL sekaligus, biar gak nge-block Redis lama kalau datanya banyak.
export async function purgeTenantKeys(username) {
  const admin = getAdminRedis();
  const prefix = `${username}:*`;
  let cursor = "0";
  let deleted = 0;
  do {
    const [next, keys] = await admin.call("SCAN", cursor, "MATCH", prefix, "COUNT", 200);
    cursor = next;
    if (keys.length) {
      await admin.call("DEL", ...keys);
      deleted += keys.length;
    }
  } while (cursor !== "0");
  return deleted;
}

// createTenant — idempotent per ownerId: kalau tenant udah ada, langsung return yang lama
// (gak generate ulang password, gak bikin ACL user baru nyasar/orphan).
export async function createTenant(ownerId) {
  const existing = getTenantByOwnerId(ownerId);
  if (existing) return existing;

  const username = buildUsername(ownerId);
  const password = generatePassword(16);
  const prefix = `${username}:`;

  const aclSupported = await applyAclUser({ username, password });

  const tenant = {
    id: crypto.randomUUID(),
    ownerId,
    username,
    password,
    prefix,
    aclSupported,
    createdAt: new Date().toISOString(),
  };

  upsertTenant(tenant);
  return tenant;
}

export async function deleteTenant(ownerId, { purgeData = true } = {}) {
  const tenant = getTenantByOwnerId(ownerId);
  if (!tenant) return { deleted: false };

  if (tenant.aclSupported) {
    await removeAclUser(tenant.username);
  }

  let purgedKeys = 0;
  if (purgeData) {
    try {
      purgedKeys = await purgeTenantKeys(tenant.username);
    } catch (err) {
      console.error(`[tenant] Gagal purge key untuk ${tenant.username}:`, err.message);
    }
  }

  clientCache.delete(tenant.username);
  removeTenantByOwnerId(ownerId);

  return { deleted: true, purgedKeys };
}

export { getTenantByOwnerId };
