# Ontract — ECS Fargate DEMO Deployment

> **Scope: demo only.** Cheapest, fewest moving parts, env vars travel from GitHub Secrets straight into the ECS task definition. Anything left out for simplicity is captured in **`PRODUCTION_BACKLOG.md`** so you can harden it later.

## Architecture (demo)

```
GitHub push (main) ──► GitHub Actions ──► ECR images
                                              │
                                              ▼
                      ┌─────────── ECS Fargate cluster ───────────┐
                      │                                           │
       Internet ──► ALB-frontend (HTTP :80) ──► frontend task     │
                                                                  │
       Internet ──► ALB-backend  (HTTP :80) ──► backend task ──► Neon Postgres
                                                                  │
                      └───────────────────────────────────────────┘
```

* **Two public ALBs**, no Service Connect, no private networking, no EFS.
  Uploaded files live on the task's ephemeral disk — fine for a demo, **they
  vanish on every redeploy**. Production fix: EFS or S3 (see backlog).
* **Postgres**: free **Neon** (recommended) or any of the alternatives in
  `aws/migration/README.md`.

---

## What you do (one time, ~20 min)

### A. AWS console — set up the cluster, ECR, ALBs

> Pick **one region** and stick to it for everything below. Example: `ap-southeast-1`.

1. **ECR**
   ```bash
   aws ecr create-repository --repository-name ontract-backend  --region $REGION
   aws ecr create-repository --repository-name ontract-frontend --region $REGION
   ```

2. **ECS cluster**
   ```bash
   aws ecs create-cluster --cluster-name ontract-cluster \
     --capacity-providers FARGATE --region $REGION
   ```

3. **IAM execution role** (only one needed for the demo)
   * Console → IAM → Roles → Create role → service `Elastic Container Service Task`.
   * Attach: `AmazonECSTaskExecutionRolePolicy`.
   * Name it `ecsTaskExecutionRole`. Note the ARN.

4. **Two ALBs** (internet-facing, HTTP listener on :80, default VPC + public subnets is fine for demo)
   * `ontract-frontend-alb` → target group `tg-frontend` (HTTP :80, type `ip`, health check `/healthz`)
   * `ontract-backend-alb`  → target group `tg-backend`  (HTTP :5000, type `ip`, health check `/api/testdb/ping`)
   * Security group: allow inbound 80 (and 5000 on the backend SG) from `0.0.0.0/0`.
   * Note both **DNS names** — you'll need them.

5. **CloudWatch log groups** (auto-created by the workflow thanks to `awslogs-create-group=true`, no action needed).

### B. GitHub — copy files & set secrets

1. **Copy these into your repo** (preserving paths). Files in `patches/` overwrite the originals.

2. **Delete from your repo** (committed secrets — leak):
   * `backend/.env`
   * `backend/ontract-notifications-firebase-adminsdk-*.json`
   * `frontend/.env.local`
   * `.env.local` (root)

3. **Add to `.gitignore`:**
   ```
   backend/.env
   backend/serviceAccountKey.json
   backend/ontract-notifications-firebase-adminsdk-*.json
   frontend/.env
   frontend/.env.local
   .env.local
   ```

4. **GitHub → Settings → Secrets and variables → Actions**

   **Repository Secrets** (encrypted):

   | Secret                                 | Demo value source                                                                  |
   | -------------------------------------- | ---------------------------------------------------------------------------------- |
   | `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` | IAM user with ECR push + ECS update (use `AmazonEC2ContainerRegistryPowerUser` + `AmazonECS_FullAccess` for demo) |
   | `AWS_ACCOUNT_ID`                       | Your 12-digit account ID                                                           |
   | `DATABASE_URL`                         | `postgresql://USER:PASS@HOST:5432/on_boarding?sslmode=require` (Neon after migration) |
   | `SECRET_KEY`                           | any 32-byte random string                                                          |
   | `ENCRYPTION_KEY`                       | a Fernet key (`python -c "from cryptography.fernet import Fernet;print(Fernet.generate_key().decode())"`) |
   | `SMTP_HOST` `SMTP_PORT` `SMTP_USER` `SMTP_PASSWORD` `FROM_EMAIL` | Zoho creds                                          |
   | `FIREBASE_SERVICE_ACCOUNT_JSON`        | Paste the **entire** Firebase Admin SDK JSON file contents                         |
   | `VITE_FIREBASE_API_KEY` … `VITE_FIREBASE_VAPID_KEY` | All 9 web SDK values                                                   |

   **Repository Variables** (plaintext is OK):

   | Variable               | Demo value                                                          |
   | ---------------------- | ------------------------------------------------------------------- |
   | `AWS_REGION`           | `ap-southeast-1`                                                    |
   | `ECS_CLUSTER`          | `ontract-cluster`                                                   |
   | `VITE_BACKEND_URL`     | `http://ontract-backend-alb-xxxx.ap-southeast-1.elb.amazonaws.com`  |
   | `VITE_API_BASE_URL`    | same as above                                                       |
   | `ALLOWED_ORIGINS`      | `*` for demo (or the frontend ALB DNS)                              |
   | `PUBLIC_BASE_URL`      | backend ALB DNS                                                     |
   | `FRONTEND_URL`         | frontend ALB DNS                                                    |

