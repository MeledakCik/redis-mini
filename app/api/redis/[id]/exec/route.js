import { NextResponse } from "next/server";
import { getInstance, getInstanceForUser } from "@/lib/store";
import { getRedisClient, isCommandAllowed } from "@/lib/redis-pool";
import { requireUser } from "@/lib/auth-guard";
import { assertStorageAvailable } from "@/lib/quota";

// Command yang nulis data baru (butuh storage) — dicek terhadap kuota 500MB/akun sebelum
// dieksekusi. Command baca/hapus/admin (GET, DEL, KEYS, dst) selalu boleh biar user yang
// udah kena limit tetap bisa lihat & bersihin data lamanya.
const WRITE_COMMANDS = new Set([
  "SET", "SETEX", "HSET", "LPUSH", "RPUSH", "SADD", "ZADD", "INCR", "DECR", "INCRBY", "DECRBY",
]);

function tokenize(input) {
  const regex = /"([^"]*)"|'([^']*)'|(\S+)/g;
  const tokens = [];
  let m;
  while ((m = regex.exec(input)) !== null) tokens.push(m[1] ?? m[2] ?? m[3]);
  return tokens;
}

// Endpoint ini punya 2 mode akses, dibedakan dari ada/gaknya header Authorization: Bearer:
//
//  a) Mode Data Browser / CLI di browser (dipanggil dari komponen React kita sendiri):
//     TIDAK ada Bearer -> pakai session login (cookie) via requireUser(), lalu instance
//     diambil dengan getInstanceForUser(id, user.id) — jadi user A gak bisa exec ke
//     instance user B walau tau id-nya.
//
//  b) Mode REST API murni (Postman, curl, server lain, dst — TANPA cookie session):
//     ADA Bearer -> instance diambil polos lewat getInstance(id) (tanpa cek user),
//     lalu divalidasi: token harus persis sama dengan instance.password. Ini yang bikin
//     Postman bisa PING dapet 200 OK tanpa perlu login browser dulu — middleware.js sudah
//     meloloskan request Bearer ke endpoint ini duluan sebelum sempat kena cek cookie.
//
// PENTING: id/token TIDAK di-hardcode di mana pun. Semua instance (termasuk milik user
// manapun) datang dari lib/store.js (instances.json), jadi endpoint ini otomatis kerja
// untuk SEMUA akun & SEMUA database yang mereka buat sendiri.
export async function POST(req, { params }) {
  const { id } = params;
  const authHeader = req.headers.get("authorization") || "";
  const bearerToken = authHeader.match(/^Bearer\s+(.+)$/i)?.[1]?.trim() || "";

  let inst = null;
  let userEmail = null; // dipakai buat plan-aware storage limit (Pro vs Free) — lihat lib/quota.js

  if (bearerToken) {
    // Mode (b): REST API / Postman — tanpa user, cukup id + token yang cocok. Gak ada email
    // session di mode ini, jadi storage limit fallback ke Free tier (lihat lib/quota.js).
    inst = getInstance(id);
  } else {
    // Mode (a): Data Browser / CLI di browser — wajib session login.
    try {
      const user = await requireUser();
      inst = getInstanceForUser(id, user.id);
      userEmail = user.email;
    } catch {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  if (!inst) return NextResponse.json({ error: "Database not found" }, { status: 404 });

  // Token WAJIB divalidasi di kedua mode (bukan cuma mode Postman) — Data Browser browser
  // pun tetap harus kirim Authorization: Bearer <password instance> ke endpoint ini.
  if (!bearerToken || bearerToken !== inst.password) {
    return NextResponse.json({ error: "Token tidak valid" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const raw = (body.raw || "").trim();
  let tokens = body.args ? [body.command, ...body.args] : tokenize(raw);
  tokens = tokens.filter(Boolean);
  if (!tokens.length) return NextResponse.json({ error: "Command kosong" }, { status: 400 });

  const [command, ...args] = tokens;
  if (!isCommandAllowed(command)) {
    return NextResponse.json({ error: `Command "${command.toUpperCase()}" tidak diizinkan` }, { status: 403 });
  }

  // Task 3: storage limit 500MB/akun — cuma dicek untuk command yang nambah data baru.
  if (WRITE_COMMANDS.has(command.toUpperCase())) {
    const storage = await assertStorageAvailable(inst.userId, userEmail);
    if (!storage.allowed) {
      return NextResponse.json(storage.response, { status: 403 });
    }
  }

  try {
    const client = getRedisClient(inst);
    const result = await client.call(command, ...args);
    return NextResponse.json({ result });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}
