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
    const raw = await client.call("SLOWLOG", "GET", "20");
    const entries = raw.map((entry) => ({
      id: entry[0],
      timestamp: entry[1],
      durationMicros: entry[2],
      args: entry[3],
    }));
    return NextResponse.json({ entries });
  } catch (err) {
    return NextResponse.json({ error: err.message || "Gagal ambil slowlog" }, { status: 500 });
  }
}
