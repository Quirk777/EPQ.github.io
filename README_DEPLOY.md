# Single-VM Deployment (Google Compute Engine, Ubuntu 24.04)

This project runs on one VM with three containers:
- `backend` (FastAPI `app.main:app` on `0.0.0.0:8001`)
- `frontend` (Next.js on `0.0.0.0:3000`)
- `caddy` (reverse proxy + HTTPS)

## 1) Prerequisites on VM

```bash
sudo apt-get update
sudo apt-get install -y ca-certificates curl gnupg

sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg

echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
sudo usermod -aG docker $USER
```

Log out and back in once after `usermod`.

## 2) Configure project

```bash
cp .env.example .env
```

Set at minimum in `.env`:
- `DOMAIN=your-domain.com`
- `PUBLIC_BASE_URL=https://your-domain.com`
- `SESSION_SECRET=<64+ random hex chars>`
- email variables if you need verification/reset emails

## 3) Deploy

```bash
chmod +x deploy.sh
./deploy.sh
```

Or manually:

```bash
docker compose build --pull
docker compose up -d
docker compose ps
```

## 4) Local production test flow (before VM rollout)

```bash
cp .env.example .env
# set DOMAIN=localhost for local validation

docker compose build --pull
docker compose up -d
```

Checks:
1. Frontend loads: `http://localhost`
2. Backend health via proxy: `http://localhost/api/healthz`
3. Register/login using UI (`/employer/signup`, `/employer/login`)
4. Create assessment from employer flow
5. Submit applicant responses (`/applicant/<assessment_id>` flow)
6. Confirm PDF generated and downloadable via employer dashboard
7. Restart and verify persistence:
   ```bash
   docker compose down
   docker compose up -d
   ```
   - prior account/session data still exists
   - generated report files still exist

## 5) Useful operations

```bash
# Logs
docker compose logs -f backend
docker compose logs -f frontend
docker compose logs -f caddy

# Restart one service
docker compose restart backend

# Stop all
docker compose down
```

## 6) Data persistence

Docker named volumes are used:
- `app_data` -> SQLite DB (`/app/data/epq.db`)
- `reports_data` -> generated PDFs (`/app/reports`)
- `caddy_data`/`caddy_config` -> TLS certificates and Caddy state

These survive container restarts/recreates.
