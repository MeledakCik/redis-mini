import fs from "fs";
import { atomicWriteJson } from "@/lib/atomic-write";
import { dataPath } from "@/lib/paths";

const DB_FILE = dataPath("redis-tenants.json");

export function readTenants() {
  if (!fs.existsSync(DB_FILE)) {
    atomicWriteJson(DB_FILE, []);
    return [];
  }
  try {
    const raw = fs.readFileSync(DB_FILE, "utf8");
    return raw.trim() ? JSON.parse(raw) : [];
  } catch (err) {
    console.error("Gagal baca redis-tenants.json:", err.message);
    return [];
  }
}

export function writeTenants(data) {
  atomicWriteJson(DB_FILE, data);
}

export function getTenantByOwnerId(ownerId) {
  return readTenants().find((t) => t.ownerId === ownerId) || null;
}

export function getTenantByUsername(username) {
  return readTenants().find((t) => t.username === username) || null;
}

export function upsertTenant(tenant) {
  const db = readTenants();
  const idx = db.findIndex((t) => t.ownerId === tenant.ownerId);
  if (idx >= 0) db[idx] = tenant;
  else db.push(tenant);
  writeTenants(db);
  return tenant;
}

export function removeTenantByOwnerId(ownerId) {
  const db = readTenants();
  const next = db.filter((t) => t.ownerId !== ownerId);
  writeTenants(next);
  return db.length !== next.length;
}
