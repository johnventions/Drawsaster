#!/usr/bin/env bash
# One-time droplet setup. Run as root on the droplet:
#   bash setup-droplet.sh "<public key for GitHub Actions>"
#
# Creates:
#   - a "deploy" user (in the docker group) that GitHub Actions logs in as
#   - /opt/proxy: one shared Caddy reverse proxy on ports 80/443 for every project.
#     Each project drops a site file in /opt/proxy/sites/<project>.caddy and joins
#     the external Docker network "web"; Caddy routes by domain and handles HTTPS.
#   - /opt/drawsaster for this app's compose file and .env
#   - firewall rules for SSH, HTTP and HTTPS
set -euo pipefail

DEPLOY_KEY="${1:?Pass the deploy public key as the first argument}"

# deploy user
if ! id deploy >/dev/null 2>&1; then
	adduser --disabled-password --gecos "" deploy
fi
usermod -aG docker deploy
install -d -m 700 -o deploy -g deploy /home/deploy/.ssh
touch /home/deploy/.ssh/authorized_keys
grep -qxF "$DEPLOY_KEY" /home/deploy/.ssh/authorized_keys || echo "$DEPLOY_KEY" >> /home/deploy/.ssh/authorized_keys
chown deploy:deploy /home/deploy/.ssh/authorized_keys
chmod 600 /home/deploy/.ssh/authorized_keys

# shared network that projects and the proxy join
docker network inspect web >/dev/null 2>&1 || docker network create web

# shared Caddy proxy
install -d -o deploy -g deploy /opt/proxy /opt/proxy/sites
cat > /opt/proxy/compose.yml <<'YAML'
# Shared reverse proxy for every project on this droplet.
# Add a project: put a site file in ./sites/<project>.caddy, e.g.
#     app.example.com {
#         reverse_proxy <network-alias>:<port>
#     }
# run its containers on the external "web" network, then:
#     docker exec caddy caddy reload --config /etc/caddy/Caddyfile
name: proxy
services:
  caddy:
    image: caddy:2
    container_name: caddy
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
      - "443:443/udp"
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile:ro
      - ./sites:/etc/caddy/sites:ro
      - caddy_data:/data
      - caddy_config:/config
    networks:
      - web
volumes:
  caddy_data:
  caddy_config:
networks:
  web:
    external: true
YAML
if [ ! -f /opt/proxy/Caddyfile ]; then
	cat > /opt/proxy/Caddyfile <<'CADDY'
# Global options. Uncomment to get certificate expiry emails:
# {
# 	email you@example.com
# }

import /etc/caddy/sites/*.caddy
CADDY
fi
chown deploy:deploy /opt/proxy/compose.yml /opt/proxy/Caddyfile
(cd /opt/proxy && docker compose up -d)

# this app's folder (the deploy workflow fills it)
install -d -o deploy -g deploy /opt/drawsaster

# firewall
if command -v ufw >/dev/null; then
	ufw allow OpenSSH
	ufw allow 80/tcp
	ufw allow 443/tcp
	ufw allow 443/udp
	ufw --force enable
fi

echo "Done. GitHub Actions can now log in as deploy@$(hostname -I | awk '{print $1}')."
