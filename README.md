# redis-mini — Redis + Qdrant Mini Console

Lightweight console untuk Redis & Vector DB (Qdrant), clone ala console.upstash.com. Dark theme, accent hijau #00e095, font JetBrains Mono.

Project ini 1 codebase jalan di 2 mode: Local (Docker Desktop) dan VPS Ubuntu (Docker). Data persistent pakai Docker Volume external.

## Architecture Production (VPS)

Client -> :443 -> nginx (alpine) -> console:3000 (Next.js standalone)
                        |-> redis:6379 (redis:7-alpine)
                        |-> qdrant:6333 (qdrant:v1.9.0)

Services di docker-compose.yml:

- **nginx** - Reverse proxy + SSL terminator, map 80/443 ke console:3000
- **console** - Next.js 14 app (output standalone), port 3000 internal only
- **redis** - redis:7-alpine, auth pakai REDIS_PASSWORD
- **qdrant** - qdrant/qdrant:v1.9.0, storage di volume qdrant_data

Semua data pakai external volume: redis_data, qdrant_data, console_data

## Tech Stack

- Next.js 14 (App Router, JavaScript, output: standalone)
- Tailwind CSS + shadcn/ui hand-rolled
- NextAuth v5 (Credentials, JWT)
- ioredis - koneksi Redis
- Qdrant REST API - vector search
- Nginx Alpine - reverse proxy
- Docker + Docker Compose

## Local Development

```bash
npm install
cp .env.example .env
# isi: REDIS_PASSWORD, API_KEY_KASYAF, NEXTAUTH_SECRET

npm run dev
# buka http://localhost:3000
```

Atau pakai docker:

```bash
docker compose up -d --build
docker compose ps
```

## VPS Deployment

```bash
git clone https://github.com/MeledakCik/redis-mini.git ~/redis-mini
cd ~/redis-mini

# .env TIDAK dari git, buat manual
nano .env
# wajib isi: REDIS_URL, REDIS_HOST, REDIS_PASSWORD, QDRANT_URL, REDIS_PUBLIC_HOST, VECTOR_PUBLIC_HOST, API_KEY_KASYAF, NEXTAUTH_URL, NEXTAUTH_SECRET

docker compose up -d --build
docker compose logs -f console
```

Setup Nginx SSL:

```bash
sudo certbot --nginx -d console.kasyaf.id -d vector.kasyaf.id
```

## Environment Variables

Template ada di .env.example. Yang dipakai app adalah .env (tidak di-commit).

Wajib:
- REDIS_URL=redis://default:PASSWORD@redis:6379
- REDIS_HOST=redis
- REDIS_PORT=6379
- REDIS_PASSWORD=PASSWORD
- REDIS_PUBLIC_HOST=console.kasyaf.id:6379
- QDRANT_URL=http://qdrant:6333
- VECTOR_PUBLIC_HOST=vector.kasyaf.id
- APP_ENV=vps
- NODE_ENV=production
- API_KEY_KASYAF=
- NEXTAUTH_URL=https://console.kasyaf.id
- NEXTAUTH_SECRET=
- ADMIN_EMAIL=

## REST API

```bash
curl -X POST https://console.kasyaf.id/api/redis/exec \
  -H "Authorization: Bearer YOUR_API_KEY_KASYAF" \
  -H "Content-Type: application/json" \
  -d '{"raw":"PING"}'
```

## Structure

```
redis-mini/
├── Dockerfile
├── docker-compose.yml
├── nginx/
│   └── nginx.conf
├── app/ (Next.js app router)
├── components/
├── lib/ (redis-pool, qdrant client, auth, etc)
├── .env (gitignored, secrets)
├── .env.example (template, boleh di-commit)
└── README.md
```

## Note

.env dan data volume tidak pernah di-push ke GitHub. Semua secrets stay di VPS. .env.example hanya template generik.
