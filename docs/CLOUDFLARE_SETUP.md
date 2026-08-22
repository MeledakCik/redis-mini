# Setup Cloudflare Anti-DDoS untuk console.kasyaf.id

IP origin VPS (`103.92.215.180`) saat ini bisa diakses langsung dari publik — siapa pun
yang tau IP-nya bisa serang origin langsung, bypass Cloudflare sepenuhnya. Dokumen ini
nutup celah itu.

Perubahan di repo ini **sudah otomatis aktif** begitu di-deploy:
- `nginx.conf` — `set_real_ip_from` untuk seluruh range IP Cloudflare + `real_ip_header
  CF-Connecting-IP` + `real_ip_recursive on`, rate limit zone `auth` (5r/m) khusus
  `/api/auth`, zone `auth_zone` (3r/s) khusus `/api/auth/callback/credentials` &
  `/api/auth/register`, dan zone `general_zone` (15r/s) untuk sisanya.
- `middleware.js` — nolak request dengan `Host` header berisi IP origin
  (`103.92.215.180`) langsung dengan 403, dan baca IP asli visitor dari header
  `cf-connecting-ip`.
- `docker-compose.yml` — `redis` dan `qdrant` cuma `expose` (gak ada `ports:` yang
  publish ke host), cuma `nginx` yang punya `ports: 80:80, 443:443`.

Tapi baru efektif penuh setelah langkah-langkah manual di dashboard Cloudflare & VPS di
bawah ini selesai (butuh akses yang gak dipunya dari sini).

## 1. Pindahkan DNS ke Cloudflare (kalau belum)

1. Login https://dash.cloudflare.com, **Add a Site** → masukin `kasyaf.id`
2. Cloudflare scan DNS record yang ada — pastikan record ini **proxy status ORANYE
   (Proxied)**, bukan abu-abu (DNS only):
   ```
   A    console.kasyaf.id    103.92.215.180    Proxied (orange cloud)
   A    vector.kasyaf.id     103.92.215.180    Proxied (orange cloud)
   ```
3. Ganti nameserver domain `kasyaf.id` di registrar ke 2 nameserver yang dikasih
   Cloudflare (misal `xxx.ns.cloudflare.com`). Propagasi bisa sampai 24 jam.

## 2. SSL/TLS mode — WAJIB Full (strict)

Dashboard → **SSL/TLS → Overview** → pilih **Full (strict)**.

Bukan "Flexible" — origin sudah punya cert Let's Encrypt asli via certbot, jadi "Full
(strict)" paling aman: koneksi Cloudflare ↔ origin tetap encrypted & cert-nya
tervalidasi (bukan cuma trust apa aja).

## 3. WAF rate limiting rule

Dashboard → **Security → WAF → Rate limiting rules** → Create rule, contoh:

- Nama: `Login brute-force protection`
- If incoming requests match: `URI Path equals /api/auth/callback/credentials` (atau
  `starts with /api/auth`)
- Rate: lebih dari **20 requests per 1 menit** dari IP yang sama
- Action: **Block** selama 10 menit

Ini lapisan tambahan DI DEPAN nginx `auth_zone`/`auth` limiter — request yang di-block
Cloudflare gak akan pernah sampai ke origin sama sekali (lebih hemat resource VPS).

Opsional:
- **Security → DDoS**: proteksi L3/L4 & L7 aktif otomatis begitu domain di-proxy
  (orange cloud), gak perlu setting tambahan di plan Free.
- **Security → Settings → Security Level**: naikin ke "Medium"/"High" kalau lagi kena
  serangan aktif.
- **"I'm Under Attack" mode**: toggle sementara kalau ada serangan real-time —
  nampilin JS challenge sebelum request nyampe origin.

## 4. Kunci VPS: cuma terima trafik 80/443 dari Cloudflare

Ini langkah PALING PENTING — tanpa ini, penyerang masih bisa langsung hit
`103.92.215.180:443` dan skip Cloudflare + `middleware.js` origin-lock sepenuhnya di
level TCP (middleware.js baru jalan setelah request nyampe proses Node).

SSH ke VPS, lalu jalankan script yang sudah disiapkan (`scripts/setup-cloudflare-ufw.sh`):

```bash
cd ~/redis-mini
sudo SSH_ALLOW_IP=<IP_KAMU_SENDIRI> bash scripts/setup-cloudflare-ufw.sh
```

Script itu:
1. Buka SSH duluan (supaya gak ke-lock out), dibatasi ke `SSH_ALLOW_IP` kalau diisi.
2. Fetch daftar IP Cloudflare terbaru dari `cloudflare.com/ips-v4` dan `ips-v6`.
3. `ufw allow` port 80/443 HANYA dari range IP Cloudflare tersebut.
4. Nampilin `ufw status numbered` supaya kamu bisa cek & hapus manual rule lama yang
   masih allow 80/443 dari "Anywhere", baru `ufw enable`.

> IP Cloudflare jarang berubah tapi bisa update — jadwalkan script ini jalan ulang
> mingguan via cron kalau mau auto-refresh.

Port lain yang publicly exposed (kalau ada, misal Redis/Qdrant public port buat
`REDIS_PUBLIC_HOST`) **TIDAK** bisa ditutup oleh Cloudflare proxy (itu cuma proteksi
port 80/443). Untuk itu tetap batasi lewat `ufw allow from <IP customer tertentu>` per
kasus, atau taruh di belakang VPN/allowlist IP terpisah.

## 5. Redeploy config yang sudah di-update

```bash
cd ~/redis-mini
git pull origin main
docker compose exec nginx nginx -t   # validasi syntax dulu SEBELUM reload
docker compose up -d --build console  # middleware.js ikut ke-rebuild
docker compose restart nginx
```

## 6. Verifikasi

```bash
# dari luar VPS: harus GAGAL connect langsung (timeout/refused) kalau firewall sudah bener
curl -m 5 https://103.92.215.180 -k

# harus tetap jalan normal lewat domain (proxied Cloudflare)
curl -I https://console.kasyaf.id

# cek header CF-Ray muncul (tanda request lewat Cloudflare)
curl -sI https://console.kasyaf.id | grep -i cf-ray

# hit /api/auth berkali-kali cepat dari 1 IP -> harus kena 429 dari nginx (zone "auth")
# sebelum sempet nyampe rate limiter di middleware.js
```

Kalau `curl https://103.92.215.180` masih connect setelah firewall di-apply, double
check `ufw status` — kemungkinan masih ada rule lama yang allow "Anywhere".
