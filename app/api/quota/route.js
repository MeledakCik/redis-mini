export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextResponse } from "next/server";
import { requireUser, authErrorResponse } from "@/lib/auth-guard";
import { readInstancesForUser } from "@/lib/store";
import { readVectorInstancesForUser } from "@/lib/vector-store";
import { getStorageUsage, getPlanAndLimits } from "@/lib/quota";

// Task 3: satu endpoint ringkas buat banner kuning di /databases & /vector, dan buat
// halaman /billing — daripada tiap halaman ngitung sendiri dari /api/instances + /api/vector.
// Payment gateway: sekarang juga bawa info plan (free/pro) + limit yang sesuai plan itu.
export async function GET() {
  let user;
  try {
    user = await requireUser();
  } catch (err) {
    return authErrorResponse(err);
  }

  const redisCount = readInstancesForUser(user.id).length;
  const vectorCount = readVectorInstancesForUser(user.id).length;
  const usage = await getStorageUsage(user.id);
  const { plan, expiresAt, maxRedis, maxVector, maxStorage } = getPlanAndLimits(user.email);

  return NextResponse.json({
    plan: { name: plan, expiresAt },
    redis: { count: redisCount, limit: maxRedis },
    vector: { count: vectorCount, limit: maxVector },
    storage: { usageBytes: usage.total, limitBytes: maxStorage, pct: Math.min(100, (usage.total / maxStorage) * 100) },
  });
}