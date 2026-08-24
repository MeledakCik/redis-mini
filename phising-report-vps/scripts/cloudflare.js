const { connect } = require("puppeteer-real-browser");
const fs = require("fs");

// ======================================================
// KONFIGURASI UTAMA
// ======================================================
const FILE_PATH = "./phishing_urls.txt";
const LOG_PATH = "./reported_urls.txt";
const SKIPPED_LOG_PATH = "./skipped_urls.txt";
const CLOUDFLARE_PHISHING_URL = "https://abuse.cloudflare.com/phishing";
const DELAY_BETWEEN_URLS = 12000;
const BROWSER_ARGS = [
    "--start-maximized",
    "--disable-blink-features=AutomationControlled",
    "--disable-features=Translate",
    "--no-sandbox",
    "--disable-dev-shm-usage",
    "--translate-script-url=''",
    "--test-type",                           // Sembunyikan info bar warning (--no-sandbox dsb)
    "--disable-infobars",                    // Sembunyikan infobar tambahan
    "--ignore-certificate-errors"
];

// ======================================================
// GENERATOR DATA PELAPOR DINAMIS
// ======================================================
const REPORTER_NAMES = [
    "Muhammad Kasyaf",
    "Kasyaf Anugrah",
    "M. Kasyaf A.",
    "Kasyaf Cyber Sec",
    "Cikawan Security",
    "Kasyaf Threat Hunter",
    "M. K. Anugrah",
    "Kasyaf Team"
];

const REPORTER_TITLES = [
    "Cyber Security Analyst",
    "Threat Intelligence Researcher",
    "Information Security Officer",
    "SOC Analyst",
    "Security Engineer",
    "Vulnerability Assessment Specialist",
    "Incident Response Lead",
    "Digital Forensics Investigator",
    "Cyber Threat Hunter",
    "IT Risk & Security Consultant"
];

const REPORTER_COMPANIES = [
    "Sentinel Security ID",
    "Indo Threat Defense",
    "Nusantara Cyber Labs",
    "Cyber Sentinel Defense",
    "BelajarNet Security Research",
    "SecOps Shield",
    "Nusantara Threat Intel",
    "Apex Cyber Security",
    "Vanguard Security Team",
    "Global Cyber Defense Init"
];

const EMAIL_DOMAINS = [
    "sentinel-id.net",
    "kasyaf-cv.my.id",
    "belajarnet.biz.id",
    "threat-intel.or.id",
    "secops-research.com",
    "cyberguard.co.id",
    "defense-labs.net"
];

const EMAIL_PREFIXES = [
    "security",
    "abuse",
    "cert",
    "threat-report",
    "soc",
    "compliance",
    "incident",
    "info-sec"
];

const USER_AGENTS = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:127.0) Gecko/20100101 Firefox/127.0",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36 Edg/126.0.0.0"
];

