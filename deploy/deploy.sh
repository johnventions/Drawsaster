#!/usr/bin/env bash
# Runs on the droplet (from the GitHub Actions deploy job) inside /opt/drawsaster.
# Usage: IMAGE=ghcr.io/owner/drawsaster:<sha> GHCR_USER=... GHCR_TOKEN=... ./deploy.sh
set -euo pipefail
cd "$(dirname "$0")"

PROJECT=drawsaster
UPSTREAM=drawsaster-app:5050
SITES_DIR=${SITES_DIR:-/opt/proxy/sites}

if [ ! -f .env ]; then
	cp env.example .env
	echo "Created .env from env.example; edit it to set your domain and storage."
fi
# shellcheck disable=SC1091
SITE_ADDRESS=$(grep -E '^SITE_ADDRESS=' .env | tail -1 | cut -d= -f2-)
if [ -z "$SITE_ADDRESS" ]; then
	echo "SITE_ADDRESS is not set in /opt/$PROJECT/.env" >&2
	exit 1
fi

if [ -n "${GHCR_TOKEN:-}" ]; then
	echo "$GHCR_TOKEN" | docker login ghcr.io -u "$GHCR_USER" --password-stdin >/dev/null
fi
[ -n "${SKIP_PULL:-}" ] || docker compose pull app
docker compose up -d --remove-orphans
if [ -n "${GHCR_TOKEN:-}" ]; then
	docker logout ghcr.io >/dev/null
fi

# wait for the container's health check
container=$(docker compose ps -q app)
for _ in $(seq 1 30); do
	status=$(docker inspect -f '{{.State.Health.Status}}' "$container")
	[ "$status" = healthy ] && break
	sleep 2
done
if [ "$status" != healthy ]; then
	echo "App did not become healthy (status: $status)" >&2
	docker compose logs --tail 50 app >&2
	exit 1
fi

# register this app's site with the shared proxy and reload it
cat > "$SITES_DIR/$PROJECT.caddy" <<SITE
$SITE_ADDRESS {
	encode zstd gzip
	reverse_proxy $UPSTREAM
}
SITE
docker exec caddy caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile >/dev/null
docker exec caddy caddy reload --config /etc/caddy/Caddyfile --adapter caddyfile

docker image prune -f >/dev/null
echo "Deployed $IMAGE at $SITE_ADDRESS"
