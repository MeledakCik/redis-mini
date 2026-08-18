import { NextResponse } from "next/server";
import { getVectorInstanceForUser } from "@/lib/vector-store";
import { deleteCollection, createCollection } from "@/lib/qdrant";
import { requireUser, authErrorResponse } from "@/lib/auth-guard";
import { checkRateLimit } from "@/lib/rate-limit";

export async function POST(_req, { params }) {
  let user;
  try {
    user = await requireUser();
  } catch (err) {
    return authErrorResponse(err);
  }

  const inst = getVectorInstanceForUser(params.id, user.id);
  if (!inst) return NextResponse.json({ error: "Database not found" }, { status: 404 });

  const rl = await checkRateLimit("vector:flush", user.id, inst.id);
  if (!rl.allowed) return rl.response;

  try {
    await deleteCollection(inst.name);
    await createCollection(inst.name, inst.dimension, inst.metric);
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: err.message || "Gagal flush vector database" }, { status: 500 });
  }
}
