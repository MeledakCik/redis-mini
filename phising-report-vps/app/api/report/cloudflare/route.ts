import { NextRequest } from 'next/server'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 60

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))
const getRandom = (a: any[]) => a[Math.floor(Math.random() * a.length)]
const capitalize = (str: string) => str.charAt(0).toUpperCase() + str.slice(1)

// List nama dari Gist maulvi/nama.txt
const RAW_NAMES = [
  "aan","abdul","abdullah","abidin","abie","achmad","adam","ade","adhi","adhitya","adi","adinda","adipati","adit","aditia","aditya","adityo","adrian","adriani","adyafni","afriani","afrizal","agnes","agung","agus","agustian","agustin","agustina","agustini","agustinus","ahmad","aini","aisyah","ajeng","aji","ajie","akbar","akhmad","alam","alamsyah","alex","alfian","ali","alif","amalia","amanda","ambar","ambarwati","amelia","amin","aminah","amir","amri","ana","anak","ananda","anang","anastasia","andhika","andi","andika","andina","andini","andre","andreas","andri","andrian","andriana","andriani","andriyani","andry","andy","angelia","angelina","angga","anggara","anggi","anggia","anggit","anggita","anggoro","anggraeni","anggraini","anggun","ani","anik","anindita","anisa","anisa","anita","anjar","anna","annisa","anton","antonius","anugrah","anwar","apriani","aprianto","aprilia","apriyani","apriyanti","ardi","ardian","ardiansyah","ari","aria","ariani","arie","arief","aries","arif","arifa","arifah","arifin","arini","ario","aris","arisandi","arista","ariyani","ariyanti","ariyanto","artha","arum","ary","arya","aryani","aryo","asep","asih","asmara","asri","asti","astri","astria","astrid","astuti","atika","tika","aulia","ayu","ayuningtyas","azhar","azhari","azis","aziz","azizah","azmi",
  "bagus","bahri","baiq","bambang","bangun","baskoro","bayu","benny","betty","bima","bintang","bobby","budi","budiman","bunga","cahya","cahyadi","cahyani","cahyo","cahyono","candra","carolina","catur","chandra","christian","christie","christin","christina","christine","christy","cindy","cinta","citra","cut",
  "dadang","dahlia","damayanti","danang","dani","daniel","danu","darma","darmawan","david","deasy","debby","debora","deddy","dede","dedi","dedy","deni","denny","deny","deri","derry","desi","dessy","desti","desty","desy","devi","devita","devy","dewa","dewi","dhani","dharma","dhian","diah","dian","diana","dicky","didi","didik","dika","dimas","dina","dinar","dinda","dini","dita","diyah","dodi","dody","dona","doni","donny","dono","dony","dwi","dyah","dyan",
  "eddy","edi","edwin","edy","efendi","effendi","eka","ekawati","eko","elfrida","eli","elisa","elisabeth","eliza","elly","elsa","ema","emi","emy","endah","endang","eni","eny","era","eri","erik","erika","erlina","erma","erna","ernawati","erni","ervina","erwin","ester","esti","eva","evie","vy",
  "fadli","fahmi","faisal","faizah","faizal","fajar","fajri","fanny","farah","farid","farida","fatimah","fatmawati","fauzan","fauzi","fauzia","fauziah","febri","febrian","febriana","febriani","febrianti","febrianto","febrina","febriyanti","fenny","fera","feri","fernando","ferry","fika","fikri","fina","firdaus","firman","firmansyah","fitra","fitrah","fitri","fitria","fitriah","fitriana","fitriani","fitriyani","fransisca","fransiska","frida","friska","fuad",
  "galih","galuh","gede","gilang","gina","ginanjaer","ginting","gita","grace","gultom","gunawan","guntur","gusti",
  "hadi","hajar","hakim","halim","hana","handayani","handoko","hani","hanif","hanifah","hannah","hanny","hanum","happy","hapsari","harahap","hari","haris","harry","hartanto","hartati","hartono","hary","haryanto","haryo","hasan","hasanah","hasibuan","hastuti","hayati","helmi","hendi","hendra","hendri","hendrik","hendro","hendy","heni","henny","henry","herawati","heri","herlina","herman","hermanto","hermawan","herry","heru","hery","hesti","hidayah","hidayat","hidayati","hikmah","hilda","himawan","huda","husna","husni","husnul","hutabarat","ibnu","ibrahim","ida","ihsan","iini","isik","aike","ikhsan","ilham","ima","imam","iman","imelda","ina","indah","indra","indrawan","indrawati","indri","indriani","indriyani","intan","iqbal","ira","irawan","irawati","irene","irfan","irma","irna","irvan","irwan","iskandar","isma","ismail","isnaini","istiqomah","ita","ivan","iwan",
  "jannah","januar","jati","jaya","jayanti","johan","joko","jonatan","juli","julia","juliana","julianti","juni","junita","juwita",
  "kadek","karina","karlina","kartika","kartikasari","kartini","ketut","khairul","khairunnisa","kharisma","khotimah","kiki","komalasari","komang","krisna","kristina","kukuh","kumala","kumalasari","kurnia","kurniasari","kurniasih","kurniati","kurniawan","kurniawati","kusuma","kusumastuti","kusumawati",
  "laila","laili","lala","larasati","latifah","laura","leni","lenny","leny","leonardo","lestari","lia","lidia","lidya","lilik","lilis","lina","linda","lis","listya","lita","liza","lubis","lucky","luh","lukman","lumban","luqman","lusiana","lutfi","luthfi","lydia",
  "made","magdalena","maharani","mahardika","mahendra","mandasari","manik","manurung","mardiana","margaretha","maria","mariana","marina","marisa","marissa","marlina","marta","martha","martin","martina","maryati","mas","maulana","maulida","maulina","maya","mayang","mayasari","mega","megasari","megawati","mei","meita","melati","melinda","melisa","merry","meutia","mia","michael","miftahul","mila","mira","miranti","mirza","mita","moch","mochamad","mochammad","moh","mohamad","mohammad","monica","muchamad","muh","muhamad","muhammad","mukti","mulia","mulya","mulyani","murni","murtini","muslim","mustika","mutia","mutiara","muttaqin",
  "nadia","nadya","nana","nang","nanda","nani","nanik","napitupulu","nasution","natalia","nelly","neni","nini","aniken","ilanin","aningrum","ningsih","nirmala","nisa","nita","nono","nino","or","nor","norma","novalia","novi","novia","noviana","noviani","novianti","novita","novitasari","noviyanti","nugraha","nugraheni","nugroho","nur","nuraeni","nuraini","nurhasanah","nurhayati","nurina","nurjanah","nurmala","nurul","nyoman",
  "octavia","octaviani","okta","oktarina","oktavia","oktaviana","oktaviani","olivia",
  "palupi","pamungkas","pandu","panjaitan","panji","paramita","paramitha","parulian","pasaribu","perdana","permana","permata","permatasari","pertiwi","peter","pipit","piter","poppy","prabowo","pradana","pradipta","pramita","pramono","prasetya","prasetyo","pratama","pratiwi","pratomo","pribadi","prima","prita","priyo","puji","purba","puri","purnama","purnamasari","purnomo","purwaningsih","purwanti","purwanto","puspa","puspasari","puspita","puspitasari","puti","putra","putri","putro","putu",
  "rachma","rachmad","rachman","rachmat","rachmawati","raden","raditya","ragil","rahadian","rahayu","rahma","rahmad","rahmadhani","rahmah","rahman","rahmat","rahmawati","rahmi","rama","ramadhan","ramadhani","randy","rangga","rani","rara","rasyid","ratih","ratna","ratnasari","ratnawati","ratri","ratu","regina","rendy","reni","renny","reny","resti","restu","retno","reza","rian","riana","riani","ricky","ridha","ridho","ridwan","rifki","rika","riki","marina","rinaldi","rini","rio","riri","ririn","risa","riska","riski","risky","risma","risna","rita","riyadi","riyanto","riza","rizal","rizka","rizki","rizky","rizqi","robby","romi","romy","ronald","roni","rony","roro","rosa","rosalina","rosdiana","rosita","roy","roza","rudi","rudy","rully","ruth","ryan",
  "safitri","sahat","sakti","salman","samuel","sandi","sandra","sandy","sani","sanjay","santi","santoso","santy","sapta","sapto","saputra","saputri","saputro","saragih","sarah","saraswati","sari","sartika","satria","satrio","satya","saviti","sekar","selly","sembiring","senja","septi","septian","septiana","septiani","setia","setiadi","setiawan","setiawati","seto","setya","setyaningsih","setyawan","setyo","setyowati","shinta","siagian","siahaan","sigit","sihombing","silalahi","silvia","simanjuntak","simatupang","simbolon","sinaga","singgih","sinta","sirait","siregar","siska","sitanggang","siti","sitompul","sitorus","sittu","slamet","sofia","sofyan","soraya","sri","suci","sugeng","sukma","sukmawati","sulastri","sulistyo","sulistyowati","sundari","supriyanto","surya","suryadi","suryani","suryo","susanti","susanto","susi","susilo","susilowati","sutrisno","syafitri","syah","syahputra","syahrul","syaiful","syam","syamsul","syarif","syarifah",
  "tambunan","tampubolon","tanjung","tantri","tarigan","taufan","taufik","taufiq","teguh","theresia","tia","tiara","tika","tirta","tita","titik","titin","titis","tommy","toni","tri","triana","triana","trisna","trisnawati","tua","tulus","tuti","tyas",
  "ulfa","ulfah","umar","umi","uswatun","utami","utami","utari","utomo",
  "vera","veronica","veronika","vidya","vina","vita","vivi",
  "wahyu","wahyudi","wahyuni","wahyuningsih","wanda","wardani","wardhana","wardhani","wati","wawan","wayan","wenny","wibisono","wibowo","wicaksono","widhi","widi","widia","widiastuti","widodo","widya","widyaningrum","widyastuti","wijaya","wijayanti","wijayanto","willy","wina","winda","windi","windy","wira","wirawan","wisnu","wiwik","wiwin","wulan","wulandari","wulansari","wuri",
  "yanti","yanto","yanuar","yayuk","yeni","yenni","yenny","yoga","yogi","yohana","yohanes","yolanda","yuanita","yuda","yudha","yudhi","yudi","yuli","yulia","yuliana","yuliani","yulianti","yulianto","yulita","yuni","yunia","yuniar","yuniarti","yunita","yusnita","yusuf","yuyun",
  "zainal","zulfikar"
]

