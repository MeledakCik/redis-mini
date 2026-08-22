# Cara Apply Patch Ini ke redis-mini

Patch ini MENGGANTI payment gateway Midtrans dengan alur pembayaran manual
(transfer bank / QRIS statis) yang terdeteksi otomatis lewat mutasi rekening
(Moota), tanpa perlu approval admin manual. Notifikasi ke admin dikirim lewat
WhatsApp Business Platform (Cloud API) resmi Meta, murni informational.

## File yang dihapus
- lib/midtrans.js
- app/api/billing/webhook/route.js (endpoint Midtrans lama)

## File baru
- lib/manual-payment.js — info rekening/QRIS tujuan
- lib/orders-store.js — pending order dengan kode unik nominal
- lib/wa-notify.js — kirim notifikasi WA ke admin (Cloud API)
- app/api/billing/status/route.js — polling status order dari frontend
- app/api/billing/webhook/moota/route.js — terima notifikasi mutasi dari Moota

## File yang di-update
- app/api/billing/checkout/route.js — bikin pending order + nominal unik, bukan redirect Midtrans
- app/billing/page.js — tampilkan instruksi transfer & polling, bukan redirect
- middleware.js — bypass auth untuk `/api/billing/webhook/moota`
- lib/plan-store.js — komentar disesuaikan (logikanya tidak berubah)
- .env.example — ganti variabel MIDTRANS_* dengan PAYMENT_*/MOOTA_*/WA_*
- app/pricing/page.js — FAQ pembayaran disesuaikan (cek manual, hapus sebutan Midtrans)

## Setup sebelum deploy

### 1. Rekening / QRIS tujuan
Isi di `.env` (server, bukan `.env.example`):
```
PAYMENT_BANK_NAME=BCA
PAYMENT_BANK_ACCOUNT_NUMBER=1234567890
PAYMENT_BANK_ACCOUNT_NAME=PT Nama Kamu
PAYMENT_QRIS_IMAGE_URL=/qris.png
```
Upload gambar QRIS statis kamu ke `public/qris.png` (atau host di CDN lain dan
ganti `PAYMENT_QRIS_IMAGE_URL` ke URL absolut).

### 2. Moota (deteksi mutasi otomatis)
1. Daftar & hubungkan rekening bank kamu di https://app.moota.co
2. Dashboard > Integrasi > Webhook > Tambah Webhook, arahkan ke:
   ```
   https://console.kasyaf.id/api/billing/webhook/moota
   ```
3. Salin **Secret Token** yang ditampilkan, isi ke `.env`:
   ```
   MOOTA_WEBHOOK_SECRET=xxxxx
   ```
4. **Cek ulang** di dashboard Moota algoritma signature yang dipakai (HMAC-SHA256
   atas raw body, header `Signature`) — dokumentasi Moota bisa berubah dari waktu
   ke waktu, sebelum production pastikan cocok dengan `verifySignature()` di
   `app/api/billing/webhook/moota/route.js`.

### 3. WhatsApp Business Platform (Cloud API resmi Meta)
1. Buat WhatsApp Business Account di https://business.facebook.com, verifikasi nomor
2. Bikin Message Template kategori **UTILITY**, misal nama `pro_activated`, body:
   ```
   Pro plan aktif otomatis untuk {{1}}. Order {{2}}, nominal Rp{{3}}.
   ```
   Tunggu status **APPROVED** di Meta Business Manager.
3. Isi `.env`:
   ```
   WA_ACCESS_TOKEN=xxxxx
   WA_PHONE_NUMBER_ID=xxxxx
   WA_ADMIN_NUMBER=62812xxxxxxx
   WA_TEMPLATE_NAME=pro_activated
   WA_TEMPLATE_LANG=id
   ```

## Deploy
```bash
cd ~/redis-mini
docker compose up -d --build console
docker compose logs -f console
```

## Test end-to-end
1. Login → `/billing` → klik "Upgrade to Pro"
2. Muncul kartu instruksi transfer dengan nominal unik (mis. Rp149.123)
3. Transfer manual sejumlah persis nominal itu (atau simulasi lewat sandbox/test
   mutation Moota kalau tersedia)
4. Dalam beberapa detik–menit, Moota kirim webhook → Pro aktif otomatis di
   halaman (polling tiap 4 detik) → admin dapat WA notifikasi

## Yang TIDAK berubah
- Dockerfile, docker-compose.yml, nginx.conf
- lib/auth.js, lib/store.js, lib/vector-store.js, qdrant client
- lib/plan-store.js (logika expiry & aktivasi Pro tetap sama, cuma dipanggil
  dari sumber trigger yang beda)
