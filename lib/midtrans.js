// lib/midtrans.js — Midtrans Snap REST client, tanpa SDK npm tambahan (cuma fetch bawaan +
// crypto Node buat verifikasi signature). Redirect flow: kita create transaction ->
// dapet redirect_url -> user diarahkan ke Midtrans (bukan popup Snap.js di halaman kita),
// lebih simpel & permukaan-serangan lebih kecil (gak perlu load script pihak ketiga di /billing).
import crypto from "crypto";

const IS_PRODUCTION = String(process.env.MIDTRANS_IS_PRODUCTION || "false") === "true";
const SERVER_KEY = process.env.MIDTRANS_SERVER_KEY || "";

const SNAP_BASE = IS_PRODUCTION
  ? "https://app.midtrans.com/snap/v1"
  : "https://app.sandbox.midtrans.com/snap/v1";

function authHeader() {
  if (!SERVER_KEY) throw new Error("MIDTRANS_SERVER_KEY belum diisi di .env");
  const token = Buffer.from(`${SERVER_KEY}:`).toString("base64");
  return `Basic ${token}`;
}

/**
 * Bikin Snap transaction, return { token, redirect_url }.
 * @param {object} params
 * @param {string} params.orderId - unik per transaksi, contoh: `pro-<userId>-<timestamp>`
 * @param {number} params.grossAmount - dalam Rupiah, integer (Midtrans gak terima desimal)
 * @param {{ email: string, name?: string }} params.customer
 * @param {string} params.itemName
 */
export async function createSnapTransaction({ orderId, grossAmount, customer, itemName }) {
  const origin = process.env.NEXTAUTH_URL || "http://localhost:3000";

  const payload = {
    transaction_details: {
      order_id: orderId,
      gross_amount: Math.round(grossAmount),
    },
    item_details: [
      {
        id: "plan-pro-monthly",
        price: Math.round(grossAmount),
        quantity: 1,
        name: itemName || "Kasyaf Redis Cloud - Pro Plan (1 bulan)",
      },
    ],
    customer_details: {
      email: customer.email,
      first_name: customer.name || customer.email.split("@")[0],
    },
    // finish_url dipakai Midtrans buat tombol "kembali ke merchant" di halaman mereka.
    // Status final tetap kita percaya dari webhook server-to-server, bukan dari redirect ini.
    callbacks: {
      finish: `${origin}/billing?checkout=finish`,
      error: `${origin}/billing?checkout=error`,
      pending: `${origin}/billing?checkout=pending`,
    },
    expiry: {
      unit: "hours",
      duration: 24,
    },
  };

  const res = await fetch(`${SNAP_BASE}/transactions`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: authHeader(),
    },
    body: JSON.stringify(payload),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.error_messages?.join(", ") || `Midtrans error ${res.status}`);
  }
  return { token: data.token, redirectUrl: data.redirect_url };
}

// Signature notifikasi Midtrans: SHA512(order_id + status_code + gross_amount + server_key)
// Wajib diverifikasi supaya webhook gak bisa dipalsukan orang luar buat klaim "sudah bayar".
export function verifyNotificationSignature(body) {
  if (!SERVER_KEY) return false;
  const { order_id, status_code, gross_amount, signature_key } = body || {};
  if (!order_id || !status_code || !gross_amount || !signature_key) return false;

  const expected = crypto
    .createHash("sha512")
    .update(`${order_id}${status_code}${gross_amount}${SERVER_KEY}`)
    .digest("hex");

  // timingSafeEqual butuh panjang buffer sama; signature SHA512 hex selalu 128 char,
  // tapi tetap guard length biar gak throw kalau ada payload aneh/truncated.
  const a = Buffer.from(expected);
  const b = Buffer.from(String(signature_key));
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

// transaction_status Midtrans yang dianggap "lunas / aktifkan Pro"
export function isPaidStatus(transactionStatus, fraudStatus) {
  if (transactionStatus === "capture") return fraudStatus === "accept";
  return transactionStatus === "settlement";
}
