// Gunakan puppeteer standar tanpa stealth plugin yang memblokir reCAPTCHA
const puppeteer = require("puppeteer");
const fs = require("fs");
const path = require("path");

// ======================================================
// KONFIGURASI
// ======================================================
const FILE_PATH = "./phishing_urls.txt";
const LOG_PATH = "./reported_urls.txt";
const PROXY_PATH = "./proxies.txt";
const SAFE_BROWSING_URL =
    "https://safebrowsing.google.com/safebrowsing/report_phish/?hl=id";
const CHROME_DEBUG_PORT = 9222;
const SUBMISSION_TIMEOUT = 30 * 1000;
const DELAY_BETWEEN_URLS = 15000;
const MAX_RETRIES = 2;

const REPORT_DETAILS_LIST = [
    "Saya melaporkan URL ini karena terindikasi sebagai situs yang tidak aman dan berpotensi melakukan phishing atau penipuan. Mohon dilakukan verifikasi lebih lanjut.",
    "Situs ini terdeteksi memuat konten berbahaya yang berpotensi merugikan pengguna. Harap segera ditindaklanjuti dan dimasukkan ke dalam daftar blokir.",
    "Indikasi kuat situs phishing / penipuan. Halaman ini mencoba mengelabui pengunjung untuk mengambil data sensitif secara ilegal.",
    "URL ini terdeteksi menyebarkan malware atau aktivitas mencurigakan yang melanggar kebijakan keamanan web. Mohon dicek.",
    "Situs web ini berpotensi membahayakan perangkat pengguna dan terindikasi sebagai web penipuan/phishing. Mohon penanganannya.",
    "Terdapat indikasi ancaman keamanan pada domain ini. Ditemukan aktivitas yang mengarah pada penipuan atau pengambilalihan data pengguna.",
    "Mohon tim Google Safe Browsing memeriksa domain ini karena menyajikan konten yang terindikasi phishing dan berisiko tinggi.",
    "Halaman web ini meniru antarmuka login resmi untuk mengelabui pengguna agar memasukkan kredensial pribadi secara ilegal.",
    "Terdeteksi adanya formulir penipuan yang meminta informasi rahasia pengguna, seperti kata sandi dan data finansial.",
    "Domain ini diduga kuat merupakan situs pencucian data (phishing site) yang membahayakan privasi pengunjung.",
    "URL ini menyebarkan berkas yang telah terinfeksi malware dan berpotensi merusak perangkat pengguna secara langsung.",
    "Terjadi aktivitas drive-by download otomatis saat membuka tautan ini yang mengunduh script berbahaya tanpa izin.",
    "Situs web ini mengandung payload berbahaya yang teridentifikasi sebagai trojan atau ransomware. Mohon tindakan pemblokiran.",
    "Sistem menemukan adanya rekayasa sosial (social engineering) pada URL ini yang mengeksploitasi kredensial pengguna.",
    "Ditemukan indikasi kuat spoofing domain yang dirancang untuk menyerupai portal resmi guna mencuri informasi sensitif.",
    "Web ini menggunakan teknik deceptive content untuk mengelabui pengunjung agar membagikan data identitas rahasia.",
    "Aktivitas lalu lintas data pada URL ini menunjukkan pola distribusi kode berbahaya yang merugikan perangkat pengunjung.",
    "Domain ini memuat tautan unduhan palsu yang berisi maldoc atau eksploitasi keamanan sistem operasi.",
    "Halaman ini terindikasi memicu peringatan keamanan browser karena terdeteksi sebagai sarana scam dan phishing.",
    "Situs ini menyajikan konten jebakan yang memicu kebocoran data pribadi (data exfiltration) pengguna secara tersembunyi.",
    "Mohon segera memblokir tautan ini karena terbukti menyebarkan skrip pencuri data kunci (keylogger/stealer).",
    "Situs ini menyimulasikan peringatan sistem palsu untuk memaksa pengguna mengunduh aplikasi berbahaya.",
    "Halaman ini memuat skrip manipulasi DOM yang mengambil alih input formulir pengguna untuk dialihkan ke server asing.",
    "URL ini terindikasi membagikan file executable (.exe / .apk) berbahaya yang tidak dikenal dan berisiko tinggi.",
    "Ditemukan upaya phishing berskala besar yang mengarah pada pengambilalihan akun elektronik secara ilegal.",
    "Situs ini menyembunyikan payload malware di balik pemendek URL untuk menghindari deteksi awal.",
    "Halaman web ini dirancang secara tidak sah untuk menjebak korban agar mentransfer dana atau memberikan akses perbankan.",
    "Terdeteksi adanya eksploitasi celah keamanan browser saat halaman ini dimuat oleh pengunjung.",
    "Domain ini dikategorikan sebagai ancaman siber aktif yang berpotensi menyebarkan adware dan spyware berisiko tinggi.",
    "Mohon tindak lanjut atas domain ini karena memuat skrip pencurian cookie sesi (session hijacking) pengguna.",
    "Terdapat indikasi pencurian identitas digital yang dilakukan melalui formulir input palsu di halaman ini.",
    "URL ini mengeksekusi skrip lintas situs (XSS) berbahaya yang memicu pengunduhan berkas tanpa konfirmasi pengguna.",
    "Halaman ini memalsukan halaman verifikasi OTP untuk mengambil alih akun perbankan/dompet digital pengunjung.",
    "Terdeteksi aktivitas malicious redirection yang mengarahkan lalu lintas pengguna ke server penyebar malware.",
    "Domain ini mengandung elemen web yang secara agresif mencoba mengompromikan keamanan perangkat lunak pengunjung.",
    "Situs ini menampilkan promosi palsu yang bertujuan utama menyerap informasi login dan kartu kredit pengguna.",
    "URL ini teridentifikasi dalam jaringan distribusi malware (malvertising) yang mengeksploitasi lalu lintas pengunjung.",
    "Halaman web ini memuat sertifikat SSL palsu/mencurigakan yang digunakan untuk menyembunyikan aktivitas phishing.",
    "Ditemukan mekanisme pencurian data lalu lintas (traffic hijacking) yang mengarahkan pengguna ke portal penipuan.",
    "Situs ini menggunakan taktik scareware untuk mengelabui pengunjung agar menginstal perangkat lunak terinfeksi.",
    "Terdapat skrip pembaca clipboard otomatis yang bertujuan mencuri kueri sensitif dan kata kunci pengguna.",
    "URL ini memicu isolasi keamanan karena menyajikan tautan unduhan berkas berpotensi merusak (PUA/PUP).",
    "Halaman ini terindikasi melakukan brute force atau eksploitasi otomatis terhadap sesi penjelajahan pengguna.",
    "Situs ini merupakan duplikasi ilegal dari portal berita/layanan publik yang ditujukan untuk mengumpulkan data korban.",
    "Domain ini terbukti digunakan sebagai node kendali (C2) dalam penyebaran aplikasi berbahaya.",
    "Situs web ini menyajikan konten eksploitasi zero-day yang menargetkan kerentanan sistem penjelajah web.",
    "Terdapat formulir klaim hadiah palsu yang dirancang khusus untuk memanen data pribadi (data harvesting).",
    "Situs ini memicu peringatan Phishing & Unsafe Site karena struktur kode yang identik dengan template penipuan.",
    "Aktivitas di URL ini terdeteksi mencoba mengunduh skrip pencuri token akses dan kredensial media sosial.",
    "Mohon masukkan domain ini ke daftar pemblokiran karena terbukti aktif melakukan social engineering berbasis web.",
    "Situs web ini terindikasi telah dikompromikan (di-hack) dan disisipi konten promosi judi online secara tidak sah.",
    "Terjadi indikasi defacement dan injection pada domain ini yang menyisipkan tautan serta materi perjudian online ilegal.",
    "Domain ini mengalami peretasan pada server/CMS sehingga halaman resminya menyajikan tautan judi online.",
    "Ditemukan aktivitas SEO poisoning pada URL ini yang mengarahkan pengunjung ke platform perjudian online tanpa izin.",
    "Situs resmi ini di-hack oleh pihak tidak bertanggung jawab dan dialihkan (redirect) ke situs perjudian ilegal.",
    "Halaman ini mengalami serangan backdoor yang menyebabkan munculnya landing page perjudian online secara otomatis.",
    "Situs institusi/lembaga ini terinfeksi skrip judi online yang merusak integritas dan keamanan konten resminya.",
    "Domain ini menyajikan konten judi online akibat adanya peretasan pada file direktori utama situs.",
    "Terdeteksi adanya pengubahan struktur URL (URL rewriting) oleh peretas untuk mempromosikan situs perjudian.",
    "Situs ini telah diambil alih sebagian dan disisipi banner serta link ke portal taruhan online ilegal.",
    "Terjadi penyalahgunaan domain (domain hijacking) di mana halaman utama dialihkan ke situs taruhan judi online.",
    "Situs web ini memuat injeksi skrip berbahaya yang memunculkan pop-up perjudian online saat diakses.",
    "Ditemukan ribuan halaman spam judi online yang dibuat secara otomatis akibat peretasan CMS pada situs ini.",
    "Halaman ini mengalami defacement terselubung (cloaking) yang menampilkan judi online pada hasil pencarian Mesin Pencari.",
    "Domain publik/pemerintah ini terindikasi diretas dan dimanfaatkan sebagai sarana promosi situs taruhan ilegal.",
    "Situs ini mengandung skrip pengalihan paksa (auto-redirect) ke domain perjudian online yang melanggar hukum.",
    "Terdeteksi adanya muatan file PHP liar di server ini yang digunakan untuk menyebarkan tautan judi online.",
    "Situs web ini telah disusupi oleh peretas untuk menyebarkan konten taruhan dan judi kasino online.",
    "Terjadi pelanggaran keamanan pada situs ini yang mengakibatkan munculnya iklan dan tautan judi tak berizin.",
    "Domain ini mengalami kerentanan keamanan yang dimanfaatkan pihak ketiga untuk memasang tautan judi online.",
    "Halaman web ini menampilkan teks dan gambar promosi judi online yang tidak sesuai dengan peruntukan asli domain.",
    "Ditemukan indikasi kuat bahwasanya domain ini diretas melalui eksploitasi plugin yang tidak terbarui untuk iklan judi.",
    "Aktivitas peretasan pada situs ini menyebabkan manipulasi indeks mesin pencari menjadi konten perjudian.",
    "Situs ini mengalami serangan Cloaked Redirection di mana pengunjung seluler dialihkan ke situs judi online.",
    "Terdeteksi adanya pendaftaran sub-domain ilegal di bawah domain ini yang digunakan khusus untuk portal judi.",
    "Situs ini memuat skrip iklan judi online tersembunyi yang merusak reputasi dan keamanan pengguna.",
    "Halaman resmi ini disusupi kode otomatis yang memproduksi keyword judi online secara masif di search engine.",
    "Terjadi manipulasi file .htaccess pada server yang menyebabkan pembaca dialihkan ke agen judi online.",
    "Situs web ini menyajikan konten judi slot/kasino akibat adanya pengambilalihan hak akses administratif.",
    "Ditemukan webshell aktif di dalam server ini yang digunakan untuk menginjeksi link judi online secara berkelanjutan.",
    "Domain ini mengalami defacement sebagian di mana header dan footer disisipi tautan perjudian ilegal.",
    "Situs web ini terbukti menjadi korban peretasan massal yang menyebarkan tautan ke jejaring judi online.",
    "Halaman ini memuat skrip iFrame tersembunyi yang menampilkan situs judi online tanpa sepengetahuan pemilik situs.",
    "Terjadi eksploitasi celah SQL Injection pada situs ini yang berujung pada penyisipan konten perjudian.",
    "Domain ini telah disusupi oleh botnet pencari situs rentan untuk dipasangi tautan promosi judi.",
    "Situs ini menampilkan konten judi online yang melanggar kebijakan konten Google dan hukum yang berlaku.",
    "Terdeteksi skrip malicious JS yang mengubah fungsi tombol di situs ini agar membuka tab judi online.",
    "Situs resmi ini diinjeksi dengan kata kunci perjudian ilegal yang mengganggu pengalaman penjelajahan pengguna.",
    "Domain ini teridentifikasi memuat landing page judi slot online akibat peretasan pada sistem manajemen konten.",
    "Halaman web ini disusupi tautan balik (backlink spam) yang mengarah ke jaringan situs perjudian haram.",
    "Terjadi pengubahan DNS / pembajakan halaman yang membuat akses domain ini mendarat di situs taruhan.",
    "Situs ini menyajikan promosi judi online yang dipasang oleh pihak luar melalui eksploitasi celah keamanan server.",
    "Ditemukan manipulasi metadata pada halaman ini yang diubah menjadi promosi perjudian dan kasino online.",
    "Situs ini terindikasi mengalami peretasan cross-site scripting yang memicu pop-up promo judi secara terus-menerus.",
    "Domain ini digunakan secara tidak sah sebagai perantara (bridge) untuk mengarahkan pengguna ke web judi.",
    "Halaman ini memuat tautan tersembunyi (hidden links) yang ditanam oleh peretas untuk meningkatkan SEO judi online.",
    "Situs resmi ini telah dicemari dengan injeksi database yang menampilkan tabel taruhan dan perjudian.",
    "Terjadi pengambilalihan sesi admin yang berakibat pada publikasi artikel-artikel promosi judi online.",
    "Domain ini diretas dan dimodifikasi sedemikian rupa sehingga menyajikan portal judi online yang meresahkan.",
    "Situs ini terinfeksi malware jenis 'SEO Spam' yang khusus menginjeksi promosi judi online pada domain berotoritas."
];

