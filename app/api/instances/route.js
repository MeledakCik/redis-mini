import { NextResponse } from "next/server";
import { readInstances, readInstancesForUser, upsertInstance } from "@/lib/store";
import { getProviderForInstance, DEPLOYMENT_MODE, REGION_LABEL, AclProvider } from "@/lib/infra";
import { generateId } from "@/lib/generate";
import { requireUser, authErrorResponse } from "@/lib/auth-guard";
import { checkRateLimit } from "@/lib/rate-limit";
import { canCreateInstance, limitResponse } from "@/lib/quota";

// Redis-as-a-Service provider: SATU cluster Redis utama (REDIS_URL) di-share oleh semua
// customer. Setiap database yang dibuat dari dashboard mendapat akun Redis ACL sendiri
// (`user_<id>` + password + key prefix `user_<id>:`), diprovisioning otomatis lewat
// `ACL SETUSER` (lib/tenant.js) — TIDAK ada input URL manual dari customer, TIDAK ada
// spawn container per database. Instance lama (provider "docker"/"external") tetap
// ditangani lewat provider masing-masing (lib/infra.js) supaya gak hilang dari dashboard.

export async function GET() {
  let user;
  try {
    user = await requireUser();
  } catch (err) {
    return authErrorResponse(err);
  }

  // Hanya database milik user yang login — tidak pernah menampilkan database akun lain.
  const db = readInstancesForUser(user.id);

  const result = await Promise.all(
    db.map(async (inst) => {
      const provider = getProviderForInstance(inst);
      try {
        const { status, memoryUsageBytes } = await provider.getRedisLiveStatus(inst);
        return { ...inst, status, memoryUsageBytes };
      } catch {
        return { ...inst, status: "not_found", memoryUsageBytes: null };
      }
    })
  );

  return NextResponse.json({
    instances: result.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)),
    deploymentMode: DEPLOYMENT_MODE,
  });
}

export async function POST(req) {
  let user;
  try {
    user = await requireUser();
  } catch (err) {
    return authErrorResponse(err);
  }

  // FREE MODE: 1 Redis database per akun (lihat lib/quota.js — FREE_TIER_LIMIT).
  const quota = canCreateInstance(user.id, "redis");
  if (!quota.allowed) {
    return NextResponse.json(limitResponse(quota.reason, { count: quota.count }), { status: 403 });
  }

  // Rate limit: 2x create per 60 menit per user
  const rl = await checkRateLimit("redis:create", user.id);
  if (!rl.allowed) return rl.response;

  const providerOk = await AclProvider.isAvailable();
  if (!providerOk) {
    return NextResponse.json(
      { error: "Gagal menghubungi Redis cluster utama. Coba lagi sebentar lagi." },
      { status: 503 }
    );
  }

  const body = await req.json().catch(() => ({}));

  try {
    const id = generateId(8);

    // Satu klik -> langsung provisioning akun ACL di cluster Redis utama. Tidak ada mode
    // "connect external redis" lagi di dashboard customer.
    const created = await AclProvider.createRedisInstance({ id });

    const instance = {
      id,
      userId: user.id,
      name: body.name?.trim() || id,
      provider: created.provider,
      containerId: null,
      containerName: null,
      host: created.host,
      port: created.port,
      username: created.username,
      prefix: created.prefix,
      // Password ACL beneran, sekaligus dipakai sebagai Bearer token endpoint REST/CLI kita
      // sendiri (app/api/redis/[id]/exec) — satu kredensial untuk dua kegunaan, sama seperti
      // pola lama di lib/tenant.js.
      password: created.password,
      externalUrl: created.externalUrl,
      region: REGION_LABEL,
      tls: String(created.externalUrl).startsWith("rediss://"),
      eviction: "allkeys-lru",
      maxMemoryMb: 100,
      createdAt: new Date().toISOString(),
    };

    upsertInstance(instance);
    return NextResponse.json({ instance }, { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: err.message || "Gagal membuat database" }, { status: 500 });
  }
}
