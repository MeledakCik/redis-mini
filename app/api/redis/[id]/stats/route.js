import { NextResponse } from "next/server";
import { getInstanceForUser } from "@/lib/store";
import { getRedisClient } from "@/lib/redis-pool";
import { requireUser, authErrorResponse } from "@/lib/auth-guard";

function parseInfo(raw) {
  const out = {};
  raw.split("\r\n").forEach((line) => {
    if (!line || line.startsWith("#")) return;
    const idx = line.indexOf(":");
    if (idx === -1) return;
    out[line.slice(0, idx)] = line.slice(idx + 1);
  });
  return out;
}

// Dipolling tiap 3 detik oleh frontend -> sengaja TIDAK di-rate-limit (lihat brief poin 3).
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
    const [memoryRaw, statsRaw, serverRaw, dbsize] = await Promise.all([
      client.info("memory"),
      client.info("stats"),
      client.info("server"),
      client.dbsize(),
    ]);

    const memory = parseInfo(memoryRaw);
    const stats = parseInfo(statsRaw);
    const server = parseInfo(serverRaw);

    return NextResponse.json({
      connected: true,
      dbsize,
      memory: {
        usedBytes: Number(memory.used_memory || 0),
        peakBytes: Number(memory.used_memory_peak || 0),
      },
      stats: {
        opsPerSec: Number(stats.instantaneous_ops_per_sec || 0),
        totalCommands: Number(stats.total_commands_processed || 0),
        totalConnections: Number(stats.total_connections_received || 0),
        netInputBytes: Number(stats.total_net_input_bytes || 0),
        netOutputBytes: Number(stats.total_net_output_bytes || 0),
        keyspaceHits: Number(stats.keyspace_hits || 0),
        keyspaceMisses: Number(stats.keyspace_misses || 0),
      },
      server: {
        uptimeSeconds: Number(server.uptime_in_seconds || 0),
        redisVersion: server.redis_version || "-",
      },
    });
  } catch (err) {
    return NextResponse.json({ connected: false, error: err.message || "Tidak bisa konek ke Redis" }, { status: 200 });
  }
}
