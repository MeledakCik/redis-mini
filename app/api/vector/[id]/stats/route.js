import { NextResponse } from "next/server";
import { getVectorInstanceForUser } from "@/lib/vector-store";
import { getCollectionInfo, isQdrantReachable } from "@/lib/qdrant";
import { getProvider } from "@/lib/infra";
import { getMetrics } from "@/lib/vector-metrics";
import { requireUser, authErrorResponse } from "@/lib/auth-guard";

// Dipolling tiap 3 detik -> sengaja TIDAK di-rate-limit.
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
  if (!qdrantUp) {
    return NextResponse.json({ connected: false, error: "Tidak bisa konek ke Qdrant. Backend mungkin belum jalan." });
  }

  try {
    const info = await getCollectionInfo(inst.name);
    const pointsCount = info?.result?.points_count ?? 0;
    const approxBytes = pointsCount * inst.dimension * 4 * 1.15;

    // Memory total backend Qdrant: cuma tersedia di mode docker (dari container stats).
    // Di mode external, Qdrant dikelola di luar aplikasi ini jadi kita gak punya akses stats-nya.
    let containerMemoryBytes = null;
    try {
      const provider = getProvider();
      containerMemoryBytes = await provider.getVectorBackendMemoryBytes();
    } catch {}

    const metrics = await getMetrics(inst.id);

    return NextResponse.json({
      connected: true,
      pointsCount,
      dimension: inst.dimension,
      metric: inst.metric,
      memory: {
        usedBytes: approxBytes,
        containerTotalBytes: containerMemoryBytes,
      },
      ops: {
        totalOps: metrics.totalOps,
        totalBytesOut: metrics.bytesOut,
      },
      collectionStatus: info?.result?.status || "unknown",
    });
  } catch (err) {
    return NextResponse.json({ connected: false, error: err.message || "Gagal ambil stats collection" });
  }
}
