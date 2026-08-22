// lib/orders-store.js — pending "manual transfer / QRIS" orders, gantiin peran
// order pending Midtrans. Beda dari plan-store.js (status subscription final),
// file ini nyimpen order yang LAGI ditunggu pembayarannya lewat mutasi bank (Moota).
//
// Kenapa perlu kode unik di nominal: transfer bank/QRIS statis gak bawa order_id
// kayak payment gateway, jadi satu-satunya cara sistem tau "transfer 149.123 ini punya
// order yang mana" adalah dengan bikin nominal per-order unik (base price + 3 digit
// kode unik 000-999). Webhook Moota nanti tinggal cocokin exact amount ke order pending.
import fs from "fs";
import { atomicWriteJson } from "@/lib/atomic-write";
import { dataPath } from "@/lib/paths";

const DB_FILE = dataPath("orders.json");
const UNIQUE_CODE_MAX = 999; // nominal jadi baseAmount + 0..999

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

export function readOrders() {
  if (!fs.existsSync(DB_FILE)) {
    atomicWriteJson(DB_FILE, {});
    return {};
  }
  try {
    const raw = fs.readFileSync(DB_FILE, "utf8");
    return raw.trim() ? JSON.parse(raw) : {};
  } catch (err) {
    console.error("Gagal baca orders.json:", err.message);
    return {};
  }
}

export function writeOrders(data) {
  atomicWriteJson(DB_FILE, data);
}

function isActive(order, now = Date.now()) {
  return order.status === "pending" && new Date(order.expiresAt).getTime() > now;
}

// Order pending yang masih aktif punya nominal yang dipantau webhook — dipakai buat
// (a) cari kode unik yang belum kepake, (b) cocokin mutasi masuk ke order yang tepat.
function activeOrders(db, now = Date.now()) {
  return Object.values(db).filter((o) => isActive(o, now));
}

/**
 * Buat / kembalikan order pending buat email ini. Idempotent per user: kalau user
 * udah punya order pending yang belum expired, order itu yang dikembalikan lagi
 * (biar gak numpuk banyak nominal unik buat 1 user yang refresh-refresh halaman billing).
 */
export function createOrGetPendingOrder(email, { baseAmount, durationDays = 30, expiryMinutes = 60 } = {}) {
  const key = normalizeEmail(email);
  if (!key) throw new Error("email wajib diisi");

  const db = readOrders();
  const now = Date.now();

  const existing = Object.values(db).find((o) => o.email === key && isActive(o, now));
  if (existing) return existing;

  const used = new Set(activeOrders(db, now).map((o) => o.uniqueCode));
  let uniqueCode = null;
  // Nyari kode unik acak yang belum kepake order aktif lain (harusnya cuma butuh
  // 1-2 percobaan kecuali lagi rame banget order barengan).
  for (let i = 0; i < UNIQUE_CODE_MAX + 1; i++) {
    const candidate = Math.floor(Math.random() * (UNIQUE_CODE_MAX + 1));
    if (!used.has(candidate)) {
      uniqueCode = candidate;
      break;
    }
  }
  if (uniqueCode === null) {
    throw new Error("Semua kode unik nominal lagi kepake, coba lagi sebentar.");
  }

  const orderId = `pro-${Buffer.from(key).toString("base64url")}-${now}`;
  const order = {
    orderId,
    email: key,
    baseAmount,
    uniqueCode,
    grossAmount: baseAmount + uniqueCode,
    durationDays,
    status: "pending", // pending -> paid | expired
    createdAt: new Date(now).toISOString(),
    expiresAt: new Date(now + expiryMinutes * 60 * 1000).toISOString(),
    paidAt: null,
    mutationId: null,
  };

  db[orderId] = order;
  writeOrders(db);
  return order;
}

export function getOrder(orderId) {
  const db = readOrders();
  return db[orderId] || null;
}

export function getPendingOrderForEmail(email) {
  const key = normalizeEmail(email);
  const db = readOrders();
  return Object.values(db).find((o) => o.email === key && isActive(o)) || null;
}

// Cari SATU order pending yang nominalnya persis sama dengan mutasi masuk. Exact-match
// nominal (bukan cuma "amount berdasar" description) itu inti dari skema kode unik ini.
export function findPendingOrderByAmount(grossAmount) {
  const db = readOrders();
  return activeOrders(db).find((o) => o.grossAmount === grossAmount) || null;
}

// Idempotent by mutationId — webhook Moota kadang retry, jangan sampe dobel proses.
export function markOrderPaid(orderId, mutationId) {
  const db = readOrders();
  const order = db[orderId];
  if (!order) return null;
  if (order.status === "paid") return order; // sudah diproses, no-op

  order.status = "paid";
  order.paidAt = new Date().toISOString();
  order.mutationId = mutationId || null;
  db[orderId] = order;
  writeOrders(db);
  return order;
}

// Housekeeping ringan: tandain order pending yang udah lewat expiresAt jadi "expired"
// biar nominal uniknya bisa dipakai ulang order lain & orders.json gak numpuk data
// "pending" palsu selamanya. Dipanggil on-read dari endpoint status/checkout.
export function sweepExpiredOrders() {
  const db = readOrders();
  const now = Date.now();
  let changed = false;
  for (const order of Object.values(db)) {
    if (order.status === "pending" && new Date(order.expiresAt).getTime() < now) {
      order.status = "expired";
      changed = true;
    }
  }
  if (changed) writeOrders(db);
}
