# Kasyaf Console - VPS Production Deployment

A mini-Upstash Redis + Qdrant console for managing multi-tenant databases on your own infrastructure.

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────┐
│                  Internet Clients                     │
└────────────────────┬────────────────────────────────┘
                     │ HTTPS
┌────────────────────▼────────────────────────────────┐
│                    Nginx                             │
│  ✓ Reverse Proxy  ✓ SSL/TLS  ✓ Rate Limiting        │
├──────────────────────────────────────────────────────┤
│         console.kasyaf.id    vector.kasyaf.id        │
└────────┬──────────────────────────────┬──────────────┘
         │ :3000                       │ :6333
         │                             │
┌────────▼─────────────┐   ┌──────────▼──────────────┐
│   Next.js Console    │   │   Qdrant Vector DB      │
│  (Docker Container)  │   │  (Docker Container)     │
├──────────────────────┤   ├─────────────────────────┤
│ ✓ Data Browser       │   │ ✓ Embeddings Storage    │
│ ✓ CLI Terminal       │   │ ✓ Similarity Search     │
│ ✓ REST API Routes    │   │ ✓ Vector Indexing       │
│ ✓ User Management    │   │ ✓ Backup/Restore        │
└────────┬─────────────┘   └─────────────────────────┘
         │ TCP :6379 (internal)
         │ (Redis ACL authenticated)
         │
┌────────▼──────────────────────────────────────────┐
│           Redis 7-Alpine (Container)               │
├───────────────────────────────────────────────────┤
│ ✓ ACL User Management                             │
│ ✓ Key Prefix Isolation                            │
│ ✓ Persistence (AOF + Snapshots)                   │
│ ✓ Docker Network Isolation                        │
└───────────────────────────────────────────────────┘
```

## 🚀 Quick Start (5 minutes)

### Prerequisites
- Ubuntu 20.04+ or Debian 11+ VPS
- Public domain names pointing to your VPS:
  - `console.kasyaf.id` (Kasyaf Console UI)
  - `vector.kasyaf.id` (Qdrant Vector DB API)
- SSH access with root or sudo
- Open ports: 80 (HTTP), 443 (HTTPS)

### Step 1: Clone/Download Files
```bash
git clone <your-repo> /opt/kasyaf-console
cd /opt/kasyaf-console
```

### Step 2: Run Setup Script
```bash
chmod +x setup.sh
sudo bash setup.sh
```

The script will:
1. ✓ Install Docker & Docker Compose
2. ✓ Install Certbot for SSL certificates
3. ✓ Create data directories
4. ✓ Generate `.env` with random secrets
5. ✓ Request Let's Encrypt SSL certificate
6. ✓ Start the full Docker stack

### Step 3: Verify Deployment
```bash
# Check running containers
docker-compose ps

# View logs
docker-compose logs -f

# Test Redis (should get PONG)
curl -X POST https://console.kasyaf.id/api/redis/[instance-id]/exec \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer [instance-password]" \
  -d '{"raw":"ping"}'

# Response: {"result":"PONG"}
```

---

## 🔑 Railway Dev vs VPS Production

### Key Differences

| Aspect | Railway Dev | VPS Production |
|--------|------------|----------------|
| **Redis Host** | `tokaido.proxy.rlwy.net:15576` | `redis:6379` (Docker internal) |
| **Redis Public Host** | `tokaido.proxy.rlwy.net:15576` | `console.kasyaf.id:6379` |
| **Vector DB** | Not deployed | `vector.kasyaf.id` (Qdrant) |
| **Networking** | Public Railway network | Docker internal + Nginx reverse proxy |
| **SSL** | Railway managed | Self-signed or Let's Encrypt |
| **Cost** | Railway credits | Your VPS cost |
| **Scaling** | Railway auto-scale | Manual container management |
| **Updates** | `git push` auto-deploy | Manual `docker-compose pull && up -d` |

### Environment Variables (`.env`)

**Railway** (dev):
```env
REDIS_URL=redis://default:password@tokaido.proxy.rlwy.net:15576
REDIS_PUBLIC_HOST=tokaido.proxy.rlwy.net:15576  # External clients see this
QDRANT_URL=not_used  # No Vector DB on Railway
```

**VPS** (prod):
```env
REDIS_URL=redis://default:password@redis:6379  # Internal Docker network
REDIS_PUBLIC_HOST=console.kasyaf.id:6379  # External clients see this
QDRANT_URL=http://qdrant:6333  # Internal Docker network
VECTOR_PUBLIC_HOST=vector.kasyaf.id  # External clients see this
```

### Critical Fix: Bull Queue Job Prefixing

Bull queue jobs store metadata in Redis with key patterns like `bull:queue-name:*`.

**OLD ACL (broken):**
```redis
ACL SETUSER {username} on >{password} ~{username}:* +@all -@dangerous
# ❌ NOPERM error for bull:* because only ~{username}:* is allowed
```

**NEW ACL (fixed):**
```redis
ACL SETUSER {username} on >{password} \
  ~{username}:* \
  ~bull:* \
  ~{username}:bull:* \
  ~bull:forensics:* \
  +@all -@dangerous -@admin -flushall -flushdb -acl \
  +info +ping +echo +hello +keys +scan +dbsize +eval +evalsha
