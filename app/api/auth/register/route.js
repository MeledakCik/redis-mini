import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { createUser, getUserByEmail } from "@/lib/users-store";
import { auth } from "@/lib/auth";

// PENTING: Registrasi publik DIMATIKAN (2026-08) — endpoint ini sebelumnya kena
// spam bot, ratusan akun kebentuk cuma modal email+password tanpa verifikasi apapun.
// Sekarang HANYA request dari session yang login (via Google/GitHub) DAN emailnya
// == ADMIN_EMAIL yang boleh provision akun credentials baru — dipakai buat akun
// manual/service account, bukan buat publik. User biasa masuk lewat OAuth + whitelist.
// (Throttle IP tambahan buat endpoint ini ada di middleware.js.)
export async function POST(req) {
  const session = await auth();
  const requesterEmail = session?.user?.email?.toLowerCase();
  const adminEmail = String(process.env.ADMIN_EMAIL || "").toLowerCase();

  if (!requesterEmail || !adminEmail || requesterEmail !== adminEmail) {
    return NextResponse.json(
      { error: "Registrasi publik ditutup. Login pakai Google/GitHub, atau hubungi admin." },
      { status: 403 }
    );
  }

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
