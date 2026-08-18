import { NextResponse } from "next/server";
import { getVectorInstanceForUser, removeVectorInstance } from "@/lib/vector-store";
import { getCollectionInfo, deleteCollection, isQdrantReachable } from "@/lib/qdrant";
import { requireUser, authErrorResponse } from "@/lib/auth-guard";
import { checkRateLimit } from "@/lib/rate-limit";

export async function GET(_req, { params }) {
  let user;
  try {
    user = await requireUser();
  } catch (err) {
    return authErrorResponse(err);
  }

  const inst = getVectorInstanceForUser(params.id, user.id);
  if (!inst) return NextResponse.json({ error: "Database not found" }, { status: 404 });

  const qdrantUp = await isQdrantReachable();
  let status = "not_found";
  let pointsCount = 0;

  if (qdrantUp) {
    try {
      const info = await getCollectionInfo(inst.name);
      pointsCount = info?.result?.points_count ?? 0;
      status = "running";
    } catch {
      status = "not_found";
    }
  }

  return NextResponse.json({ instance: { ...inst, status, pointsCount } });
}

export async function DELETE(_req, { params }) {
  let user;
  try {
    user = await requireUser();
  } catch (err) {
    return authErrorResponse(err);
  }

  const inst = getVectorInstanceForUser(params.id, user.id);
  if (!inst) return NextResponse.json({ error: "Database not found" }, { status: 404 });

  const rl = await checkRateLimit("vector:delete", user.id);
  if (!rl.allowed) return rl.response;

  try {
    await deleteCollection(inst.name);
  } catch (err) {
    console.warn("Gagal hapus collection di Qdrant (lanjut hapus metadata):", err.message);
  }

  removeVectorInstance(inst.id);
  return NextResponse.json({ success: true });
}
