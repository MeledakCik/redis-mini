// lib/manual-payment.js — info rekening/QRIS tujuan yang ditampilkan ke user pas
// checkout. Ini BUKAN payment gateway: cuma nampilin nomor rekening/gambar QRIS statis
// milik kamu sendiri. Deteksi "sudah bayar"-nya dikerjakan Moota (baca lib/orders-store.js
// & app/api/billing/webhook/moota/route.js), bukan dari halaman ini.
export function getPaymentDestination() {
  return {
    bank: {
      bankName: process.env.PAYMENT_BANK_NAME || "BCA",
      accountNumber: process.env.PAYMENT_BANK_ACCOUNT_NUMBER || "",
      accountName: process.env.PAYMENT_BANK_ACCOUNT_NAME || "",
    },
    // URL gambar QRIS statis (upload sendiri ke /public, misal /public/qris.png)
    qrisImageUrl: process.env.PAYMENT_QRIS_IMAGE_URL || "/qris.png",
  };
}
