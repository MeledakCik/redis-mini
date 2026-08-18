# Kasyaf Console VPS Deployment - Complete Package

## ✅ 7 Files Generated (Production Ready)

All files are complete, no placeholders, ready for `docker-compose up -d`.

### 📦 File Manifest

```
✓ docker-compose.yml      (1.6 KB)  - Container orchestration
✓ nginx.conf              (3.4 KB)  - SSL/TLS reverse proxy
✓ Dockerfile              (918 B)   - Next.js 14 image
✓ .env.example            (1.1 KB)  - Environment template
✓ setup.sh                (4.6 KB)  - Automated deployment
✓ redis-admin.ts          (7.1 KB)  - ACL management (CRITICAL)
✓ README-VPS-DEPLOYMENT.md (18 KB) - Complete guide
```

---

## 🚀 Deployment Steps

### 1. Prepare VPS
```bash
# SSH into your VPS
ssh root@your-vps-ip

# Create deployment directory
mkdir -p /opt/kasyaf-console
cd /opt/kasyaf-console

# Copy all 7 files here
# Then run:
```

### 2. Auto-Deploy (Recommended)
```bash
chmod +x setup.sh
sudo bash setup.sh

# The script will:
# ✓ Install Docker & Docker Compose
# ✓ Install Certbot for SSL
# ✓ Create data directories
# ✓ Generate .env with random secrets
# ✓ Request Let's Encrypt certificates
# ✓ Start all containers
```

### 3. Manual Setup (Alternative)
```bash
# If you prefer manual control:

# 1. Install Docker
curl -fsSL https://get.docker.com | sudo sh

# 2. Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# 3. Create directories
mkdir -p data/redis data/qdrant data/certbot/www
touch data/redis/users.acl

# 4. Generate .env
cp .env.example .env
# Edit .env with your values, especially:
#   REDIS_PASSWORD (32 random chars)
#   API_KEY_KASYAF
#   NEXTAUTH_SECRET
#   NEXTAUTH_URL (your domain)
#   ADMIN_EMAIL

# 5. Get SSL certificate
sudo certbot certonly --webroot -w ./data/certbot/www \
  -d console.kasyaf.id -d vector.kasyaf.id \
  --email admin@kasyaf.id --agree-tos --non-interactive

# 6. Start containers
sudo docker-compose up -d --build
```

### 4. Verify Deployment
```bash
# Check container status
docker-compose ps
# All should show "Up" and "healthy"

# Check logs
docker-compose logs -f console

# Test endpoint
curl -X POST https://console.kasyaf.id/api/redis/[id]/exec \
  -H "Authorization: Bearer [password]" \
  -d '{"raw":"ping"}'
# Expected: {"result":"PONG"}
```

---

## 📋 File Descriptions

### 1. **docker-compose.yml**
**Purpose:** Orchestrate all containers (Redis, Qdrant, Console, Nginx)

**Key Features:**
- Redis 7 with ACL + persistence
- Qdrant 1.9.0 vector database
- Next.js 14 console app
- Nginx reverse proxy with SSL
- Health checks for all services
- Internal network isolation

**Usage:** `docker-compose up -d`, `docker-compose stop`, etc.

---

### 2. **nginx.conf**
**Purpose:** Reverse proxy with SSL/TLS termination

**Key Features:**
- HTTP → HTTPS redirect
- Two virtual hosts:
  - `console.kasyaf.id:443` → Console (:3000)
  - `vector.kasyaf.id:443` → Qdrant (:6333)
- Let's Encrypt certificate support
- Gzip compression
- Security headers
- Proper timeouts for long operations

**Note:** SSL certificates must be obtained with Certbot (see setup.sh)

---

### 3. **Dockerfile**
**Purpose:** Build Next.js 14 application image

**Key Features:**
- Multi-stage build (smaller final image)
- Node 20-alpine (lightweight)
- Proper signal handling with dumb-init
- Health checks
- Non-root user for security
- Respects Node.js best practices

**Build Command:**
```bash
docker-compose up -d --build  # Builds automatically
```

