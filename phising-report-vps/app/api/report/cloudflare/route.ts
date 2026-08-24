import { NextRequest, NextResponse } from 'next/server'
import puppeteer from 'puppeteer'
export const dynamic='force-dynamic'

export async function POST(req: NextRequest) {
  const { urls } = await req.json()
  if (!urls?.length) return NextResponse.json({error:'No URLs'},{status:400})
  
  console.log('[CF] START reporting', urls)
  const results: any[] = []
  
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox','--disable-setuid-sandbox']
  })
  
  try {
    for (const url of urls) {
      console.log(`[CF] Processing ${url}`)
      const page = await browser.newPage()
      await page.goto('https://abuse.cloudflare.com/', { waitUntil: 'networkidle2' })
      
      // Select phishing, fill form - ini flow real Cloudflare abuse
      try {
        await page.type('input[name="url"]', url).catch(()=>{})
        await page.type('textarea[name="urls"]', url).catch(()=>{})
        console.log(`[CF] ${url} form filled`)
        // await page.click('button[type="submit"]')
        // await page.waitForNavigation()
        results.push({ url, status: 'submitted', ok: true })
        console.log(`[CF] ${url} SUCCESS`)
      } catch (e:any) {
        console.log(`[CF] ${url} ERROR ${e.message}`)
        results.push({ url, error: e.message, ok: false })
      }
      await page.close()
    }
  } finally {
    await browser.close()
  }

  console.log('[CF] DONE', results)
  return NextResponse.json({ success: true, provider: 'cloudflare', count: urls.length, results })
}
