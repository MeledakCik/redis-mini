// lib/infra.js — factory provider infrastruktur, gantiin lib/docker.js lama.
//
// GOAL (Task 2): satu codebase, jalan di 2 mode:
//  - mode "docker": npm run dev di laptop / VPS Ubuntu dengan Docker daemon -> spawn container
//    redis:7-alpine per database (perilaku lama, dipindah ke DockerProvider apa adanya).
//  - mode "external": Railway (atau environment manapun tanpa Docker daemon) -> TIDAK spawn
//    container, cukup connect ke Redis & Qdrant eksternal (Railway Redis plugin, Upstash,
//    Qdrant Cloud, dst) lewat REDIS_URL / QDRANT_URL per instance.
//
// Semua route /api/instances & /api/vector panggil getProvider() lalu pakai method generiknya,
// gak perlu tau lagi apakah lagi di Docker atau external.

import Redis from "ioredis";
import { IS_DOCKER_AVAILABLE, DEPLOYMENT_MODE, REGION_LABEL } from "@/lib/env";
import { getAdminRedis } from "@/lib/redis-admin";
import {
  buildUsername,
  generatePassword as generateTenantPassword,
  applyAclUser,
  removeAclUser,
  purgeTenantKeys,
  buildPublicRedisUrl,
  redisClientForUser,
} from "@/lib/tenant";

const LABEL_KEY = "app";
const LABEL_VALUE = "redis-uts";
const REDIS_IMAGE = "redis:7-alpine";
const QDRANT_PORT = 6333;

let _dockerode;
async function getDocker() {
  if (!_dockerode) {
    // import dinamis: di mode "external" (Railway) module `dockerode` gak pernah dipakai,
    // jadi gak perlu ada socket /var/run/docker.sock buat modul ini kebaca.
    const { default: Docker } = await import("dockerode");
    _dockerode = new Docker();
  }
  return _dockerode;
}

// Cek Qdrant reachable lewat HTTP biasa (bukan docker inspect) — dipakai baik oleh
// DockerProvider maupun ExternalProvider karena keduanya sama-sama gak lagi spawn/kelola
// container Qdrant sendiri, cuma connect ke instance yang udah jalan di tempat lain.
async function isReachable(baseUrl) {
  try {
    const res = await fetch(`${baseUrl}/collections`, { signal: AbortSignal.timeout(3000) });
    return res.ok;
  } catch {
    return false;
  }
}

