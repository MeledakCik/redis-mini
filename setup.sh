#!/bin/bash

# Kasyaf Console VPS Setup Script
# Run on fresh Ubuntu/Debian VPS as root: bash setup.sh

set -e

echo "=========================================="
echo "Kasyaf Console VPS Setup"
echo "=========================================="

# Check if running as root
if [[ $EUID -ne 0 ]]; then
   echo "This script must be run as root"
   exit 1
fi

# 1. Install Docker
echo "[1/6] Installing Docker..."
if ! command -v docker &> /dev/null; then
    curl -fsSL https://get.docker.com | sh
    usermod -aG docker $SUDO_USER
    echo "Docker installed successfully"
else
    echo "Docker already installed"
fi

# 2. Install Docker Compose
echo "[2/6] Installing Docker Compose..."
if ! command -v docker-compose &> /dev/null; then
    curl -fL "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    chmod +x /usr/local/bin/docker-compose
    echo "Docker Compose installed successfully"
else
    echo "Docker Compose already installed"
fi

# 3. Install Certbot for SSL
echo "[3/6] Installing Certbot..."
apt-get update
apt-get install -y certbot python3-certbot-nginx curl wget
echo "Certbot installed successfully"

# 4. Create necessary directories
echo "[4/6] Creating data directories..."
mkdir -p data/redis
mkdir -p data/qdrant
mkdir -p data/certbot/www
touch data/redis/users.acl
chmod 755 data/redis
chmod 755 data/qdrant
chmod 755 data/certbot/www
echo "Directories created"

# 5. Generate .env file if not exists
echo "[5/6] Configuring environment..."
if [ ! -f .env ]; then
    echo "Generating .env from .env.example..."
    cp .env.example .env
    
    # Generate random Redis password (32 chars)
    REDIS_PASS=$(openssl rand -base64 24 | tr -dc A-Za-z0-9 | head -c 32)
    sed -i "s/CHANGE_ME_32_RANDOM/$REDIS_PASS/g" .env
    
    # Generate random API key (32 chars)
    API_KEY=$(openssl rand -base64 24 | tr -dc A-Za-z0-9 | head -c 32)
    sed -i "s/CHANGE_ME_SECURE_RANDOM_SECRET/$API_KEY/g" .env
    sed -i "s/CHANGE_ME/$API_KEY/g" .env
    
    echo "✓ .env generated with random secrets"
    echo ""
    echo "NOTE: Update the following in .env if needed:"
    echo "  - NEXTAUTH_URL (your domain)"
    echo "  - ADMIN_EMAIL (your email)"
    echo "  - SMTP settings (for email notifications)"
else
    echo ".env already exists, skipping generation"
fi

# 6. Check DNS before attempting SSL certificate
echo "[6/6] SSL Certificate Setup..."
echo ""
echo "IMPORTANT: Before proceeding with SSL certificate generation,"
echo "please ensure your domains are pointing to this server:"
echo ""
echo "  console.kasyaf.id -> $(hostname -I | awk '{print $1}')"
echo "  vector.kasyaf.id  -> $(hostname -I | awk '{print $1}')"
echo ""
read -p "Have you configured DNS records? (yes/no) " -n 3 -r
echo
if [[ $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
    echo "Starting Docker containers for SSL setup..."
    docker-compose up -d nginx
    
    echo "Waiting for nginx to be ready..."
    sleep 5
    
    echo "Requesting SSL certificates from Let's Encrypt..."
    certbot certonly --webroot -w ./data/certbot/www \
        -d console.kasyaf.id -d vector.kasyaf.id \
        --email admin@kasyaf.id \
        --agree-tos \
        --no-eff-email \
        --non-interactive \
        --rsa-key-size 4096 || {
        echo "⚠ Certificate generation may have failed. Common reasons:"
        echo "  - DNS not configured correctly"
        echo "  - Port 80 blocked by firewall"
        echo "  - Domain not reachable"
        echo ""
        echo "You can retry later with: certbot certonly --webroot -w ./data/certbot/www -d console.kasyaf.id -d vector.kasyaf.id"
        echo ""
    }
    
    # Generate Diffie-Hellman parameters for extra security (one-time, takes ~1-2 min)
    if [ ! -f /etc/letsencrypt/dhparam-2048.pem ]; then
        echo "Generating Diffie-Hellman parameters (this may take a few minutes)..."
        openssl dhparam -out /etc/letsencrypt/dhparam-2048.pem 2048
    fi
else
    echo "⚠ Skipping SSL certificate generation. Configure DNS and run manually:"
    echo "   certbot certonly --webroot -w ./data/certbot/www -d console.kasyaf.id -d vector.kasyaf.id"
    echo ""
fi

# 7. Start full stack
echo ""
echo "Building and starting full application stack..."
docker-compose down 2>/dev/null || true
docker-compose up -d --build

echo ""
echo "=========================================="
echo "✓ Setup Complete!"
echo "=========================================="
echo ""
echo "Application Status:"
docker-compose ps
echo ""
echo "Logs (last 50 lines):"
docker-compose logs --tail=50 -f
