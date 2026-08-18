import { NextResponse } from "next/server";

const PROTECTED_PAGES = ["/databases", "/vector", "/billing"];

export function middleware(req) {
  const { pathname } = req.nextUrl;

  const token =
    req.cookies.get('authjs.session-token')?.value ||
    req.cookies.get('__Secure-authjs.session-token')?.value ||
    req.cookies.get('next-auth.session-token')?.value;

  const isLoggedIn =!!token;

  const isApi = pathname.startsWith("/api/");
  const isAuthApi = pathname.startsWith("/api/auth/");
  // /api/config publik (dipakai form Create Database buat tau mode docker/external
  // SEBELUM user login juga gak masalah, gak ada data sensitif di response-nya).
  const isPublicApi = pathname === "/api/config";
  // FIX: allow both redis and vector exec pakai Bearer token
  const isExecApi = /^\/api\/(redis|vector)\/[^\/]+\/exec$/.test(pathname);
  const isProtectedPage = PROTECTED_PAGES.some((p) => pathname === p || pathname.startsWith(`${p}/`));

  if (isExecApi) {
    const hasBearer = req.headers.get("authorization")?.startsWith("Bearer ") ||!!req.headers.get("x-vector-token");
    if (hasBearer) return NextResponse.next();
  }

  if (isPublicApi) return NextResponse.next();

  if (isApi &&!isAuthApi) {
    if (!isLoggedIn &&!isExecApi) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.next();
  }

  if (isProtectedPage &&!isLoggedIn) {
    const loginUrl = new URL("/login", req.nextUrl.origin);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (isLoggedIn && (pathname === "/login" || pathname === "/register")) {
    return NextResponse.redirect(new URL("/databases", req.nextUrl.origin));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/databases/:path*", "/vector/:path*", "/api/:path*", "/login", "/register"],
};