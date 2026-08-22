import { NextResponse } from "next/server";
import crypto from "crypto";
import { findPendingOrderByAmount, markOrderPaid, sweepExpiredOrders } from "@/lib/orders-store";
import { applyPaidOrder } from "@/lib/plan-store";
import { notifyAdminProActivated } from "@/lib/wa-notify";

// Endpoint ini dipanggil server-to-server oleh Moota tiap ada mutasi bank baru masuk
// (bukan browser user) — sama seperti webhook Midtrans dulu, TIDAK pakai requireUser()/
// session cookie. Ditambahkan ke daftar bypass di middleware.js.
//
// Keamanannya murni dari verifySignature() di bawah (HMAC-SHA256 raw body pakai
// MOOTA_WEBHOOK_SECRET, dicocokkan ke header "Signature") — bukan dari auth session,
// karena Moota emang gak bisa kirim cookie. Isi MOOTA_WEBHOOK_SECRET persis dengan
// "Secret Token" yang muncul pas kamu bikin webhook di dashboard Moota
// (Dashboard > Integrasi > Webhook), dan CEK ULANG algoritma signature-nya di dashboard —
// dokumentasi Moota bisa berubah, jadi verifikasi dulu sebelum production.
function verifySignature(rawBody, signatureHeader) {
  const secret = process.env.MOOTA_WEBHOOK_SECRET || "";
  if (!secret || !signatureHeader) return false;

  const expected = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");

  const a = Buffer.from(expected);
  const b = Buffer.from(String(signatureHeader));
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

export async function POST(req) {
  const rawBody = await req.text();
  const signature = req.headers.get("signature") || req.headers.get("Signature");

  if (!verifySignature(rawBody, signature)) {
    console.warn("Moota webhook: signature tidak valid");
    return NextResponse.json({ error: "Invalid signature" }, { status: 403 });
  }

  let mutations;
  try {
    const parsed = JSON.parse(rawBody);
    // Moota kirim array mutasi, kadang dibungkus { data: [...] } tergantung versi API —
    // handle dua-duanya.
    mutations = Array.isArray(parsed) ? parsed : Array.isArray(parsed?.data) ? parsed.data : [parsed];
  } catch {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  sweepExpiredOrders();

  for (const mutation of mutations) {
    // Cuma peduli mutasi KREDIT (uang MASUK). Nominal berupa string/number tergantung
    // versi API Moota ("100123.00" atau 100123) — normalize ke integer rupiah.
    if (String(mutation?.type).toUpperCase() !== "CR") continue;

    const amount = Math.round(Number(mutation.amount));
    if (!Number.isFinite(amount)) continue;

    const order = findPendingOrderByAmount(amount);
    if (!order) continue; // mutasi masuk yang gak match nominal order manapun, abaikan

    const updated = markOrderPaid(order.orderId, mutation.mutation_id);
    if (!updated) continue;

    // applyPaidOrder sudah idempotent by lastOrderId (lihat lib/plan-store.js), jadi
    // aman kalau Moota retry webhook yang sama.
    applyPaidOrder(order.email, order.orderId, { durationDays: order.durationDays });

    // Notifikasi ke admin murni informational — kegagalan kirim WA TIDAK membatalkan
    // aktivasi Pro yang udah kejadian di atas.
    notifyAdminProActivated({
      email: order.email,
      orderId: order.orderId,
      grossAmount: order.grossAmount,
    }).catch((err) => console.error("Gagal kirim notifikasi WA:", err.message));
  }

  return NextResponse.json({ ok: true });
}
