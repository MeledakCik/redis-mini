#!/usr/bin/env bash
# scripts/setup-cloudflare-ufw.sh — kunci VPS supaya port 80/443 (web console) HANYA bisa
# diakses lewat Cloudflare, sementara port 6379 (Redis) & 6333 (Qdrant) tetap terbuka untuk
# publik karena itu core fitur produk ini (customer connect LANGSUNG dari app mereka sendiri,
# lihat lib/redis-public-host.js & lib/qdrant-public-host.js) — proteksinya dari ACL
# password per-tenant, bukan dari firewall IP-range kayak 80/443.
#
# Jalankan ini di VPS (bukan di container), sebagai root/sudo:
#   sudo bash scripts/setup-cloudflare-ufw.sh
#
# WAJIB baca docs/CLOUDFLARE_SETUP.md dulu sebelum jalanin ini — terutama soal DNS record
# mana yang harus orange cloud (console.kasyaf.id, vector.kasyaf.id) vs yang WAJIB grey
# cloud (hostname Redis/Qdrant, mis. db.kasyaf.id), karena raw TCP DB gak bisa lewat proxy
# Cloudflare standar.

set -euo pipefail

if [ "$(id -u)" -ne 0 ]; then
  echo "Jalankan sebagai root/sudo: sudo bash $0" >&2
  exit 1
fi

if ! command -v ufw >/dev/null 2>&1; then
  echo "ufw belum terinstall. Install dulu: sudo apt-get update && sudo apt-get install -y ufw" >&2
  exit 1
fi

echo "== 1/5: Pastikan SSH gak ke-lock =="
ufw allow OpenSSH
read -rp "IP kamu sendiri buat akses SSH (kosongkan buat skip): " MY_IP
if [ -n "${MY_IP:-}" ]; then
  ufw allow from "$MY_IP" to any port 22 proto tcp
fi

echo "== 2/5: Allow port 80/443 HANYA dari IP range Cloudflare =="
# Daftar resmi & auto-update dari Cloudflare — WAJIB fetch fresh tiap jalanin script ini
# (bukan hardcode di script, karena range Cloudflare emang jarang tapi bisa berubah).
CF_IPV4_URL="https://www.cloudflare.com/ips-v4"
CF_IPV6_URL="https://www.cloudflare.com/ips-v6"

if ! curl -fsS "$CF_IPV4_URL" -o /tmp/cf-ipv4.txt; then
  echo "Gagal fetch $CF_IPV4_URL. Cek koneksi internet VPS, lalu jalankan ulang." >&2
  exit 1
fi
if ! curl -fsS "$CF_IPV6_URL" -o /tmp/cf-ipv6.txt; then
  echo "Gagal fetch $CF_IPV6_URL. Cek koneksi internet VPS, lalu jalankan ulang." >&2
  exit 1
fi

while IFS= read -r ip; do
  [ -z "$ip" ] && continue
  ufw allow from "$ip" to any port 80 proto tcp
  ufw allow from "$ip" to any port 443 proto tcp
done < /tmp/cf-ipv4.txt

while IFS= read -r ip; do
  [ -z "$ip" ] && continue
  ufw allow from "$ip" to any port 80 proto tcp
  ufw allow from "$ip" to any port 443 proto tcp
done < /tmp/cf-ipv6.txt

echo "== 3/5: Hapus rule lama yang allow 80/443 dari Anywhere (kalau ada) =="
echo "Cek manual dulu, lalu hapus rule nomor yang match 'Anywhere' di 80/443:"
ufw status numbered | grep -E "80|443" || true
echo "  -> sudo ufw delete <nomor rule>"
read -rp "Sudah dihapus semua rule 80/443 'Anywhere' yang lama? (y/n) " CONFIRM
if [ "$CONFIRM" != "y" ]; then
  echo "Selesaikan dulu manual, baru lanjut jalanin ufw enable." >&2
fi

echo "== 4/5: Redis (6379) & Qdrant (6333) TETAP TERBUKA untuk publik =="
# Ini SENGAJA, bukan celah keamanan yang kelewat — lihat header komentar di atas.
ufw allow 16379/tcp comment "Redis-as-a-Service, proteksi via ACL password per-tenant"
ufw limit 16379/tcp
ufw allow 6333/tcp comment "Qdrant vector DB, proteksi via token per-tenant"
echo "== 5/5: Enable ufw =="
ufw enable
ufw status verbose

cat <<'EOF'

Selesai. Verifikasi dari LUAR VPS:

  # harus GAGAL connect (timeout/refused) - port 80/443 gak lagi terima trafik "Anywhere"
  curl -m 5 https://103.92.215.180 -k

  # harus tetap jalan normal lewat domain (proxied Cloudflare)
  curl -I https://console.kasyaf.id

  # Redis/Qdrant tetap bisa diakses langsung by design:
  redis-cli -h db.kasyaf.id -p 6379 PING

Range IP Cloudflare jarang berubah tapi bisa saja berubah — jadwalkan script ini jalan
ulang berkala (mis. cron mingguan) biar rule ufw selalu sinkron dengan IP terbaru.
EOF
