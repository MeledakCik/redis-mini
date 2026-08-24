#!/bin/bash
# deploy.sh - untuk update code di VPS
set -e
echo "Pull & rebuild..."
# git pull (kalau pakai git)
npm install
npm run build
pm2 restart phishing-reporter
echo "Deployed!"