const REPORTER_TITLES = [
  "Cyber Security Analyst", "Threat Intelligence Researcher", 
  "Information Security Officer", "SOC Analyst", "Security Engineer"
]
const REPORTER_COMPANIES = [
  "Sentinel Security ID", "Indo Threat Defense", 
  "Nusantara Cyber Labs", "BelajarNet Security Research"
]
const EMAIL_DOMAINS = ["sentinel-id.net", "belajarnet.biz.id", "threat-intel.or.id"]

function generateIndonesianName() {
  const count = Math.random() > 0.4 ? 2 : 3
  const parts = []
  for (let i = 0; i < count; i++) {
    parts.push(capitalize(getRandom(RAW_NAMES)))
  }
  return parts.join(" ")
}

function generateEmail(name: string) {
  const cleanName = name.toLowerCase().replace(/[^a-z]/g, "")
  const domain = getRandom(EMAIL_DOMAINS)
  return `${cleanName}${Math.floor(Math.random() * 89 + 10)}@${domain}`
}

async function fillInputFull(page: any, selector: string, text: string) {
  await page.waitForSelector(selector, { visible: true, timeout: 15000 })
  await page.evaluate((sel: string, val: string) => {
    const el: any = document.querySelector(sel)
    if (!el) return
    el.focus()
    const prototype = el.tagName === "TEXTAREA" 
      ? (window as any).HTMLTextAreaElement.prototype 
      : (window as any).HTMLInputElement.prototype
    const setter = Object.getOwnPropertyDescriptor(prototype, "value")?.set
    if (setter) setter.call(el, val)
    else el.value = val

    el.dispatchEvent(new Event('input', { bubbles: true }))
    el.dispatchEvent(new Event('change', { bubbles: true }))
  }, selector, text)
  await sleep(100)
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({ urls: [] }))
  const urls: string[] = body.urls || []

  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      const sendLog = (data: any) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))
      }

      if (!urls || urls.length === 0) {
        sendLog({ type: 'error', message: 'No URLs provided' })
        controller.close()
        return
      }

      let browser: any = null
      try {
        sendLog({ type: 'step', step: 'Memulai Chromium Puppeteer...' })
        const { connect } = eval("require")('puppeteer-real-browser')
        const conn = await connect({
          headless: false,
          turnstile: true,
          args: [
            "--start-maximized",
            "--disable-blink-features=AutomationControlled",
            "--disable-features=Translate",
            "--no-sandbox",
            "--disable-dev-shm-usage"
          ],
          connectOption: { defaultViewport: null }
        })

        browser = conn.browser
        const page = conn.page

        for (const url of urls) {
          const name = generateIndonesianName()
          const email = generateEmail(name)
          const title = getRandom(REPORTER_TITLES)
          const company = getRandom(REPORTER_COMPANIES)
          const justification = "URL ini teridentifikasi melakukan aktivitas phishing aktif dengan meniru antarmuka login resmi."
          const comment = "Laporan dibuat berdasarkan hasil audit keamanan dan deteksi ancaman real-time."

          sendLog({
            type: 'step',
            step: `Buka Form Cloudflare Abuse...`,
            formData: { name, email, company, title }
          })

          await page.goto('https://abuse.cloudflare.com/phishing', { waitUntil: 'domcontentloaded', timeout: 20000 })
          await page.waitForSelector('input[name="name"]', { visible: true, timeout: 10000 })

          sendLog({ 
            type: 'step', 
            step: `Mengisi Form (${name} - ${email})...`,
            formData: { name, email, company, title }
          })

          await fillInputFull(page, 'input[name="name"]', name)
          await fillInputFull(page, 'input[name="email"]', email)
          await fillInputFull(page, 'input[name="email2"]', email)
          await fillInputFull(page, 'input[name="title"]', title)
          await fillInputFull(page, 'input[name="company"]', company)
          await fillInputFull(page, 'textarea[name="urls"]', url)
          await fillInputFull(page, 'textarea[name="justification"]', justification)

          sendLog({ type: 'step', step: `Memilih Negara (Indonesia)...` })
          const countryBtn = await page.$('button[aria-label="Reporter current country"]')
          if (countryBtn) {
            await countryBtn.click().catch(() => {})
            await sleep(300)
            await page.evaluate(() => {
              const options = Array.from(document.querySelectorAll('div[role="option"]'))
              const target = options.find(opt => opt.textContent?.trim() === 'Indonesia') as any
              if (target) target.click()
            }).catch(() => {})
          }

          await fillInputFull(page, 'textarea[name="comments"]', comment)

          await page.evaluate(() => {
            const labels = Array.from(document.querySelectorAll('label'))
            const dsa = labels.find(l => l.textContent?.includes('DSA certification')) as any
            if (dsa) dsa.click()
          }).catch(() => {})

          sendLog({ type: 'step', step: `Menunggu Turnstile Captcha diselesaikan...` })
          await page.waitForFunction(() => {
            const btn = document.querySelector('button[type="submit"]') as HTMLButtonElement
            if (!btn) return false
            return !btn.disabled && !btn.classList.contains('opacity-50')
          }, { timeout: 25000, polling: 500 }).catch(() => {})

          await sleep(500)

          sendLog({ type: 'step', step: `Mengklik tombol Submit...` })
          await page.evaluate(() => {
            const submitBtn = document.querySelector('button[type="submit"]') as HTMLButtonElement
            if (submitBtn) submitBtn.click()
          }).catch(() => {})

          await sleep(3000)

          sendLog({ type: 'step', step: `Menganalisis hasil respons...` })
          const responseText = await page.evaluate(() => {
            const bodyText = document.body.innerText || ""
            const is400 = bodyText.includes("status 400") || bodyText.includes("maximum number of reports") || bodyText.includes("already submitted")
            const is429 = bodyText.includes("status 429") || bodyText.includes("Too Many Requests")
            const isSuccess = bodyText.toLowerCase().includes("thank you") || bodyText.toLowerCase().includes("received")

            if (isSuccess) return "SUCCESS_THANK_YOU"
            if (is400) return "DUPLICATE_MAX_REPORTS_400"
            if (is429) return "RATE_LIMITED_429"
            return bodyText.length > 0 ? "SUBMITTED" : "UNKNOWN_RESPONSE"
          })

          let proofText = "Form Submitted"
          let isOk = true

          if (responseText === "SUCCESS_THANK_YOU") proofText = "Laporan berhasil dikirim (Thank You)"
          else if (responseText === "DUPLICATE_MAX_REPORTS_400") proofText = "Domain telah mencapai batas laporan (HTTP 400)"
          else if (responseText === "RATE_LIMITED_429") { proofText = "Terkena limit rate request (HTTP 429)"; isOk = false; }

          sendLog({
            type: 'done',
            url,
            ok: isOk,
            proof: proofText,
            formData: { name, email, company, title }
          })
        }

        if (browser) await browser.close().catch(() => {})
      } catch (e: any) {
        if (browser) await browser.close().catch(() => {})
        sendLog({ type: 'error', message: e.message })
      }
      controller.close()
    }
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive'
    }
  })
}
