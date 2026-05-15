# Ontract — AWS ECS Fargate (Demo) Ready-to-Push Repo

This is **your existing application** (Flask backend + Vite/React frontend) with everything needed to deploy it to **AWS ECS Fargate** via **GitHub Actions**, plus scripts to migrate the PostgreSQL DB off your EC2 host onto a free managed Postgres (**Neon** recommended).

> **Scope: demo grade.** Cheapest, fewest moving parts, all secrets travel from GitHub Secrets → ECS task def at deploy time.
> Every shortcut taken for the demo is listed (with its production replacement) in **[`PRODUCTION_BACKLOG.md`](./PRODUCTION_BACKLOG.md)**.

---

## 🚨 BEFORE YOU PUSH — rotate the leaked secrets

The zip you uploaded committed live credentials. They are effectively public. **Rotate / revoke first:**

| Where it leaked                              | What to rotate                                |
| -------------------------------------------- | --------------------------------------------- |
| `backend/.env` (now deleted from this repo)  | DB password on `13.250.108.195`, SMTP password |
| `frontend/.env.local`, root `.env.local`     | Both `VERCEL_OIDC_TOKEN`s                     |
| `backend/ontract-notifications-firebase-adminsdk-*.json` | Generate a new Firebase Admin private key in Firebase Console → Project Settings → Service accounts |

The repo's `.gitignore` (root level) now prevents re-committing any of them.

---

## What's in this repo

```
.
├── README.md                              ← you are here
├── PRODUCTION_BACKLOG.md                  ← what's deferred for prod (19 items, P0→P3)
├── .gitignore                             ← blocks .env / Firebase JSON / build artifacts
│
├── backend/                               ← your Flask app (unchanged business logic)
│   ├── app/                               ← controllers, models, views, routes, utils, …
│   ├── Routes/                            ← Workorder_Routes.py
│   ├── utils/                             ← mailer.py
│   ├── firebase_config.py
│   ├── pdfgencode.txt
│   ├── whatsapp.py
│   ├── run.py
│   ├── requirements.txt
│   ├── Dockerfile                         ◄ NEW
│   ├── .dockerignore                      ◄ NEW
│   └── .env.example                       ◄ NEW (template — fill values in GitHub Secrets, NOT here)
│
├── frontend/                              ← your Vite/React app (unchanged components)
│   ├── src/                               ← components, context, App.jsx, …
│   ├── public/                            ← static + firebase-messaging-sw.js
│   ├── package.json
│   ├── vite.config.js
│   ├── Dockerfile                         ◄ NEW
│   ├── .dockerignore                      ◄ NEW
│   ├── nginx.conf                         ◄ NEW (SPA fallback + /healthz)
│   └── .env.example                       ◄ NEW
│
├── .github/workflows/                     ◄ NEW
│   ├── deploy-backend.yml                 build → ECR → render task def → ECS deploy
│   └── deploy-frontend.yml                same shape, with Vite build-args
│
├── aws/                                   ◄ NEW
│   ├── README.md                          ★ full demo deployment guide
│   ├── task-definitions/
│   │   ├── backend-task-def.json          env values as __PLACEHOLDER__ tokens
│   │   └── frontend-task-def.json
│   └── migration/
│       ├── README.md                      Neon vs Supabase vs RDS comparison
│       ├── 1_dump_from_ec2.sh             pg_dump from 13.250.108.195
│       └── 2_restore_to_target.sh         psql restore into the new DB
│
└── scripts/
    └── render-task-def.sh                 ◄ NEW  Python placeholder→value substitution
```

### Files that were modified vs. your upload

