import crypto from "crypto";
import { getAdminRedis } from "@/lib/redis-admin";
import { resolvePublicRedisEndpoint } from "@/lib/redis-public-host";
import { getTenantByOwnerId, upsertTenant, removeTenantByOwnerId } from "@/lib/tenant-store";

// ---------------------------------------------------------------------------
// Kredensial
// ---------------------------------------------------------------------------

export function generatePassword(len = 16) {
  return crypto.randomBytes(len).toString("base64url").slice(0, len);
}

export function buildUsername(seed) {
  const clean = String(seed || "")
    .replace(/[^a-zA-Z0-9]/g, "")
    .toLowerCase();
  const base = clean ? clean.slice(0, 12) : crypto.randomBytes(4).toString("hex");
  return `user_${base}`;
}

// ---------------------------------------------------------------------------
// Command safety - FIX: SCRIPT dihapus dari dangerous karena BullMQ butuh EVALSHA/SCRIPT
// ---------------------------------------------------------------------------

export const DANGEROUS_COMMANDS = new Set([
  "FLUSHALL", "FLUSHDB", "CONFIG", "ACL", "SHUTDOWN", "DEBUG", "MODULE",
  "CLUSTER", "REPLICAOF", "SLAVEOF", "MONITOR", "SAVE", "BGSAVE", "BGREWRITEAOF",
  "LASTSAVE", "SWAPDB", "FAILOVER", "RESET", "LATENCY", "SLOWLOG",
]);

export function isDangerousCommand(cmd) {
  return DANGEROUS_COMMANDS.has(String(cmd).toUpperCase());
}

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

const MULTI_KEY_COMMANDS = new Set(["DEL", "UNLINK", "EXISTS", "TOUCH", "MGET"]);

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
      const keys = await this.admin.call("KEYS", this._prefixKey("*"));
      return keys.length;
    }

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

const clientCache = globalThis.__miniUpstashTenantClients || (globalThis.__miniUpstashTenantClients = new Map());

export function redisClientForUser(username) {
  if (!clientCache.has(username)) {
    clientCache.set(username, new TenantRedisClient(username));
  }
  return clientCache.get(username);
}

// ---------------------------------------------------------------------------
// Provisioning - FIXED FOR BULLMQ
// ---------------------------------------------------------------------------

export function buildPublicRedisUrl({ username, password }) {
  const { host, port, scheme } = resolvePublicRedisEndpoint();
  return `${scheme}://${username}:${password}@${host}:${port}`;
}

export async function applyAclUser({ username, password }) {
  const admin = getAdminRedis();
  try {
    // FIX: BullMQ butuh INFO, EVAL, EVALSHA, SCRIPT + key pattern bull:*
    // -@dangerous nge-block INFO, jadi kita allow balik +info dll
    await admin.call(
      "ACL", "SETUSER", username,
      "reset",
      "on",
      `>${password}`,
      `~${username}:*`,
      `~${username}:bull:*`,
      `~bull:*`,
      `~${username}:*bull*`,
      "+@all",
      "-@dangerous",
      "+info",
      "+client|getname",
      "+client|setname",
      "+eval",
      "+evalsha",
      "+script",
      "+eval_ro",
      "+memory"
    );
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
    console.error(`[tenant] ACL DELUSER gagal untuk ${username}:`, err.message);
    return false;
  }
}

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
