# EPQ Single-VM Deployment: Google Cloud, Nginx, PostgreSQL

This deployment keeps local development unchanged:

- Frontend dev: `http://localhost:3000`
- Backend dev: `http://localhost:8001`
- Local database: SQLite `epq.db`

Production uses Docker Compose on one VM:

- Nginx reverse proxy on ports `80` and `443`
- Next.js frontend service on the internal Docker network
- FastAPI backend service on the internal Docker network
- PostgreSQL service with a persistent Docker volume

## Files Added Or Changed

- `docker-compose.yml` starts `postgres`, `backend`, `frontend`, and `nginx`.
- `deploy/nginx/epq.conf` contains the Nginx reverse proxy and HTTPS settings.
- `.env.production.example` lists production-only environment variables.
- `scripts/migrate_sqlite_to_postgres.py` copies core data from SQLite to PostgreSQL.
- `app/services/db_adapter.py` selects SQLite for dev or PostgreSQL for production.
- `app/services/db.py`, `app/services/auth_db.py`, and direct DB routes now use the shared adapter.

## 1. Create The VM

Create a Google Cloud Ubuntu VM, then open firewall ports:

```bash
gcloud compute firewall-rules create epq-http --allow tcp:80 --target-tags epq
gcloud compute firewall-rules create epq-https --allow tcp:443 --target-tags epq
```

Point your DNS `A` record for `example.com` to the VM external IP.

## 2. Install Docker

```bash
sudo apt-get update
sudo apt-get install -y ca-certificates curl git
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo tee /etc/apt/keyrings/docker.asc >/dev/null
sudo chmod a+r /etc/apt/keyrings/docker.asc
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | sudo tee /etc/apt/sources.list.d/docker.list >/dev/null
sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
sudo usermod -aG docker "$USER"
```

Log out and back in so Docker permissions apply.

## 3. Configure Secrets

```bash
cp .env.production.example .env.production
nano .env.production
```

Set:

- `DOMAIN`
- `PUBLIC_BASE_URL`
- `POSTGRES_PASSWORD`
- `SESSION_SECRET`
- Gmail variables, if email is enabled

Generate a session secret:

```bash
python -c "import secrets; print(secrets.token_hex(32))"
```

In `deploy/nginx/epq.conf`, replace every `example.com` with your real domain.

## 4. Issue HTTPS Certificate

```bash
docker run --rm \
  -v "$(pwd)/deploy/certbot/conf:/etc/letsencrypt" \
  certbot/certbot certonly \
  --standalone \
  --preferred-challenges http \
  -d example.com \
  -d www.example.com
```

## 5. Start Production Services

```bash
docker compose --env-file .env.production up -d --build
```

## 6. Migrate SQLite Data

Copy your current `epq.db` to the VM project root, then run:

```bash
docker compose --env-file .env.production cp epq.db backend:/app/epq.db
docker compose --env-file .env.production exec backend \
  python scripts/migrate_sqlite_to_postgres.py --sqlite /app/epq.db
```

Use `--truncate` only when you intentionally want to clear matching PostgreSQL tables first.

## 7. Verify

```bash
curl -I https://example.com
curl https://example.com/healthz
docker compose --env-file .env.production ps
docker compose --env-file .env.production logs --tail=100 backend
```

## 8. Updating The App

```bash
git pull
docker compose --env-file .env.production build
docker compose --env-file .env.production up -d
docker compose --env-file .env.production ps
```

## 9. Backups

Back up PostgreSQL:

```bash
docker compose --env-file .env.production exec postgres \
  pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB" > epq-backup.sql
```

Back up generated files:

```bash
docker run --rm -v python_project_reports_data:/data -v "$(pwd):/backup" alpine \
  tar czf /backup/reports-backup.tgz -C /data .
```

## Production Notes

- Do not commit `.env.production`.
- Keep `HTTPS_ONLY_COOKIES=true` in production.
- Keep PostgreSQL private to the Docker network; do not publish port `5432`.
- Nginx is the only public entry point.
- Renew certificates with Certbot before expiry, then reload Nginx.
- Local development remains controlled by `run-dev.ps1` and uses SQLite unless you explicitly set `DATABASE_URL`.
