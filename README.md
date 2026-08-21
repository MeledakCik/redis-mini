# Kasyaf Redis Cloud

### by Cikawan — https://console.kasyaf.id

![Kasyaf Redis Cloud](/public/logo.png)

Lightweight console untuk Redis & Vector DB (Qdrant), clone ala console.upstash.com. Dark theme, accent hijau #00e095, font JetBrains Mono.

Project ini 1 codebase jalan di 2 mode: Local (Docker Desktop) dan VPS Ubuntu (Docker). Data persistent pakai Docker Volume external.

## Architecture Production (VPS)

Client -> :443 -> nginx (alpine) -> console:3000 (Next.js standalone)
                        |-> redis:6379 (redis:7-alpine)
                        |-> qdrant:6333 (qdrant:v1.9.0)

Services di docker-compose.yml:

- **nginx** - Reverse proxy + SSL terminator, map 80/443 ke console:3000
- **console** - Next.js 14 app (output standalone), port 3000 internal only
- **redis** - redis:7-alpine, auth pakai REDIS_PASSWORD
- **qdrant** - qdrant/qdrant:v1.9.0, storage di volume qdrant_data

Semua data pakai external volume: redis_data, qdrant_data, console_data

## Tech Stack

- Next.js 14 (App Router, JavaScript, output: standalone)
- Tailwind CSS + shadcn/ui hand-rolled
- NextAuth v5 (Google, GitHub, Credentials fallback — JWT session)
- ioredis - koneksi Redis
- Qdrant REST API - vector search
- Nginx Alpine - reverse proxy
- Docker + Docker Compose

## Local Development

```bash
npm install
cp .env.example .env
# isi: REDIS_PASSWORD, API_KEY_KASYAF, NEXTAUTH_SECRET, GOOGLE_CLIENT_ID/SECRET, GITHUB_ID/SECRET

npm run dev
# buka http://localhost:3000
```

Atau pakai docker:

```bash
docker compose up -d --build
docker compose ps
```

## VPS Deployment

```bash
git clone https://github.com/MeledakCik/redis-mini.git ~/redis-mini
cd ~/redis-mini

# .env TIDAK dari git, buat manual
nano .env
# wajib isi: REDIS_URL, REDIS_HOST, REDIS_PASSWORD, QDRANT_URL, REDIS_PUBLIC_HOST,
# VECTOR_PUBLIC_HOST, API_KEY_KASYAF, NEXTAUTH_URL, NEXTAUTH_SECRET, ADMIN_EMAIL,
# GOOGLE_CLIENT_ID/SECRET, GITHUB_ID/SECRET, ALLOWED_EMAILS, ALLOWED_DOMAINS

docker compose up -d --build
docker compose logs -f console
```

Setup Nginx SSL:

```bash
sudo certbot --nginx -d console.kasyaf.id -d vector.kasyaf.id
```

## Environment Variables

Template ada di .env.example. Yang dipakai app adalah .env (tidak di-commit).

Wajib:
- REDIS_URL=redis://default:PASSWORD@redis:6379
- REDIS_HOST=redis
- REDIS_PORT=6379
- REDIS_PASSWORD=PASSWORD
- REDIS_PUBLIC_HOST=console.kasyaf.id:6379
- QDRANT_URL=http://qdrant:6333
- QDRANT_HOST=console.kasyaf.id (host publik buat connection string; port default 6333)
- QDRANT_PUBLIC_URL=http://console.kasyaf.id:6333 (opsional, override QDRANT_HOST; sengaja http bukan https, port 6333 gak di-TLS-in nginx)
- VECTOR_PUBLIC_HOST=vector.kasyaf.id
- APP_ENV=vps
- NODE_ENV=production
- API_KEY_KASYAF=
- NEXTAUTH_URL=https://console.kasyaf.id
- NEXTAUTH_SECRET=
- ADMIN_EMAIL=
- GOOGLE_CLIENT_ID= / GOOGLE_CLIENT_SECRET=
- GITHUB_ID= / GITHUB_SECRET=
- ALLOWED_EMAILS= (comma separated, opsional tambahan di luar ADMIN_EMAIL)
- ALLOWED_DOMAINS= (comma separated, misal kasyaf.id)

## OAuth Setup (Google & GitHub)

Console login pakai Google, GitHub, dan Email/Password (fallback, akun-akun lama).
Login via OAuth di-gate whitelist — hanya email yang match `ADMIN_EMAIL`,
`ALLOWED_EMAILS`, atau domain di `ALLOWED_DOMAINS` yang bisa masuk (default deny).

### 1. Google Cloud Console

1. Buka https://console.cloud.google.com/apis/credentials
2. Create Credentials -> OAuth client ID -> Web application
3. Authorized JavaScript origins: `https://console.kasyaf.id`
4. Authorized redirect URIs:
   ```
   https://console.kasyaf.id/api/auth/callback/google
   ```
   (untuk local dev tambahkan juga `http://localhost:3000/api/auth/callback/google`)
5. Copy Client ID & Client Secret ke `.env`:
   ```
   GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com
   GOOGLE_CLIENT_SECRET=xxx
   ```

### 2. GitHub OAuth App

1. Buka https://github.com/settings/developers -> New OAuth App
2. Homepage URL: `https://console.kasyaf.id`
3. Authorization callback URL:
   ```
   https://console.kasyaf.id/api/auth/callback/github
   ```
