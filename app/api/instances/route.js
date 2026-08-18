import { NextResponse } from "next/server";
import { readInstances, readInstancesForUser, upsertInstance } from "@/lib/store";
import { getProvider, getProviderForInstance, DEPLOYMENT_MODE } from "@/lib/infra";
import { generateId, generatePassword, generatePort } from "@/lib/generate";
import { requireUser, authErrorResponse } from "@/lib/auth-guard";
import { checkRateLimit } from "@/lib/rate-limit";
import { canCreateInstance, limitResponse } from "@/lib/quota";

// NOTE: ini adalah pattern acuan untuk semua route lain di app/api/redis/... dan
// app/api/vector/... — lihat app/api/vector/route.js untuk versi Vector-nya.
//
// Task 2: route ini sekarang provider-agnostic lewat lib/infra.js. Di mode "docker"
// (local Axioo / VPS dengan Docker daemon) tetap spawn container redis:7-alpine seperti
// sebelumnya. Di mode "external" (Railway, atau DEPLOYMENT_MODE=external manapun) TIDAK
// coba spawn container — user connect ke Redis eksternal (Railway Redis plugin, Upstash,
// dst) lewat REDIS_URL yang dikirim dari form "Connect External Redis".

export async function GET() {
  let user;
  try {
    user = await requireUser();
  } catch (err) {
    return authErrorResponse(err);
  }

  // Hanya instance milik user yang login
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

  // Task 3: free tier = 1 Redis database per akun.
  const quota = canCreateInstance(user.id, "redis");
  if (!quota.allowed) {
    return NextResponse.json(limitResponse(quota.reason, { count: quota.count }), { status: 403 });
  }

  // Rate limit: 2x create per 60 menit per user
  const rl = await checkRateLimit("redis:create", user.id);
  if (!rl.allowed) return rl.response;

  const provider = getProvider();
  const providerOk = await provider.isAvailable();
  if (!providerOk) {
    const msg =
      provider.mode === "docker"
        ? "Docker daemon tidak jalan. Buka Docker Desktop dulu."
        : "Gagal menghubungi infrastruktur eksternal.";
    return NextResponse.json({ error: msg }, { status: 503 });
  }

  const body = await req.json().catch(() => ({}));

  try {
    const id = generateId(8);
    // Token akses REST API/CLI kita sendiri (dicek di app/api/redis/[id]/exec/route.js).
    // Ini SELALU digenerate app-level, terpisah dari kredensial Redis eksternal itu sendiri
    // (yang di mode external sudah nempel di dalam externalUrl / dikelola providernya
    // sendiri) — jadi endpoint exec tetap konsisten butuh Bearer token di KEDUA mode.
    const apiToken = generatePassword(24);
    let created;

    if (provider.mode === "external") {
      // Mode external (Railway/VPS tanpa Docker daemon): user WAJIB kasih connection
      // string Redis eksternal sendiri lewat form "Connect External Redis" di frontend.
      const externalUrl = String(body.redisUrl || body.externalUrl || "").trim();
      if (!externalUrl) {
        return NextResponse.json({ error: "Redis URL wajib diisi (redis:// atau rediss://)." }, { status: 400 });
      }
      created = await provider.createRedisInstance({ id, externalUrl });
    } else {
      // Mode docker (perilaku lama, apa adanya): port unik lintas SEMUA user (satu mesin
      // Docker dipakai bersama, bukan cuma milik sendiri).
      const allInstances = readInstances();
      const port = generatePort(allInstances.map((i) => i.port).filter(Boolean));
      const containerName = `mini-upstash-${id}`;
      // Redis container pakai apiToken yang sama sebagai --requirepass, jadi satu token
      // berfungsi ganda: auth Redis beneran DAN Bearer token endpoint exec kita.
      created = await provider.createRedisInstance({ id, port, password: apiToken, containerName });
      created.containerName = containerName;
    }

    const instance = {
      id,
      userId: user.id,
      name: body.name?.trim() || id,
      provider: created.provider,
      containerId: created.containerId || null,
      containerName: created.containerName || null,
      host: created.host,
      port: created.port,
      password: apiToken,
      externalUrl: created.externalUrl || null,
      region: created.provider === "external" ? "External" : "Local Docker",
      tls: created.provider === "external" ? String(created.externalUrl).startsWith("rediss://") : false,
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
