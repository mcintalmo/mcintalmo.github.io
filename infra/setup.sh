#!/usr/bin/env bash
set -euo pipefail

# ── Config ────────────────────────────────────────────────────────────────────
REPO_URL="https://github.com/mcintalmo/mcintalmo.github.io.git"
APP_DIR="$HOME/mcintalmo.github.io"
API_DOMAIN="api.alexandermcintosh.com"
LIVEKIT_DOMAIN="livekit.alexandermcintosh.com"
EMAIL="mcintalmo@gmail.com"
COMPOSE_VERSION="2.27.0"

# ── Helpers ───────────────────────────────────────────────────────────────────
log() { echo -e "\n\033[1;34m==>\033[0m $*"; }
need() { command -v "$1" &>/dev/null || { echo "Missing: $1"; exit 1; }; }

# ── System packages ───────────────────────────────────────────────────────────
log "Updating system packages"
sudo apt-get update -qq
sudo apt-get upgrade -y -qq
sudo apt-get install -y -qq \
    git curl wget unzip \
    ca-certificates gnupg \
    certbot python3-certbot-nginx \
    ufw fail2ban

# ── Docker ────────────────────────────────────────────────────────────────────
log "Installing Docker"
if ! command -v docker &>/dev/null; then
    curl -fsSL https://get.docker.com | sh
    sudo usermod -aG docker "$USER"
    echo "NOTE: Log out and back in for Docker group to take effect"
fi

log "Installing Docker Compose"
if ! docker compose version &>/dev/null; then
    DOCKER_CONFIG="${DOCKER_CONFIG:-$HOME/.docker}"
    mkdir -p "$DOCKER_CONFIG/cli-plugins"
    curl -SL "https://github.com/docker/compose/releases/download/v${COMPOSE_VERSION}/docker-compose-linux-aarch64" \
        -o "$DOCKER_CONFIG/cli-plugins/docker-compose"
    chmod +x "$DOCKER_CONFIG/cli-plugins/docker-compose"
fi

# ── Firewall ──────────────────────────────────────────────────────────────────
log "Configuring UFW firewall"
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow http
sudo ufw allow https
# LiveKit ports
sudo ufw allow 7880/tcp
sudo ufw allow 7881/tcp
sudo ufw allow 7882/udp
sudo ufw allow 50000:60000/udp
sudo ufw --force enable

# NOTE: Oracle also has a separate security list in the web console —
# you must open these same ports there too, UFW alone isn't enough.

# ── fail2ban ──────────────────────────────────────────────────────────────────
log "Enabling fail2ban"
sudo systemctl enable --now fail2ban

# ── Clone repo ────────────────────────────────────────────────────────────────
log "Cloning repo"
if [ ! -d "$APP_DIR" ]; then
    git clone "$REPO_URL" "$APP_DIR"
else
    echo "Repo already exists at $APP_DIR, skipping clone"
fi

# ── Environment file ──────────────────────────────────────────────────────────
log "Setting up backend .env"
if [ ! -f "$APP_DIR/backend/.env" ]; then
    cp "$APP_DIR/.env.example" "$APP_DIR/backend/.env"
    echo "⚠️  Please edit $APP_DIR/backend/.env with your secrets (NVIDIA_API_KEY, LIVEKIT_API_KEY, LIVEKIT_API_SECRET) before running services."
else
    echo "backend .env already exists, skipping template copy"
fi

# ── Nginx ─────────────────────────────────────────────────────────────────────
log "Installing Nginx configuration"
sudo cp "$APP_DIR/infra/nginx/portfolio.conf" /etc/nginx/sites-available/portfolio.conf
sudo ln -sf /etc/nginx/sites-available/portfolio.conf /etc/nginx/sites-enabled/portfolio.conf
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl enable --now nginx
sudo systemctl restart nginx

# ── TLS via Certbot ───────────────────────────────────────────────────────────
log "Obtaining TLS certificates for API and LiveKit subdomains"
if [ ! -d "/etc/letsencrypt/live/$API_DOMAIN" ]; then
    sudo certbot --nginx \
        -d "$API_DOMAIN" \
        --non-interactive \
        --agree-tos \
        -m "$EMAIL"
else
    echo "Certificate for $API_DOMAIN already exists, skipping"
fi

if [ ! -d "/etc/letsencrypt/live/$LIVEKIT_DOMAIN" ]; then
    sudo certbot --nginx \
        -d "$LIVEKIT_DOMAIN" \
        --non-interactive \
        --agree-tos \
        -m "$EMAIL"
else
    echo "Certificate for $LIVEKIT_DOMAIN already exists, skipping"
fi

# Auto-renew
log "Setting up certbot auto-renewal"
sudo systemctl enable --now certbot.timer

# ── systemd service ───────────────────────────────────────────────────────────
log "Installing systemd service for docker compose"

# Docker Compose Services (runs all backend services)
sudo tee /etc/systemd/system/portfolio.service > /dev/null <<EOF
[Unit]
Description=Portfolio Docker Compose Services (auth, agent, livekit, whisper, kokoro)
Requires=docker.service
After=docker.service network-online.target

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=$APP_DIR/infra
ExecStart=/usr/bin/docker compose -f docker-compose.yaml up -d
ExecStop=/usr/bin/docker compose -f docker-compose.yaml down
User=$USER

[Install]
WantedBy=multi-user.target
EOF

log "Reloading systemd daemon and enabling portfolio service"
sudo systemctl daemon-reload
sudo systemctl enable portfolio.service

# ── Done ──────────────────────────────────────────────────────────────────────
log "Setup complete"
echo ""
echo "Next steps:"
echo "  1. Edit $APP_DIR/backend/.env with your secrets"
echo "  2. Log out and back in (Docker group membership)"
echo "  3. Start the entire container stack via:"
echo "     sudo systemctl start portfolio.service"