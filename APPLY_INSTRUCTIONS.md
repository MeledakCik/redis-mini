# Cara Apply Patch Ini ke redis-mini

Struktur folder di zip ini SAMA PERSIS dengan struktur repo `redis-mini`,
tinggal timpa/copy ke lokasi yang sama. Isinya: payment gateway Midtrans + quota
plan-aware, anti-DDoS (nginx rate limit + Cloudflare real IP), halaman /pricing,
dan fix bug redirect callback Midtrans yang lari ke localhost.

## File yang di-update (existing, akan ditimpa)
- .env.example
- middleware.js
- nginx.conf
- lib/quota.js
- app/billing/page.js
- app/api/quota/route.js
- app/api/instances/route.js
- app/api/instances/[id]/stats/route.js
- app/api/redis/[id]/exec/route.js
- app/api/vector/route.js
- app/api/vector/[id]/exec/route.js
- components/marketing/final-cta.jsx

## File baru
- lib/midtrans.js
- lib/plan-store.js
- app/api/billing/checkout/route.js
- app/api/billing/webhook/route.js
- app/pricing/page.js
- CLOUDFLARE_SETUP.md

## Langkah apply

```bash
cd ~/redis-mini

# copy semua file dari zip ke sini (asumsikan zip di-extract ke ~/patch-billing)
cp -r ~/patch-billing/. .

git status   # cek diff-nya
git add .
git commit -m "feat: Midtrans payment gateway + quota, anti-DDoS rate limit, /pricing"
git push origin main
```

## Sebelum deploy ke VPS

1. Tambahkan ke `.env` di VPS (BUKAN `.env.example`):
   ```
   MIDTRANS_SERVER_KEY=Mid-server-xxx        # dari dashboard.midtrans.com
   MIDTRANS_CLIENT_KEY=Mid-client-xxx
   MIDTRANS_IS_PRODUCTION=true               # false dulu kalau mau test sandbox
   ```
2. **WAJIB**: pastikan salah satu dari `NEXTAUTH_URL` / `AUTH_URL` / `APP_URL` /
   `BASE_URL` ada di `.env` dan isinya domain publik (`https://console.kasyaf.id`),
   BUKAN kosong / localhost. Ini yang dipakai buat redirect balik setelah bayar
   di Midtrans — kalau gak ada satupun, user bakal diarahkan ke `localhost:3000`
   (bug yang sudah diperbaiki di `lib/midtrans.js`, tapi tetap butuh env-nya keisi).
3. Daftarkan **Notification URL** di dashboard Midtrans -> Settings -> Configuration:
   ```
   https://console.kasyaf.id/api/billing/webhook
   ```
4. Deploy:
   ```bash
   cd ~/redis-mini
   docker compose exec nginx nginx -t     # validasi syntax nginx.conf SEBELUM reload
   docker compose up -d --build console
   docker compose restart nginx
   docker compose logs -f console
   ```
5. Test: login -> `/pricing` -> `/billing` -> klik "Upgrade to Pro" -> harus
   sampai ke halaman Midtrans (Sandbox kalau `MIDTRANS_IS_PRODUCTION=false`),
   bukan `ERR_CONNECTION_REFUSED` ke localhost.

## Cloudflare (anti-DDoS)

`nginx.conf` di patch ini sudah siap nerima trafik lewat Cloudflare (rate limit +
baca IP asli visitor dari header `CF-Connecting-IP`), tapi bagian setup Cloudflare
dashboard-nya (DNS, SSL mode, WAF, kunci firewall VPS) harus dikerjakan manual —
lihat `CLOUDFLARE_SETUP.md`.

## Yang TIDAK berubah (aman)
- Dockerfile, docker-compose.yml
- lib/auth.js, lib/store.js, lib/vector-store.js, qdrant client
- app/api/redis/[id]/exec & app/api/vector/[id]/exec tetap mode Bearer token untuk
  REST API (cuma nambah parameter email opsional buat storage limit Pro-aware saat
  dipakai dari Data Browser browser, gak ngubah alur Bearer/Postman)
- Tidak ada dependency npm baru (recharts sudah ada di package.json sebelumnya)