function getRandomDetail() {
    return REPORT_DETAILS_LIST[Math.floor(Math.random() * REPORT_DETAILS_LIST.length)];
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function randomDelay(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function appendLog(url) {
    fs.appendFileSync(LOG_PATH, `${url}\n`, "utf8");
}

function loadReportedUrls() {
    if (!fs.existsSync(LOG_PATH)) return new Set();
    const content = fs.readFileSync(LOG_PATH, "utf8");
    const lines = content.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    return new Set(lines);
}

function loadUrls() {
    if (!fs.existsSync(FILE_PATH)) {
        throw new Error(`File "${FILE_PATH}" tidak ditemukan.`);
    }
    const urls = fs
        .readFileSync(FILE_PATH, "utf8")
        .split(/\r?\n/)
        .map(line => line.trim())
        .filter(line => line.length > 0 && !line.startsWith("#"));
    
    return [...new Set(urls)];
}

function isValidUrl(value) {
    try {
        const url = new URL(value);
        return url.protocol === "http:" || url.protocol === "https:";
    } catch {
        return false;
    }
}

// ======================================================
// MANAGEMENT PROXY DARI FILE
// ======================================================
function loadProxies() {
    if (!fs.existsSync(PROXY_PATH)) {
        console.log(`[!] Warning: File "${PROXY_PATH}" tidak ditemukan. Berjalan tanpa proxy.`);
        return [];
    }

    const lines = fs.readFileSync(PROXY_PATH, "utf8")
        .split(/\r?\n/)
        .map(l => l.trim())
        .filter(l => l.length > 0 && !l.startsWith("#"));

    return lines.map(line => {
        const parts = line.split(":");
        if (parts.length === 4) {
            return {
                server: `http://${parts[0]}:${parts[1]}`,
                username: parts[2],
                password: parts[3]
            };
        } else if (parts.length === 2) {
            return {
                server: `http://${parts[0]}:${parts[1]}`,
                username: null,
                password: null
            };
        }
        return null;
    }).filter(Boolean);
}

let proxyList = [];
let currentProxyIndex = 0;

function getNextProxy() {
    if (proxyList.length === 0) return null;
    const proxy = proxyList[currentProxyIndex];
    currentProxyIndex = (currentProxyIndex + 1) % proxyList.length;
    return proxy;
}

async function connectChrome(activeProxy = null) {
    console.log("[+] Menghubungkan ke Chrome / Launching instance...");
    
    // Jika tidak ada remote debugging port aktif, launch instance baru dengan proxy jika ada
    const launchArgs = [
        "--start-maximized",
        "--disable-blink-features=AutomationControlled"
    ];

    if (activeProxy) {
        launchArgs.push(`--proxy-server=${activeProxy.server}`);
        console.log(`[+] Menggunakan Proxy: ${activeProxy.server}`);
    }

    try {
        // Coba koneksi ke Chrome debug port terlebih dahulu
        const browser = await puppeteer.connect({
            browserURL: `http://127.0.0.1:${CHROME_DEBUG_PORT}`,
            defaultViewport: null,
        });
        console.log("[✓] Terhubung ke Remote Chrome Debugging.");
        return browser;
    } catch (error) {
        // Fallback: Launch Puppeteer biasa dengan Proxy terpilih
        console.log("[i] Debug Port tidak ditemukan, meluncurkan Browser baru...");
        const browser = await puppeteer.launch({
            headless: false,
            args: launchArgs
        });
        return browser;
    }
}

async function humanMouseMove(page, targetX, targetY) {
    const start = await page.evaluate(() => ({ x: window.mouseX || 100, y: window.mouseY || 100 }));
    const steps = randomDelay(20, 35);
    
    for (let i = 1; i <= steps; i++) {
        const t = i / steps;
        const x = Math.round(start.x + (targetX - start.x) * t + Math.sin(t * Math.PI) * randomDelay(-10, 10));
        const y = Math.round(start.y + (targetY - start.y) * t + Math.sin(t * Math.PI) * randomDelay(-10, 10));
        
        await page.mouse.move(x, y);
        await sleep(randomDelay(5, 12));
    }
    
    await page.evaluate((x, y) => { window.mouseX = x; window.mouseY = y; }, targetX, targetY);
    await sleep(randomDelay(150, 300));
}

async function humanClickElement(page, element) {
    const box = await element.boundingBox();
    if (!box) throw new Error("Bounding box elemen tidak ditemukan.");
    
    const x = box.x + box.width / 2 + randomDelay(-5, 5);
    const y = box.y + box.height / 2 + randomDelay(-5, 5);
    
    await humanMouseMove(page, x, y);
    await page.mouse.click(x, y);
    await sleep(randomDelay(350, 500));
}

async function simulateHumanBehavior(page) {
    console.log("[+] Mensimulasikan pergerakan manusia...");
    await page.evaluate(() => window.scrollBy({ top: Math.floor(Math.random() * 120) + 40, behavior: 'smooth' }));
    await sleep(randomDelay(800, 1200));
    await humanMouseMove(page, randomDelay(200, 500), randomDelay(200, 400));
    await sleep(randomDelay(500, 800));
    await page.evaluate(() => window.scrollBy({ top: -80, behavior: 'smooth' }));
    await sleep(randomDelay(800, 1200));
}

async function openNewTabSafeBrowsing(browser, activeProxy = null) {
    console.log("[+] Membuka tab baru Safe Browsing...");
    const page = await browser.newPage();

    if (activeProxy && activeProxy.username && activeProxy.password) {
        await page.authenticate({
            username: activeProxy.username,
            password: activeProxy.password
        });
    }

    await page.setViewport({ width: 1366, height: 768 });

    console.log("[+] Navigasi ke Safe Browsing...");
    await page.goto(SAFE_BROWSING_URL, {
        waitUntil: "networkidle2",
        timeout: 45000,
    });
    
    await sleep(2500);
    await page.waitForSelector("mat-form-field", { timeout: 20000 });

    const isRecaptchaActive = await page.evaluate(() => {
        return !!document.querySelector('iframe[src*="recaptcha"]') || typeof window.grecaptcha !== "undefined";
    });

    if (isRecaptchaActive) {
        console.log("[✓] Badge/API reCAPTCHA v3 terdeteksi aktif.");
    } else {
        console.log("[!] Warning: Memancing reCAPTCHA dengan scroll...");
        await page.evaluate(() => window.scrollTo(0, 150));
        await sleep(1500);
    }

    console.log("[✓] Tab baru & Form Safe Browsing siap.");
    return page;
}

// ======================================================
// DROPDOWN ANGULAR MATERIAL
// ======================================================
async function openDropdown(page, labelText) {
    await page.keyboard.press("Escape").catch(() => {});
    await sleep(400);

    const selectEl = await page.evaluateHandle((text) => {
        const labels = Array.from(document.querySelectorAll("mat-label"));
        const label = labels.find(el => el.textContent.trim().toLowerCase().includes(text.toLowerCase()));
        if (!label) return null;
        const field = label.closest("mat-form-field");
        return field ? field.querySelector("mat-select") : null;
    }, labelText);

    const select = await selectEl.asElement();
    if (!select) throw new Error(`Dropdown "${labelText}" tidak ditemukan.`);

    await page.waitForFunction(
        el => el && !el.classList.contains("mat-select-disabled") && el.getAttribute("aria-disabled") !== "true",
        { timeout: 7000 },
        select
    );

    await select.focus();
    await sleep(200);
    await page.keyboard.press("Space");
    await sleep(randomDelay(600, 900));

    const isOverlayOpen = await page.$(".cdk-overlay-pane mat-option");
    if (!isOverlayOpen) {
        await humanClickElement(page, select);
        await sleep(randomDelay(600, 900));
    }

    await page.waitForSelector(".cdk-overlay-pane mat-option", { timeout: 7000 });
}

async function selectOption(page, optionText) {
    const clicked = await page.evaluate((text) => {
        const options = Array.from(document.querySelectorAll(".cdk-overlay-pane mat-option"));
        const target = text.toLowerCase();
        
        const match = options.find(opt => {
            const txt = opt.textContent.trim().toLowerCase();
            return txt.includes(target);
        });

        if (match) {
            match.scrollIntoView({ block: 'center' });
            match.click();
            return true;
        }
        return false;
    }, optionText);

    if (!clicked) {
        console.log(`[!] Opsi "${optionText}" dicoba via keyboard...`);
        await page.keyboard.press("ArrowDown");
        await sleep(300);
        await page.keyboard.press("Enter");
    }

    await sleep(randomDelay(600, 900));
}

async function selectReportType(page) {
    console.log('[+] Memilih "Jenis Laporan" -> "Halaman ini tidak aman"');
    await openDropdown(page, "Jenis Laporan");
    await selectOption(page, "tidak aman");
    console.log("[✓] Jenis Laporan berhasil dipilih.");
}

async function selectThreatType(page) {
    console.log('[+] Memilih "Jenis Ancaman" -> "Manipulasi Psikologis"');
    await openDropdown(page, "Jenis Ancaman");
    await selectOption(page, "Manipulasi Psikologis");
    console.log("[✓] Jenis Ancaman berhasil dipilih.");
    await sleep(1000);
}

async function selectThreatCategory(page) {
    console.log('[+] Memeriksa "Kategori Ancaman"...');
    await sleep(1500);

    const isEnabled = await page.evaluate(() => {
        const field = document.querySelector('mat-form-field.form_threat_subtype');
        if (!field) return false;
        const select = field.querySelector('mat-select');
        return select && !select.classList.contains("mat-select-disabled") && select.getAttribute("aria-disabled") !== "true";
    });

    if (isEnabled) {
        try {
            await openDropdown(page, "Kategori Ancaman");
            await selectOption(page, "Phishing Lainnya");
            console.log("[✓] Kategori ancaman berhasil dipilih (Phishing Lainnya).");
        } catch (e) {
            try {
                await page.keyboard.press("ArrowDown");
                await sleep(200);
                await page.keyboard.press("Enter");
            } catch (err) {}
        }
    }
}

async function typeSafely(page, selector, text, triggerTab = false) {
    await page.waitForSelector(selector, { timeout: 10000 });
    const element = await page.$(selector);
    
    await humanClickElement(page, element);

    await page.keyboard.down('Control');
    await page.keyboard.press('KeyA');
    await page.keyboard.up('Control');
    await page.keyboard.press('Backspace');
    await sleep(randomDelay(150, 300));

    for (const char of text) {
        await page.keyboard.type(char, { delay: randomDelay(30, 70) });
    }
    await sleep(randomDelay(200, 400));

    if (triggerTab) {
        await page.keyboard.press('Tab');
        await sleep(randomDelay(300, 500));
    }
}

async function fillReportForm(page, url) {
    console.log("[+] Mengisi URL...");
    await typeSafely(page, 'input[formcontrolname="url"]', url, true);
    
    await page.evaluate(() => {
        const input = document.querySelector('input[formcontrolname="url"]');
        if (input) {
            input.dispatchEvent(new Event('input', { bubbles: true }));
            input.dispatchEvent(new Event('change', { bubbles: true }));
            input.dispatchEvent(new Event('blur', { bubbles: true }));
        }
    });

    await sleep(randomDelay(800, 1500));

    const randomDetails = getRandomDetail();
    console.log(`[+] Mengisi Detail Tambahan: "${randomDetails.substring(0, 35)}..."`);
    await typeSafely(page, 'textarea[formcontrolname="details"]', randomDetails, false);
    
    await page.evaluate(() => {
        const textarea = document.querySelector('textarea[formcontrolname="details"]');
        if (textarea) {
            textarea.dispatchEvent(new Event('input', { bubbles: true }));
            textarea.dispatchEvent(new Event('change', { bubbles: true }));
            textarea.dispatchEvent(new Event('blur', { bubbles: true }));
        }
    });
    
    await sleep(2000);
}

async function getSubmissionStatus(page) {
    try {
        return await page.evaluate(() => {
            const bodyText = document.body ? document.body.innerText || "" : "";
            const normalized = bodyText.replace(/\s+/g, " ").trim().toLowerCase();
            
            const statusCard = document.querySelector('.submission-status, [class*="status"], mat-card');
            const cardText = statusCard ? statusCard.innerText.toLowerCase() : "";

            const isSuccess = 
                normalized.includes("pengiriman url berhasil") ||
                normalized.includes("submission successful") ||
                normalized.includes("laporan telah diterima") ||
                cardText.includes("berhasil") ||
                cardText.includes("successful");

            const isError = 
                normalized.includes("terjadi error. coba lagi") ||
                normalized.includes("an error occurred");

            return { success: isSuccess, error: isError };
        });
    } catch (e) {
        return { success: false, error: false };
    }
}

async function handleSubmission(page, url, index, total) {
    const submitWait = randomDelay(3000, 5000);
    console.log(`[+] Jeda ${submitWait / 1000}s sebelum menekan tombol Kirim...`);
    await sleep(submitWait);

    try {
        const submitBtnEl = await page.evaluateHandle(() => {
            const buttons = Array.from(document.querySelectorAll("button"));
            return buttons.find(b => {
                const txt = b.textContent.trim().toLowerCase();
                return (txt.includes("kirim") || txt.includes("submit") || b.type === "submit") && !b.disabled;
            }) || null;
        });

        const btn = await submitBtnEl.asElement();
        if (btn) {
            await page.evaluate(el => el.scrollIntoView({ block: 'center', behavior: 'smooth' }), btn);
            await sleep(randomDelay(500, 800));
            await humanClickElement(page, btn);
            console.log("[✓] Tombol Kirim diklik.");
        }
    } catch (e) {
        console.log("[!] Gagal klik tombol Kirim:", e.message);
    }

    console.log(`[+] Monitoring hasil response untuk URL: ${url}`);

    const started = Date.now();
    while (Date.now() - started < SUBMISSION_TIMEOUT) {
        try {
            const currentUrl = page.url();
            if (currentUrl.includes("report_phish_thanks") || currentUrl.includes("success")) {
                console.log("[✓] PENGIRIMAN URL BERHASIL (Navigasi Berhasil)");
                return "success";
            }

            const status = await getSubmissionStatus(page);
            if (status.success) {
                console.log("[✓] PENGIRIMAN URL BERHASIL (Centang Hijau Terdeteksi)");
                return "success";
            }

            if (status.error) {
                console.log("[!] Terdeteksi 'Terjadi error. Coba lagi'.");
                return "error_submission";
            }
        } catch (e) {}
        await sleep(1000);
    }
    return "timeout";
}

async function processUrl(url, index, total) {
    console.log("\n==============================================");
    console.log(`                 ${index}/${total}`);
    console.log("==============================================");
    console.log(`[+] URL Target: ${url}`);

    if (!isValidUrl(url)) {
        console.log("[!] URL tidak valid. Dilewati.");
        return "skip";
    }

    let attempt = 0;
    while (attempt <= MAX_RETRIES) {
        const activeProxy = getNextProxy();
        console.log(`\n[+] Percobaan ${attempt + 1}/${MAX_RETRIES + 1}`);
        let browser = null;
        let page = null;
        
        try {
            browser = await connectChrome(activeProxy);
            page = await openNewTabSafeBrowsing(browser, activeProxy);

            await selectReportType(page);
            await selectThreatType(page);
            await selectThreatCategory(page);

            await fillReportForm(page, url);

            await simulateHumanBehavior(page);

            const result = await handleSubmission(page, url, index, total);

            if (result === "success") {
                if (page && !page.isClosed()) await page.close().catch(() => {});
                return "success";
            }

            if (page && !page.isClosed()) await page.close().catch(() => {});
            
            if (result === "error_submission" && attempt >= 1) {
                console.log(`[!] Lanjut ke URL berikutnya...`);
                return "failed";
            }

            if (result === "error_submission" && attempt < MAX_RETRIES) {
                const cooldown = randomDelay(10000, 15000);
                console.log(`[i] Cooldown ${cooldown / 1000}s sebelum retry...`);
                await sleep(cooldown);
            }

            attempt++;
        } catch (error) {
            console.error(`[!] Error: ${error.message}`);
            if (page && !page.isClosed()) await page.close().catch(() => {});
            attempt++;
        }
    }

    return "failed";
}

async function main() {
    console.clear();
    console.log("==============================================");
    console.log("     GOOGLE SAFE BROWSING REPORT ASSISTANT");
    console.log("==============================================\n");

    proxyList = loadProxies();
    console.log(`[+] Total Proxy Loaded: ${proxyList.length}`);

    const urls = loadUrls();
    const reportedUrls = loadReportedUrls();

    const remainingUrls = urls.filter(u => !reportedUrls.has(u));
    console.log(`[+] Total URL Sisa : ${remainingUrls.length}`);

    if (remainingUrls.length === 0) {
        console.log("[✓] Semua URL sudah pernah dilaporkan!");
        return;
    }

    try {
        for (let i = 0; i < remainingUrls.length; i++) {
            const currentUrl = remainingUrls[i];
            const result = await processUrl(currentUrl, i + 1, remainingUrls.length);
            
            if (result === "success") {
                appendLog(currentUrl);
                console.log(`[✓] URL ${i + 1} BERHASIL DI-SUBMIT & dicatat.`);
            } else {
                console.log(`[!] URL ${i + 1} dilewati.`);
            }

            if (i < remainingUrls.length - 1) {
                console.log(`\n[i] Jeda ${DELAY_BETWEEN_URLS / 1000}s antar URL...`);
                await sleep(DELAY_BETWEEN_URLS);
            }
        }
    } finally {
        console.log("\n==============================================");
        console.log("[✔] PROSES SELESAI");
        console.log("==============================================");
    }
}

main().catch(error => {
    console.error("\n[FATAL ERROR]", error);
    process.exit(1);
});