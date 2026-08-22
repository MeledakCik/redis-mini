import { NextResponse } from "next/server";
import { requireUser, authErrorResponse } from "@/lib/auth-guard";
import { checkRateLimit } from "@/lib/rate-limit";
import { createOrGetPendingOrder, sweepExpiredOrders } from "@/lib/orders-store";
import { getPaymentDestination } from "@/lib/manual-payment";
import { getPlan } from "@/lib/plan-store";

const PRO_PRICE_IDR = 149000; // harga dasar, nominal final = ini + kode unik 3 digit

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

  // Defense-in-depth (selain limit_req di nginx.conf): cegah user spam bikin order
  // pending, yang bisa numpuk kode unik nominal kepake sia-sia.
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

  sweepExpiredOrders();

  let order;
  try {
    // Idempotent: kalau user udah punya order pending yang belum expired, dia bakal
    // dapet order (dan nominal) yang sama lagi — bukan bikin order/kode unik baru.
    order = createOrGetPendingOrder(user.email, {
      baseAmount: PRO_PRICE_IDR,
      durationDays: 30,
      expiryMinutes: 60,
    });
  } catch (err) {
    console.error("Gagal membuat order manual payment:", err.message);
    return NextResponse.json({ error: "Gagal membuat order pembayaran. Coba lagi nanti." }, { status: 502 });
  }

  return NextResponse.json({
    orderId: order.orderId,
    grossAmount: order.grossAmount,
    uniqueCode: order.uniqueCode,
    expiresAt: order.expiresAt,
    destination: getPaymentDestination(),
  });
}
