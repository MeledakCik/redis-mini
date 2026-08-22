#!/usr/bin/env bash
# scripts/setup-cloudflare-ufw.sh
#
# Kunci VPS supaya port 80/443 cuma bisa diakses lewat Cloudflare (bukan langsung ke
# origin IP 103.92.215.180). SSH port TETAP dibuka (default 22, atau sesuaikan lewat
# variabel di bawah) supaya kamu gak ke-lock out dari server sendiri.
#
# List IP Cloudflare DIAMBIL DARI INTERNET (curl ke cloudflare.com/ips-v4 dan ips-v6) —
# jalankan script ini di VPS (yang punya akses internet), BUKAN dari environment yang
# internet-nya diblokir. Kalau kamu mau pin list statis tanpa fetch, edit CF_IPV4/CF_IPV6
# di bawah manual dari https://www.cloudflare.com/ips/.
#
# Usage:
#   sudo bash scripts/setup-cloudflare-ufw.sh
#   sudo SSH_ALLOW_IP=1.2.3.4 bash scripts/setup-cloudflare-ufw.sh   # batasi SSH ke IP kamu
#
set -euo pipefail

if [ "$(id -u)" -ne 0 ]; then
  echo "Jalankan sebagai root (sudo bash scripts/setup-cloudflare-ufw.sh)" >&2
  exit 1
fi

if ! command -v ufw >/dev/null 2>&1; then
  echo "ufw tidak ditemukan. Install dulu: sudo apt install ufw" >&2
  exit 1
fi

SSH_PORT="${SSH_PORT:-22}"
SSH_ALLOW_IP="${SSH_ALLOW_IP:-}"

echo "==> Mengizinkan SSH (port ${SSH_PORT}) sebelum enable ufw, biar gak ke-lock out..."
if [ -n "$SSH_ALLOW_IP" ]; then
  ufw allow from "$SSH_ALLOW_IP" to any port "$SSH_PORT" proto tcp
else
  ufw allow "${SSH_PORT}/tcp"
  echo "    (SSH_ALLOW_IP kosong — SSH dibuka untuk semua IP. Set SSH_ALLOW_IP=<ip kamu> untuk membatasi.)"
fi

echo "==> Fetch daftar IP Cloudflare terbaru..."
CF_IPV4="$(curl -fsS https://www.cloudflare.com/ips-v4)"
CF_IPV6="$(curl -fsS https://www.cloudflare.com/ips-v6)"

if [ -z "$CF_IPV4" ]; then
  echo "Gagal fetch ips-v4 dari cloudflare.com — cek koneksi internet VPS." >&2
  exit 1
fi

echo "==> Mengizinkan port 80/443 HANYA dari range IP Cloudflare..."
for ip in $CF_IPV4; do
  ufw allow from "$ip" to any port 80 proto tcp
  ufw allow from "$ip" to any port 443 proto tcp
done
for ip in $CF_IPV6; do
  ufw allow from "$ip" to any port 80 proto tcp
  ufw allow from "$ip" to any port 443 proto tcp
done

echo ""
echo "==> Rule ufw saat ini (cek manual apa masih ada 'Anywhere' untuk 80/443 dan hapus):"
ufw status numbered

echo ""
echo "==> Kalau sudah yakin gak ada rule lama yang allow 80/443 dari Anywhere, jalankan:"
echo "      sudo ufw default deny incoming"
echo "      sudo ufw default allow outgoing"
echo "      sudo ufw enable"
echo ""
echo "==> Verifikasi setelah enable:"
echo "      curl -m 5 https://103.92.215.180 -k     # harus GAGAL connect (timeout/refused)"
echo "      curl -I https://console.kasyaf.id        # harus tetap jalan normal"
echo ""
echo "Catatan: IP Cloudflare jarang berubah tapi bisa update — jadwalkan script ini"
echo "jalan ulang mingguan via cron kalau mau auto-refresh."