| File                                       | Why                                                                                                  |
| ------------------------------------------ | ---------------------------------------------------------------------------------------------------- |
| `backend/app/config.py`                    | Removed hardcoded `ENCRYPTION_KEY` / `SECRET_KEY` defaults; reads them from env only                 |
| `backend/app/__init__.py`                  | Removed `"*"` from CORS list; reads `ALLOWED_ORIGINS` from env via `Config.ALLOWED_ORIGINS`          |
| `backend/app/utils/firebase_init.py`       | Reads Firebase JSON from `FIREBASE_SERVICE_ACCOUNT_JSON` env (no committed JSON file required)       |
| `frontend/src/api.js`                      | Removed hardcoded `localhost:5000`; uses `import.meta.env.VITE_BACKEND_URL`                          |
| `frontend/src/firebase.js`                 | Firebase web config now comes from `VITE_FIREBASE_*` env vars (was hardcoded)                        |

### Files that were deleted vs. your upload

| File                                                          | Reason                                                                              |
| ------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| `backend/.env`                                                | Committed live DB / SMTP passwords. Values now go to GitHub Secrets.                |
| `frontend/.env.local`                                         | Committed Vercel OIDC token.                                                        |
| `.env.local` (root)                                           | Committed Vercel OIDC token.                                                        |
| `backend/ontract-notifications-firebase-adminsdk-*.json`      | Committed Firebase service account. Now sourced from `FIREBASE_SERVICE_ACCOUNT_JSON` GitHub Secret. |

---

## How to use this repo (3 phases)

### Phase 1 — One-time AWS setup (~20 min)

Follow [`aws/README.md`](./aws/README.md) section **A**:

1. `aws ecr create-repository` twice (backend + frontend).
2. Create the ECS cluster.
3. Create the IAM execution role.
4. Create two ALBs + target groups (one for frontend :80, one for backend :5000).

### Phase 2 — Configure GitHub (~5 min)

Follow [`aws/README.md`](./aws/README.md) section **B**:

1. Push this repo to a new GitHub repo.
2. **Settings → Secrets and variables → Actions** and add the secrets/variables listed below (full table in `aws/README.md`):

| Repository **Secrets**                                                                    |
| ----------------------------------------------------------------------------------------- |
| `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_ACCOUNT_ID`                            |
| `DATABASE_URL`                                                                            |
| `SECRET_KEY`, `ENCRYPTION_KEY`                                                            |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `FROM_EMAIL`                      |
| `FIREBASE_SERVICE_ACCOUNT_JSON` (paste entire JSON file contents)                         |
| `VITE_FIREBASE_API_KEY`, `..._AUTH_DOMAIN`, `..._PROJECT_ID`, `..._STORAGE_BUCKET`,       |
| `..._MESSAGING_SENDER_ID`, `..._APP_ID`, `..._MEASUREMENT_ID`, `..._VAPID_KEY`            |

| Repository **Variables**                                                                  |
| ----------------------------------------------------------------------------------------- |
| `AWS_REGION` (e.g. `ap-southeast-1`)                                                      |
| `ECS_CLUSTER` (`ontract-cluster`)                                                         |
| `VITE_BACKEND_URL`, `VITE_API_BASE_URL` (backend ALB DNS — `http://...elb.amazonaws.com`) |
| `ALLOWED_ORIGINS` (`*` for demo, or the frontend ALB DNS)                                 |
| `PUBLIC_BASE_URL`, `FRONTEND_URL` (ALB DNS values)                                        |

3. Register the two task definitions and create the two ECS services (one-time, commands in `aws/README.md` § C).

### Phase 3 — Deploy

```bash
git add .
git commit -m "ci: ECS Fargate demo deploy"
git push origin main
```

GitHub Actions will:

1. Build the Docker images.
2. Push to ECR.
3. Render `aws/task-definitions/*.json` — replacing `__PLACEHOLDER__` tokens with values from your GitHub Secrets/Variables.
4. Register a new task definition revision.
5. Update the ECS service and wait for it to stabilise.

When green, open the **frontend ALB DNS** in a browser. Done.

### Postgres migration

