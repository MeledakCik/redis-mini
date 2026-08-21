// lib/plan-store.js — status subscription per user (free/pro), disimpan terpisah dari
// users.json karena user OAuth (Google/GitHub) gak pernah masuk users.json (itu cuma
// buat akun Credentials). Key-nya email ter-normalize, konsisten dipakai session.user.email.
import fs from "fs";
import { atomicWriteJson } from "@/lib/atomic-write";
import { dataPath } from "@/lib/paths";

const DB_FILE = dataPath("plans.json");

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

export function readPlans() {
  if (!fs.existsSync(DB_FILE)) {
    atomicWriteJson(DB_FILE, {});
    return {};
  }
  try {
    const raw = fs.readFileSync(DB_FILE, "utf8");
    return raw.trim() ? JSON.parse(raw) : {};
  } catch (err) {
    console.error("Gagal baca plans.json:", err.message);
    return {};
  }
}

export function writePlans(data) {
  atomicWriteJson(DB_FILE, data);
}

// Default: free plan, gak ada expiry.
export function getPlan(email) {
  const key = normalizeEmail(email);
  if (!key) return { plan: "free", expiresAt: null };
  const db = readPlans();
  const entry = db[key];
  if (!entry) return { plan: "free", expiresAt: null };

  // Pro yang udah lewat expiresAt otomatis dianggap balik ke free (tanpa perlu cron job
  // terpisah — dicek on-read, cukup buat skala single-instance kayak deployment ini).
  if (entry.plan === "pro" && entry.expiresAt && new Date(entry.expiresAt).getTime() < Date.now()) {
    return { plan: "free", expiresAt: null, expired: true, lastOrderId: entry.lastOrderId };
  }
  return entry;
}

export function setPlan(email, { plan, expiresAt = null, lastOrderId = null }) {
  const key = normalizeEmail(email);
  if (!key) throw new Error("email wajib diisi");
  const db = readPlans();
  db[key] = {
    plan,
    expiresAt,
    lastOrderId,
    updatedAt: new Date().toISOString(),
  };
  writePlans(db);
  return db[key];
}

// Dipanggil dari webhook Midtrans — idempotent by order_id, biar notifikasi yang
// dikirim ulang (Midtrans retry on non-200) gak dobel-extend masa aktif Pro.
export function applyPaidOrder(email, orderId, { durationDays = 30 } = {}) {
  const key = normalizeEmail(email);
  const db = readPlans();
  const current = db[key];

  if (current?.lastOrderId === orderId && current?.plan === "pro") {
    return current; // sudah diproses sebelumnya, no-op
  }

  const now = Date.now();
  const base = current?.plan === "pro" && current.expiresAt && new Date(current.expiresAt).getTime() > now
    ? new Date(current.expiresAt).getTime() // extend dari sisa masa aktif kalau masih Pro
    : now;
  const expiresAt = new Date(base + durationDays * 24 * 60 * 60 * 1000).toISOString();

  return setPlan(key, { plan: "pro", expiresAt, lastOrderId: orderId });
}