4. Generate client secret, copy ke `.env`:
   ```
   GITHUB_ID=xxx
   GITHUB_SECRET=xxx
   ```

### 3. Tambah email ke whitelist

Edit `.env` di VPS, isi comma-separated (spasi setelah koma akan di-trim otomatis):

```
ALLOWED_EMAILS=kamu@gmail.com,partner@gmail.com
ALLOWED_DOMAINS=kasyaf.id
```

Lalu restart container:

```
docker compose up -d --build console
```

Email yang gak ada di `ADMIN_EMAIL` / `ALLOWED_EMAILS` / domain-nya gak ada di
`ALLOWED_DOMAINS` akan otomatis di-redirect ke `/unauthorized` walau berhasil login
di Google/GitHub — **default deny**.

> Login Email/Password (Credentials) TIDAK terpengaruh whitelist ini — itu cuma
> berlaku buat akun yang sudah diprovision (lihat section registrasi di bawah).

### 4. Registrasi publik ditutup

`/register` (email+password self-serve) sudah dimatikan buat cegah bot spam akun.
Satu-satunya cara user baru masuk adalah login via Google/GitHub + whitelist (poin 3).

Kalau butuh bikin akun credentials manual (misal buat service/API-only, tanpa Google),
login dulu ke console pakai akun `ADMIN_EMAIL`, lalu panggil endpoint ini dari sesi
admin yang sama (contoh pakai cookie session admin):

```bash
curl -X POST https://console.kasyaf.id/api/auth/register \
  -H "Content-Type: application/json" \
  -H "Cookie: authjs.session-token=<COOKIE_SESSION_ADMIN>" \
  -d '{"email":"service@kasyaf.id","password":"minimal8karakter"}'
```

Request dari siapa pun selain `ADMIN_EMAIL` akan selalu ditolak `403`.

### 5. REST API tetap terpisah

Whitelist / OAuth sama sekali tidak menyentuh `/api/redis/*/exec` atau
`/api/vector/*/exec` versi Bearer token. Endpoint itu tetap pakai token per-instance
(`Authorization: Bearer <instance_password>`), independen dari session login browser:

```bash
curl -X POST https://console.kasyaf.id/api/redis/<instance-id>/exec \
  -H "Authorization: Bearer YOUR_INSTANCE_PASSWORD" \
  -H "Content-Type: application/json" \
  -d '{"raw":"PING"}'
```

## Security Hardening

- **Rate limiting login (Credentials)**: max 5 percobaan gagal / 10 menit per
  kombinasi email+IP, lalu lockout 15 menit. Ada 2 layer:
  1. Per-email+IP di dalam `authorize()` (`lib/auth.js`)
  2. Per-IP kasar di `middleware.js` buat endpoint `/api/auth/callback/credentials`
     (nge-cover brute force lintas-email dari 1 sumber)
- **Registrasi publik ditutup** — `/api/auth/register` cuma bisa dipanggil sesi
  admin (`ADMIN_EMAIL`), plus throttle IP tambahan di middleware.
- **OAuth whitelist default-deny** — Google/GitHub login yang emailnya gak ada di
  `ADMIN_EMAIL` / `ALLOWED_EMAILS` / `ALLOWED_DOMAINS` di-redirect ke `/unauthorized`,
  gak dapat sesi valid.
- **Security headers** (di `middleware.js`): `X-Frame-Options`,
  `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`,
  `Strict-Transport-Security` (production only).
- **REST API terpisah dari session** — `/api/redis/*/exec` & `/api/vector/*/exec`
  cuma nerima `Authorization: Bearer <instance_password>`, gak pernah kebaca cookie
  session, jadi kompromise di sisi console login gak otomatis bocorin akses API.

### Known limitation

Rate limiter saat ini in-memory (per-proses, `lib/rate-limit.js`). Cukup untuk
`console` sebagai 1 replica (lihat `docker-compose.yml`). Kalau nanti di-scale ke
banyak instance, ganti backend-nya ke Redis (`INCR` + `EXPIRE`) — signature fungsi
bisa tetap sama.

### Rekomendasi lanjutan (belum diimplementasi, opsional)

- Content-Security-Policy — belum ditambahin karena butuh testing manual biar gak
  break hydration Next.js/inline style Tailwind. Test dulu di staging:
  `Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:;`
- CAPTCHA (hCaptcha/Cloudflare Turnstile) di form Credentials login kalau brute
  force masih kerasa meski udah di-lock.

## REST API

```bash
curl -X POST https://console.kasyaf.id/api/redis/exec \
  -H "Authorization: Bearer YOUR_API_KEY_KASYAF" \
  -H "Content-Type: application/json" \
  -d '{"raw":"PING"}'
```

## Structure

```
redis-mini/
├── Dockerfile
├── docker-compose.yml
├── nginx/
│   └── nginx.conf
├── app/ (Next.js app router)
├── components/
├── lib/ (redis-pool, qdrant client, auth, rate-limit, etc)
├── .env (gitignored, secrets)
├── .env.example (template, boleh di-commit)
└── README.md
```

## Note

.env dan data volume tidak pernah di-push ke GitHub. Semua secrets stay di VPS. .env.example hanya template generik.