---

### 4. **.env.example**
**Purpose:** Template for environment variables

**Key Variables:**
- `REDIS_URL`: Internal Docker network connection
- `REDIS_PUBLIC_HOST`: External hostname for clients
- `QDRANT_URL`: Internal Qdrant connection
- `VECTOR_PUBLIC_HOST`: External Qdrant hostname
- `API_KEY_KASYAF`: API authentication key
- `APP_ENV=vps`: Production environment flag

**⚠️ DO NOT commit `.env` to git** (contains secrets)

**Setup:** `setup.sh` auto-generates from `.env.example`

---

### 5. **setup.sh**
**Purpose:** Fully automated VPS deployment

**Execution Steps:**
1. Checks root privileges
2. Installs Docker + Docker Compose
3. Installs Certbot + dependencies
4. Creates data directories
5. Generates `.env` with random secrets
6. Requests SSL certificates from Let's Encrypt
7. Builds and starts containers
8. Shows logs and status

**Usage:**
```bash
sudo bash setup.sh
```

**Expected Duration:** 3-5 minutes (faster on subsequent runs)

---

### 6. **redis-admin.ts** (CRITICAL)
**Purpose:** Redis ACL user management for multi-tenancy

**⚠️ CRITICAL BUG FIXES:**
This file implements the **FINAL ACL** that fixes all known issues:
1. ✓ NOAUTH Protocol error → Fixed by AUTH default first
2. ✓ NOPERM INFO → Added +info +ping +echo +hello
3. ✓ NOPERM keys → Added +keys +scan +dbsize
4. ✓ NOPERM bull:forensics:* → Added ~bull:* patterns

**Key Function: `createTenantUser(username, password)`**
```typescript
// Creates Redis ACL user with proper permissions:
// ✓ Key pattern isolation: ~{username}:* ~bull:* ~{username}:bull:* ~bull:forensics:*
// ✓ Command permissions: +@all -@dangerous -@admin
// ✓ Essential commands: +info +ping +keys +scan +dbsize +eval +evalsha
// ✓ Security: -flushall -flushdb -acl
```

**Other Functions:**
- `removeTenantUser()`: Clean up ACL user on deletion
- `isAclSupported()`: Check Redis version >= 6.0
- `listAclUsers()`: Debug utility
- `getAclUser()`: Get user details
- `flushAclUsers()`: Clear all non-default users

**Integration Point:**
Replace existing `lib/redis-admin.js` with this TypeScript version in your application.

---

### 7. **README-VPS-DEPLOYMENT.md**
**Purpose:** Comprehensive deployment & operations guide

**Sections:**
- Architecture diagram
- Quick start (5 min)
- Railway dev vs VPS prod comparison
- Bull queue job prefixing (critical fix)
- ACL permissions explained
- Operations (start/stop/backup/restore)
- Security best practices
- Troubleshooting guide
- API endpoint reference
- Load testing examples

---

## 🔐 Security Configuration

### Isolation Layers
1. **Redis in Docker**: No external port exposure
2. **Nginx SSL**: Encrypts client ↔ server traffic
3. **Redis ACL**: Tenant key isolation at database level
4. **Docker Network**: Internal `kasyaf-net` bridges services

### Secrets Management
- `REDIS_PASSWORD`: 32 random chars (generated by setup.sh)
- `API_KEY_KASYAF`: API authentication (generated by setup.sh)
- `NEXTAUTH_SECRET`: Session encryption (manual)
- All stored in `.env`, never in Git

### SSL/TLS
- **Automated:** Certbot + Let's Encrypt (free)
- **Auto-renewal:** Cron job renewals (90-day cycle)
- **Verification:** Webroot method (no DNS changes needed)

---

## 🧪 Testing After Deployment

### 1. Health Checks
```bash
# All containers should show "healthy"
docker-compose ps

# Individual health
docker-compose exec redis redis-cli -a ${REDIS_PASSWORD} ping
# Expected: PONG

docker-compose exec qdrant curl http://localhost:6333/health
# Expected: {"status":"ok"}

curl http://localhost:3000
# Expected: HTTP 200
```

