// lib/quota.js — Task 3: limit per akun free tier = 1 Redis + 1 Vector + 500MB storage total.
import { readInstancesForUser } from "@/lib/store";
import { readVectorInstancesForUser } from "@/lib/vector-store";
import { getProvider } from "@/lib/infra";

export const MAX_REDIS_PER_USER = 1;
export const MAX_VECTOR_PER_USER = 1;
export const MAX_STORAGE_BYTES = 500 * 1024 * 1024; // 500MB

// Approx bytes per vector float (4 bytes) + ~15% overhead untuk payload/index Qdrant,
// dipakai juga oleh app/api/vector/[id]/stats/route.js supaya angkanya konsisten.
export function approxVectorBytes(pointsCount, dimension) {
  return Math.round(pointsCount * (dimension || 0) * 4 * 1.15);
}

export function canCreateInstance(userId, type) {
  const redisCount = readInstancesForUser(userId).length;
  const vectorCount = readVectorInstancesForUser(userId).length;

  if (type === "redis" && redisCount >= MAX_REDIS_PER_USER) {
    return { allowed: false, reason: "redis_limit", count: redisCount, limit: MAX_REDIS_PER_USER };
  }
  if (type === "vector" && vectorCount >= MAX_VECTOR_PER_USER) {
    return { allowed: false, reason: "vector_limit", count: vectorCount, limit: MAX_VECTOR_PER_USER };
  }
  return { allowed: true };
}

function limitResponse(reason, extra = {}) {
  const messages = {
    redis_limit: "Free plan limit: 1 Redis database per account. Upgrade to create more.",
    vector_limit: "Free plan limit: 1 Vector database per account. Upgrade to create more.",
    storage_limit: "Storage limit 500MB reached. Delete data or upgrade.",
  };
  return {
    error: reason === "storage_limit" ? "STORAGE_LIMIT" : "LIMIT_REACHED",
    message: messages[reason] || "Free plan limit reached.",
    limit: reason === "storage_limit" ? MAX_STORAGE_BYTES : 1,
    upgradeUrl: "/billing",
    ...extra,
  };
}
export { limitResponse };

// Storage = sum bytes semua vector collection milik user (dihitung dari points_count x dimension)
// + approx memory Redis milik user (dari INFO memory / container stats, tergantung provider).
export async function getStorageUsage(userId) {
  const provider = getProvider();
  let vectorBytes = 0;
  let redisBytes = 0;

  const { getCollectionInfo, isQdrantReachable } = await import("@/lib/qdrant");
  const vectorInstances = readVectorInstancesForUser(userId);
  if (vectorInstances.length && (await isQdrantReachable())) {
    for (const inst of vectorInstances) {
      try {
        const info = await getCollectionInfo(inst.name);
        const pointsCount = info?.result?.points_count ?? 0;
        vectorBytes += approxVectorBytes(pointsCount, inst.dimension);
      } catch {
        // collection belum ada / gak reachable, dianggap 0 dulu
      }
    }
  }

  const redisInstances = readInstancesForUser(userId);
  for (const inst of redisInstances) {
    try {
      const { memoryUsageBytes } = await provider.getRedisLiveStatus(inst);
      if (memoryUsageBytes) redisBytes += memoryUsageBytes;
    } catch {}
  }

  return { total: vectorBytes + redisBytes, vectorBytes, redisBytes };
}

export async function assertStorageAvailable(userId) {
  const usage = await getStorageUsage(userId);
  if (usage.total >= MAX_STORAGE_BYTES) {
    return { allowed: false, usage: usage.total, response: limitResponse("storage_limit", { usage: usage.total }) };
  }
  return { allowed: true, usage: usage.total };
}
