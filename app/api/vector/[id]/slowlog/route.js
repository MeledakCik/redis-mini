import { NextResponse } from "next/server";
import { getVectorInstanceForUser } from "@/lib/vector-store";
import { requireUser, authErrorResponse } from "@/lib/auth-guard";

// Qdrant gak punya konsep "SLOWLOG" seperti Redis lewat REST API-nya.
// Endpoint ini selalu balikin kosong biar UI Insights tetap konsisten dengan tab Redis.
export async function GET(_req, { params }) {
  let user;
  try {
    user = await requireUser();
  } catch (err) {
    return authErrorResponse(err);
  }

  const inst = getVectorInstanceForUser(params.id, user.id);
  if (!inst) return NextResponse.json({ error: "Database not found" }, { status: 404 });

  return NextResponse.json({ entries: [], note: "Qdrant belum expose slowlog lewat REST API." });
}
