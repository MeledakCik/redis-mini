import Redis from "ioredis";

// SATU koneksi admin ke Redis UTAMA (REDIS_URL) — dipakai untuk:
//   1. ACL SETUSER/DELUSER waktu create/delete tenant
//   2. Base connection untuk redisClientForUser() (proxy prefixing internal, lib/tenant.js)
//
// "Admin" di sini maksudnya: connect pakai default user (atau user apa pun yang creds-nya
// ada di REDIS_URL), yang scope-nya EMANG harus full akses ke seluruh keyspace — ini yang
// disebut di requirement "Admin (yang punya REDIS_URL asli) bisa akses semua". Jangan pernah
// expose REDIS_URL asli ke customer; yang di-expose cuma redis://{username}:{password}@{PUBLIC_HOST}
// hasil ACL SETUSER yang keys-nya dibatasi ~{username}:* saja.
//
// Sengaja SATU koneksi dipool (bukan connection-per-tenant) karena instruksinya "jangan create
// service baru, cuma 1 Redis instance untuk semua customer" — jadi dari sisi app kita juga gak
// buka N koneksi fisik ke Redis yang sama, cukup 1 connection pool yang dipakai bergantian
// dengan prefix key yang berbeda-beda per tenant (lihat lib/tenant.js).
let _admin;

export function getAdminRedis() {
  if (!process.env.REDIS_URL) {
    throw new Error(
      "REDIS_URL wajib diisi — ini koneksi admin ke Redis utama tempat semua tenant customer di-host. " +
        "Isi di .env.local (dev), atau environment variable (VPS/Railway). Lihat .env.example."
    );
  }

  if (!_admin) {
    // globalThis biar survive hot-reload Next.js dev server (gak buka koneksi baru tiap save file)
    _admin = globalThis.__miniUpstashAdminRedis;
    if (!_admin) {
      _admin = new Redis(process.env.REDIS_URL, {
        maxRetriesPerRequest: 2,
        connectTimeout: 5000,
        lazyConnect: false,
      });
      _admin.on("error", (err) => {
        // jangan crash proses kalau Redis utama lagi mati sementara — biar route handler yang
        // manggil tetap dapet error yang jelas lewat try/catch, bukan proses Node yang mati
        console.error("[redis-admin] connection error:", err.message);
      });
      globalThis.__miniUpstashAdminRedis = _admin;
    }
  }
  return _admin;
}

// Cek dukungan ACL Redis (butuh Redis >= 6). Dipanggil sekali di createTenant() untuk nentuin
// mode ACL vs fallback prefix-only — hasilnya TIDAK di-cache global karena kondisi bisa berubah
// (mis. admin permission ACL server dibenerin belakangan), jadi tiap create dicoba ulang.
export async function isAclSupported() {
  try {
    const admin = getAdminRedis();
    await admin.call("ACL", "WHOAMI");
    return true;
  } catch {
    return false;
  }
}
