// QDRANT_URL itu koneksi INTERNAL app -> Qdrant (mis. "http://qdrant:6333" lewat Docker DNS
// di network kasyaf-net) — BUKAN alamat yang bisa dipakai customer buat connect langsung dari
// luar. Modul ini nentuin host:port publik yang benar buat ditaruh di connection string
// (qdrant://default:{token}@{PUBLIC_HOST}:{PUBLIC_PORT}/{collection}) yang dikembalikan ke
// customer, sama seperti lib/redis-public-host.js buat Redis.
//
// Prioritas (env manapun yang keisi duluan menang):
//   1. QDRANT_PUBLIC_URL — full url publik, mis. "http://console.kasyaf.id:6333". Sengaja
//      default-nya http, BUKAN https — Qdrant native protocol di port 6333 gak di-TLS-in
//      langsung (nginx cuma proxy 443 buat web console-nya, bukan buat port 6333 ini), jadi
//      kalau dipaksa https di sini customer bakal dapet TLS handshake error waktu connect
//      langsung ke port 6333.
//   2. QDRANT_HOST — hostname/IP publik polos (mis. "console.kasyaf.id" atau IP VPS), boleh
//      "host:port" atau host doang (port default 6333 kalau gak disertain).
//   3. Fallback terakhir: "127.0.0.1:6333" (dev lokal tanpa domain publik).
export function resolvePublicQdrantEndpoint() {
  const publicUrl = process.env.QDRANT_PUBLIC_URL;
  if (publicUrl) {
    const parsed = tryParseHostPort(publicUrl);
    if (parsed) return parsed;
    console.error("[qdrant-public-host] QDRANT_PUBLIC_URL tidak bisa di-parse:", publicUrl);
  }

  const qdrantHost = process.env.QDRANT_HOST;
  if (qdrantHost) {
    const [host, port] = qdrantHost.replace(/^https?:\/\//, "").split(":");
    if (host) return { host, port: port || "6333" };
  }

  return { host: "127.0.0.1", port: "6333" };
}

function tryParseHostPort(raw) {
  try {
    const u = new URL(raw);
    if (!u.hostname) return null;
    return { host: u.hostname, port: u.port || "6333" };
  } catch {
    const m = String(raw).match(/^([^:@/]+):(\d+)$/);
    if (m) return { host: m[1], port: m[2] };
    return null;
  }
}