// ============================= DOCKER PROVIDER =============================
// Logic lama dari lib/docker.js (dockerode), dipindah apa adanya.
const DockerProvider = {
  mode: "docker",

  async isAvailable() {
    try {
      const d = await getDocker();
      await d.ping();
      return true;
    } catch {
      return false;
    }
  },

  async createRedisInstance({ id, port, password, containerName }) {
    const d = await getDocker();

    try {
      await d.getImage(REDIS_IMAGE).inspect();
    } catch {
      await new Promise((resolve, reject) => {
        d.pull(REDIS_IMAGE, (err, stream) => {
          if (err) return reject(err);
          d.modem.followProgress(stream, (err2) => (err2 ? reject(err2) : resolve()));
        });
      });
    }

    const container = await d.createContainer({
      name: containerName,
      Image: REDIS_IMAGE,
      Labels: { [LABEL_KEY]: LABEL_VALUE, "redis-uts.id": id },
      Cmd: [
        "redis-server",
        "--requirepass", password,
        "--maxmemory", "100mb",
        "--maxmemory-policy", "allkeys-lru",
      ],
      ExposedPorts: { "6379/tcp": {} },
      HostConfig: {
        // ALLOW_EXTERNAL_REDIS=true -> bind 0.0.0.0 (dipakai kalau mau akses dari luar host,
        // mis. VPS tanpa reverse proxy). Default tetap 127.0.0.1 (aman, cuma localhost).
        PortBindings: {
          "6379/tcp": [{ HostIp: process.env.ALLOW_EXTERNAL_REDIS === "true" ? "0.0.0.0" : "127.0.0.1", HostPort: String(port) }],
        },
        RestartPolicy: { Name: "always" },
      },
    });

    await container.start();
    return { containerId: container.id, host: "127.0.0.1", port, provider: "docker" };
  },

  async _listLiveContainers() {
    const d = await getDocker();
    return d.listContainers({ all: true, filters: JSON.stringify({ label: [`${LABEL_KEY}=${LABEL_VALUE}`] }) });
  },

  async getRedisLiveStatus(inst) {
    const live = await this._listLiveContainers();
    const c = live.find((x) => x.Id === inst.containerId);
    const status = c ? c.State : "not_found";
    let memoryUsageBytes = null;
    if (c && c.State === "running") {
      try {
        memoryUsageBytes = (await this._containerStats(inst.containerId)).memory_stats?.usage || null;
      } catch {}
    }
    return { status, memoryUsageBytes };
  },

  async _containerStats(containerId) {
    const d = await getDocker();
    return d.getContainer(containerId).stats({ stream: false });
  },

  async restartRedisInstance(inst) {
    const d = await getDocker();
    await d.getContainer(inst.containerId).restart();
  },

  async removeRedisInstance(inst) {
    const d = await getDocker();
    const container = d.getContainer(inst.containerId);
    try { await container.stop(); } catch {}
    try { await container.remove({ force: true }); } catch {}
  },

  // --- Qdrant (vector backend) ---
  // Task fix: Qdrant SUDAH jalan sebagai service tersendiri di docker-compose.yml (port
  // 6333/6334 punya dia sendiri). App ini TIDAK BOLEH lagi bikin/spawn container Qdrant
  // sendiri (createContainer + PortBindings 6333) — itu yang nyebabin bentrok
  // "port already allocated 0.0.0.0:6333" tiap kali user create Vector Database, karena
  // container qdrant dari compose udah pegang port itu duluan.
  //
  // Sekarang app cukup CONNECT ke Qdrant yang sudah jalan (lihat qdrantBaseUrl di bawah),
  // dan tiap Vector Database cuma bikin 1 COLLECTION lewat REST API Qdrant (lib/qdrant.js),
  // bukan container baru. ensureVectorBackend() di sini cuma mastiin Qdrant itu reachable.
  async ensureVectorBackend() {
    const reachable = await isReachable(this.qdrantBaseUrl);
    if (!reachable) {
      throw new Error(
        `Qdrant tidak bisa dihubungi di ${this.qdrantBaseUrl}. Pastikan service "qdrant" di docker-compose.yml jalan (docker compose ps), atau set QDRANT_URL ke endpoint Qdrant yang benar.`
      );
    }
    return { alreadyExisted: true };
  },

  async getVectorBackendStatus() {
    const running = await isReachable(this.qdrantBaseUrl);
    return { running, containerId: null };
  },

  // Gak ada container yang app ini kelola lagi buat Qdrant (service-nya dikelola docker-compose
  // sendiri, terpisah dari container mana pun yang di-spawn app ini) — no-op, sama seperti
  // ExternalProvider. Restart service Qdrant compose dilakukan manual: `docker compose restart qdrant`.
  async restartVectorBackend() {
    return;
  },

  // Gak ada akses ke container stats Qdrant lagi dari sisi app (bukan container yang app ini
  // spawn/kelola) — biarin null, UI sudah handle containerTotalBytes: null dengan baik.
  async getVectorBackendMemoryBytes() {
    return null;
  },

  // Prioritas: QDRANT_URL (mis. "http://qdrant:6333", hostname service compose lewat Docker
  // DNS di network kasyaf-net) -> fallback 127.0.0.1 buat dev lokal di host tanpa compose.
  get qdrantBaseUrl() {
    return process.env.QDRANT_URL || `http://127.0.0.1:${QDRANT_PORT}`;
  },
};

