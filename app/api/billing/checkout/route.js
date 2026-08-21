import { NextResponse } from "next/server";
import { requireUser, authErrorResponse } from "@/lib/auth-guard";
import { checkRateLimit } from "@/lib/rate-limit";
import { createSnapTransaction } from "@/lib/midtrans";
import { getPlan } from "@/lib/plan-store";

const PRO_PRICE_IDR = 149000; // ~$9/mo, dibulatkan buat harga IDR yang wajar (Midtrans = IDR only)

export async function POST() {
  let user;
  try {
    user = await requireUser();
  } catch (err) {
    return authErrorResponse(err);
  }

  if (!user.email) {
    return NextResponse.json({ error: "Akun tidak punya email, tidak bisa checkout." }, { status: 400 });
  }

  // Defense-in-depth (selain limit_req di nginx.conf): cegah user spam create-transaction
  // ke Midtrans, yang bisa numpuk order pending di dashboard Midtrans mereka.
  const rl = checkRateLimit(`billing:checkout:${user.id}`, { max: 5, windowMs: 10 * 60 * 1000, lockoutMs: 10 * 60 * 1000 });
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Terlalu banyak percobaan checkout. Coba lagi nanti." },
      { status: 429, headers: { "Retry-After": String(Math.ceil(rl.retryAfterMs / 1000)) } }
    );
  }

  const current = getPlan(user.email);
  if (current.plan === "pro") {
    return NextResponse.json({ error: "Akun kamu sudah Pro.", plan: current }, { status: 400 });
  }

  // Email di-embed langsung ke order_id (base64url, tanpa padding) supaya webhook bisa
  // aktifkan Pro tanpa perlu tabel pending-order terpisah — order_id Midtrans cuma boleh
  // [a-zA-Z0-9-_], persis charset base64url.
  const emailToken = Buffer.from(user.email).toString("base64url");
  const orderId = `pro-${emailToken}-${Date.now()}`;

  try {
    const { redirectUrl } = await createSnapTransaction({
      orderId,
      grossAmount: PRO_PRICE_IDR,
      customer: { email: user.email, name: user.name },
      itemName: "Kasyaf Redis Cloud - Pro Plan (1 bulan)",
    });
    return NextResponse.json({ redirectUrl, orderId });
  } catch (err) {
    console.error("Midtrans checkout error:", err.message);
    return NextResponse.json({ error: "Gagal membuat transaksi pembayaran. Coba lagi nanti." }, { status: 502 });
  }
}
