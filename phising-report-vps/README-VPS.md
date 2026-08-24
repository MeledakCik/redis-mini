# DEPLOY DI VPS - LENGKAP

## 1. Sewa VPS
Rekomendasi murah yang support puppeteer:
- Hostinger VPS KVM1 (Rp 50rb/bln)
- Contabo 4GB (3$)
- DigitalOcean Basic (4$)
OS: Ubuntu 22.04

## 2. Upload project ke VPS
```bash
scp phishing-reporter-next-final.zip root@IP_VPS:/root/
ssh root@IP_VPS
apt install unzip -y
unzip phishing-reporter-next-final.zip -d phishing-reporter
cd phishing-reporter
```

## 3. Setup Sekali Klik
```bash
chmod +x setup-vps.sh deploy.sh
./setup-vps.sh
```
Ini akan install Node 20, Chromium, PM2, npm install, build, dan jalan di port 3000.

## 4. Cek
```bash
pm2 logs phishing-reporter
pm2 list
```
Buka http://IP_VPS:3000

## 5. Pasang Domain + SSL (Opsional tapi recommended)
```bash
sudo apt install nginx certbot python3-certbot-nginx -y
sudo nano /etc/nginx/sites-available/phishing-reporter
# copy isi dari nginx.conf, ganti YOUR_DOMAIN
sudo ln -s /etc/nginx/sites-available/phishing-reporter /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
sudo certbot --nginx -d domainlu.com
```

## 6. Cara Report Jalan
Ada 2 cara:

**A. Via UI Next.js (Dashboard)**
Buka web -> klik "Report ALL to Cloudflare/Google" -> ini akan trigger API

**B. Via CLI (Lebih stabil untuk puppeteer-real-browser)**
```bash
# sekali jalan
npm run report:cloudflare
npm run report:google

# atau jalan background
pm2 start scripts/cloudflare.js --name cf-report
pm2 start scripts/google.js --name google-report
```

File `phishing_urls.txt` & `proxies.txt` ada di root, bisa lu edit langsung via UI atau nano.

**C. Auto cron tiap 6 jam (udah gue set di ecosystem.config.js)**
PM2 akan auto run cloudflare reporter tiap 6 jam. Mau matiin? edit ecosystem.config.js hapus bagian report-cloudflare-cron.

## 7. Update Code
Kalau ada perubahan:
```bash
./deploy.sh
```

## Troubleshooting
- Puppeteer error `No usable sandbox`: sudah di-handle di BROWSER_ARGS (--no-sandbox)
- Proxy mati: cek proxies.txt, gue sudah kasih 2 proxy tapi kayaknya mati, ganti proxy fresh
- Memory habis: VPS minimal 2GB RAM untuk puppeteer-real-browser, kalau 1GB bakal crash