```bash
cd aws/migration
./1_dump_from_ec2.sh                       # → dump_on_boarding_*.sql
./2_restore_to_target.sh dump_*.sql        # paste your Neon Direct URL
# Then update DATABASE_URL secret in GitHub → re-run the backend workflow.
```

Details + Neon vs Supabase vs RDS comparison: [`aws/migration/README.md`](./aws/migration/README.md).

---

## Local development (unchanged from before)

Backend:
```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
# Create backend/.env locally (NOT committed — .gitignore blocks it)
cp .env.example .env  # then fill in real values
python run.py         # http://localhost:5000
```

Frontend:
```bash
cd frontend
npm install
cp .env.example .env  # fill in real values (NOT committed)
npm run dev           # http://localhost:5173
```

---

## What's deferred for production

A condensed view — full prioritised list with implementation notes lives in [`PRODUCTION_BACKLOG.md`](./PRODUCTION_BACKLOG.md).

### P0 — Must-do before real traffic
1. Move secrets from task-def `environment` → **AWS Secrets Manager** (`secrets` block).
2. Rotate the leaked DB / SMTP / Vercel / Firebase credentials.
3. Replace static IAM keys → **GitHub OIDC** role assumption.
4. Remove `*` from CORS `ALLOWED_ORIGINS`; list real origins only.
5. **HTTPS everywhere** — ACM cert + HTTPS:443 listener + HTTP→HTTPS redirect + `SESSION_COOKIE_SECURE=true`.

### P1 — Reliability & cost
6. Single ALB with path-based routing instead of two ALBs (~\$18/mo saved).
7. Persistent uploads → **EFS** mount or refactor to **S3** + pre-signed URLs.
8. Private subnets + NAT Gateway (or VPC endpoints) — drop `assignPublicIp`.
9. **Application Auto Scaling** (target CPU 60%, 1-4 tasks); add `FARGATE_SPOT` capacity provider.
10. CloudWatch metric filters + alarms + SNS notifications.
11. Container hardening — non-root user, ECR scan-on-push, pin by digest.
12. **AWS WAF** in front of ALB (managed rule sets + rate-based rules).

### P2 — Developer experience
13. CodeDeploy blue/green with canary + auto-rollback.
14. **Per-PR preview environments** using Neon DB branches + ephemeral ECS services.
15. Alembic migrations as a pre-deploy `runTask` step.
16. CI test gates (pytest + ruff backend, eslint + vitest frontend).
17. SBOM + provenance attestations; image signing via AWS Signer.

### P3 — Nice-to-haves
18. CloudFront in front of frontend ALB (global CDN + edge TLS).
19. AWS Backup, OpenTelemetry → X-Ray/Honeycomb, AWS Budgets alerts, GitHub Environments with manual approval gates.

---

## Cost (demo)

| Item                                       | Monthly         |
| ------------------------------------------ | --------------- |
| Fargate backend (0.5 vCPU, 1 GB)           | ~ \$15          |
| Fargate frontend (0.25 vCPU, 0.5 GB)       | ~ \$7           |
| 2 × ALB                                    | ~ \$36          |
| ECR + CloudWatch logs                      | < \$2           |
| Neon Postgres                              | \$0             |
| **Total**                                  | **~ \$60 / mo** |

Drop to **~ \$42 / mo** by switching to a single ALB (backlog item #6).

---

## Troubleshooting

See the table in [`aws/README.md`](./aws/README.md) "Troubleshooting" section. Common ones:

- `psycopg2.OperationalError` → `DATABASE_URL` secret wrong or SG blocks 5432.
- `Firebase credentials not found` → `FIREBASE_SERVICE_ACCOUNT_JSON` secret missing/malformed.
- Uploads disappear after redeploy → expected on demo (ephemeral disk); see backlog #7.
- CORS error in browser → `ALLOWED_ORIGINS` variable doesn't include the frontend ALB DNS.
- 502 from ALB → check CloudWatch log group `/ecs/ontract-backend` for the task error.
