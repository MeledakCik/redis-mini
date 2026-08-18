import { NextResponse } from "next/server";
import { requireUser, authErrorResponse } from "@/lib/auth-guard";
import { checkRateLimit } from "@/lib/rate-limit";
import { createTenant, buildPublicRedisUrl } from "@/lib/tenant";

// Multi-tenant model: SATU Redis server (REDIS_URL) dipakai bareng-bareng semua customer.
// Isolasi antar customer dijamin oleh Redis ACL (~{username}:* di server-nya sendiri) DAN
// oleh prefixing di layer app (lib/tenant.js) buat akses lewat Data Browser/CLI kita sendiri.
//
// Idempotent: kalau user udah punya tenant, endpoint ini return yang sudah ada (gak generate
// ulang password/ACL user baru).
export async function POST() {
  let user;
  try {
    user = await requireUser();
  } catch (err) {
    return authErrorResponse(err);
  }

  const rl = await checkRateLimit("tenant:create", user.id);
  if (!rl.allowed) return rl.response;

  try {
    const tenant = await createTenant(user.id);
    const redisUrl = buildPublicRedisUrl(tenant);
    const { host, port } = parseHostPort(redisUrl);

    return NextResponse.json(
      {
        redisUrl,
        username: tenant.username,
        password: tenant.password,
        prefix: tenant.prefix,
        host,
        port,
        // false berarti ACL gak kesetting di server (Redis tanpa ACL / permission admin
        // kurang) -> redisUrl di atas TIDAK akan bisa dipakai connect langsung ke Redis.
        // Data tetap bisa diakses lewat REST/CLI bawaan app ini (proxy prefix-only).
        directAccessSupported: tenant.aclSupported,
      },
      { status: 201 }
    );
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: err.message || "Gagal membuat akun Redis" }, { status: 500 });
  }
}

function parseHostPort(redisUrl) {
  try {
    const u = new URL(redisUrl);
    return { host: u.hostname, port: u.port || "6379" };
  } catch {
    return { host: null, port: null };
  }
}
