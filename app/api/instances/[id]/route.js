import { NextResponse } from "next/server";
import { getInstanceForUser, removeInstance } from "@/lib/store";
import { getProviderForInstance } from "@/lib/infra";
import { dropRedisClient } from "@/lib/redis-pool";
import { requireUser, authErrorResponse } from "@/lib/auth-guard";
import { checkRateLimit } from "@/lib/rate-limit";

export async function GET(_req, { params }) {
  let user;
  try {
    user = await requireUser();
  } catch (err) {
    return authErrorResponse(err);
  }

  const inst = getInstanceForUser(params.id, user.id);
  if (!inst) return NextResponse.json({ error: "Database not found" }, { status: 404 });

  const provider = getProviderForInstance(inst);
  let status = "not_found";
  let memoryUsageBytes = null;
  try {
    ({ status, memoryUsageBytes } = await provider.getRedisLiveStatus(inst));
  } catch {}

  return NextResponse.json({ instance: { ...inst, status, memoryUsageBytes } });
}

export async function DELETE(_req, { params }) {
  let user;
  try {
    user = await requireUser();
  } catch (err) {
    return authErrorResponse(err);
  }

  const inst = getInstanceForUser(params.id, user.id);
  if (!inst) return NextResponse.json({ error: "Database not found" }, { status: 404 });

  const rl = await checkRateLimit("redis:delete", user.id);
  if (!rl.allowed) return rl.response;

  const provider = getProviderForInstance(inst);
  await provider.removeRedisInstance(inst);
  dropRedisClient(inst.id);
  removeInstance(inst.id);

  return NextResponse.json({ success: true });
}