// ============================ EXTERNAL PROVIDER ============================
// Tanpa dockerode sama sekali. Redis & Qdrant sudah jalan di tempat lain (Railway Redis
// plugin, Upstash, Qdrant Cloud, VPS lain, dst) — kita cuma nyimpen & validasi koneksinya.
const ExternalProvider = {
  mode: "external",

  async isAvailable() {
    // Selalu "available" — gak ada daemon lokal yang perlu dicek. Validasi koneksi real
    // dilakukan per-instance di createRedisInstance / ensureVectorBackend.
    return true;
  },

  async createRedisInstance({ id, externalUrl }) {
    if (!externalUrl) {
      throw new Error("REDIS_URL / connection string eksternal wajib diisi di mode external.");
    }
    // Validasi hidup dengan PING sebelum disimpan, biar gak nyimpen instance yang gak nyambung.
    const client = new Redis(externalUrl, { lazyConnect: true, connectTimeout: 4000, maxRetriesPerRequest: 1 });
    try {
      await client.connect();
      const pong = await client.ping();
      if (pong !== "PONG") throw new Error("Redis eksternal tidak merespon PING dengan benar.");
    } finally {
      client.disconnect();
    }

    let host = "external", port = null;
    try {
      const u = new URL(externalUrl);
      host = u.hostname;
      port = u.port ? Number(u.port) : (u.protocol === "rediss:" ? 6380 : 6379);
    } catch {}

    return { containerId: null, host, port, provider: "external", externalUrl };
  },

  async getRedisLiveStatus(inst) {
    if (!inst.externalUrl) return { status: "not_found", memoryUsageBytes: null };
    const client = new Redis(inst.externalUrl, { lazyConnect: true, connectTimeout: 3000, maxRetriesPerRequest: 1 });
    try {
      await client.connect();
      const info = await client.info("memory");
      const match = info.match(/used_memory:(\d+)/);
      return { status: "running", memoryUsageBytes: match ? Number(match[1]) : null };
    } catch {
      return { status: "not_found", memoryUsageBytes: null };
    } finally {
      client.disconnect();
    }
  },

  async restartRedisInstance() {
    // Gak ada container yang bisa di-restart di mode external — cukup no-op, redis-pool.js
    // yang drop & bikin koneksi ioredis baru (tetap terasa seperti "reconnect fresh" buat user).
    return;
  },

  async removeRedisInstance() {
    // Gak ada apa pun untuk dihapus di sisi infra — Redis eksternal tetap hidup, cuma metadata
    // instance-nya yang dihapus dari store (dilakukan oleh caller di route.js).
    return;
  },

  // --- Qdrant eksternal: satu QDRANT_URL dipakai bersama semua vector DB, sama seperti
  // satu container Qdrant dipakai bersama di mode Docker. ---
  async ensureVectorBackend() {
    if (!process.env.QDRANT_URL) {
      throw new Error("QDRANT_URL wajib diisi di mode external supaya Vector Database bisa jalan.");
    }
    const reachable = await isReachable(this.qdrantBaseUrl);
    if (!reachable) {
      throw new Error(`Qdrant tidak bisa dihubungi di ${this.qdrantBaseUrl}. Cek QDRANT_URL.`);
    }
    return { containerId: null, alreadyExisted: true };
  },

  async getVectorBackendStatus() {
    const running = await isReachable(this.qdrantBaseUrl);
    return { running, containerId: null };
  },

  async restartVectorBackend() {
    return; // gak ada yang bisa di-restart, Qdrant eksternal dikelola di luar aplikasi ini
  },

  async getVectorBackendMemoryBytes() {
    return null; // gak ada akses container stats untuk backend eksternal
  },

  get qdrantBaseUrl() {
    return process.env.QDRANT_URL || `http://127.0.0.1:${QDRANT_PORT}`;
  },
};