```

**Application Usage:**
```javascript
// OLD (doesn't work on prod with standard ACL)
new Queue('forensics', { connection });

// NEW (works everywhere - prefix scopes to tenant)
new Queue('forensics', { 
  connection,
  prefix: `${username}:bull`  // Results in keys like: user_abc123:bull:forensics:*
});
```

---

## 📋 ACL Permissions Explained

```redis
ACL SETUSER {username} \
  on                                    # User enabled
  >{password}                          # Password with > (hashed)
  ~{username}:*                        # Allow keys like: user_abc:*
  ~bull:*                              # Allow Bull job queues
  ~{username}:bull:*                   # Allow tenant-specific Bull jobs
  ~bull:forensics:*                    # Allow forensics queue
  +@all                                # Allow all commands
  -@dangerous                          # EXCEPT dangerous commands
  -@admin                              # EXCEPT admin commands
  -flushall -flushdb -acl              # EXCEPT these specific commands
  +info +ping +echo +hello             # BUT allow these utility commands
  +keys +scan +dbsize                  # BUT allow these scan commands
  +eval +evalsha                       # BUT allow Lua scripting
```

### What Each Part Does
- `~{username}:*`: Tenant can only see their own keys
- `-@dangerous`: Blocks FLUSHALL, FLUSHDB, SHUTDOWN, MONITOR, etc.
- `-@admin`: Blocks CONFIG, ACL, CLUSTER, REPLICAOF, etc.
- `+info`: Allow INFO (needed for monitoring)
- `+keys`: Allow KEYS (needed for Data Browser)
- `+scan`: Allow SCAN (efficient key iteration)
- `+eval`: Allow Lua scripts (some apps need this)

---

## 🛠️ Operations

### Start/Stop Services
```bash
# Start all containers
docker-compose up -d

# Stop all containers (preserve data)
docker-compose stop

# Restart all containers
docker-compose restart redis

# View logs
docker-compose logs -f console
docker-compose logs -f redis

# Enter Redis CLI
docker-compose exec redis redis-cli -a ${REDIS_PASSWORD}

# Enter Qdrant CLI (for vector DB)
docker-compose exec qdrant curl http://localhost:6333/collections
```

### Backup & Restore

**Backup Redis Data:**
```bash
# Copy Redis persistent storage
tar -czf redis-backup-$(date +%Y%m%d).tar.gz data/redis/

# Upload to S3/backup service
aws s3 cp redis-backup-*.tar.gz s3://my-backups/
```

**Restore from Backup:**
```bash
# Stop Redis
docker-compose stop redis

# Restore data
tar -xzf redis-backup-*.tar.gz

# Start Redis
docker-compose up -d redis
```

**Backup Qdrant Snapshots:**
```bash
# Qdrant snapshots are in data/qdrant/
tar -czf qdrant-backup-$(date +%Y%m%d).tar.gz data/qdrant/
```

### Update Application

**Update Next.js Code:**
```bash
git pull origin main
docker-compose up -d --build console
```

**Update Redis Version:**
```bash
# Edit docker-compose.yml: redis: image: redis:7-alpine → redis:8-alpine
docker-compose pull redis
docker-compose up -d redis
```

### Monitor Resources

```bash
# Check container resource usage
docker stats

# Check disk usage
du -sh data/redis data/qdrant

# Check Redis memory
docker-compose exec redis redis-cli -a ${REDIS_PASSWORD} INFO memory

