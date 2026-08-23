# Setup Cloudflare Anti-DDoS untuk console.kasyaf.id

IP VPS (`103.92.215.180`) saat ini bisa diakses langsung publik — siapa pun yang tau
IP-nya bisa serang origin langsung, bypass Cloudflare sepenuhnya. Dokumen ini nutup
celah itu buat **web console** (`console.kasyaf.id` / `vector.kasyaf.id`), sambil tetap
mempertahankan akses publik langsung ke **Redis (6379) & Qdrant (6333)** — karena itu
core fitur produk ini (Redis-as-a-Service: customer connect langsung dari app mereka).

Perubahan di `nginx.conf`, `middleware.js`, dan `docker-compose.yml` di repo ini
**sudah otomatis aktif** begitu di-deploy — tapi baru efektif penuh setelah langkah
manual di bawah selesai (butuh akses dashboard Cloudflare & SSH VPS).

## ⚠️ Hostname database vs web console — WAJIB dipisah

Ini penyebab paling umum "tiba-tiba Redis gak bisa connect setelah pasang Cloudflare":

| Hostname | Dipakai untuk | Proxy status di Cloudflare |
|---|---|---|
| `console.kasyaf.id` | Web console (HTTPS, port 443) | **Orange cloud (Proxied)** |
| `vector.kasyaf.id` | Redirect ke web console | **Orange cloud (Proxied)** |
| `db.kasyaf.id` (atau nama lain, bebas) | `REDIS_PUBLIC_HOST` & `QDRANT_HOST` — connection string yang dikembalikan ke customer | **Grey cloud (DNS only) — JANGAN diproxy** |

Cloudflare proxy standar (tanpa add-on Spectrum berbayar) **cuma forward trafik
HTTP/HTTPS**, bukan raw TCP sembarang port. Kalau hostname yang dipakai untuk
`REDIS_PUBLIC_HOST`/`QDRANT_HOST` ikut di-proxy (orange cloud), semua koneksi client ke
port 6379/6333 akan **timeout / ENETUNREACH** ke IP edge Cloudflare — bukan ke Redis
kamu. Gejalanya persis seperti ini di log aplikasi customer:

```
Error: connect ETIMEDOUT 172.67.128.254:6379
Error: connect ENETUNREACH 2606:4700:3033::ac43:80fe:6379
```

(`172.67.x.x`, `104.21.x.x`, `2606:4700:...` adalah IP edge Cloudflare, bukan IP VPS kamu.)

**Fix:** bikin DNS A record terpisah (mis. `db.kasyaf.id`) yang nunjuk ke
`103.92.215.180`, proxy status **DNS only (grey cloud, awan abu-abu)** — bukan
Proxied. Lalu set `REDIS_PUBLIC_HOST=db.kasyaf.id:6379` dan
`QDRANT_HOST=db.kasyaf.id` / `QDRANT_PUBLIC_URL=http://db.kasyaf.id:6333` di `.env`
(lihat `.env.example`).

## 1. Pindahkan DNS ke Cloudflare (kalau belum)

1. Daftar/login https://dash.cloudflare.com, **Add a Site** -> masukin `kasyaf.id`
2. Cloudflare akan scan DNS record yang ada — pastikan record ini benar:
   ```
   A    console.kasyaf.id    103.92.215.180    Proxied (orange cloud)
   A    vector.kasyaf.id     103.92.215.180    Proxied (orange cloud)
   A    db.kasyaf.id         103.92.215.180    DNS only (grey cloud)   <-- WAJIB grey!
   ```
3. Ganti nameserver domain `kasyaf.id` di registrar ke 2 nameserver yang dikasih
   Cloudflare (misal `xxx.ns.cloudflare.com`). Propagasi bisa sampai 24 jam, biasanya
   < 1 jam.

## 2. SSL/TLS mode

Dashboard Cloudflare -> **SSL/TLS** -> Overview -> pilih **Full (strict)**.
(Bukan "Flexible" — origin sudah punya cert Let's Encrypt asli via certbot, jadi
"Full (strict)" paling aman: Cloudflare <-> origin tetap encrypted & tervalidasi.)
Ini cuma berlaku untuk hostname yang di-proxy (console/vector), `db.kasyaf.id` yang
grey cloud gak kena SSL mode Cloudflare sama sekali (langsung ke origin).

## 3. Aktifkan proteksi DDoS bawaan

Dashboard -> **Security** -> **DDoS**: proteksi L3/L4 & L7 Cloudflare aktif otomatis
begitu domain di-proxy (orange cloud), gak perlu konfigurasi tambahan di plan Free.

Opsional buat extra layer:
- **Security -> WAF -> Rate limiting rules**: contoh rule "kalau > 20 request ke
  `/api/auth/callback/credentials` dalam 1 menit dari 1 IP -> Block 10 menit"
- **Security -> Settings -> Security Level**: naikin ke "Medium"/"High" kalau lagi
  kena serangan aktif
- **"I'm Under Attack" mode**: toggle sementara di Security -> Settings kalau ada
  serangan real-time, nampilin JS challenge sebelum request nyampe origin

## 4. Kunci VPS: port 80/443 cuma dari Cloudflare, port 6379/6333 tetap terbuka

Pakai script yang sudah disiapkan di repo ini:

```bash
cd ~/redis-mini
sudo bash scripts/setup-cloudflare-ufw.sh
```

Script itu:
- Allow SSH dari IP kamu
- Allow 80/443 **hanya** dari range IP resmi Cloudflare (fetch fresh dari
  `cloudflare.com/ips-v4` dan `ips-v6`, bukan hardcode — biar selalu up to date)
- **Sengaja membiarkan 6379 (Redis) & 6333 (Qdrant) terbuka ke publik** — itu bukan
  celah, itu memang cara kerja produk ini. Proteksinya dari password ACL per-tenant
  (Redis) dan token per-tenant (Qdrant), bukan dari IP allowlist.

> Range IP Cloudflare jarang berubah tapi bisa saja berubah. Jadwalkan script di atas
> jalan ulang mingguan via cron kalau mau auto-sync, atau pakai `cloudflare-ufw` /
> `crowdsec` Cloudflare bouncer.

## 5. Redeploy config yang sudah di-update

```bash
cd ~/redis-mini
git pull origin main
docker compose config            # validasi dulu sebelum apply
docker compose exec nginx nginx -t   # validasi syntax nginx SEBELUM reload
docker compose up -d --build
```

## 6. Verifikasi

```bash
# dari luar VPS: harus GAGAL connect langsung (timeout/refused) ke port 80/443
curl -m 5 https://103.92.215.180 -k

# harus tetap jalan normal lewat domain (proxied Cloudflare)
curl -I https://console.kasyaf.id
curl -sI https://console.kasyaf.id | grep -i cf-ray   # tanda request lewat Cloudflare

# Redis/Qdrant tetap harus bisa diakses LANGSUNG (bukan lewat Cloudflare) - by design
redis-cli -h db.kasyaf.id -p 6379 PING
curl http://db.kasyaf.id:6333/collections
```

Kalau `curl https://103.92.215.180` masih connect setelah firewall di-apply, double
check `ufw status` — kemungkinan masih ada rule lama yang allow "Anywhere" di 80/443.

Kalau Redis/Qdrant customer gagal connect (`ETIMEDOUT` ke IP yang polanya
`172.6x.x.x` / `104.2x.x.x` / `2606:4700:...`), balik ke bagian **"Hostname database
vs web console"** di atas — hostname-nya kemungkinan besar salah di-proxy Cloudflare.
