# EPQ Non-Docker Production Deployment

Target:

- Google Cloud Ubuntu VM
- PostgreSQL installed directly on the VM
- FastAPI backend managed by systemd
- Next.js frontend managed by PM2
- Nginx reverse proxy
- Certbot HTTPS

Local development remains unchanged: SQLite, backend on `localhost:8001`, frontend on `localhost:3000`.

## Files Added

- `deploy/env/epq-backend.env.example`
- `deploy/systemd/epq-backend.service`
- `deploy/pm2/ecosystem.config.cjs`
- `deploy/nginx/epq-vm-http.conf`
- `deploy/nginx/epq-vm.conf`
- `DEPLOYMENT_GCP_VM_SYSTEMD_PM2.md`

Docker files are untouched and optional.

## 1. Create The Google Cloud VM

Use Ubuntu 22.04 LTS or 24.04 LTS.

Open firewall ports:

```bash
gcloud compute firewall-rules create epq-http --allow tcp:80 --target-tags epq
gcloud compute firewall-rules create epq-https --allow tcp:443 --target-tags epq
```

Point your DNS `A` record to the VM external IP before running Certbot.

## 2. Install OS Packages

```bash
sudo apt-get update
sudo apt-get upgrade -y
sudo apt-get install -y \
  git curl ca-certificates build-essential \
  python3 python3-venv python3-pip \
  postgresql postgresql-contrib libpq-dev \
  nginx certbot python3-certbot-nginx \
  wkhtmltopdf fontconfig
```

Install Node.js 20 and PM2:

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
sudo npm install -g pm2
node --version
npm --version
pm2 --version
```

## 3. Create App User And Folders

```bash
sudo adduser --system --group --home /opt/epq epq
sudo mkdir -p /opt/epq /etc/epq /var/lib/epq/reports /var/lib/epq/uploads /var/backups/epq /var/www/certbot
sudo chown -R epq:epq /opt/epq /var/lib/epq /var/backups/epq
sudo chmod 750 /etc/epq
```

## 4. Deploy Code

Option A, clone on the VM:

```bash
sudo -u epq git clone YOUR_REPO_URL /opt/epq
cd /opt/epq
```

Option B, copy a release bundle to `/opt/epq`.

Do not copy local `.env` files from your Windows development machine.

## 5. PostgreSQL Setup

Create a database and least-privilege app user:

```bash
sudo -u postgres psql
```

Inside `psql`:

```sql
CREATE DATABASE epq_prod;
CREATE USER epq_app WITH ENCRYPTED PASSWORD 'CHANGE_ME_DB_PASSWORD';
GRANT ALL PRIVILEGES ON DATABASE epq_prod TO epq_app;
\c epq_prod
GRANT ALL ON SCHEMA public TO epq_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO epq_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO epq_app;
\q
```

Verify:

```bash
psql "postgresql://epq_app:CHANGE_ME_DB_PASSWORD@127.0.0.1:5432/epq_prod" -c "SELECT current_database(), current_user;"
```

## 6. Backend Environment

Copy the template and edit secrets:

```bash
sudo cp /opt/epq/deploy/env/epq-backend.env.example /etc/epq/epq-backend.env
sudo nano /etc/epq/epq-backend.env
```

Set:

- `PUBLIC_BASE_URL=https://your-domain.com`
- `FRONTEND_URL=https://your-domain.com`
- `DATABASE_URL=postgresql://epq_app:CHANGE_ME_DB_PASSWORD@127.0.0.1:5432/epq_prod`
- `SESSION_SECRET`
- Gmail values if email is enabled

Generate `SESSION_SECRET`:

```bash
python3 -c "import secrets; print(secrets.token_hex(32))"
```

Secure the file:

```bash
sudo chown root:epq /etc/epq/epq-backend.env
sudo chmod 640 /etc/epq/epq-backend.env
```

## 7. Backend Install And systemd

```bash
cd /opt/epq
sudo -u epq python3 -m venv /opt/epq/venv
sudo -u epq /opt/epq/venv/bin/pip install --upgrade pip wheel
sudo -u epq /opt/epq/venv/bin/pip install -r /opt/epq/requirements.txt
sudo cp /opt/epq/deploy/systemd/epq-backend.service /etc/systemd/system/epq-backend.service
sudo systemctl daemon-reload
sudo systemctl enable epq-backend
sudo systemctl start epq-backend
sudo systemctl status epq-backend --no-pager
```

Health check:

```bash
curl -fsS http://127.0.0.1:8001/healthz
curl -fsS http://127.0.0.1:8001/health/db
```

Expected DB health should report PostgreSQL.

## 8. Frontend Install And PM2

```bash
cd /opt/epq/frontend
sudo -u epq npm ci
sudo -u epq npm run build
sudo -u epq pm2 start /opt/epq/deploy/pm2/ecosystem.config.cjs
sudo -u epq pm2 save
sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u epq --hp /opt/epq
sudo systemctl enable pm2-epq
sudo systemctl restart pm2-epq
sudo -u epq pm2 status
```

Frontend check:

```bash
curl -I http://127.0.0.1:3000
```

## 9. Nginx And HTTPS

Create the temporary HTTP-only site for first certificate issuance:

```bash
sudo cp /opt/epq/deploy/nginx/epq-vm-http.conf /etc/nginx/sites-available/epq
sudo sed -i 's/example.com/your-domain.com/g' /etc/nginx/sites-available/epq
sudo ln -sfn /etc/nginx/sites-available/epq /etc/nginx/sites-enabled/epq
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl reload nginx
```

