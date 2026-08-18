import crypto from "crypto";

export function generateId(len = 8) {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let out = "";
  for (let i = 0; i < len; i++) out += chars[crypto.randomInt(0, chars.length)];
  return out;
}

// mirip format Upstash: "kqHyzqC2y6ZJTRy-3kaX"
export function generatePassword(len = 24) {
  return crypto.randomBytes(len).toString("base64url").slice(0, len);
}

export function generatePort(existingPorts, min = 11000, max = 12000) {
  const used = new Set(existingPorts);
  for (let i = 0; i < 300; i++) {
    const port = crypto.randomInt(min, max + 1);
    if (!used.has(port)) return port;
  }
  throw new Error(`Tidak ada port kosong di range ${min}-${max}`);
}
