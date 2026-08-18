import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { createUser, getUserByEmail } from "@/lib/users-store";

// Endpoint ini sengaja TIDAK di-gate oleh middleware (prefix /api/auth/* dikecualikan)
// karena orang yang belum punya akun jelas belum bisa login.
export async function POST(req) {
  const body = await req.json().catch(() => ({}));
  const email = String(body.email || "").trim().toLowerCase();
  const password = String(body.password || "");

  if (!email || !email.includes("@")) {
    return NextResponse.json({ error: "Email tidak valid" }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json({ error: "Password minimal 8 karakter" }, { status: 400 });
  }
  if (getUserByEmail(email)) {
    return NextResponse.json({ error: "Email sudah terdaftar" }, { status: 409 });
  }

  try {
    const passwordHash = await bcrypt.hash(password, 12);
    const id = crypto.randomUUID();
    createUser({ id, email, passwordHash });
    return NextResponse.json({ success: true }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: err.message || "Gagal registrasi" }, { status: 500 });
  }
}
