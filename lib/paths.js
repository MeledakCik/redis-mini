import fs from "fs";
import path from "path";

// Railway (dan VPS kalau operator mau) butuh direktori data yang persist di luar
// build output (.next/standalone kehapus tiap deploy). Default:
//  - RAILWAY_ENVIRONMENT ada -> /app/data (mount volume Railway di path ini, lihat railway.json/README)
//  - selain itu -> process.cwd() (perilaku lama, tetap jalan apa adanya di local/VPS)
export const DATA_DIR =
  process.env.DATA_DIR || (process.env.RAILWAY_ENVIRONMENT ? "/app/data" : process.cwd());

// Pastikan foldernya ada (khususnya penting untuk /app/data yang fresh di volume baru).
try {
  fs.mkdirSync(DATA_DIR, { recursive: true });
} catch (err) {
  console.error("Gagal membuat DATA_DIR:", DATA_DIR, err.message);
}

export function dataPath(filename) {
  return path.join(DATA_DIR, filename);
}
