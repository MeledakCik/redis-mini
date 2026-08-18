import fs from "fs";
import path from "path";
import crypto from "crypto";

// Atomic write: tulis ke file temp dulu di direktori yang sama, baru rename().
// rename() pada filesystem yang sama itu atomic di level OS, jadi request lain yang
// baca file ini gak akan pernah dapet hasil "setengah nulis" walau ada write bersamaan.
export function atomicWriteJson(filePath, data) {
  const dir = path.dirname(filePath);
  const tmpFile = path.join(
    dir,
    `.${path.basename(filePath)}.${process.pid}.${crypto.randomBytes(4).toString("hex")}.tmp`
  );
  fs.writeFileSync(tmpFile, JSON.stringify(data, null, 2));
  fs.renameSync(tmpFile, filePath);
}