### 2. API Test
```bash
# Using Bearer token authentication
INSTANCE_ID="generated-by-app"
INSTANCE_PASSWORD="generated-by-app"

curl -X POST https://console.kasyaf.id/api/redis/${INSTANCE_ID}/exec \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${INSTANCE_PASSWORD}" \
  -d '{"raw":"ping"}'

# Expected response:
# {"result":"PONG"}
```

### 3. ACL Test
```bash
# Verify tenant user was created with correct permissions
docker-compose exec redis redis-cli -a ${REDIS_PASSWORD} ACL LIST | grep user_
# Should show tenant users with:
# user={username} ... ~{username}:* ~bull:* ... +@all -@dangerous ...
```

### 4. Vector DB Test
```bash
# Check Qdrant is running
curl https://vector.kasyaf.id/collections

# Should return empty collections (or existing ones)
# {"result":{"collections":[]}}
```

---

## 📊 Resource Requirements

### Minimum
- 2 GB RAM
- 1 vCPU
- 20 GB disk (for data/redis + data/qdrant)

### Recommended
- 4+ GB RAM
- 2+ vCPU
- 100 GB disk

### Scaling Tips
- Monitor with `docker stats`
- Increase Redis maxmemory: `CONFIG SET maxmemory 4gb`
- Add load balancer for multiple VPS instances
- Use managed Redis/Qdrant for high volume

---

## 🔄 Upgrade Procedure

### Update Application Code
```bash
git pull origin main
docker-compose up -d --build console

# No data loss - only console container rebuilt
```

### Update Redis Version
```bash
# 1. Edit docker-compose.yml:
#    redis: image: redis:7-alpine → redis:8-alpine

# 2. Pull new image
docker-compose pull redis

# 3. Restart (creates backup before switching)
docker-compose up -d redis

# 4. Verify
docker-compose exec redis redis-cli -a ${REDIS_PASSWORD} INFO server | grep redis_version
```

### Backup Before Upgrade
```bash
tar -czf backup-before-upgrade-$(date +%Y%m%d).tar.gz data/
```

---

## 🆘 Emergency Commands

```bash
# Stop all containers (preserve data)
docker-compose stop

# View all logs
docker-compose logs | tail -100

# Restart specific service
docker-compose restart redis

# Full cleanup + restart
docker-compose down
docker-compose up -d --build

# View container resource usage
docker stats

# Connect to Redis CLI
docker-compose exec redis redis-cli -a ${REDIS_PASSWORD}
```

---

## ✨ What's Different from Railway Dev

| Aspect | Railway | VPS (This Package) |
|--------|---------|-------------------|
| **Deployment** | `git push` | Docker Compose + setup.sh |
| **Redis Host** | Railway network | Local Docker + Nginx proxy |
| **Qdrant** | Not included | Included |
| **Certificates** | Railway managed | Let's Encrypt (Certbot) |
| **Backups** | Railway snapshots | Manual tar + restore |
| **Monitoring** | Railway dashboard | Docker logs + custom setup |
| **Secrets** | Environment variables | .env file |
| **Cost** | Railway credits | VPS hourly/monthly |

---

## 🎯 Next Steps

1. **Download all 7 files** from this output
2. **Copy to your VPS**: `/opt/kasyaf-console/`
3. **Run setup**: `sudo bash setup.sh`
4. **Wait 3-5 minutes** for SSL certificate
5. **Test**: `curl https://console.kasyaf.id`
6. **Configure DNS**: Point `console.kasyaf.id` and `vector.kasyaf.id`
7. **Create first tenant**: Via app UI
8. **Test PING**: Via REST API

---

## 📞 Support

If something goes wrong:
1. Check **README-VPS-DEPLOYMENT.md** troubleshooting section
2. View logs: `docker-compose logs -f`
3. Check disk space: `df -h`
4. Check Docker daemon: `docker ps`
5. Restart services: `docker-compose restart`

---

**All files ready for production deployment!** 🚀

Generated: 2024-08-19
