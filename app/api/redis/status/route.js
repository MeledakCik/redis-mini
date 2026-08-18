export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextResponse } from "next/server";
import { requireUser, authErrorResponse } from "@/lib/auth-guard";
import { getTenantByOwnerId, buildPublicRedisUrl } from "@/lib/tenant";

// Read-only — dipakai halaman /connect buat cek "user ini udah punya akun Redis belum"
// tanpa nge-trigger create/rate-limit.
export async function GET() {
  let user;
  try {
    user = await requireUser();
  } catch (err) {
    return authErrorResponse(err);
  }

  const tenant = getTenantByOwnerId(user.id);
  if (!tenant) return NextResponse.json({ tenant: null });

  return NextResponse.json({
    tenant: {
      redisUrl: buildPublicRedisUrl(tenant),
      username: tenant.username,
      password: tenant.password,
      prefix: tenant.prefix,
      directAccessSupported: tenant.aclSupported,
      createdAt: tenant.createdAt,
    },
  });
}