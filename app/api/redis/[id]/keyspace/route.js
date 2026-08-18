import { NextResponse } from "next/server";
import { getInstanceForUser } from "@/lib/store";
import { getRedisClient } from "@/lib/redis-pool";
import { requireUser, authErrorResponse } from "@/lib/auth-guard";

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
    const client = getRedisClient(inst);
    let cursor = "0";
    const counts = { string: 0, hash: 0, list: 0, set: 0, zset: 0, other: 0 };
    let scanned = 0;
    const SCAN_CAP = 2000;

    do {
      const [nextCursor, batch] = await client.scan(cursor, "COUNT", 200);
      cursor = nextCursor;
      const types = await Promise.all(batch.map((k) => client.type(k)));
      types.forEach((t) => {
        counts[t] !== undefined ? counts[t]++ : counts.other++;
      });
      scanned += batch.length;
    } while (cursor !== "0" && scanned < SCAN_CAP);

    return NextResponse.json({ counts, scanned, capped: scanned >= SCAN_CAP });
  } catch (err) {
    return NextResponse.json({ error: err.message || "Gagal analisa keyspace" }, { status: 500 });
  }
}
