import { NextResponse } from "next/server";
import { requireUser, authErrorResponse } from "@/lib/auth-guard";
import { readInstancesForUser } from "@/lib/store";
import { readVectorInstancesForUser } from "@/lib/vector-store";
import { getStorageUsage, MAX_REDIS_PER_USER, MAX_VECTOR_PER_USER, MAX_STORAGE_BYTES } from "@/lib/quota";

// Task 3: satu endpoint ringkas buat banner kuning di /databases & /vector, dan buat
// halaman /billing — daripada tiap halaman ngitung sendiri dari /api/instances + /api/vector.
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

  return NextResponse.json({
    redis: { count: redisCount, limit: MAX_REDIS_PER_USER },
    vector: { count: vectorCount, limit: MAX_VECTOR_PER_USER },
    storage: { usageBytes: usage.total, limitBytes: MAX_STORAGE_BYTES, pct: Math.min(100, (usage.total / MAX_STORAGE_BYTES) * 100) },
  });
}