# Check Qdrant usage
curl http://localhost:6333/collections | jq '.result[].points_count'
```

### SSL Certificate Renewal

Let's Encrypt certificates expire after 90 days. Certbot auto-renews them:

```bash
# Manual renewal (usually automatic via cron)
certbot renew --webroot -w ./data/certbot/www

# Test renewal (dry-run, doesn't change anything)
certbot renew --dry-run

# Check certificate expiry
openssl x509 -enddate -noout -in /etc/letsencrypt/live/console.kasyaf.id/cert.pem
```

---

## 🔐 Security Best Practices

### 1. Change Default Secrets
```bash
# In .env, replace placeholders:
REDIS_PASSWORD=generated_by_setup.sh  # 32-char random
API_KEY_KASYAF=your_secure_key        # Only you know this
NEXTAUTH_SECRET=your_secure_secret    # For session auth
```

### 2. Firewall Rules
```bash
# Only allow inbound on 22 (SSH), 80 (HTTP), 443 (HTTPS)
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw enable

# Verify
sudo ufw status
```

### 3. Regular Updates
```bash
# Keep base system updated
sudo apt-get update && sudo apt-get upgrade -y

# Keep Docker images updated
docker-compose pull
docker-compose up -d

# Check for vulnerabilities in dependencies
npm audit
npm audit fix
```

### 4. Redis Network Isolation
Redis runs inside Docker network `kasyaf-net` and is NOT exposed directly:
- ✓ Only `console` container can reach Redis on port 6379
- ✓ External clients access via REST API at `https://console.kasyaf.id/api/redis/[id]/exec`
- ✓ Nginx reverse proxy validates Bearer tokens

### 5. Monitoring & Alerts
```bash
# Set up cron to check service health
cat > /etc/cron.d/kasyaf-health << 'EOF'
*/5 * * * * /usr/bin/curl -f http://localhost:3000 > /dev/null 2>&1 || /usr/bin/docker-compose restart console
EOF
```

---

## 🐛 Troubleshooting

### Issue: "NOAUTH Protocol error"
**Cause:** Redis password is incorrect or missing in connection string

**Fix:**
```bash
# Check current password in .env
grep REDIS_PASSWORD .env

# Verify it's used in REDIS_URL
grep REDIS_URL .env

# Restart Redis if password changed
docker-compose restart redis
```

### Issue: "NOPERM INFO" or "NOPERM keys"
**Cause:** ACL user doesn't have permission for command

**Fix:** Ensure redis-admin.ts createTenantUser() includes:
```typescript
// These MUST be in the ACL SETUSER call:
'+info +ping +echo +hello +keys +scan +dbsize +eval +evalsha'
```

### Issue: "NOPERM bull:forensics:*"
**Cause:** Application uses Bull queue without proper ACL patterns

**Fix:**
```javascript
// When creating queue:
new Queue('forensics', {
  connection: redisClient,
  prefix: `${username}:bull`  // This prefixes all Bull keys
});

// Make sure ACL allows: ~bull:* ~{username}:bull:* ~bull:forensics:*
```

### Issue: "SSL certificate not found"
**Cause:** Certbot failed to generate certificate

**Fix:**
```bash
# Check DNS is pointing correctly
nslookup console.kasyaf.id

# Try manual renewal
certbot certonly --webroot -w ./data/certbot/www \
  -d console.kasyaf.id -d vector.kasyaf.id \
  --email admin@kasyaf.id \
  --agree-tos --non-interactive

# Check logs
docker logs nginx  # or cat /var/log/certbot.log
```

### Issue: "Connection refused" to Redis
**Cause:** Redis container not running or not healthy

**Fix:**
```bash
# Check status
docker-compose ps redis

# Restart Redis
docker-compose restart redis

# Wait for health check to pass
docker-compose logs redis

# Check port binding
docker port redis  # Should show 6379/tcp (no external binding)
```

### Issue: Slow queries or high memory
**Cause:** Key bloat, inefficient commands, memory leaks

**Fix:**
```bash
# Check top keys consuming memory
docker-compose exec redis redis-cli -a ${REDIS_PASSWORD} --bigkeys

# Check command stats
docker-compose exec redis redis-cli -a ${REDIS_PASSWORD} INFO commandstats

# Identify slow commands
docker-compose exec redis redis-cli -a ${REDIS_PASSWORD} SLOWLOG GET 10

# Set max memory policy
docker-compose exec redis redis-cli -a ${REDIS_PASSWORD} CONFIG SET maxmemory 2gb
docker-compose exec redis redis-cli -a ${REDIS_PASSWORD} CONFIG SET maxmemory-policy allkeys-lru
```

