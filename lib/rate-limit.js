// Simple in-memory rate limiter — cukup buat deployment single-container (console
// cuma 1 replica di docker-compose.yml). State di-share antar-request karena Next.js
// standalone jalan sebagai 1 proses Node.js long-running (bukan cold-start per request),
// dan Map ini juga aman dipakai dari middleware.js (Edge Runtime) karena cuma pakai
// Map, Date.now(), dan setInterval — semua didukung Edge Runtime bawaan Next.js.
//
// KETERBATASAN: kalau nanti di-scale jadi banyak instance/replica, state ini TIDAK
// ke-share antar container. Buat kasus itu, ganti backend-nya ke Redis (INCR + EXPIRE)
// tanpa perlu ubah signature checkRateLimit/resetRateLimit di file ini.
const buckets = new Map(); // key -> { count, firstAttempt, lockedUntil }

function now() {
  return Date.now();
}

/**
 * @param {string} key identifier unik, misal `login:${email}:${ip}`
 * @param {object} opts
 * @param {number} [opts.max=5] max percobaan yang diizinkan dalam window
 * @param {number} [opts.windowMs=600000] panjang window (ms)
 * @param {number} [opts.lockoutMs=900000] berapa lama di-lock setelah kena limit
 * @returns {{ allowed: boolean, retryAfterMs: number }}
 */
export function checkRateLimit(key, { max = 5, windowMs = 10 * 60 * 1000, lockoutMs = 15 * 60 * 1000 } = {}) {
  const t = now();
  let entry = buckets.get(key);

  if (entry?.lockedUntil && entry.lockedUntil > t) {
    return { allowed: false, retryAfterMs: entry.lockedUntil - t };
  }

  if (!entry || t - entry.firstAttempt > windowMs) {
    entry = { count: 0, firstAttempt: t, lockedUntil: 0 };
  }

  entry.count += 1;

  if (entry.count > max) {
    entry.lockedUntil = t + lockoutMs;
    buckets.set(key, entry);
    return { allowed: false, retryAfterMs: lockoutMs };
  }

  buckets.set(key, entry);
  return { allowed: true, retryAfterMs: 0 };
}

// Dipanggil setelah login SUKSES, biar user yang bener gak ke-lock gara-gara
// beberapa typo password sebelumnya.
export function resetRateLimit(key) {
  buckets.delete(key);
}

// Bersih-bersih periodik biar Map gak growing terus di proses long-running.
const cleanupTimer = setInterval(() => {
  const t = now();
  for (const [key, entry] of buckets.entries()) {
    const stale = (!entry.lockedUntil || entry.lockedUntil < t) && t - entry.firstAttempt > 60 * 60 * 1000;
    if (stale) buckets.delete(key);
  }
}, 30 * 60 * 1000);
cleanupTimer.unref?.();
