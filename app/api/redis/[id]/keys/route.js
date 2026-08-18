import { NextResponse } from "next/server";
import { getInstanceForUser } from "@/lib/store";
import { getRedisClient } from "@/lib/redis-pool";
import { requireUser, authErrorResponse } from "@/lib/auth-guard";

export async function GET(req, { params }) {
  let user;
  try {
    user = await requireUser();
  } catch (err) {
    return authErrorResponse(err);
  }

  const inst = getInstanceForUser(params.id, user.id);
  if (!inst) return NextResponse.json({ error: "Database not found" }, { status: 404 });

  const { searchParams } = new URL(req.url);
  const pattern = searchParams.get("pattern") || "*";
  const limit = Math.min(Number(searchParams.get("limit") || 100), 500);

  try {
    const client = getRedisClient(inst);
    let cursor = "0";
    let keys = [];
    do {
      const [nextCursor, batch] = await client.scan(cursor, "MATCH", pattern, "COUNT", 100);
      cursor = nextCursor;
      keys.push(...batch);
    } while (cursor !== "0" && keys.length < limit);

    keys = keys.slice(0, limit);

    const detailed = await Promise.all(
      keys.map(async (key) => {
        const [type, ttl] = await Promise.all([client.type(key), client.ttl(key)]);
        return { key, type, ttl };
      })
    );

    return NextResponse.json({ keys: detailed, total: detailed.length });
  } catch (err) {
    return NextResponse.json({ error: err.message || "Gagal ambil keys" }, { status: 500 });
  }
}
