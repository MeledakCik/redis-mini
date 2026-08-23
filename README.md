# ⚡ Kasyaf Cloud — Serverless Data Platform for Developers

> **Redis & Vector DB tanpa ribet setup. REST API 100% kompatibel dengan Upstash SDK — provisioning dalam hitungan detik.**

<p align="center">
  <a href="https://console.kasyaf.id"><img src="https://img.shields.io/badge/Live-console.kasyaf.id-00e095?style=for-the-badge&logo=vercel" /></a>
  <a href="https://db.kasyaf.id:16379"><img src="https://img.shields.io/badge/Redis-db.kasyaf.id:16379-DC382D?style=for-the-badge&logo=redis&logoColor=white" /></a>
  <img src="https://img.shields.io/badge/Next.js-14-black?style=for-the-badge&logo=next.js" />
  <img src="https://img.shields.io/badge/Docker-Ready-2496ED?style=for-the-badge&logo=docker&logoColor=white" />
</p>

<p align="center">
  <b>by Cikawan</b> • <a href="https://console.kasyaf.id">console.kasyaf.id</a> • <a href="https://kasyaf.id">kasyaf.id</a>
</p>

---

![Kasyaf Redis Cloud](/public/logo.png)

### 🎯 Apa itu Kasyaf Cloud?

Clone dari `console.upstash.com` tapi lightweight, self-hosted, 1 codebase jalan di 2 mode:

- **Local Mode** → `Docker Desktop` / `npm run dev`
- **VPS Mode** → Ubuntu Sumopod `103.92.215.180` + Docker Compose + Nginx

Semua data persistent pakai **Docker External Volume** (`redis_data`, `qdrant_data`, `console_data`).

### ✨ Features

- 🔥 **Redis Cloud** - `redis:7-alpine` + ACL per-tenant `user_{id}:bull:*` + BullMQ ready (`+info +eval +evalsha`)
- 🧠 **Vector Cloud** - `qdrant/qdrant:v1.9.0` REST API
- 🔌 **Upstash Compatible REST API** - `POST /api/redis/<id>/exec` & `/api/vector/<id>/exec` pakai Bearer token
- 🎨 **Console UI** - Dark theme, accent `#00e095`, font JetBrains Mono, mirip Upstash Console
- ⚙️ **BullMQ & Queue** - Support forensic worker, screenshot, multi-channel dispatcher (Resend + Gmail)
- 🔐 **NextAuth v5** - Google, GitHub, Credentials fallback (JWT) + whitelist default-deny

---

### 🏗️ Architecture Production

```mermaid
graph TD
    User[👨‍💻 Developer Browser] -->|https://console.kasyaf.id :443<br/>ORANGE Proxied - Anti DDoS| CF[Cloudflare Edge]
    CF --> Nginx

    App[🚂 Railway / BullMQ Worker] -->|redis://db.kasyaf.id:16379<br/>GRAY DNS Only - Direct TCP| Nginx2[Host:16379]

    subgraph VPS - Sumopod 103.92.215.180
        Nginx[nginx:alpine<br/>:80/:443 - SSL Terminator]
        Console[console:3000<br/>Next.js 14 Standalone]
        Redis[redis:6379<br/>redis:7-alpine]
        Qdrant[qdrant:6333<br/>qdrant:v1.9.0]
        Nginx --> Console
        Console --> Redis
        Console --> Qdrant
    end

    Nginx2 --> Redis

    style CF fill:#f38020,color:#fff
    style Nginx fill:#00e095,stroke:#000,color:#000
    style Redis fill:#DC382D,color:#fff
```

**Services di `docker-compose.yml`:**

| Service | Image | Port Internal | Public | Fungsi |
| :--- | :--- | :--- | :--- | :--- |
| `nginx` | `nginx:alpine` | 80, 443 | 443 | Reverse Proxy + SSL Terminator |
| `console` | `next:standalone` | 3000 | via nginx | Next.js 14 App Router |
| `redis` | `redis:7-alpine` | 6379 | `db.kasyaf.id:16379` | Main Datastore + BullMQ |
| `qdrant` | `qdrant/qdrant:v1.9.0` | 6333 | `vector.kasyaf.id` | Vector Search |