function getRandomItem(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

function generateRandomReporter() {
    const name = getRandomItem(REPORTER_NAMES);
    const title = getRandomItem(REPORTER_TITLES);
    const company = getRandomItem(REPORTER_COMPANIES);
    const prefix = getRandomItem(EMAIL_PREFIXES);
    const domain = getRandomItem(EMAIL_DOMAINS);
    const email = `${prefix}@${domain}`;
    const userAgent = getRandomItem(USER_AGENTS);

    return {
        name,
        email,
        title,
        company,
        userAgent,
        country: "Indonesia"
    };
}

const REPORT_DETAILS_LIST = [
    "URL ini teridentifikasi melakukan aktivitas phishing aktif dengan meniru antarmuka login resmi.",
    "Halaman web ini terindikasi memanen kredensial pengguna secara ilegal tanpa izin.",
    "Terdeteksi adanya formulir login palsu yang dirancang untuk mencuri data sensitif pengunjung.",
    "Situs ini terbukti meng-host materi phishing yang mengelabui korban untuk memasukkan kata sandi.",
    "Terdapat bukti visual dan teknis bahwa domain ini digunakan sebagai landing page phishing.",
    "Domain ini mengarahkan pengguna ke halaman pencurian kredensial akun keuangan dan email.",
    "Halaman ini meniru brand ternama untuk memancing data pribadi dan akun rahasia pengunjung.",
    "Ditemukan indikasi kuat fraud dan credential harvesting pada direktori URL yang dilaporkan."
];

const COMMENTS_LIST = [
    "Laporan dibuat berdasarkan hasil audit keamanan dan deteksi ancaman real-time.",
    "Mohon diproses penanganannya untuk melindungi pengguna internet dari potensi kerugian.",
    "Verifikasi lanjutan dapat dilakukan dengan menganalisis traffic dan landing page terlampir."
];

// ======================================================
// HELPER FUNCTIONS
// ======================================================
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function appendLog(file, url) {
    fs.appendFileSync(file, `${url}\n`, "utf8");
}

function loadHistoryUrls() {
    const history = new Set();
    [LOG_PATH, SKIPPED_LOG_PATH].forEach(file => {
        if (fs.existsSync(file)) {
            const content = fs.readFileSync(file, "utf8");
            content.split(/\r?\n/).map(l => l.trim()).filter(Boolean).forEach(u => history.add(u));
        }
    });
    return history;
}

function loadUrls() {
    if (!fs.existsSync(FILE_PATH)) {
        throw new Error(`File "${FILE_PATH}" tidak ditemukan.`);
    }
    return [...new Set(
        fs.readFileSync(FILE_PATH, "utf8")
        .split(/\r?\n/)
        .map(line => line.trim())
        .filter(line => line.length > 0 && !line.startsWith("#"))
    )];
}

async function isUrlAlive(targetUrl, userAgent) {
    console.log(`[?] Memeriksa status keberadaan URL...`);
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000);
        const response = await fetch(targetUrl, {
            method: "HEAD",
            signal: controller.signal,
            headers: { "User-Agent": userAgent }
        });
        clearTimeout(timeoutId);
        return response.status >= 200 && response.status < 400;
    } catch (err) {
        return false;
    }
}

// ======================================================
// PENGISIAN INPUT REACT SECARA UTUH DAN FULL
// ======================================================
async function fillInputFull(page, selector, text) {
    await page.waitForSelector(selector, { visible: true, timeout: 15000 });
    
    await page.evaluate((sel, val) => {
        const el = document.querySelector(sel);
        if (!el) return;

        el.focus();
        const prototype = el.tagName === "TEXTAREA" 
            ? window.HTMLTextAreaElement.prototype 
            : window.HTMLInputElement.prototype;
            
        const setter = Object.getOwnPropertyDescriptor(prototype, "value")?.set;
        if (setter) {
            setter.call(el, val);
        } else {
            el.value = val;
        }

        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
    }, selector, text);

    await sleep(200);

    const currentValue = await page.$eval(selector, el => el.value);
    if (currentValue !== text) {
        await page.click(selector);
        await page.evaluate(sel => { document.querySelector(sel).value = ''; }, selector);
        await page.type(selector, text, { delay: 10 });
    }

    await page.evaluate(sel => {
        const el = document.querySelector(sel);
        if (el) el.dispatchEvent(new Event('blur', { bubbles: true }));
    }, selector);

    await sleep(300);
}

// ======================================================
// AUTO-RELOAD JIKA HALAMAN BLANK PUTIH
// ======================================================
async function ensurePageLoaded(page, maxRetries = 3) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        console.log(`[+] Mengakses Cloudflare Form (Attempt ${attempt}/${maxRetries})...`);
        try {
            await page.goto(CLOUDFLARE_PHISHING_URL, { waitUntil: "domcontentloaded", timeout: 30000 });
            await page.waitForSelector('input[name="name"]', { visible: true, timeout: 8000 });
            console.log("[✓] Form berhasil dimuat!");
            return true;
        } catch (e) {
            console.log(`[!] Halaman masih blank/lambat. Melakukan Reload...`);
            await page.goto("about:blank").catch(() => {});
            await sleep(1500);
        }
    }
    return false;
}

