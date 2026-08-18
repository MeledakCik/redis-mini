import { NextResponse } from "next/server";
import { getVectorInstanceForUser } from "@/lib/vector-store";
import { getCollectionInfo } from "@/lib/qdrant";
import { requireUser, authErrorResponse } from "@/lib/auth-guard";

export async function GET(_req, { params }) {
  let user;
  try {
    user = await requireUser();
  } catch (err) {
    return authErrorResponse(err);
  }

  const inst = getVectorInstanceForUser(params.id, user.id);
  if (!inst) return NextResponse.json({ error: "Database not found" }, { status: 404 });

  try {
    const info = await getCollectionInfo(inst.name);
    const pointsCount = info?.result?.points_count ?? 0;
    const segmentsCount = info?.result?.segments_count ?? 0;

    return NextResponse.json({
      totalVectors: pointsCount,
      dimension: inst.dimension,
      metric: inst.metric,
      segmentsCount,
    });
  } catch (err) {
    return NextResponse.json({ error: err.message || "Gagal analisa keyspace" }, { status: 500 });
  }
}
