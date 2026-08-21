# Setup Cloudflare Anti-DDoS untuk console.kasyaf.id

IP VPS (`103.92.215.180`) saat ini expose langsung ke publik — siapa pun yang tau IP-nya
bisa serang origin langsung, bypass Cloudflare sepenuhnya. Dokumen ini nutup celah itu.

Perubahan di `nginx.conf` dan `middleware.js` di repo ini (rate limiting, real IP dari
Cloudflare) **sudah otomatis aktif** begitu di-deploy — tapi baru efektif penuh setelah
langkah-langkah manual di bawah selesai (butuh akses dashboard Cloudflare & SSH VPS yang
gak saya punya).

## 1. Pindahkan DNS ke Cloudflare (kalau belum)

1. Daftar/login https://dash.cloudflare.com, **Add a Site** -> masukin `kasyaf.id`
2. Cloudflare akan scan DNS record yang ada — pastikan record ini ada dan **proxy status
   ORANYE (Proxied)**, bukan abu-abu (DNS only):
   ```
   A    console.kasyaf.id    103.92.215.180    Proxied (orange cloud)
   A    vector.kasyaf.id     103.92.215.180    Proxied (orange cloud)
   ```
3. Ganti nameserver domain `kasyaf.id` di registrar (tempat kamu beli domain) ke 2
   nameserver yang dikasih Cloudflare (misal `xxx.ns.cloudflare.com`). Propagasi bisa
   sampai 24 jam, biasanya < 1 jam.

## 2. SSL/TLS mode

Dashboard Cloudflare -> **SSL/TLS** -> Overview -> pilih **Full (strict)**.
(Bukan "Flexible" — origin sudah punya cert Let's Encrypt asli via certbot, jadi
"Full (strict)" paling aman: Cloudflare <-> origin tetap encrypted & tervalidasi.)

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

## 4. Kunci VPS: cuma terima trafik dari Cloudflare + IP kamu sendiri

Ini langkah PALING PENTING — tanpa ini, penyerang masih bisa langsung hit
`103.92.215.180:443` dan skip Cloudflare sepenuhnya.

SSH ke VPS, lalu (asumsi `ufw`, sesuaikan kalau pakai `iptables`/`firewalld`):

```bash
# reset dulu biar gak numpuk rule lama (hati-hati kalau ufw belum pernah dipakai,
# pastikan default policy allow SSH dulu sebelum enable biar gak ke-lock)
sudo ufw allow OpenSSH
sudo ufw allow from <IP_KAMU_SENDIRI> to any port 22

# izinkan 80/443 HANYA dari range IP Cloudflare (list resmi & auto-update):
# https://www.cloudflare.com/ips-v4 dan https://www.cloudflare.com/ips-v6
for ip in $(curl -s https://www.cloudflare.com/ips-v4); do
  sudo ufw allow from $ip to any port 80 proto tcp
  sudo ufw allow from $ip to any port 443 proto tcp
done
for ip in $(curl -s https://www.cloudflare.com/ips-v6); do
  sudo ufw allow from $ip to any port 80 proto tcp
  sudo ufw allow from $ip to any port 443 proto tcp
done

# hapus rule lama yang allow 80/443 dari "Anywhere" kalau ada
sudo ufw status numbered
sudo ufw delete <nomor rule "80,443 ALLOW Anywhere">

sudo ufw enable
sudo ufw status verbose
```

> Ganti IP Cloudflare berubah dari waktu ke waktu (jarang tapi ada). Kalau mau auto-update,
> jadwalkan script di atas jalan mingguan via cron, atau pakai `cloudflare-ufw` /
> `crowdsec` Cloudflare bouncer.

Port lain yang publicly exposed di docker-compose.yml (kalau ada, misal Redis/Qdrant
public port buat `REDIS_PUBLIC_HOST`) **TIDAK bisa** ditutup sama Cloudflare proxy (itu
cuma proteksi HTTP/HTTPS port 80/443). Untuk itu, tetap batasi lewat `ufw allow from
<IP customer tertentu>` per kasus, atau pasang di belakang VPN/allowlist IP terpisah.

## 5. Redeploy nginx.conf yang sudah di-update

```bash
cd ~/redis-mini
git pull origin main
docker compose exec nginx nginx -t   # validasi syntax dulu SEBELUM reload
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
```

Kalau `curl https://103.92.215.180` masih connect setelah firewall di-apply, double
check `ufw status` — kemungkinan masih ada rule lama yang allow "Anywhere".