// ======================================================
// SUBMIT HANDLER & TURNSTILE / ERROR MODAL SOLVER
// ======================================================
async function waitForTurnstileAndSubmit(page, currentUrl) {
    console.log("[+] Mensimulasikan pergerakan kursor untuk Turnstile...");

    await page.mouse.move(200, 300);
    await sleep(300);
    await page.mouse.move(500, 400);
    await sleep(500);

    try {
        await page.waitForFunction(() => {
            const btn = document.querySelector('button[type="submit"]');
            if (!btn) return false;
            const isDisabled = btn.disabled || btn.hasAttribute('disabled');
            const isOpacityLow = btn.classList.contains('opacity-50');
            return !isDisabled && !isOpacityLow;
        }, { timeout: 25000, polling: 500 });

        console.log("[✓] Turnstile PASSED! Mengklik Submit...");
        await sleep(500);

        const submitBtn = await page.$('button[type="submit"]');
        if (submitBtn) {
            await submitBtn.click();
        } else {
            await page.evaluate(() => document.querySelector('button[type="submit"]')?.click());
        }

        console.log("[+] Memeriksa respons submission...");
        await sleep(3000);

        // Deteksi Modal / Text Error (Status 400 & 429)
        const responseStatus = await page.evaluate(() => {
            const bodyText = document.body.innerText || "";
            
            // Cek Status 400 / Domain Limit / Duplicate
            const is400 = bodyText.includes("status 400") || 
                          bodyText.includes("maximum number of reports") || 
                          bodyText.includes("dedupe") || 
                          bodyText.includes("already submitted");

            // Cek Status 429 / IP Rate Limit
            const is429 = bodyText.includes("status 429") || 
                          bodyText.includes("Too Many Requests") || 
                          bodyText.includes("rate limit exceeded");

            // Klik tombol OK pada Modal jika muncul
            const buttons = Array.from(document.querySelectorAll('button'));
            const okBtn = buttons.find(b => b.textContent.trim() === "OK");
            if (okBtn) okBtn.click();

            return { is400, is429, hasModal: !!okBtn };
        });

        // Tampilkan info log sesuai status error yang didapat
        if (responseStatus.is400) {
            console.log(`[!] Cloudflare Response [HTTP 400]: Domain ini sudah mencapai batas maksimum laporan / sudah pernah dilaporkan.`);
            await sleep(1000);
            return true; // Tetap anggap selesai agar dicatat ke reported_urls.txt & di-skip berikutnya
        }

        if (responseStatus.is429) {
            console.log(`[!] Cloudflare Response [HTTP 429]: Terkena Rate Limit IP (Too Many Requests).`);
            await sleep(1000);
            return false; // Jangan dicatat sebagai sukses agar bisa dicoba ulang nanti
        }

        console.log("[✓] Laporan Berhasil Dikirim!");
        return true;

    } catch (err) {
        console.log("[!] Turnstile gagal terverifikasi atau Submit Timeout:", err.message);
    }

    return false;
}