### C. Register the task definitions & create services (one time)

```bash
export REGION=ap-southeast-1
export ACCOUNT_ID=123456789012

# Substitute placeholders (AWS_ACCOUNT_ID / AWS_REGION only — env values are
# substituted at deploy time by the workflow)
sed -e "s|__AWS_ACCOUNT_ID__|$ACCOUNT_ID|g" \
    -e "s|__AWS_REGION__|$REGION|g" \
    aws/task-definitions/frontend-task-def.json > /tmp/frontend.json

aws ecs register-task-definition --cli-input-json file:///tmp/frontend.json --region $REGION

# Backend: just register a stub for now; the workflow will register
# a new revision each deploy with the real env vars.
sed -e "s|__AWS_ACCOUNT_ID__|$ACCOUNT_ID|g" \
    -e "s|__AWS_REGION__|$REGION|g" \
    aws/task-definitions/backend-task-def.json > /tmp/backend.json
aws ecs register-task-definition --cli-input-json file:///tmp/backend.json --region $REGION

# Create the services (one time)
aws ecs create-service \
  --cluster ontract-cluster \
  --service-name ontract-backend-svc \
  --task-definition ontract-backend \
  --desired-count 1 --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[subnet-aaa,subnet-bbb],securityGroups=[sg-backend],assignPublicIp=ENABLED}" \
  --load-balancers "targetGroupArn=arn:...:targetgroup/tg-backend/...,containerName=backend,containerPort=5000" \
  --region $REGION

aws ecs create-service \
  --cluster ontract-cluster \
  --service-name ontract-frontend-svc \
  --task-definition ontract-frontend \
  --desired-count 1 --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[subnet-aaa,subnet-bbb],securityGroups=[sg-frontend],assignPublicIp=ENABLED}" \
  --load-balancers "targetGroupArn=arn:...:targetgroup/tg-frontend/...,containerName=frontend,containerPort=80" \
  --region $REGION
```

> `assignPublicIp=ENABLED` is the demo shortcut — it skips NAT Gateway costs. Production: put tasks in private subnets and add a NAT (see backlog).

### D. Push to GitHub → it deploys itself

```bash
git add .
git commit -m "ci: demo ECS Fargate deploy"
git push origin main
```

Watch the **Actions** tab. Each workflow:

1. Builds the image and pushes to ECR.
2. Runs `scripts/render-task-def.sh` to substitute env-var values from GitHub Secrets into the task definition.
3. Registers a new task definition revision.
4. Updates the ECS service and waits for stability.

Open the **frontend ALB DNS** in a browser — you're live.

---

## Postgres migration (demo)

```bash
cd aws/migration
chmod +x *.sh
./1_dump_from_ec2.sh                     # dumps EC2 DB → dump_*.sql
./2_restore_to_target.sh dump_*.sql      # paste your Neon connection URL
```

Then update the **`DATABASE_URL` GitHub Secret** to the Neon URL and re-run the backend workflow (Actions → Run workflow). See `aws/migration/README.md` for the Neon vs Supabase vs RDS comparison and step-by-step.

---

## 🚨 Rotate the leaked secrets first

The zip you uploaded committed:

* DB password `Jhaishna123` for `13.250.108.195`
* SMTP password `MPYYZnrv6j59`
* Two `VERCEL_OIDC_TOKEN`s in `.env.local` files

**Rotate / revoke all of them before running anything.**

---

## Cost sanity (demo)

| Item                                 | Monthly         |
| ------------------------------------ | --------------- |
| Fargate backend  (0.5 vCPU, 1 GB)    | ~ \$15          |
| Fargate frontend (0.25 vCPU, 0.5 GB) | ~ \$7           |
| 2 × ALB                              | ~ \$36          |
| ECR + logs                           | < \$2           |
| Neon Postgres                        | \$0             |
| **Total**                            | **~ \$60 / mo** |

> If you want it cheaper for a demo, swap the two ALBs for a single ALB with two listener rules (`/` → frontend, `/api/*` → backend). That brings you to **~ \$42 / mo**. The "single ALB" config is in `PRODUCTION_BACKLOG.md` because it's also what we recommend for prod.

---

## Troubleshooting

| Symptom                                                  | Fix                                                                                                |
| -------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| Task stops with `psycopg2.OperationalError`              | Wrong `DATABASE_URL` Secret. Update the secret and re-run the workflow.                            |
| CORS error in browser                                    | Set `ALLOWED_ORIGINS` variable to the frontend ALB DNS (or `*` for demo).                          |
| 502 from ALB                                             | Target group health check failing. Look at task logs in CloudWatch (`/ecs/ontract-backend`).       |
| Uploaded files disappear after redeploy                  | Expected — demo uses ephemeral disk. See backlog item "Persistent uploads".                        |
| `Firebase credentials not found`                         | `FIREBASE_SERVICE_ACCOUNT_JSON` secret is missing or malformed (must be the full JSON, single line is fine). |
| Workflow fails at "Render env values"                    | One of the `secrets.*` or `vars.*` referenced in the workflow isn't set in GitHub.                 |
