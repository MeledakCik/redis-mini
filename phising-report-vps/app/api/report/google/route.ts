import { NextRequest, NextResponse } from 'next/server'
import puppeteer from 'puppeteer'

export const dynamic = 'force-dynamic'

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

const REPORT_DETAILS = [
  "Saya melaporkan URL ini karena terindikasi sebagai situs yang tidak aman dan berpotensi melakukan phishing atau penipuan. Mohon dilakukan verifikasi lebih lanjut.",
  "Situs ini terdeteksi memuat konten berbahaya yang berpotensi merugikan pengguna. Harap segera ditindaklanjuti.",
  "Indikasi kuat situs phishing / penipuan. Halaman ini mencoba mengelabui pengunjung untuk mengambil data sensitif secara ilegal.",
  "URL ini terdeteksi menyebarkan malware atau aktivitas mencurigakan yang melanggar kebijakan keamanan web."
]

function getRandomDetail() {
  return REPORT_DETAILS[Math.floor(Math.random() * REPORT_DETAILS.length)]
}

export async function POST(req: NextRequest) {
  try {
    const { urls } = await req.json()
    if (!urls?.length) return NextResponse.json({ error: 'No URLs provided' }, { status: 400 })

    console.log(`[GOOGLE] START processing ${urls.length} URL(s)...`, urls)

    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-blink-features=AutomationControlled']
    })

    const results: any[] = []

    try {
      for (const targetUrl of urls) {
        const page = await browser.newPage()
        await page.setViewport({ width: 1366, height: 768 })

        try {
          await page.goto('https://safebrowsing.google.com/safebrowsing/report_phish/?hl=id', {
            waitUntil: 'networkidle2',
            timeout: 30000
          })

          // 1. Ketik URL
          await page.waitForSelector('input[formcontrolname="url"]', { timeout: 10000 })
          await page.type('input[formcontrolname="url"]', targetUrl, { delay: 40 })

          // 2. Ketik Detail Laporan
          const detail = getRandomDetail()
          await page.type('textarea[formcontrolname="details"]', detail, { delay: 20 })
          await sleep(1000)

          // 3. Klik Tombol Submit
          const submitted = await page.evaluate(() => {
            const btn = Array.from(document.querySelectorAll('button')).find((b) => {
              const txt = b.textContent?.toLowerCase() || ''
              return (txt.includes('kirim') || txt.includes('submit')) && !b.disabled
            })
            if (btn) {
              ;(btn as HTMLElement).click()
              return true
            }
            return false
          })

          if (!submitted) throw new Error('Tombol Submit tidak ditemukan atau disabled')

          await sleep(3000)

          // 4. Verifikasi Status & Ambil Screenshot Bukti
          const currentUrl = page.url()
          const pageContent = await page.content()
          const isSuccess = currentUrl.includes('thanks') || pageContent.includes('berhasil') || pageContent.includes('diterima')

          const screenshot = (await page.screenshot({ encoding: 'base64', type: 'jpeg', quality: 60 })) as string

          results.push({
            url: targetUrl,
            ok: isSuccess,
            status: isSuccess ? 'SUCCESS' : 'SUBMITTED',
            proof: 'Google Safe Browsing',
            screenshot: `data:image/jpeg;base64,${screenshot}`
          })
        } catch (e: any) {
          console.error(`[GOOGLE] Error processing ${targetUrl}:`, e.message)
          results.push({
            url: targetUrl,
            ok: false,
            error: e.message,
            proof: 'Google Safe Browsing (Failed)',
            screenshot: null
          })
        } finally {
          await page.close().catch(() => {})
        }
      }
    } finally {
      await browser.close()
    }

    return NextResponse.json({ success: true, provider: 'google', count: urls.length, results })
  } catch (e: any) {
    console.error(`[GOOGLE] FATAL ERROR`, e)
    return NextResponse.json({ success: false, error: e.message }, { status: 500 })
  }
}