import fs from "fs";
import { atomicWriteJson } from "@/lib/atomic-write";
import { dataPath } from "@/lib/paths";

const DB_FILE = dataPath("users.json");

export function readUsers() {
  if (!fs.existsSync(DB_FILE)) {
    atomicWriteJson(DB_FILE, []);
    return [];
  }
  try {
    const raw = fs.readFileSync(DB_FILE, "utf8");
    return raw.trim() ? JSON.parse(raw) : [];
  } catch (err) {
    console.error("Gagal baca users.json:", err.message);
    return [];
  }
}

export function writeUsers(data) {
  atomicWriteJson(DB_FILE, data);
}

export function getUserByEmail(email) {
  const norm = String(email || "").trim().toLowerCase();
  return readUsers().find((u) => u.email.toLowerCase() === norm) || null;
}

export function getUserById(id) {
  return readUsers().find((u) => u.id === id) || null;
}

export function createUser({ id, email, passwordHash }) {
  const db = readUsers();
  if (db.some((u) => u.email.toLowerCase() === email.toLowerCase())) {
    throw new Error("Email sudah terdaftar");
  }
  const user = { id, email, passwordHash, createdAt: new Date().toISOString() };
  db.push(user);
  writeUsers(db);
  return user;
}
