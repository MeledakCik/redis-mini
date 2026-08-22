import { NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/rate-limit";

const PROTECTED_PAGES = ["/databases", "/vector", "/connect"];
const PUBLIC_PAGES = ["/login", "/register", "/unauthorized"];

// Origin VPS ini TIDAK boleh diakses langsung by IP — cuma lewat Cloudflare
// (nginx sudah percaya CF-Connecting-IP lewat set_real_ip_from, lihat nginx.conf).
// Kalau request datang dengan Host header = IP mentah ini, berarti DNS/Cloudflare
// di-skip (client hit origin langsung) -> tolak. Lihat docs/CLOUDFLARE_SETUP.md.
const ORIGIN_IP = "103.92.215.180";

function getIp(req) {
  return (
    req.headers.get("cf-connecting-ip")?.trim() ||
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown"
  );
}

export function middleware(req) {
  const { pathname } = req.nextUrl;

  // --- ANTI-DDOS / ORIGIN LOCK: tolak akses langsung ke IP origin, cuma lewat Cloudflare ---
  const host = req.headers.get("host") || "";
  if (host.includes(ORIGIN_IP)) {
    return NextResponse.json({ error: "Direct origin access is not allowed." }, { status: 403 });
  }

  const token =
    req.cookies.get("authjs.session-token")?.value ||
    req.cookies.get("__Secure-authjs.session-token")?.value ||
    req.cookies.get("next-auth.session-token")?.value;

  const isLoggedIn = !!token;

  const isApi = pathname.startsWith("/api/");
  const isAuthApi = pathname.startsWith("/api/auth/"); // NextAuth handlers (google/github/credentials callback) - selalu bypass
  const isPublicApi = pathname === "/api/config";
  const isExecApi = /^\/api\/(redis|vector)\/[^\/]+\/exec$/.test(pathname); // REST API pakai Bearer, bukan cookie
  const isProtectedPage = PROTECTED_PAGES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
  const isPublicPage = PUBLIC_PAGES.some((p) => pathname === p);

  let res = NextResponse.next();

  // --- SECURITY HEADERS ---
  res.headers.set("X-Frame-Options", "SAMEORIGIN");
  res.headers.set("X-Content-Type-Options", "nosniff");
  res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  res.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=(), interest-cohort=()");
  res.headers.set("X-XSS-Protection", "0"); // legacy header, sengaja dimatiin - lebih rawan exploit daripada guna
  if (process.env.NODE_ENV === "production") {
    res.headers.set("Strict-Transport-Security", "max-age=63072000; includeSubDomains");
  }

  // --- ANTI-DDOS: rate limit umum per-IP untuk SEMUA /api/* ---
  // Ini lapisan kedua (defense-in-depth) setelah limit_req di nginx.conf. nginx nolak
  // request sebelum sampai proses Node sama sekali (lebih murah CPU-nya buat volumetric
  // flood); layer ini nge-cover kasus di belakang load balancer lain / bypass nginx lokal,
  // dan juga jalan pas `npm run dev` tanpa nginx di depannya.
  // Endpoint yang udah py auth guard sendiri (login, register) dikecualikan di sini
  // biar gak double-count.
  if (isApi && pathname !== "/api/auth/callback/credentials" && pathname !== "/api/auth/register") {
    const ip = getIp(req);
    const rl = checkRateLimit(`api-ip:${ip}`, { max: 120, windowMs: 60 * 1000, lockoutMs: 2 * 60 * 1000 });
    if (!rl.allowed) {
      return NextResponse.json(
        { error: "Terlalu banyak request. Coba lagi nanti." },
        { status: 429, headers: { "Retry-After": String(Math.ceil(rl.retryAfterMs / 1000)) } }
      );
    }
  }

  // Defense-in-depth: throttle per-IP ke endpoint credentials callback SEBELUM
  // request nyampe authorize(). Nge-cover pattern "coba banyak email beda dari 1 IP"
  // yang gak kena limiter per-email di authorize().
  if (pathname === "/api/auth/callback/credentials" && req.method === "POST") {
    const ip = getIp(req);
    const rl = checkRateLimit(`login-ip:${ip}`, { max: 20, windowMs: 5 * 60 * 1000, lockoutMs: 15 * 60 * 1000 });
    if (!rl.allowed) {
      return NextResponse.json(
        { error: "Terlalu banyak percobaan login. Coba lagi nanti." },
        { status: 429, headers: { "Retry-After": String(Math.ceil(rl.retryAfterMs / 1000)) } }
      );
    }
  }

  // Registrasi manual (admin-only, lihat app/api/auth/register/route.js) tetap
  // ditambahin throttle IP kasar, extra defense meski udah di-gate 403 di handler.
  if (pathname === "/api/auth/register" && req.method === "POST") {
    const ip = getIp(req);
    const rl = checkRateLimit(`register-ip:${ip}`, { max: 10, windowMs: 5 * 60 * 1000, lockoutMs: 15 * 60 * 1000 });
    if (!rl.allowed) {
      return NextResponse.json(
        { error: "Terlalu banyak percobaan. Coba lagi nanti." },
        { status: 429, headers: { "Retry-After": String(Math.ceil(rl.retryAfterMs / 1000)) } }
      );
    }
  }

  // Bearer-token mode buat REST API (/api/redis/exec, /api/vector/exec) — TIDAK pernah
  // divalidasi lewat session cookie, biar OAuth login gak ganggu integrasi curl/Postman.
  if (isExecApi) {
    const hasBearer = req.headers.get("authorization")?.startsWith("Bearer ") || !!req.headers.get("x-vector-token");
    if (hasBearer) return res;
  }

  if (isPublicApi) return res;

  // /api/auth/* (signin, callback google/github, session, csrf, dll) selalu bypass guard
  if (isApi && !isAuthApi) {
    if (!isLoggedIn && !isExecApi) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return res;
  }
  if (isAuthApi) return res;

  if (isPublicPage) {
    if (isLoggedIn && (pathname === "/login" || pathname === "/register")) {
      return NextResponse.redirect(new URL("/databases", req.nextUrl.origin));
    }
    return res;
  }

  if (isProtectedPage && !isLoggedIn) {
    const loginUrl = new URL("/login", req.nextUrl.origin);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return res;
}

export const config = {
  matcher: ["/", "/databases/:path*", "/vector/:path*", "/api/:path*", "/login", "/register", "/unauthorized", "/connect/:path*"],
};
