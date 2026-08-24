# CLEAN FINAL - No Double Files

Structure (15 files only):
- app/page.tsx (input only, no file)
- app/api/report/cloudflare/route.ts
- app/api/report/google/route.ts
- app/api/urls/route.ts
- lib/proxies.ts
- scripts/cloudflare.js (1 file)
- scripts/google.js (1 file)
- proxies.txt (1 file)
- package.json, tailwind, tsconfig, Dockerfile, docker-compose.yml, nginx.example.conf

Deploy beda domain, no port conflict:
docker compose up -d --build (joins kasyaf-net)
Then add nginx.example.conf to main nginx.conf