### 🌐 DNS Setup - INI KUNCI BIAR GAK KE-BLOCK

> Cloudflare Free cuma proxy port 80/443. Kalo Redis di-orange-in bakal `ETIMEDOUT`.

| Name | Type | Content | Proxy Status | Wajib |
| :--- | :--- | :--- | :--- | :--- |
| `console.kasyaf.id` | A | `103.92.215.180` | ☁️ **Proxied** | Web Console - Aman DDoS |
| `db.kasyaf.id` | A | `103.92.215.180` | **DNS only** | Redis TCP 16379 - Biar direct |
| `vector.kasyaf.id` | A | `103.92.215.180` | ☁️ **Proxied** | Vector API |
| `kasyaf.id` | A | `76.76.21.21` | DNS only | Landing Vercel |

---

### 🚀 Quick Start - Local

```bash
git clone https://github.com/MeledakCik/redis-mini.git
cd redis-mini
cp .env.example .env
# isi: REDIS_PASSWORD, API_KEY_KASYAF, NEXTAUTH_SECRET, GOOGLE_CLIENT_ID/SECRET, GITHUB_ID/SECRET

# Option 1: Bare metal
npm install
npm run dev
# -> http://localhost:3000

# Option 2: Docker (Recommended)
docker compose up -d --build
docker compose ps
docker compose logs -f console
```

### 📦 Deploy ke VPS

```bash
# SSH ke VPS Sumopod
ssh kaskaf@103.92.215.180

git clone https://github.com/MeledakCik/redis-mini.git ~/redis-mini
cd ~/redis-mini

# .env TIDAK dari git, buat manual!
nano .env

docker compose up -d --build
docker compose logs -f console
```

<details>
<summary><b>📄 .env Template (klik buka)</b></summary>

```env
# Core
APP_ENV=vps
NODE_ENV=production
REDIS_URL=redis://default:PASSWORD@redis:6379
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=xxx
REDIS_PUBLIC_HOST=db.kasyaf.id:16379
QDRANT_URL=http://qdrant:6333
QDRANT_HOST=console.kasyaf.id
QDRANT_PUBLIC_URL=http://console.kasyaf.id:6333
VECTOR_PUBLIC_HOST=vector.kasyaf.id
API_KEY_KASYAF=xxx

# Auth
NEXTAUTH_URL=https://console.kasyaf.id
NEXTAUTH_SECRET=xxx
ADMIN_EMAIL=admin@kasyaf.id
GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=xxx
GITHUB_ID=xxx
GITHUB_SECRET=xxx
ALLOWED_EMAILS=email1@gmail.com,email2@gmail.com
ALLOWED_DOMAINS=kasyaf.id

# BullMQ / Worker
GMAIL_USER=
GMAIL_CLIENT_ID=
GMAIL_CLIENT_SECRET=
GMAIL_REFRESH_TOKEN=
RESEND_API_KEY=
```

</details>

---

### 🔧 Fix Penting - Redis ACL buat BullMQ (Yang kemarin ETIMEDOUT & NOPERM)

Ini template ACL yang bener, kalo gak ada `+info +eval` bakal `NOPERM` pas `BullMQ Worker` jalan:

```conf
# Template wajib
+@all -@dangerous +info +eval +evalsha +script +client +memory +latency +lolwut
```

**Cara create user baru:**

```bash
docker exec -it redis-mini-redis-1 redis-cli --user default --pass $REDIS_PASSWORD

ACL SETUSER user_userw3mk9eh0 on >zOUKAQxmU5tsGZrw1_8A on ~user_userw3mk9eh0:* +@all -@dangerous +info +eval +evalsha +script +client +memory +latency

ACL LIST
```

**Test dari Windows:**

```powershell
Test-NetConnection db.kasyaf.id -Port 16379
# TcpTestSucceeded : True = Aman!
```

**IORedis Config biar gak ETIMEDOUT dari Railway EU:**

```js
new IORedis(process.env.REDIS_URL, {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
  connectTimeout: 30000,
  keepAlive: 30000,
  retryStrategy: (times) => Math.min(times * 100, 5000),
  reconnectOnError: () => true
})
```

---

### 🔐 OAuth Setup

