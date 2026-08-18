#!/bin/bash
# Kasyaf Console VPS Setup Script - FINAL FIX
# Run on fresh Ubuntu/Debian VPS as root: bash setup.sh

set -e

echo "=========================================="
echo "Kasyaf Console VPS Setup - FINAL"
echo "=========================================="

if [[ $EUID -ne 0 ]]; then
   echo "This script must be run as root - use sudo bash setup.sh"
   exit 1
fi

# 1. Install Docker
echo "[1/7] Installing Docker..."
if ! command -v docker &> /dev/null; then
    curl -fsSL https://get.docker.com | sh
    usermod -aG docker $SUDO_USER || true
    echo "Docker installed"
else
    echo "Docker already installed"
fi

# 2. Install Docker Compose v2 (plugin)
echo "[2/7] Installing Docker Compose..."
if ! docker compose version &> /dev/null; then
    curl -fL "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    chmod +x /usr/local/bin/docker-compose
fi
# Use docker compose (v2) fallback to docker-compose (v1)
DC="docker compose"
if ! $DC version &> /dev/null; then DC="docker-compose"; fi
echo "Using: $DC"

# 3. Install Certbot
echo "[3/7] Installing Certbot..."
apt-get update -y
apt-get install -y certbot python3-certbot-nginx curl wget openssl

# 4. Create directories with correct permission (FIX EACCES)
echo "[4/7] Creating data directories..."
mkdir -p data/redis data/qdrant data/certbot/www
touch data/redis/users.acl
chmod -R 777 data
chmod 644 data/redis/users.acl
echo "Directories created with 777 (fix Redis AOF write)"

# 5. Generate .env (FIX placeholder logic)
echo "[5/7] Configuring .env..."
if [ ! -f .env ]; then
    if [ -f .env.example ]; then
        cp .env.example .env
    else
        cat > .env <<'EOF'
DEPLOYMENT_MODE=docker
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=CHANGE_ME_32_RANDOM
REDIS_URL=redis://default:CHANGE_ME_32_RANDOM@redis:6379
QDRANT_URL=http://qdrant:6333
AUTH_SECRET=CHANGE_ME_SECURE_RANDOM_SECRET
AUTH_URL=https://console.kasyaf.id
NEXTAUTH_URL=https://console.kasyaf.id
DATA_DIR=/app/data
NODE_ENV=production
PORT=3000
ADMIN_EMAIL=admin@kasyaf.id
EOF
    fi
    
    REDIS_PASS=$(openssl rand -base64 24 | tr -dc A-Za-z0-9 | head -c 32)
    # ganti semua placeholder
    sed -i "s/CHANGE_ME_32_RANDOM/$REDIS_PASS/g" .env
    sed -i "s/CHANGE_ME_SECURE_RANDOM_SECRET/$(openssl rand -base64 32)/g" .env
    sed -i "s/CHANGE_ME_SECURE_RANDOM/$(openssl rand -base64 24 | tr -dc A-Za-z0-9 | head -c 32)/g" .env
    sed -i "s/CHANGE_ME/$REDIS_PASS/g" .env
    
    echo "✓ .env generated"
    echo "  REDIS_PASSWORD=$REDIS_PASS"
else
    echo ".env exists, skip"
fi

# 6. SSL - FIX: start nginx dulu biar challenge bisa
echo "[6/7] SSL Certificate Setup..."
echo "Domains: console.kasyaf.id & vector.kasyaf.id -> $(hostname -I | awk '{print $1}')"
read -p "DNS sudah pointing? (yes/no): " -n 3 -r
echo
if [[ $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
    $DC up -d nginx
    sleep 5
    certbot certonly --webroot -w ./data/certbot/www         -d console.kasyaf.id -d vector.kasyaf.id         --email admin@kasyaf.id --agree-tos --no-eff-email --non-interactive --rsa-key-size 4096 || echo "SSL fail - cek DNS/port 80"
else
    echo "Skip SSL - jalankan manual nanti: certbot certonly --webroot -w ./data/certbot/www -d console.kasyaf.id -d vector.kasyaf.id"
fi

# 7. Start full stack
echo "[7/7] Building full stack..."
$DC down 2>/dev/null || true
$DC up -d --build

echo ""
echo "=========================================="
echo "✓ Setup Complete!"
echo "=========================================="
$DC ps
echo ""
echo "Logs console:"
$DC logs --tail=30 console
echo ""
echo "Cek: https://console.kasyaf.id (atau http://IP:3000)"
echo "PING test: docker exec -it redis redis-cli -a $REDIS_PASS PING -> harus PONG"
