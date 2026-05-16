#!/usr/bin/env bash
set -euo pipefail

if [[ ! -f .env.production ]]; then
  echo "Missing .env.production. Copy .env.production.example to .env.production and fill required values first."
  exit 1
fi

set -a
source .env.production
set +a

if ! command -v docker >/dev/null 2>&1; then
  echo "Docker is required but not installed."
  exit 1
fi

if docker compose version >/dev/null 2>&1; then
  COMPOSE="docker compose"
elif command -v docker-compose >/dev/null 2>&1; then
  COMPOSE="docker-compose"
else
  echo "Docker Compose is required but not installed."
  exit 1
fi

echo "Building images..."
$COMPOSE --env-file .env.production build --pull

echo "Starting services..."
$COMPOSE --env-file .env.production up -d

echo "Current status:"
$COMPOSE --env-file .env.production ps

echo "Health probe:"
curl -kfsS "https://${DOMAIN}/healthz" || curl -fsS "http://${DOMAIN}/healthz" || true
