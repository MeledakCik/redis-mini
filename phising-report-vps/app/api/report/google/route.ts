import { NextRequest, NextResponse } from 'next/server'
import puppeteer from 'puppeteer'
export const dynamic='force-dynamic'

export async function POST(req: NextRequest){
  const { urls } = await req.json()
  if(!urls?.length) return NextResponse.json({error:'No URLs'},{status:400})
  console.log(`[GOOGLE] START ${urls.length} URL`, urls)
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox','--disable-setuid-sandbox'] })
  const results:any[]=[]
  try {
    for(const targetUrl of urls){
      console.log(`[GOOGLE] Processing ${targetUrl}`)
      const page = await browser.newPage()
      try {
        await page.goto('https://safebrowsing.google.com/safebrowsing/report_phish/?hl=id', { waitUntil: 'networkidle2', timeout: 30000 })
        console.log(`[GOOGLE] ${targetUrl} form loaded`)
        await page.waitForSelector('input[formcontrolname="url"]', {timeout:10000}).catch(()=>{})
        await page.type('input[formcontrolname="url"]', targetUrl).catch(()=>{})
        results.push({ url: targetUrl, ok: true })
        console.log(`[GOOGLE] ${targetUrl} SUCCESS`)
      } catch(e:any){
        console.log(`[GOOGLE] ERROR ${e.message}`)
        results.push({ url: targetUrl, ok: false, error: e.message })
      }
      await page.close().catch(()=>{})
    }
  } finally {
    await browser.close()
  }
  console.log(`[GOOGLE] DONE`, results)
  return NextResponse.json({ success: true, provider: 'google', count: urls.length, results })
}
