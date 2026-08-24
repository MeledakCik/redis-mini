#!/bin/bash
set -e
echo "=== Setup VPS for Phishing Reporter Next.js ==="

# Update
sudo apt update

# Install Node 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Install Chrome deps for puppeteer-real-browser
sudo apt install -y chromium-browser fonts-liberation libasound2 libatk-bridge2.0-0 libatk1.0-0 libatspi2.0-0 libcups2 libdbus-1-3 libdrm2 libgbm1 libgtk-3-0 libnspr4 libnss3 libxcomposite1 libxdamage1 libxfixes3 libxrandr2 xdg-utils wget gconf-service libappindicator3-1 libxss1

# Install PM2
sudo npm install -g pm2

# Install project deps
npm install

# Build Next.js
npm run build

# PM2 start
pm2 start ecosystem.config.js
pm2 save
pm2 startup | tail -n 1

echo ""
echo "=== DONE ==="
echo "App jalan di http://YOUR_VPS_IP:3000"
echo "Untuk domain + SSL, lanjut setup nginx di bawah"
echo ""
echo "Cek log: pm2 logs phishing-reporter"
