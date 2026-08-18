import fs from "fs";
import { atomicWriteJson } from "@/lib/atomic-write";
import { dataPath } from "@/lib/paths";

const DB_FILE = dataPath("instances.json");

// Task 2, migrasi schema: instance lama (dari sebelum ada mode docker/external) gak punya
// field `provider` — dianggap "docker" (perilaku lama, spawn container Redis lokal).
function migrateInstance(inst) {
  if (inst.provider) return inst;
  return { ...inst, provider: "docker", host: inst.host || "127.0.0.1", externalUrl: inst.externalUrl || null };
}

export function readInstances() {
  if (!fs.existsSync(DB_FILE)) {
    atomicWriteJson(DB_FILE, []);
    return [];
  }
  try {
    const raw = fs.readFileSync(DB_FILE, "utf8");
    const data = raw.trim() ? JSON.parse(raw) : [];
    return data.map(migrateInstance);
  } catch (err) {
    console.error("Gagal baca instances.json:", err.message);
    return [];
  }
}

export function writeInstances(data) {
  atomicWriteJson(DB_FILE, data);
}

// Semua instance milik satu user (dipakai buat halaman list /databases).
export function readInstancesForUser(userId) {
  return readInstances().filter((i) => i.userId === userId);
}

export function getInstance(id) {
  return readInstances().find((i) => i.id === id) || null;
}

// Ambil instance TAPI hanya kalau dimiliki userId ini.
// Kalau id-nya exist tapi punya user lain, tetap balikin null (bukan data user lain) —
// caller lalu cukup return 404 generik "Database not found", jadi user A gak bisa tau
// apakah id tebakannya benar-benar exist punya user B (cegah IDOR enumeration).
export function getInstanceForUser(id, userId) {
  const inst = getInstance(id);
  if (!inst || inst.userId !== userId) return null;
  return inst;
}

export function upsertInstance(instance) {
  const db = readInstances();
  const idx = db.findIndex((i) => i.id === instance.id);
  if (idx === -1) db.push(instance);
  else db[idx] = { ...db[idx], ...instance };
  writeInstances(db);
  return instance;
}

export function removeInstance(id) {
  const db = readInstances();
  const next = db.filter((i) => i.id !== id);
  writeInstances(next);
}
