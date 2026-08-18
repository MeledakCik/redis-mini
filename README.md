# Mini Upstash Pro — Redis + Vector Console Clone

Clone dashboard ala **console.upstash.com**. Dark theme, accent hijau `#00e095`, font JetBrains
Mono. Dua produk: **Redis** dan **Vector** (Qdrant di baliknya). Login multi-user, isolasi data
per user, rate limiting, REST API dengan Bearer token (bisa dipanggil langsung dari
Postman/curl tanpa cookie session), dan **satu codebase** yang jalan di 3 target deploy:
laptop lokal (Docker Desktop), VPS Ubuntu (Docker), dan Railway (tanpa Docker daemon).

> Semua id/token database itu dinamis per akun — TIDAK ADA yang di-hardcode di source code.
> Redis & Vector database diambil dari `instances.json` / `vector-instances.json` lewat
> `lib/store.js` / `lib/vector-store.js`.

## Tech Stack

- **Next.js 14** (App Router, JavaScript, `output: 'standalone'`)
- **Tailwind CSS** + komponen ala shadcn/ui (hand-rolled di `components/ui/`)
- **NextAuth (Auth.js) v5** — login Credentials, session JWT
- **Dockerode** — spawn container Docker (mode `docker` saja — lazy-imported, gak dibutuhkan di mode `external`)
- **ioredis** — koneksi & eksekusi command ke Redis (container lokal ATAU Redis eksternal)
- **Qdrant REST API** — mesin vector search di balik modul Vector (container lokal ATAU Qdrant eksternal)
- **Recharts**, **@xterm/xterm**, **lucide-react**

## Dua Mode Deployment (Task 2)

Aplikasi ini otomatis deteksi mode lewat `lib/env.js`:

| | **Mode `docker`** | **Mode `external`** |
|---|---|---|
| Kapan dipakai | Laptop (Docker Desktop), VPS Ubuntu dengan Docker daemon | Railway atau environment manapun tanpa Docker daemon |
| Redis baru | Spawn container `redis:7-alpine` per database (`lib/infra.js` → `DockerProvider`) | Connect ke Redis eksternal (Railway Redis plugin, Upstash, dll) via `REDIS_URL` yang diisi user di form "Connect External Redis" |
| Vector baru | Spawn/pakai 1 container `qdrant/qdrant` bersama | Connect ke Qdrant eksternal via `QDRANT_URL` |
| Deteksi | `/var/run/docker.sock` ada **dan** `RAILWAY_ENVIRONMENT` gak ada | Sebaliknya, atau `DEPLOYMENT_MODE=external` di-set manual |

Override manual selalu bisa lewat `DEPLOYMENT_MODE=docker|external` di environment variable —
tidak wajib mengandalkan auto-detect.

## Free Tier Limit (Task 3)

Per akun: **1 Redis database**, **1 Vector database**, **500MB storage total** (`lib/quota.js`).
Lewat limit → API balikin `403 { error: "LIMIT_REACHED" | "STORAGE_LIMIT", upgradeUrl: "/billing" }`,
frontend redirect ke `/billing` (dummy checkout, gak ada payment provider beneran). User lama yang
udah punya lebih dari limit sebelum fitur ini ada TIDAK dihapus paksa — cuma dicegah bikin baru.

---

## A. Local (Docker Desktop)

```bash
npm install
docker pull redis:7-alpine
docker pull qdrant/qdrant:latest      # opsional, otomatis ke-pull pas bikin vector DB pertama

cp .env.local.example .env.local
# isi AUTH_SECRET, generate dengan:
openssl rand -base64 32

npm run dev
```

Buka `http://localhost:3000`, register akun, mulai bikin database. `DEPLOYMENT_MODE` gak perlu
diisi — auto-detect ke `docker` karena `/var/run/docker.sock` ada dan `RAILWAY_ENVIRONMENT`
gak ada.

## B. VPS (Ubuntu, dengan Docker)

```bash
# 1. Install Docker
curl -fsSL https://get.docker.com | sh

# 2. Clone & konfigurasi
git clone <repo-url> mini-upstash-pro && cd mini-upstash-pro
cp .env.example .env
# isi minimal: AUTH_SECRET (openssl rand -base64 32), AUTH_URL (https://domain-kamu.com)

# 3. Build & jalankan (app + qdrant, lihat docker-compose.yml)
DATA_DIR=./data docker compose up -d --build
```

Catatan penting soal `docker-compose.yml`: service `app` jalan dengan `network_mode: host` dan
mount `/var/run/docker.sock`, supaya bisa spawn container Redis **sibling** di Docker daemon
host yang sama (Docker-out-of-Docker) — sama persis seperti kalau dijalankan langsung
`npm run dev` di host. `DATA_DIR=./data` mem-bind folder `./data` di host ke `/app/data` di
dalam container, jadi `instances.json`/`vector-instances.json`/`users.json` **survive** restart
& redeploy.

Untuk expose ke internet, taruh Nginx (atau Caddy) di depan sebagai reverse proxy + TLS:

```nginx
server {
    listen 443 ssl;
    server_name domain-kamu.com;
    ssl_certificate     /etc/letsencrypt/live/domain-kamu.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/domain-kamu.com/privkey.pem;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Generate cert gratis dengan `certbot --nginx -d domain-kamu.com`. Set `AUTH_URL=https://domain-kamu.com`
di `.env` sebelum `docker compose up -d --build` ulang.