// ============================== ACL PROVIDER ================================
// Ini yang dipakai tombol "Create Database" di /databases sekarang (Task: Redis-as-a-Service
// provider beneran, bukan tool lokal). TIDAK spawn container, TIDAK minta user input URL
// manual — satu server Redis utama (REDIS_URL) dipakai bersama semua customer, tiap database
// yang di-create dapat SATU akun ACL sendiri (`user_<id>`) yang keynya dibatasi ke
// `~user_<id>:*` lewat `ACL SETUSER` (lib/tenant.js). Public connection string yang
// dikembalikan ke customer pakai host publik (REDIS_PUBLIC_HOST / REDIS_PUBLIC_URL), BUKAN
// host internal REDIS_URL yang cuma reachable dari dalam network kita sendiri.
const AclProvider = {
  mode: "acl",

  async isAvailable() {
    try {
      const admin = getAdminRedis();
      await admin.ping();
      return true;
    } catch {
      return false;
    }
  },

  async createRedisInstance({ id }) {
    const username = buildUsername(`user_${id}`);
    const password = generateTenantPassword(20);

    const aclSupported = await applyAclUser({ username, password });
    if (!aclSupported) {
      throw new Error(
        "Gagal provisioning ACL di Redis cluster utama. Cek REDIS_URL / permission admin server."
      );
    }

    const connectionString = buildPublicRedisUrl({ username, password });
    let host = null;
    let port = null;
    try {
      const u = new URL(connectionString);
      host = u.hostname;
      port = u.port ? Number(u.port) : 6379;
    } catch {}

    return {
      containerId: null,
      host,
      port,
      provider: "acl",
      username,
      password, // password ACL beneran — dipakai juga sebagai Bearer token endpoint REST/CLI kita
      prefix: `${username}:`,
      externalUrl: connectionString, // dipakai juga sebagai "connection string publik" di UI
      aclSupported,
    };
  },

  // Status "live" instance ACL dicek lewat proxy prefixed (lib/tenant.js), BUKAN raw ACL
  // connection — SCAN/KEYS Redis native gak otomatis dibatasi oleh ACL key-pattern (itu
  // kenapa app ini punya proxy admin+prefix sendiri, lihat lib/tenant.js).
  async getRedisLiveStatus(inst) {
    if (!inst.username) return { status: "not_found", memoryUsageBytes: null };
    try {
      const client = redisClientForUser(inst.username);
      const pong = await client.call("PING");
      if (pong !== "PONG") return { status: "not_found", memoryUsageBytes: null };
      return { status: "running", memoryUsageBytes: null };
    } catch {
      return { status: "not_found", memoryUsageBytes: null };
    }
  },

  // Gak ada container/proses yang bisa di-restart — server utamanya shared. Cukup no-op,
  // sama seperti ExternalProvider (redis-pool.js yang bikin koneksi baru biar terasa "reconnect").
  async restartRedisInstance() {
    return;
  },

  async removeRedisInstance(inst) {
    if (!inst.username) return;
    await removeAclUser(inst.username);
    await purgeTenantKeys(inst.username);
  },
};

export function getProvider() {
  return DEPLOYMENT_MODE === "external" ? ExternalProvider : DockerProvider;
}

// Pilih provider berdasarkan field instance.provider (bukan cuma DEPLOYMENT_MODE global) —
// dipakai di route GET/restart/flush/delete supaya tiap instance tetap ditangani lewat
// provider yang benar-benar dipakai waktu instance itu dibuat, walau app-nya sendiri
// kebetulan lagi jalan di mode yang lain (mis. migrasi data lama dari Docker/external ke ACL).
export function getProviderForInstance(inst) {
  if (inst?.provider === "acl") return AclProvider;
  return inst?.provider === "external" ? ExternalProvider : DockerProvider;
}

export { QDRANT_PORT, IS_DOCKER_AVAILABLE, DEPLOYMENT_MODE, REGION_LABEL, AclProvider };