// ======================================================
// PROCESS REPORT FLOW
// ======================================================
async function processReport(page, url, reporter) {
    const isLoaded = await ensurePageLoaded(page, 4);
    if (!isLoaded) {
        throw new Error("Gagal memuat form Cloudflare setelah beberapa kali reload.");
    }

    // Bersihkan Cookie & Cache per-submit agar session Cloudflare selalu segar
    const client = await page.target().createCDPSession();
    await client.send('Network.clearBrowserCookies');
    await client.send('Network.clearBrowserCache');

    await sleep(1000);

    console.log("[+] Mengisi Full Name...");
    await fillInputFull(page, 'input[name="name"]', reporter.name);

    console.log(`[+] Mengisi Email Address (${reporter.email})...`);
    await fillInputFull(page, 'input[name="email"]', reporter.email);

    console.log("[+] Mengisi Confirm Email Address...");
    await fillInputFull(page, 'input[name="email2"]', reporter.email);

    console.log("[+] Mengisi Title...");
    await fillInputFull(page, 'input[name="title"]', reporter.title);

    console.log("[+] Mengisi Company Name...");
    await fillInputFull(page, 'input[name="company"]', reporter.company);
    
    console.log(`[+] Mengisi Target URLs (${url})...`);
    await fillInputFull(page, 'textarea[name="urls"]', url);

    console.log("[+] Mengisi Justification...");
    await fillInputFull(page, 'textarea[name="justification"]', getRandomItem(REPORT_DETAILS_LIST));

    console.log("[+] Memilih Negara Indonesia...");
    const countryBtn = await page.$('button[aria-label="Reporter current country"]');
    if (countryBtn) {
        await countryBtn.click();
        await sleep(600);
        await page.evaluate((cName) => {
            const options = Array.from(document.querySelectorAll('div[role="option"]'));
            const target = options.find(opt => opt.textContent.trim() === cName);
            if (target) target.click();
        }, reporter.country);
    }
    await sleep(600);

    console.log("[+] Mengisi Reported User-Agent...");
    await fillInputFull(page, 'input[name="reported_user_agent"]', reporter.userAgent);

    console.log("[+] Mengisi Comments...");
    await fillInputFull(page, 'textarea[name="comments"]', getRandomItem(COMMENTS_LIST));

    console.log("[+] Centang DSA certification...");
    await page.evaluate(() => {
        const labels = Array.from(document.querySelectorAll('label'));
        const dsa = labels.find(l => l.textContent.includes("DSA certification"));
        if (dsa) dsa.click();
    });

    return await waitForTurnstileAndSubmit(page, url);
}

// ======================================================
// MAIN ENTRY POINT
// ======================================================
async function main() {
    console.clear();
    console.log("==============================================");
    console.log("   CLOUDFLARE REPORT - ACCURATE FULL INPUT   ");
    console.log("==============================================\n");

    const urls = loadUrls();
    const historyUrls = loadHistoryUrls();
    const remainingUrls = urls.filter(u => !historyUrls.has(u));

    console.log(`[+] Total URL sisa: ${remainingUrls.length}`);
    if (remainingUrls.length === 0) {
        console.log("[i] Tidak ada URL baru yang perlu diproses.");
        return;
    }

    let { browser, page } = await connect({
        headless: true,
        turnstile: true,
        connectOption: { defaultViewport: null },
        args: BROWSER_ARGS
    });

    try {
        for (let i = 0; i < remainingUrls.length; i++) {
            const currentUrl = remainingUrls[i];
            const reporter = generateRandomReporter();

            console.log(`\n[${i + 1}/${remainingUrls.length}] Target: ${currentUrl}`);
            console.log(`[+] Pelapor : ${reporter.name} (${reporter.email})`);

            const alive = await isUrlAlive(currentUrl, reporter.userAgent);
            if (!alive) {
                console.log(`[SKIP] Target Down -> Dicatat ke skipped_urls.txt.`);
                appendLog(SKIPPED_LOG_PATH, currentUrl);
                continue;
            }

            try {
                if (!browser || !browser.isConnected()) {
                    console.log("[!] Reconnecting browser...");
                    const instance = await connect({
                        headless: true,
                        turnstile: true,
                        connectOption: { defaultViewport: null },
                        args: BROWSER_ARGS
                    });
                    browser = instance.browser;
                    page = instance.page;
                }

                const success = await processReport(page, currentUrl, reporter);
                if (success) {
                    appendLog(LOG_PATH, currentUrl);
                    console.log(`[✓] PROSES SELESAI & DICATAT!`);
                } else {
                    console.log(`[!] Gagal submit/timeout pada URL ini.`);
                }
            } catch (err) {
                console.log(`[!] Error: ${err.message}`);
            }

            if (i < remainingUrls.length - 1) {
                console.log(`[i] Jeda ${DELAY_BETWEEN_URLS / 1000}s...`);
                await sleep(DELAY_BETWEEN_URLS);
            }
        }
    } finally {
        if (browser && browser.isConnected()) {
            await browser.close().catch(() => {});
        }
        console.log("\n[✔] SEMUA PROSES SELESAI");
    }
}

main().catch(console.error);