Console login pakai Google, GitHub, dan Email/Password fallback. Login via OAuth di-gate whitelist.

**1. Google Cloud Console**

- https://console.cloud.google.com/apis/credentials
- Create OAuth Client ID → Web Application
- Origin: `https://console.kasyaf.id`
- Redirect: `https://console.kasyaf.id/api/auth/callback/google`
- (dev) tambahin `http://localhost:3000/api/auth/callback/google`

**2. GitHub OAuth App**

- https://github.com/settings/developers → New OAuth App
- Homepage: `https://console.kasyaf.id`
- Callback: `https://console.kasyaf.id/api/auth/callback/github`

**3. Whitelist**

```env
ALLOWED_EMAILS=kamu@gmail.com,partner@gmail.com
ALLOWED_DOMAINS=kasyaf.id
```

Email gak ada di whitelist → auto redirect `/unauthorized` (default deny).

**4. Register ditutup**

`/register` self-serve dimatikan anti bot. Cara bikin akun manual (harus sesi ADMIN):

```bash
curl -X POST https://console.kasyaf.id/api/auth/register \
  -H "Content-Type: application/json" \
  -H "Cookie: authjs.session-token=<COOKIE_ADMIN>" \
  -d '{"email":"service@kasyaf.id","password":"minimal8karakter"}'
```

### 🛡️ Security Hardening

- **Rate limiting** 5x gagal / 10m per email+IP → lockout 15m (2 layer di `lib/auth.js` & `middleware.js`)
- **Registrasi publik ditutup** - cuma `ADMIN_EMAIL` bisa
- **OAuth whitelist default-deny**
- **Security headers** - `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, `HSTS`
- **REST API terpisah** - `/api/redis/*/exec` cuma Bearer token, gak pake cookie session
- **UFW** - `ufw limit 16379/tcp` + fail2ban ready
- **In-memory rate limit** - cukup buat 1 replica, kalo scale banyak instance ganti ke Redis `INCR+EXPIRE`

### 📡 REST API

```bash
# Redis - Upstash Compatible
curl -X POST https://console.kasyaf.id/api/redis/<instance-id>/exec \
  -H "Authorization: Bearer YOUR_INSTANCE_PASSWORD" \
  -H "Content-Type: application/json" \
  -d '{"raw":"PING"}'

# BullMQ
REDIS_URL=redis://user_userw3mk9eh0:zOUKAQxmU5tsGZrw1_8A@db.kasyaf.id:16379

# Vector
curl -X POST https://console.kasyaf.id/api/vector/<id>/exec ...
```

### 📁 Structure

```
redis-mini/
├── Dockerfile
├── docker-compose.yml
├── nginx/
│   └── conf.d/default.conf
├── app/ (Next.js App Router)
│   ├── api/redis/[id]/exec
│   ├── api/vector/[id]/exec
│   └── console/
├── components/ (shadcn hand-rolled)
├── lib/ (redis-pool, qdrant, auth, rate-limit)
├── public/logo.png
├── .env (gitignored)
├── .env.example
└── README.md
```

### 🐛 Known Issues Solved

| Error | Penyebab | Fix |
| :--- | :--- | :--- |
| `NOPERM ... INFO` | ACL template kurang | Tambah `+info +eval +evalsha +script` |
| `ETIMEDOUT` Railway | CF orange block TCP 16379 | `db.kasyaf.id` jadi **DNS only** |
| `bind() 0.0.0.0:80 failed` | Nginx host tabrakan Docker | `docker compose down` dulu, pake `certonly --standalone` |
| `404 acme-challenge` | Webroot salah | Pake standalone + ubah CF jadi gray sementara |
| `Gmail invalid_grant` | Refresh token expired | Generate lagi di OAuth Playground |
| `Tidak aman` di `db.kasyaf.id` | Gray cloud, no CF SSL | Biarin, itu buat TCP bukan buat browsing. Suruh user buka `console.kasyaf.id` |

### 📜 License

MIT - Made with ❤️ by Cikawan

---

<p align="center">
  <b>Kasyaf Cloud v1.0</b> • <code>[KASYAF_CLOUD_v1.0] • LIVE</code><br/>
  Serverless Data Platform for Developers.
</p>
