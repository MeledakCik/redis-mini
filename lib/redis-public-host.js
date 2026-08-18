// REDIS_URL itu koneksi INTERNAL app -> Redis utama (bisa "redis.railway.internal" yang cuma
// reachable dari dalam network Railway, atau 127.0.0.1 lokal) — BUKAN alamat yang bisa dipakai
// customer buat connect langsung dari luar. Modul ini nentuin host:port yang benar buat
// ditaruh di redis://{username}:{password}@{PUBLIC_HOST} yang dikembalikan ke customer.
//
// Prioritas (env manapun yang keisi duluan menang):
//   1. REDIS_PUBLIC_URL  — full connection string publik (khas Railway: "Redis Public URL" di
//                          plugin Redis-nya). Host+port+scheme diambil langsung dari sini.
//   2. REDIS_PUBLIC_HOST — "host:port" polos (VPS: isi IP publik VPS + port Redis, mis.
//                          "203.0.113.10:6379"; local: "localhost:6379").
//   3. Fallback: parse host:port dari REDIS_URL sendiri. Cuma benar kalau REDIS_URL kamu
//                emang sudah public-reachable (khas local dev) — di Railway/VPS privat ini
//                KEMUNGKINAN BESAR salah, makanya di-log warning supaya ketauan pas testing.
export function resolvePublicRedisEndpoint() {
  const publicUrl = process.env.REDIS_PUBLIC_URL;
  if (publicUrl) {
    const parsed = tryParseHostPort(publicUrl);
    if (parsed) return parsed;
    console.error("[redis-public-host] REDIS_PUBLIC_URL tidak bisa di-parse:", publicUrl);
  }

  const publicHost = process.env.REDIS_PUBLIC_HOST;
  if (publicHost) {
    const [host, port] = publicHost.replace(/^redis(s)?:\/\//, "").split(":");
    if (host) return { host, port: port || "6379", scheme: "redis" };
  }

  const internalUrl = process.env.REDIS_URL;
  if (internalUrl) {
    const parsed = tryParseHostPort(internalUrl);
    if (parsed) {
      console.warn(
        "[redis-public-host] REDIS_PUBLIC_URL / REDIS_PUBLIC_HOST belum diisi — fallback pakai host dari " +
          "REDIS_URL langsung. Ini SERING SALAH di Railway/VPS (REDIS_URL biasanya alamat internal). " +
          "Isi REDIS_PUBLIC_HOST atau REDIS_PUBLIC_URL di environment variables."
      );
      return parsed;
    }
  }

  throw new Error(
    "Gak bisa nentuin public host Redis. Isi salah satu: REDIS_PUBLIC_URL, REDIS_PUBLIC_HOST, atau REDIS_URL."
  );
}

function tryParseHostPort(raw) {
  try {
    // URL() butuh scheme yang dikenal browser/node buat parse host — redis:// & rediss://
    // sebenarnya didukung langsung oleh WHATWG URL parser di Node.
    const u = new URL(raw);
    if (!u.hostname) return null;
    return { host: u.hostname, port: u.port || "6379", scheme: u.protocol.replace(":", "") || "redis" };
  } catch {
    // Format "host:port" polos tanpa scheme (jarang, tapi jaga-jaga)
    const m = String(raw).match(/^([^:@\/]+):(\d+)$/);
    if (m) return { host: m[1], port: m[2], scheme: "redis" };
    return null;
  }
}
