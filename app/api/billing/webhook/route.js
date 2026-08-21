import { NextResponse } from "next/server";
import { verifyNotificationSignature, isPaidStatus } from "@/lib/midtrans";
import { applyPaidOrder } from "@/lib/plan-store";

// Endpoint ini dipanggil server-to-server oleh Midtrans (bukan browser user), makanya
// TIDAK pakai requireUser()/session cookie — middleware.js sudah bypass semua /api/auth/*
// tapi endpoint ini di luar itu, jadi tetap lewat guard normal /api/* (harus login) KECUALI
// kita bypass eksplisit. Ditambahkan ke daftar bypass di middleware.js (lihat komentar di sana).
//
// Keamanan endpoint ini murni dari verifyNotificationSignature() (SHA512 order_id+status_code+
// gross_amount+server_key) — bukan dari auth session, karena Midtrans emang gak bisa kirim cookie.
export async function POST(req) {
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid payload" }, { status: 400 });

  if (!verifyNotificationSignature(body)) {
    console.warn("Midtrans webhook: signature tidak valid", body?.order_id);
    return NextResponse.json({ error: "Invalid signature" }, { status: 403 });
  }

  const { order_id, transaction_status, fraud_status } = body;

  // order_id format: pro-<base64url(email)>-<timestamp>, lihat app/api/billing/checkout/route.js
  const match = /^pro-([A-Za-z0-9_-]+)-\d+$/.exec(order_id || "");
  if (!match) {
    console.warn("Midtrans webhook: order_id gak dikenali", order_id);
    return NextResponse.json({ ok: true }); // 200 tetap, biar Midtrans gak retry order asing
  }

  let email;
  try {
    email = Buffer.from(match[1], "base64url").toString("utf8");
  } catch {
    return NextResponse.json({ ok: true });
  }

  if (isPaidStatus(transaction_status, fraud_status)) {
    applyPaidOrder(email, order_id, { durationDays: 30 });
  }
  // status lain (pending, deny, expire, cancel) — gak perlu aksi, plan tetap free/current.

  return NextResponse.json({ ok: true });
}
