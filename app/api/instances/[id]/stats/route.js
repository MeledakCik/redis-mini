import { NextResponse } from "next/server";
import { getInstanceForUser } from "@/lib/store";
import { requireUser, authErrorResponse } from "@/lib/auth-guard";
import { getStorageUsage, getPlanAndLimits } from "@/lib/quota";

// Task 3: dipakai tab "Details" untuk nampilin "Storage Used: X MB / 500MB" — kuota storage
// itu per AKUN (gabungan semua Redis + Vector milik user), bukan per instance, jadi angkanya
// akan sama kalau user buka instance lain. Dipolling ringan (gak sering) oleh frontend.
export async function GET(_req, { params }) {
  let user;
  try {
    user = await requireUser();
  } catch (err) {
    return authErrorResponse(err);
  }

  const inst = getInstanceForUser(params.id, user.id);
  if (!inst) return NextResponse.json({ error: "Database not found" }, { status: 404 });

  try {
    const usage = await getStorageUsage(user.id);
    const { maxStorage } = getPlanAndLimits(user.email);
    return NextResponse.json({
      usageBytes: usage.total,
      limitBytes: maxStorage,
      pct: Math.min(100, (usage.total / maxStorage) * 100),
      breakdown: { redisBytes: usage.redisBytes, vectorBytes: usage.vectorBytes },
    });
  } catch (err) {
    return NextResponse.json({ error: err.message || "Gagal ambil storage usage" }, { status: 500 });
  }
}