---

## 📊 Testing & Validation

### Test REST API
```bash
# Get instance ID and password from your app
INSTANCE_ID="your-instance-id"
INSTANCE_PASSWORD="your-instance-password"

# Test PING command
curl -X POST https://console.kasyaf.id/api/redis/${INSTANCE_ID}/exec \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${INSTANCE_PASSWORD}" \
  -d '{"raw":"ping"}' \
  -v

# Expected response:
# {"result":"PONG"}

# Test SET command
curl -X POST https://console.kasyaf.id/api/redis/${INSTANCE_ID}/exec \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${INSTANCE_PASSWORD}" \
  -d '{"raw":"set mykey myvalue"}' \
  -v

# Expected response:
# {"result":"OK"}

# Test GET command
curl -X POST https://console.kasyaf.id/api/redis/${INSTANCE_ID}/exec \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${INSTANCE_PASSWORD}" \
  -d '{"raw":"get mykey"}' \
  -v

# Expected response:
# {"result":"myvalue"}
```

### Load Testing
```bash
# Install Apache Bench
sudo apt-get install apache2-utils

# Test 1000 requests, 10 concurrent
ab -n 1000 -c 10 https://console.kasyaf.id/

# Test API endpoint specifically
ab -n 100 -c 5 -H "Authorization: Bearer ${INSTANCE_PASSWORD}" \
  -p test.json \
  https://console.kasyaf.id/api/redis/${INSTANCE_ID}/exec
```

---

## 📚 File Structure

```
.
├── docker-compose.yml          # Main orchestration
├── Dockerfile                   # Next.js app image
├── nginx.conf                   # Reverse proxy config
├── setup.sh                     # Initial deployment
├── .env.example                 # Environment template
├── .env                         # Production secrets (generated)
├── data/
│   ├── redis/
│   │   ├── dump.rdb            # Redis snapshot backup
│   │   ├── appendonly.aof      # Redis AOF (append-only file)
│   │   └── users.acl           # ACL rules file
│   ├── qdrant/                 # Qdrant persistent storage
│   └── certbot/www/            # Let's Encrypt verification
├── src/
│   ├── lib/
│   │   ├── redis-admin.ts      # ACL management (CRITICAL)
│   │   ├── tenant.js           # Multi-tenancy helpers
│   │   ├── redis-pool.js       # Connection pooling
│   │   └── ...
│   ├── app/
│   │   ├── api/
│   │   │   ├── redis/[id]/exec/route.js      # ✓ Main PONG endpoint
│   │   │   ├── vector/[id]/exec/route.js     # Vector DB exec
│   │   │   └── ...
│   │   └── ...
│   └── ...
└── README.md                    # This file
```

---

## 🔗 API Endpoints (POST)

| Endpoint | Description | Auth |
|----------|-------------|------|
| `/api/redis/[id]/exec` | Execute Redis command | Bearer token |
| `/api/redis/[id]/stats` | Get Redis stats (INFO) | Bearer token |
| `/api/redis/[id]/keys` | List keys (KEYS command) | Bearer token |
| `/api/redis/[id]/keyspace` | Keyspace info | Bearer token |
| `/api/vector/[id]/exec` | Execute Qdrant command | Bearer token |
| `/api/vector/[id]/points` | List vector points | Bearer token |
| `/api/config` | System configuration | API Key header |

---

## 📖 Documentation

- **Redis Documentation**: https://redis.io/commands/
- **Qdrant Documentation**: https://qdrant.tech/documentation/
- **Next.js Documentation**: https://nextjs.org/docs
- **Docker Compose**: https://docs.docker.com/compose/
- **Let's Encrypt Certbot**: https://certbot.eff.org/

---

## 💬 Support & Contributing

For issues, questions, or contributions:
1. Check troubleshooting section above
2. Review logs: `docker-compose logs -f`
3. Create an issue with:
   - Error message (sanitize secrets)
   - Steps to reproduce
   - Environment info (OS, Docker version, etc.)
   - Docker stats output

---

## 📝 License

MIT License - See LICENSE file for details

---

**Last Updated**: 2024-08-19  
**Version**: 2.0 (VPS Production)  
**Status**: ✅ Production Ready
