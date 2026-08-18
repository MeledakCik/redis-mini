// Qdrant REST API gak punya counter "commands processed" kayak Redis INFO stats,
// jadi kita hitung sendiri di layer aplikasi tiap kali /exec dipanggil sukses.
//
// Backend punya 2 mode, sama pola-nya kayak lib/rate-limit.js:
//  - REDIS_URL diisi (Redis internal, khas Railway) -> disimpan di Redis (HINCRBY),
//    jadi metrics survive restart & konsisten lintas instance app.
//  - REDIS_URL kosong -> fallback in-memory Map di globalThis (perilaku lama), cukup
//    untuk local/VPS single-instance.

import Redis from "ioredis";

const store = globalThis.__miniUpstashVectorMetrics || (globalThis.__miniUpstashVectorMetrics = new Map());

let _vmRedis;
function getMetricsRedis() {
  if (!process.env.REDIS_URL) return null;
  if (!_vmRedis) {
    _vmRedis = globalThis.__miniUpstashVectorMetricsRedis;
    if (!_vmRedis) {
      _vmRedis = new Redis(process.env.REDIS_URL, { maxRetriesPerRequest: 1, connectTimeout: 2000 });
      _vmRedis.on("error", () => {}); // jangan crash proses kalau Redis metrics lagi mati
      globalThis.__miniUpstashVectorMetricsRedis = _vmRedis;
    }
  }
  return _vmRedis;
}

function key(id) {
  return `vectormetrics:${id}`;
}

export async function recordOp(id) {
  const redis = getMetricsRedis();
  if (redis) {
    try {
      await redis.hincrby(key(id), "totalOps", 1);
      return;
    } catch {
      // fallback ke in-memory di bawah kalau Redis lagi bermasalah
    }
  }
  const entry = store.get(id) || { totalOps: 0, bytesOut: 0 };
  entry.totalOps += 1;
  store.set(id, entry);
}

export async function recordBytesOut(id, bytes) {
  const redis = getMetricsRedis();
  if (redis) {
    try {
      await redis.hincrby(key(id), "bytesOut", bytes);
      return;
    } catch {
      // fallback ke in-memory
    }
  }
  const entry = store.get(id) || { totalOps: 0, bytesOut: 0 };
  entry.bytesOut += bytes;
  store.set(id, entry);
}

export async function getMetrics(id) {
  const redis = getMetricsRedis();
  if (redis) {
    try {
      const h = await redis.hgetall(key(id));
      if (h && (h.totalOps !== undefined || h.bytesOut !== undefined)) {
        return { totalOps: Number(h.totalOps || 0), bytesOut: Number(h.bytesOut || 0) };
      }
    } catch {
      // fallback ke in-memory
    }
  }
  return store.get(id) || { totalOps: 0, bytesOut: 0 };
}
