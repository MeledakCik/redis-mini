// lib/free-tier.js — pengganti lib/quota.js + lib/plan-store.js lama. Billing/payment
// (Midtrans, lalu manual transfer + Moota) sudah DICABUT TOTAL dari produk ini — semua
// akun sekarang FREE selamanya, hardcoded, tidak ada lagi konsep plan/Pro/expiry/payment.
//
// TODO: re-add custom QRIS gateway later — kalau nanti mau jual Pro plan lagi, mulai dari
// sini: bikin ulang penyimpanan plan (mis. plans.json + lib/plan-store.js versi baru),
// lalu ganti FREE_TIER_LIMIT/MAX_VECTOR_PER_USER/MAX_STORAGE_BYTES di bawah jadi
// plan-aware lagi (function getLimitsForPlan(plan) dulu ada di lib/quota.js versi lama,
// lihat git history sebelum komit ini kalau perlu referensi).
import { readInstancesForUser } from "@/lib/store";
import { readVectorInstancesForUser } from "@/lib/vector-store";
import { getProviderForInstance } from "@/lib/infra";

// Satu-satunya sumber limit di seluruh app sekarang — flat, sama buat semua user,
// tidak ada lagi lookup ke plan/subscription manapun.
export const FREE_TIER_LIMIT = 1; // 1 Redis database per akun
export const MAX_VECTOR_PER_USER = 1; // 1 Vector database per akun
export const MAX_STORAGE_BYTES = 500 * 1024 * 1024; // 500MB total per akun (Redis + Vector)

// Dipertahankan sebagai alias biar kode lama yang masih import MAX_REDIS_PER_USER
// (kalau ada) gak pecah — nilainya identik dengan FREE_TIER_LIMIT.
export const MAX_REDIS_PER_USER = FREE_TIER_LIMIT;

export function approxVectorBytes(pointsCount, dimension) {
  return Math.round(pointsCount * (dimension || 0) * 4 * 1.15);
}

export function canCreateInstance(userId, type) {
  const redisCount = readInstancesForUser(userId).length;
  const vectorCount = readVectorInstancesForUser(userId).length;

  if (type === "redis" && redisCount >= FREE_TIER_LIMIT) {
    return { allowed: false, reason: "redis_limit", count: redisCount, limit: FREE_TIER_LIMIT };
  }
  if (type === "vector" && vectorCount >= MAX_VECTOR_PER_USER) {
    return { allowed: false, reason: "vector_limit", count: vectorCount, limit: MAX_VECTOR_PER_USER };
  }
  return { allowed: true };
}

function limitResponse(reason, extra = {}) {
  const messages = {
    redis_limit: `Free tier limit: ${FREE_TIER_LIMIT} Redis database per account.`,
    vector_limit: `Free tier limit: ${MAX_VECTOR_PER_USER} Vector database per account.`,
    storage_limit: `Storage limit ${Math.round(MAX_STORAGE_BYTES / 1024 / 1024)}MB reached. Delete data to free up space.`,
  };
  return {
    error: reason === "storage_limit" ? "STORAGE_LIMIT" : "LIMIT_REACHED",
    message: messages[reason] || "Free tier limit reached.",
    limit: reason === "storage_limit" ? MAX_STORAGE_BYTES : FREE_TIER_LIMIT,
    ...extra,
  };
}
export { limitResponse };

// Storage = sum bytes semua vector collection milik user (dihitung dari points_count x
// dimension) + approx memory Redis milik user (dari INFO memory / container stats).
export async function getStorageUsage(userId) {
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
      const { memoryUsageBytes } = await getProviderForInstance(inst).getRedisLiveStatus(inst);
      if (memoryUsageBytes) redisBytes += memoryUsageBytes;
    } catch {}
  }

  return { total: vectorBytes + redisBytes, vectorBytes, redisBytes };
}

// Guard anti-abuse yang tetap dipertahankan (bukan billing) — cegah 1 akun ngisi
// shared Redis/Qdrant cluster tanpa batas. Flat 500MB buat semua orang, gak ada
// lagi bedanya "Free vs Pro".
export async function assertStorageAvailable(userId) {
  const usage = await getStorageUsage(userId);
  if (usage.total >= MAX_STORAGE_BYTES) {
    return {
      allowed: false,
      usage: usage.total,
      response: limitResponse("storage_limit", { usage: usage.total, limit: MAX_STORAGE_BYTES }),
    };
  }
  return { allowed: true, usage: usage.total };
}
