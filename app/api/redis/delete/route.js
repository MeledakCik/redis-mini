import { NextResponse } from "next/server";
import { requireUser, authErrorResponse } from "@/lib/auth-guard";
import { checkRateLimit } from "@/lib/rate-limit";
import { deleteTenant } from "@/lib/tenant";

export async function DELETE() {
  let user;
  try {
    user = await requireUser();
  } catch (err) {
    return authErrorResponse(err);
  }

  const rl = await checkRateLimit("tenant:delete", user.id);
  if (!rl.allowed) return rl.response;

  try {
    const result = await deleteTenant(user.id, { purgeData: true });
    if (!result.deleted) {
      return NextResponse.json({ error: "Kamu belum punya akun Redis" }, { status: 404 });
    }
    return NextResponse.json({ success: true, purgedKeys: result.purgedKeys });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: err.message || "Gagal menghapus akun Redis" }, { status: 500 });
  }
}
