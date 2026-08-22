// lib/wa-notify.js — kirim notifikasi WA ke admin pakai WhatsApp Business Platform
// (Cloud API) resmi dari Meta. Ini MURNI notifikasi (fire-and-forget) buat admin
// tau ada Pro baru yang aktif otomatis — bukan approval gate, karena aktivasi Pro
// sudah terjadi duluan begitu webhook Moota konfirmasi mutasi masuk (lihat
// app/api/billing/webhook/moota/route.js). Kalau WA gagal kirim, plan tetep aktif.
//
// Kenapa harus pakai template message (bukan free-text biasa):
// WhatsApp Cloud API cuma izinin bisnis kirim free-text ke user dalam "24-hour
// customer service window" (setelah user chat duluan ke nomor bisnis kamu). Buat
// notifikasi yang DIMULAI oleh sistem (business-initiated), WAJIB pakai Message
// Template yang sudah dibuat & di-approve di Meta Business Manager terlebih dulu.
// https://developers.facebook.com/docs/whatsapp/cloud-api/guides/send-message-templates
//
// Setup yang perlu disiapkan sebelum ini jalan:
// 1. WhatsApp Business Account + nomor terverifikasi di business.facebook.com
// 2. Bikin Message Template (kategori UTILITY) misal "pro_activated" dengan body:
//    "Pro plan aktif otomatis untuk {{1}}. Order {{2}}, nominal Rp{{3}}."
//    lalu tunggu status APPROVED (biasanya cepat buat template utility sederhana).
// 3. Isi env: WA_ACCESS_TOKEN, WA_PHONE_NUMBER_ID, WA_ADMIN_NUMBER (format 62xxxx,
//    tanpa +/spasi), WA_TEMPLATE_NAME (default "pro_activated"), WA_TEMPLATE_LANG
//    (default "id" — sesuaikan dengan bahasa yang dipilih pas bikin template).

const GRAPH_VERSION = "v21.0";

function graphUrl(phoneNumberId) {
  return `https://graph.facebook.com/${GRAPH_VERSION}/${phoneNumberId}/messages`;
}

/**
 * Kirim notifikasi WA ke admin pakai approved message template.
 * @param {object} params
 * @param {string[]} params.bodyParams - nilai buat {{1}}, {{2}}, dst di template, urut.
 */
export async function sendWaTemplateToAdmin({ bodyParams = [] } = {}) {
  const token = process.env.WA_ACCESS_TOKEN;
  const phoneNumberId = process.env.WA_PHONE_NUMBER_ID;
  const adminNumber = process.env.WA_ADMIN_NUMBER;
  const templateName = process.env.WA_TEMPLATE_NAME || "pro_activated";
  const templateLang = process.env.WA_TEMPLATE_LANG || "id";

  if (!token || !phoneNumberId || !adminNumber) {
    console.warn("WA notify dilewati: WA_ACCESS_TOKEN/WA_PHONE_NUMBER_ID/WA_ADMIN_NUMBER belum diisi di .env");
    return { skipped: true };
  }

  const payload = {
    messaging_product: "whatsapp",
    to: adminNumber,
    type: "template",
    template: {
      name: templateName,
      language: { code: templateLang },
      components: bodyParams.length
        ? [
            {
              type: "body",
              parameters: bodyParams.map((text) => ({ type: "text", text: String(text) })),
            },
          ]
        : [],
    },
  };

  try {
    const res = await fetch(graphUrl(phoneNumberId), {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      console.error("WA notify gagal:", res.status, JSON.stringify(data));
      return { ok: false, error: data };
    }
    return { ok: true, data };
  } catch (err) {
    console.error("WA notify error:", err.message);
    return { ok: false, error: err.message };
  }
}

// Helper spesifik buat event "Pro aktif otomatis" — dipanggil dari webhook Moota.
export async function notifyAdminProActivated({ email, orderId, grossAmount }) {
  return sendWaTemplateToAdmin({
    bodyParams: [email, orderId, grossAmount.toLocaleString("id-ID")],
  });
}
