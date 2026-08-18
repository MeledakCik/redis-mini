import fs from "fs";
import { atomicWriteJson } from "@/lib/atomic-write";
import { dataPath } from "@/lib/paths";

const DB_FILE = dataPath("vector-instances.json");

// Task 2, migrasi schema: vector instance lama gak punya field `provider` — dianggap "docker"
// (perilaku lama, pakai 1 container Qdrant lokal bersama).
function migrateVectorInstance(inst) {
  if (inst.provider) return inst;
  return { ...inst, provider: "docker", host: inst.host || "127.0.0.1" };
}

export function readVectorInstances() {
  if (!fs.existsSync(DB_FILE)) {
    atomicWriteJson(DB_FILE, []);
    return [];
  }
  try {
    const raw = fs.readFileSync(DB_FILE, "utf8");
    const data = raw.trim() ? JSON.parse(raw) : [];
    return data.map(migrateVectorInstance);
  } catch (err) {
    console.error("Gagal baca vector-instances.json:", err.message);
    return [];
  }
}

export function writeVectorInstances(data) {
  atomicWriteJson(DB_FILE, data);
}

export function readVectorInstancesForUser(userId) {
  return readVectorInstances().filter((i) => i.userId === userId);
}

export function getVectorInstance(id) {
  return readVectorInstances().find((i) => i.id === id) || null;
}

// Sama seperti getInstanceForUser: balikin null (bukan 403) kalau id punya user lain,
// supaya endpoint di atasnya bisa return 404 generik dan gak bocorin keberadaan id tsb.
export function getVectorInstanceForUser(id, userId) {
  const inst = getVectorInstance(id);
  if (!inst || inst.userId !== userId) return null;
  return inst;
}

export function upsertVectorInstance(instance) {
  const db = readVectorInstances();
  const idx = db.findIndex((i) => i.id === instance.id);
  if (idx === -1) db.push(instance);
  else db[idx] = { ...db[idx], ...instance };
  writeVectorInstances(db);
  return instance;
}

export function removeVectorInstance(id) {
  const db = readVectorInstances();
  writeVectorInstances(db.filter((i) => i.id !== id));
}
