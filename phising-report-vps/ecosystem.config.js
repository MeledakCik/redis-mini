module.exports = {
  apps: [{
    name: "phishing-reporter",
    script: "node_modules/next/dist/bin/next",
    args: "start -p 3000",
    cwd: "./",
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: "1G",
    env: {
      NODE_ENV: "production",
      PUPPETEER_EXECUTABLE_PATH: "/usr/bin/chromium-browser",
      PORT: "3000"
    }
  }, {
    name: "report-cloudflare-cron",
    script: "./scripts/cloudflare.js",
    cron_restart: "0 */6 * * *", // tiap 6 jam auto report (optional)
    autorestart: false,
    watch: false
  }]
}
