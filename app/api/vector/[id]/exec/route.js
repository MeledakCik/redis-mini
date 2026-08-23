import { NextResponse } from "next/server";
import { getVectorInstanceForUser, getVectorInstance } from "@/lib/vector-store";
import { parseVectorCommand } from "@/lib/vector-command";
import { upsertPoints, searchPoints, deletePoints, retrievePoints, scrollPoints } from "@/lib/qdrant";
import { recordOp, recordBytesOut } from "@/lib/vector-metrics";
import { requireUser } from "@/lib/auth-guard";
import { assertStorageAvailable } from "@/lib/free-tier";

// Sama seperti app/api/redis/[id]/exec/route.js: endpoint ini juga punya 2 mode akses.
//  a) Browser (Data Browser/CLI kita sendiri): session login lewat requireUser() +
//     getVectorInstanceForUser(id, user.id).
//  b) REST API murni (Postman dst, tanpa cookie): getVectorInstance(id) langsung, tanpa cek
//     user, lalu token divalidasi manual terhadap inst.token di bawah.
// id/token instance TIDAK di-hardcode — selalu diambil dari vector-instances.json lewat
// lib/vector-store.js, jadi otomatis kerja untuk semua akun & semua vector database.
export async function POST(req, { params }) {
  const { id } = params;

  // ambil token vector dari 2 cara: X-Vector-Token atau Authorization Bearer
  const xToken = req.headers.get("x-vector-token") || "";
  const authHeader = req.headers.get("authorization") || "";
  const bearer = authHeader.match(/^Bearer\s+(.+)$/i)?.[1]?.trim() || "";
  const requestToken = (xToken || bearer).trim();

  let user = null;
  let inst = null;

  // 1. coba mode browser (ada cookie login)
  try {
    user = await requireUser();
    inst = getVectorInstanceForUser(id, user.id);
  } catch {
    // 2. mode Postman / REST API (tanpa cookie) -> pakai token doang
    if (typeof getVectorInstance === "function") {
      inst = getVectorInstance(id);
    }
  }

  if (!inst) {
    return NextResponse.json({ error: "Database not found" }, { status: 404 });
  }

  // validasi token: harus persis sama dengan inst.token milik instance ini (dinamis per instance,
  // bukan hardcoded).
  if (!requestToken || requestToken !== inst.token) {
    return NextResponse.json({ error: "Token tidak valid" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const raw = (body.raw || "").trim();
  if (!raw) return NextResponse.json({ error: "Command kosong" }, { status: 400 });

  let parsed;
  try {
    parsed = parseVectorCommand(raw);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }

  function respond(payload, status = 200) {
    recordOp(inst.id);
    recordBytesOut(inst.id, Buffer.byteLength(JSON.stringify(payload)));
    return NextResponse.json(payload, { status });
  }

  try {
    switch (parsed.command) {
      case "PING":
        return respond({ result: "PONG" });
      
      case "UPSERT": {
        if (parsed.vector.length !== inst.dimension) {
          return NextResponse.json(
            { error: `Dimensi salah: ${parsed.vector.length} vs ${inst.dimension}` },
            { status: 400 }
          );
        }
        // Task 3: storage limit 500MB/akun — UPSERT nambah data baru, jadi dicek dulu.
        const storage = await assertStorageAvailable(inst.userId);
        if (!storage.allowed) {
          return NextResponse.json(storage.response, { status: 403 });
        }
        await upsertPoints(inst.name, [{ id: parsed.id, vector: parsed.vector, payload: parsed.metadata }]);
        return respond({ result: { status: "OK", id: parsed.id } });
      }
      
      case "QUERY": {
        if (parsed.vector.length !== inst.dimension) {
          return NextResponse.json(
            { error: `Dimensi salah: ${parsed.vector.length} vs ${inst.dimension}` },
            { status: 400 }
          );
        }
        const res = await searchPoints(inst.name, parsed.vector, parsed.topK, parsed.filter);
        const matches = (res.result || []).map((r) => ({ id: r.id, score: r.score, metadata: r.payload || {} }));
        return respond({ result: matches });
      }
      
      case "DELETE": {
        if (parsed.all) {
          let offset = null;
          let deleted = 0;
          do {
            const page = await scrollPoints(inst.name, 100, offset);
            const ids = (page.result?.points || []).map((p) => p.id);
            if (ids.length > 0) {
              await deletePoints(inst.name, ids);
              deleted += ids.length;
            }
            offset = page.result?.next_page_offset ?? null;
          } while (offset !== null);
          return respond({ result: { status: "OK", deleted } });
        }
        await deletePoints(inst.name, [parsed.id]);
        return respond({ result: { status: "OK", id: parsed.id } });
      }
      
      case "FETCH": {
        const res = await retrievePoints(inst.name, [parsed.id]);
        const point = (res.result || [])[0];
        if (!point) return respond({ result: null });
        return respond({ result: { id: point.id, vector: point.vector, metadata: point.payload || {} } });
      }
      
      case "RANGE": {
        const page = await scrollPoints(inst.name, parsed.limit, parsed.offset);
        const points = (page.result?.points || []).map((p) => ({ id: p.id, vector: p.vector, metadata: p.payload || {} }));
        return respond({ result: { vectors: points, nextCursor: page.result?.next_page_offset ?? null } });
      }
      
      default:
        return NextResponse.json({ error: `Command "${parsed.command}" belum didukung` }, { status: 400 });
    }
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: err.message || "Command gagal" }, { status: 400 });
  }
}