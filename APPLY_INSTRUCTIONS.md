# Cara Apply Patch Ini ke redis-mini

Struktur folder di zip ini SAMA PERSIS dengan struktur repo `redis-mini`,
tinggal timpa/copy ke lokasi yang sama.

## File yang di-update (existing, akan ditimpa)
- lib/auth.js
- middleware.js
- app/login/page.js
- app/register/page.js
- app/api/auth/register/route.js
- .env.example

## File baru
- lib/rate-limit.js
- app/unauthorized/page.js

## README.md
File `README.md` di zip ini FULL VERSION (bukan diff) — pastikan tidak ada
section custom lain di README repo asli lo yang ke-overwrite. Kalau ada,
merge manual bagian yang hilang.

## Langkah apply

```bash
# di local, dari root repo redis-mini
cd ~/redis-mini

# copy semua file dari zip ke sini (asumsikan zip di-extract ke ~/patch)
cp -r ~/patch/lib/. lib/
cp -r ~/patch/app/. app/
cp ~/patch/middleware.js .
cp ~/patch/.env.example .
cp ~/patch/README.md .

git status   # cek diff-nya
git add .
git commit -m "feat: Google/GitHub OAuth login + whitelist, disable public register, rate limiting"
git push origin main
```

## Sebelum deploy ke VPS

1. Isi `.env` di VPS (BUKAN `.env.example`) dengan:
   ```
   GOOGLE_CLIENT_ID=
   GOOGLE_CLIENT_SECRET=
   GITHUB_ID=
   GITHUB_SECRET=
   ALLOWED_EMAILS=
   ALLOWED_DOMAINS=
   ```
2. Setup redirect URI di Google Cloud Console & GitHub OAuth App
   (lihat section "OAuth Setup" di README.md).
3. Deploy:
   ```bash
   cd ~/redis-mini
   git pull origin main
   docker compose up -d --build console
   docker compose logs -f console
   ```
4. Test 3 skenario: login Credentials existing account, login Google
   (email whitelisted), login Google (email TIDAK whitelisted -> harus
   ke /unauthorized).

## Yang TIDAK berubah (aman)
- Dockerfile, docker-compose.yml, nginx.conf
- lib/redis-pool.js, lib/store.js, qdrant client
- app/api/redis/[id]/exec, app/api/vector/[id]/exec (tetap Bearer token, gak kesentuh)
- components/ui/button.jsx, components/ui/input.jsx
- Tidak ada dependency npm baru
