import { NextResponse } from "next/server";
import { getInstanceForUser } from "@/lib/store";
import { getProviderForInstance } from "@/lib/infra";
import { dropRedisClient } from "@/lib/redis-pool";
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

  const rl = await checkRateLimit("redis:restart", user.id, inst.id);
  if (!rl.allowed) return rl.response;

  try {
    const provider = getProviderForInstance(inst);
    // Mode docker: restart container beneran. Mode external: no-op di sisi infra (gak ada
    // container), redis-pool.js yang bikin koneksi ioredis fresh biar tetap terasa "reconnect".
    await provider.restartRedisInstance(inst);
    dropRedisClient(inst.id);
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: err.message || "Gagal restart" }, { status: 500 });
  }
}
