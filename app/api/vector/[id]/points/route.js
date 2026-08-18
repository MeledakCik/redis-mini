import { NextResponse } from "next/server";
import { getVectorInstanceForUser } from "@/lib/vector-store";
import { scrollPoints } from "@/lib/qdrant";
import { requireUser, authErrorResponse } from "@/lib/auth-guard";

export async function GET(req, { params }) {
  let user;
  try {
    user = await requireUser();
  } catch (err) {
    return authErrorResponse(err);
  }

  const inst = getVectorInstanceForUser(params.id, user.id);
  if (!inst) return NextResponse.json({ error: "Database not found" }, { status: 404 });

  const { searchParams } = new URL(req.url);
  const search = (searchParams.get("pattern") || "*").trim();
  const limit = Math.min(Number(searchParams.get("limit") || 200), 500);

  try {
    let points = [];
    let offset = null;
    do {
      const page = await scrollPoints(inst.name, 100, offset);
      const batch = page.result?.points || [];
      points.push(...batch);
      offset = page.result?.next_page_offset ?? null;
    } while (offset !== null && points.length < limit);

    points = points.slice(0, limit);

    if (search && search !== "*") {
      const needle = search.replace(/\*/g, "").toLowerCase();
      points = points.filter((p) => String(p.id).toLowerCase().includes(needle));
    }

    const result = points.map((p) => ({
      id: p.id,
      dimension: (p.vector || []).length,
      preview: (p.vector || []).slice(0, 4).map((n) => +n.toFixed(3)),
      metadata: p.payload || {},
    }));

    return NextResponse.json({ vectors: result, total: result.length });
  } catch (err) {
    return NextResponse.json({ error: err.message || "Gagal ambil vectors" }, { status: 500 });
  }
}
