# EPQ Production Preparation Checklists

This is an offline preparation document for the non-Docker Google Cloud VM deployment. It does not change local development: local SQLite remains the default unless `DATABASE_URL` is explicitly set.

## 1. Deployment Docs Consistency Review

Reviewed files:

- `DEPLOYMENT_GCP_VM_SYSTEMD_PM2.md`
- `deploy/env/epq-backend.env.example`
- `deploy/systemd/epq-backend.service`
- `deploy/pm2/ecosystem.config.cjs`
- `deploy/nginx/epq-vm-http.conf`
- `deploy/nginx/epq-vm.conf`

Current production shape is consistent:

- Backend: FastAPI on `127.0.0.1:8001`
- Frontend: Next.js on `127.0.0.1:3000`
- Nginx public entry: ports `80` and `443`
- PostgreSQL: local VM socket/TCP on `127.0.0.1:5432`
- Backend service working directory: `/opt/epq`
- Frontend working directory: `/opt/epq/frontend`
- Backend env file: `/etc/epq/epq-backend.env`
- Reports: `/var/lib/epq/reports`
- App upload backup coverage includes both `/var/lib/epq/uploads` and `/opt/epq/uploads`

One important implementation note:

- Branding assets currently use a relative app path under `/opt/epq/uploads/branding`, so backups must include `/opt/epq/uploads` until the app is later changed to honor `UPLOADS_DIR`.

## 2. Production Environment Variables

Required backend variables:

- `ENVIRONMENT=production`
- `PUBLIC_BASE_URL=https://YOUR_DOMAIN`
- `FRONTEND_URL=https://YOUR_DOMAIN`
- `DATABASE_URL=postgresql://epq_app:PASSWORD@127.0.0.1:5432/epq_prod`
- `SESSION_SECRET=<64-char hex or equivalent strong secret>`
- `SESSION_COOKIE_NAME=epq_session`
- `HTTPS_ONLY_COOKIES=true`
- `SESSION_SAME_SITE=lax`
- `TRUSTED_PROXY_IPS=127.0.0.1`
- `REQUIRE_EMAIL_VERIFICATION=true`
- `REPORTS_DIR=/var/lib/epq/reports`
- `UPLOADS_DIR=/var/lib/epq/uploads`
- `WKHTMLTOPDF_PATH=/usr/bin/wkhtmltopdf`

Optional email variables:

- `GMAIL_USER`
- `GMAIL_APP_PASSWORD`
- `GMAIL_FROM_NAME=EPQ Assessment Platform`

Required frontend PM2 variables:

- `NODE_ENV=production`
- `PORT=3000`
- `BACKEND_URL=http://127.0.0.1:8001`

Safety checks:

- `SESSION_SECRET` must not be the development value.
- `REQUIRE_EMAIL_VERIFICATION=true` should only be enabled after email delivery is configured and tested.
- PostgreSQL password should be long and alphanumeric, or URL-encode special characters like `@`, `:`, `/`, `#`, `%`, and spaces.
- Do not copy local Windows `.env` to the VM.
- Keep `/etc/epq/epq-backend.env` owned by `root:epq` with `640` permissions.

## 3. Production Deployment Checklist

Before billing/cloud resources:

- Confirm repo URL: `https://github.com/Quirk777/EPQ.github.io.git`
- Confirm project ID: `epq-production`
- Confirm VM name: `epq-prod`
- Confirm zone: `us-central1-a`
- Choose production domain.
- Choose PostgreSQL password.
- Generate production `SESSION_SECRET`.
- Confirm current local `epq.db` is the database to migrate.

After billing is enabled:

- Enable Google Cloud APIs: Compute Engine, Cloud Resource Manager, Service Usage.
- Create Ubuntu VM.
- Open firewall ports `80` and `443`.
- Record VM external IP.
- Point DNS `A` records to the VM IP.
- Install OS packages: Python, Node.js, PostgreSQL, Nginx, Certbot, PM2, wkhtmltopdf.
- Create `epq` system user and required directories.
- Clone repo to `/opt/epq`.
- Create `/etc/epq/epq-backend.env`.
- Create PostgreSQL database/user/grants.
- Copy `epq.db` to `/opt/epq/epq.db`.
- Create Python venv and install backend requirements.
- Run `db.init_db()` against PostgreSQL.
- Run SQLite to PostgreSQL migration.
- Build frontend with `npm ci && npm run build`.
- Install and start `epq-backend.service`.
- Start frontend with PM2 and save PM2 startup.
- Install temporary HTTP Nginx config.
- Verify HTTP health.
- Issue Certbot certificate.
- Switch to final HTTPS Nginx config.
- Verify HTTPS health and app flows.
- Take first backup.

## 4. Rollback Checklist

Before every deploy:

- Record current commit: `git rev-parse HEAD`
- Take database backup with `pg_dump -Fc`.
- Take files backup for reports/uploads.
- Confirm backup files exist and are non-empty.

