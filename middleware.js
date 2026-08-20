import { NextResponse } from "next/server";

const PROTECTED_PAGES = ["/databases", "/vector", "/billing", "/connect"];

export function middleware(req) {
  const { pathname } = req.nextUrl;

  const token =
    req.cookies.get('authjs.session-token')?.value ||
    req.cookies.get('__Secure-authjs.session-token')?.value ||
    req.cookies.get('next-auth.session-token')?.value;

  const isLoggedIn = !!token;

  const isApi = pathname.startsWith("/api/");
  const isAuthApi = pathname.startsWith("/api/auth/");
  const isPublicApi = pathname === "/api/config";
  const isExecApi = /^\/api\/(redis|vector)\/[^\/]+\/exec$/.test(pathname);
  const isProtectedPage = PROTECTED_PAGES.some((p) => pathname === p || pathname.startsWith(`${p}/`));

  let res = NextResponse.next();

  // --- SECURITY HEADERS DI MIDDLEWARE JUGA (defense in depth) ---
  res.headers.set("X-Frame-Options", "SAMEORIGIN");
  res.headers.set("X-Content-Type-Options", "nosniff");
  res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");

  if (isExecApi) {
    const hasBearer = req.headers.get("authorization")?.startsWith("Bearer ") || !!req.headers.get("x-vector-token");
    if (hasBearer) return res;
  }

  if (isPublicApi) return res;

  if (isApi && !isAuthApi) {
    if (!isLoggedIn && !isExecApi) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return res;
  }

  if (isProtectedPage && !isLoggedIn) {
    const loginUrl = new URL("/login", req.nextUrl.origin);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (isLoggedIn && (pathname === "/login" || pathname === "/register")) {
    return NextResponse.redirect(new URL("/databases", req.nextUrl.origin));
  }

  return res;
}

export const config = {
  matcher: ["/databases/:path*", "/vector/:path*", "/api/:path*", "/login", "/register"],
};