Issue the certificate:

```bash
sudo certbot certonly --webroot -w /var/www/certbot -d your-domain.com -d www.your-domain.com
```

Switch to the final HTTPS site:

```bash
sudo cp /opt/epq/deploy/nginx/epq-vm.conf /etc/nginx/sites-available/epq
sudo sed -i 's/example.com/your-domain.com/g' /etc/nginx/sites-available/epq
sudo nginx -t
sudo systemctl reload nginx
curl -I https://your-domain.com
curl -fsS https://your-domain.com/healthz
```

## 10. SQLite To PostgreSQL Migration

Copy your current `epq.db` to the VM:

```bash
sudo cp /tmp/epq.db /opt/epq/epq.db
sudo chown epq:epq /opt/epq/epq.db
```

Run migration as the app user with the production environment loaded:

```bash
sudo -u epq bash -lc 'set -a; source /etc/epq/epq-backend.env; set +a; cd /opt/epq; /opt/epq/venv/bin/python scripts/migrate_sqlite_to_postgres.py --sqlite /opt/epq/epq.db'
```

Restart services:

```bash
sudo systemctl restart epq-backend
sudo -u epq pm2 restart epq-frontend
curl -fsS http://127.0.0.1:8001/health/db
```

## 11. Normal Deployment Commands

```bash
cd /opt/epq
sudo -u epq git fetch --all --prune
sudo -u epq git pull --ff-only

sudo -u epq /opt/epq/venv/bin/pip install -r requirements.txt

cd /opt/epq/frontend
sudo -u epq npm ci
sudo -u epq npm run build

sudo systemctl restart epq-backend
sudo -u epq pm2 restart epq-frontend

sudo systemctl status epq-backend --no-pager
sudo -u epq pm2 status
curl -fsS https://your-domain.com/healthz
```

## 12. Backup Strategy

Create a timestamped backup:

```bash
TS=$(date -u +%Y%m%dT%H%M%SZ)
sudo -u postgres pg_dump -Fc epq_prod > /var/backups/epq/epq_prod_$TS.dump
sudo tar -czf /var/backups/epq/epq_files_$TS.tgz \
  -C /var/lib/epq reports uploads \
  -C /opt/epq uploads
sudo find /var/backups/epq -type f -mtime +14 -delete
```

Recommended cron:

```bash
sudo crontab -e
```

Add:

```cron
15 3 * * * TS=$(date -u +\%Y\%m\%dT\%H\%M\%SZ); sudo -u postgres pg_dump -Fc epq_prod > /var/backups/epq/epq_prod_$TS.dump && tar -czf /var/backups/epq/epq_files_$TS.tgz -C /var/lib/epq reports uploads -C /opt/epq uploads && find /var/backups/epq -type f -mtime +14 -delete
```

Copy backups off the VM regularly, for example to a private Google Cloud Storage bucket.

## 13. Restore From Backup

Stop app services:

```bash
sudo systemctl stop epq-backend
sudo -u epq pm2 stop epq-frontend
```

Restore database:

```bash
sudo -u postgres dropdb epq_prod
sudo -u postgres createdb epq_prod
sudo -u postgres pg_restore -d epq_prod /var/backups/epq/epq_prod_TIMESTAMP.dump
sudo -u postgres psql -d epq_prod -c "GRANT ALL PRIVILEGES ON DATABASE epq_prod TO epq_app;"
sudo -u postgres psql -d epq_prod -c "GRANT ALL ON SCHEMA public TO epq_app;"
sudo -u postgres psql -d epq_prod -c "GRANT ALL ON ALL TABLES IN SCHEMA public TO epq_app;"
sudo -u postgres psql -d epq_prod -c "GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO epq_app;"
```

Restore files:

```bash
sudo tar -xzf /var/backups/epq/epq_files_TIMESTAMP.tgz -C /var/lib/epq
sudo chown -R epq:epq /var/lib/epq
```

Start services:

```bash
sudo systemctl start epq-backend
sudo -u epq pm2 start epq-frontend
```

## 14. Rollback Strategy

Before deploying, capture the current revision:

```bash
cd /opt/epq
sudo -u epq git rev-parse HEAD
```

Rollback code:

```bash
cd /opt/epq
sudo -u epq git fetch --all
sudo -u epq git checkout PREVIOUS_GOOD_COMMIT

sudo -u epq /opt/epq/venv/bin/pip install -r requirements.txt
cd /opt/epq/frontend
sudo -u epq npm ci
sudo -u epq npm run build

sudo systemctl restart epq-backend
sudo -u epq pm2 restart epq-frontend
curl -fsS https://your-domain.com/healthz
```

Rollback database only if the failed release changed persisted data. Use the restore process above.

## 15. Logs And Troubleshooting

Backend:

```bash
sudo journalctl -u epq-backend -n 200 --no-pager
sudo journalctl -u epq-backend -f
```

Frontend:

```bash
sudo -u epq pm2 logs epq-frontend
sudo -u epq pm2 monit
```

Nginx:

```bash
sudo nginx -t
sudo tail -n 100 /var/log/nginx/error.log
sudo tail -n 100 /var/log/nginx/access.log
```

PostgreSQL:

```bash
sudo systemctl status postgresql --no-pager
sudo -u postgres psql -d epq_prod -c "SELECT now();"
```