Code rollback:

- Stop or restart only after the previous commit is checked out.
- `git checkout PREVIOUS_GOOD_COMMIT`
- Reinstall backend requirements.
- Rebuild frontend.
- Restart `epq-backend`.
- Restart `epq-frontend` with PM2.
- Verify `/healthz`, `/health/db`, homepage, and login.

Database rollback:

- Only restore database if the failed release changed persisted data.
- Stop backend and frontend first.
- Drop/recreate `epq_prod`.
- Restore `pg_restore`.
- Re-grant database, schema, table, and sequence privileges to `epq_app`.
- Restore files archive if reports/uploads are affected.
- Start services and smoke test.

Emergency rollback decision:

- If only frontend is broken, roll back frontend code/build first.
- If backend health fails, inspect `journalctl -u epq-backend` before touching the database.
- If auth/session fails after HTTPS changes, check `PUBLIC_BASE_URL`, `HTTPS_ONLY_COOKIES`, `SESSION_SAME_SITE`, Nginx `X-Forwarded-Proto`, and browser cookies.

## 5. Smoke-Test Checklist

### Frontend

- `curl -I http://127.0.0.1:3000` returns `200` or a valid Next.js response.
- `curl -I https://YOUR_DOMAIN` returns `200` or expected redirect/final response.
- Homepage loads in browser.
- Employer pages render without blank screen.
- Browser console has no critical runtime errors.

### Backend

- `curl -fsS http://127.0.0.1:8001/healthz`
- `curl -fsS http://127.0.0.1:8001/health/db`
- Public: `curl -fsS https://YOUR_DOMAIN/healthz`
- DB health reports `PostgreSQL`.
- `journalctl -u epq-backend -n 100 --no-pager` has no startup traceback.

### Auth

- Employer signup works.
- Employer login works.
- Session persists after page refresh.
- Logout clears access.
- Password reset/email verification routes do not crash, even if Gmail is not configured.
- If Gmail is enabled, test one email send path.

### Applicant Flow

- Create or open an employer role.
- Generate/open applicant assessment link.
- Applicant questions load.
- Submit applicant assessment.
- Employer dashboard shows the new candidate.
- Duplicate/invalid submissions return controlled errors.

### PDF Generation

- After applicant submit, PDF status moves from processing to success/ready.
- PDF exists under `/var/lib/epq/reports`.
- Employer PDF download route opens the PDF.
- `wkhtmltopdf --version` works on the VM.
- Backend logs do not show PDF generation exceptions.

### PostgreSQL Migration

- Migration refuses to run without `DATABASE_URL`.
- Migration runs with production `DATABASE_URL`.
- Output shows copied/skipped table counts with no traceback.
- `psql -d epq_prod` confirms expected table count.
- Login using a migrated employer account works.
- Existing applicants/reports are visible after migration.

## 6. Remaining Production Risks

Known risks to monitor:

- Branding uploads currently live under `/opt/epq/uploads`; deployment backups account for this, but the app does not yet honor `UPLOADS_DIR` for branding.
- `DATABASE_URL` can break if the DB password includes unencoded special characters.
- Gmail settings are optional, but email-dependent workflows will not send mail until configured.
- Certbot cannot be completed until a real domain points to the VM.
- Current deployment uses a single VM: app, database, and files share one host. This is low cost but not highly available.
- Backups must be copied off-VM to protect against disk/VM loss.
- PostgreSQL migration should be tested once on a throwaway VM or fresh database before final production cutover.
- Nginx final HTTPS config requires certificate files to exist first; use the HTTP bootstrap config before the HTTPS config.

## 7. Minimal-Cost Google Cloud Recommendation

Recommended starting setup:

- Compute Engine VM: Ubuntu 24.04 LTS
- Machine type: `e2-small` for light testing, `e2-medium` for safer production headroom
- Boot disk: 30 GB balanced persistent disk
- Network: public IP, firewall ports `80` and `443` only
- Database: PostgreSQL installed directly on VM
- Files: local VM disk under `/var/lib/epq` and `/opt/epq/uploads`
- Backups: nightly `pg_dump` plus files archive copied to a private Cloud Storage bucket

Lowest-cost launch path:

- Start with `e2-small` if traffic is very low.
- Use `e2-medium` if PDF generation or Next.js builds strain memory.
- Avoid Cloud SQL initially to keep costs down.
- Avoid load balancers initially; Nginx on the VM is enough for one VM.
- Add a budget alert in Google Cloud Billing before deployment.
- Add a static external IP once the VM is final, so DNS does not change after stop/start.

When to upgrade:

- Move PostgreSQL to Cloud SQL if backups, point-in-time recovery, or managed maintenance become more important than cost.
- Move uploaded files/reports to Cloud Storage if disk growth or off-VM durability becomes a concern.
- Add uptime checks once the public domain is live.
