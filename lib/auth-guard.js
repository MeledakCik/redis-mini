import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export class AuthError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

// Ambil session dari NextAuth. Kalau gak ada -> throw 401.
// Catatan: middleware.js sudah nge-gate semua /api/* di edge, jadi ini defense-in-depth
// + cara praktis buat ambil session.user.id di dalam route handler.
export async function requireUser() {
  const session = await auth();
  if (!session?.user?.id) {
    throw new AuthError(401, "Unauthorized");
  }
  return session.user;
}

export function authErrorResponse(err) {
  if (err instanceof AuthError) {
    return NextResponse.json({ error: err.message }, { status: err.status });
  }
  console.error(err);
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}