## C. Railway (tanpa Docker daemon)

Railway **tidak punya Docker daemon** untuk aplikasi jalanin container sendiri — jadi mode
`docker` (spawn container Redis per database) TIDAK bisa dipakai di sini. Aplikasi otomatis
jalan di mode `external`: connect ke Redis & Qdrant eksternal, gak pernah coba spawn container.

1. **Add Service from GitHub** — connect repo ini, Railway build otomatis lewat `railway.json`
   (`builder: NIXPACKS`, jalanin `npm run build` lalu `npm run start`).
2. **Add Volume**, mount di path `/app/data` — ini WAJIB, tanpa ini `instances.json` dkk hilang
   tiap kali Railway redeploy container baru.
3. **Add Redis** (plugin Railway) — dipakai untuk rate-limit (`lib/rate-limit.js`) & vector
   metrics (`lib/vector-metrics.js`) internal supaya survive restart/multi-instance. Copy
   connection string-nya ke env var `REDIS_URL`.
4. Set environment variables:
   - `AUTH_SECRET` — wajib, `openssl rand -base64 32`
   - `AUTH_URL` — URL public Railway kamu (`https://xxx.up.railway.app`)
   - `DEPLOYMENT_MODE=external`
   - `DATA_DIR=/app/data`
   - `QDRANT_URL` — Qdrant eksternal (Qdrant Cloud free tier, atau Qdrant di VPS lain yang
     reachable dari Railway) — wajib diisi kalau mau modul Vector jalan.
   - `REDIS_URL` — dari langkah 3 (opsional tapi direkomendasikan)
5. **Deploy.** Healthcheck otomatis nge-hit `/api/auth/session` (lihat `railway.json`).

Setelah deploy, tombol "Create Database" di dashboard otomatis berubah jadi
**"Connect External Redis"** (form Name + Redis URL + TLS checkbox), karena frontend baca mode
deployment dari `GET /api/config`.

---

## Struktur Project (ringkas)

```
mini-upstash-pro/
├── Dockerfile                   # multi-stage, output standalone — dipakai VPS & Railway
├── docker-compose.yml           # VPS: app (host network) + qdrant + volume data
├── railway.json                 # Railway: nixpacks, healthcheck /api/auth/session
├── .env.example                 # semua env var, semua mode
├── .env.local.example           # template minimal buat dev lokal
├── data/.gitkeep                # DATA_DIR default kalau di-mount ke ./data
├── middleware.js                # proteksi route; whitelist Bearer utk /api/(redis|vector)/*/exec
├── lib/
│   ├── env.js                   # deteksi IS_DOCKER_AVAILABLE / DEPLOYMENT_MODE
│   ├── infra.js                 # factory provider: DockerProvider vs ExternalProvider
│   ├── paths.js                 # DATA_DIR resolver
│   ├── quota.js                 # Task 3: limit 1 Redis + 1 Vector + 500MB/akun
│   ├── atomic-write.js          # write-then-rename, race-condition-safe
│   ├── store.js / vector-store.js / users-store.js   # baca/tulis *.json di DATA_DIR
│   ├── redis-pool.js            # koneksi ioredis, docker (host:port) atau external (URL)
│   ├── qdrant.js                # REST client Qdrant, base URL ikut provider aktif
│   ├── rate-limit.js            # Redis-backed (kalau REDIS_URL ada) atau in-memory
│   └── vector-metrics.js        # sama, Redis-backed atau in-memory
├── app/
│   ├── billing/page.js          # Task 3: Free vs Pro, dummy checkout
│   └── api/
│       ├── config/route.js               # publik: { deploymentMode } buat frontend
│       ├── quota/route.js                # ringkasan kuota akun (banner + billing page)
│       ├── instances/route.js            # GET list, POST create (quota + provider aware)
│       ├── instances/[id]/stats/route.js # storage usage tab Details
│       ├── redis/[id]/exec/route.js      # 2 mode: browser (cookie) & REST (Bearer)
│       ├── vector/route.js               # sama pattern-nya untuk Vector
│       └── vector/[id]/exec/route.js
└── components/
    ├── create-database-dialog.jsx        # form docker vs "Connect External Redis"
    ├── quota-banner.jsx                  # banner kuning 1/1 Redis, 1/1 Vector, storage %
    ├── storage-usage-card.jsx            # tab Details: Storage Used X/500MB
    └── cli-terminal.jsx                  # generik (id/port/token/apiPath sbg prop)
```

## REST API — 2 Mode Akses

`POST /api/redis/:id/exec` dan `POST /api/vector/:id/exec` punya 2 cara akses:

- **Data Browser / CLI (dari UI kita sendiri)** — session cookie login, instance diambil lewat
  `getInstanceForUser(id, user.id)` sehingga user A gak bisa akses instance user B.
- **REST API murni (Postman/curl, tanpa cookie)** — kirim header `Authorization: Bearer <token>`.
  `middleware.js` meloloskan request ber-Bearer ke endpoint exec ini duluan sebelum sempat kena
  cek cookie, lalu route handler validasi token-nya cocok dengan `instance.password`/`token`.

```bash
curl -X POST https://domain-kamu.com/api/redis/<id>/exec \
  -H "Authorization: Bearer <token-instance-kamu>" \
  -H "Content-Type: application/json" \
  -d '{"raw":"PING"}'
# -> 200 OK { "result": "PONG" }
```
