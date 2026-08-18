import { NextResponse } from "next/server";
import { getInstanceForUser } from "@/lib/store";
import { getRedisClient } from "@/lib/redis-pool";
import { requireUser, authErrorResponse } from "@/lib/auth-guard";
import { checkRateLimit } from "@/lib/rate-limit";

export async function POST(_req, { params }) {
  let user;
  try {
    user = await requireUser();
  } catch (err) {
    return authErrorResponse(err);
  }

  const inst = getInstanceForUser(params.id, user.id);
  if (!inst) return NextResponse.json({ error: "Database not found" }, { status: 404 });

  const rl = await checkRateLimit("redis:flush", user.id, inst.id);
  if (!rl.allowed) return rl.response;

  try {
    // FLUSHDB lewat ioredis — sama untuk mode docker maupun external (redis-pool.js
    // yang nentuin mau konek ke container lokal atau externalUrl).
    const client = getRedisClient(inst);
    await client.flushdb();
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: err.message || "Gagal flush database" }, { status: 500 });
  }
}
