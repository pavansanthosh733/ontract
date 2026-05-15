# Production Hardening Backlog

Everything that was **intentionally simplified for the demo**, in priority order. Each item is self-contained — you can pick them off independently after the demo is green.

---

## P0 — Must-do before any real traffic

### 1. Move secrets out of the task definition's `environment` block → **AWS Secrets Manager**
**Demo today**: env values are baked into the task def revision (visible to anyone with `ecs:DescribeTaskDefinition`).
**Prod target**:
1. Create `ontract/backend` (JSON of all backend env vars) and `ontract/firebase` (the Firebase JSON) in Secrets Manager.
2. Replace the `environment` entries in `backend-task-def.json` with `secrets` entries:
   ```json
   { "name": "DATABASE_URL",
     "valueFrom": "arn:aws:secretsmanager:REGION:ACCT:secret:ontract/backend:DATABASE_URL::" }
   ```
3. Grant the execution role `secretsmanager:GetSecretValue` on those ARNs.
4. Drop `scripts/render-task-def.sh` and the env-substitution step from the workflow.

### 2. Rotate the leaked credentials (zip you uploaded had them committed)
- DB password on `13.250.108.195`
- SMTP password
- Both `VERCEL_OIDC_TOKEN`s

### 3. Replace static IAM access keys with **GitHub OIDC**
**Demo**: long-lived `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` repository secrets.
**Prod**: create an IAM role trusted by `token.actions.githubusercontent.com` (sub = `repo:OWNER/REPO:ref:refs/heads/main`). Use `aws-actions/configure-aws-credentials@v4` with `role-to-assume`. Delete the static keys.

### 4. CORS — remove `*`
- `backend/app/__init__.py` currently includes `"*"` in `allowed_origins`. Remove it. Use the env-driven list only.
- Demo sets `ALLOWED_ORIGINS=*`; production should be explicit:
  ```
  ALLOWED_ORIGINS=https://app.yourdomain.com,https://admin.yourdomain.com
  ```

### 5. HTTPS everywhere
- Request an **ACM certificate** for `app.yourdomain.com` (and `api.yourdomain.com` if you keep two ALBs).
- Add an HTTPS:443 listener; redirect HTTP:80 → HTTPS:443.
- `SESSION_COOKIE_SECURE=true`, `SESSION_COOKIE_SAMESITE=None` (already in patched `config.py` once you flip the env var).

---

## P1 — Reliability & cost

### 6. Single ALB instead of two
- One ALB, two listener rules on HTTPS:443:
  - default → `tg-frontend`
  - `path = /api/*` and `path = /uploads/*` → `tg-backend`
- Frontend then talks to the **same origin**: set `VITE_BACKEND_URL=""` (empty). Nginx config keeps the `/api/` proxy block (in production version of `nginx.conf`).
- Saves ~\$18/mo and eliminates the public backend URL.

### 7. Persistent uploads
- **Demo**: ephemeral disk; files lost on redeploy.
- **Prod option A (simple)**: mount **EFS** at `/app/uploads`. Add `volumes` + `mountPoints` in the task def, create EFS + mount targets in each AZ.
- **Prod option B (preferred)**: refactor `file_controller.py` to upload to **S3** and serve via pre-signed URLs. Far cheaper, infinite scale, no AZ pinning.

### 8. Private networking
- **Demo**: tasks get a public IP (`assignPublicIp=ENABLED`) to reach the internet (ECR, SMTP, Firebase).
- **Prod**: place tasks in **private subnets**; add **NAT Gateway** (or VPC endpoints for ECR/SecretsManager/Logs to avoid the NAT fee).

### 9. Auto-scaling
- Attach **Application Auto Scaling** to each service (target tracking on CPU 60%, min=1, max=4).
- Use a mix of `FARGATE_SPOT` for non-critical capacity.

### 10. Centralised logging & alarms
- Already shipping to CloudWatch. Add:
  - **Log subscription** to a Lambda / firehose if you want them off-AWS.
  - **Metric filters** for `ERROR`, `Traceback` → CloudWatch Alarms → SNS → email/Slack.
  - **Service alarms**: `RunningTaskCount < 1`, `TargetResponseTime > 2s`, `HTTPCode_Target_5XX_Count > 5/min`.

### 11. Container hardening
- Run as **non-root** (the `appuser` from the production Dockerfile in the original commit — re-enable for prod).
- Add a `HEALTHCHECK` instruction in the Dockerfile (currently relies on ALB target group only).
- Pin base images by **digest**, not tag.
- Scan images: enable **ECR scan-on-push** and fail the pipeline on `CRITICAL` findings.

### 12. WAF in front of ALB
- AWS WAF managed rules: `AWSManagedRulesCommonRuleSet`, `AWSManagedRulesKnownBadInputsRuleSet`, `AWSManagedRulesSQLiRuleSet`.
- Add a **rate-based rule** (e.g. 2000 req / 5min / IP) for login endpoints.

---

## P2 — Developer experience

### 13. Blue/green deploys
- Switch the deploy action from rolling (default) to **CodeDeploy blue/green** with traffic shifting (10% canary → 100%) and automatic rollback on alarm trip.

### 14. Per-PR preview environments
- Use **Neon database branches** (free) + an ephemeral ECS service per PR.
- Workflow trigger: `pull_request`. Tear down on `closed`.
- Reviewers get a clickable URL per PR.

### 15. Database migrations as a separate step
- Today: Flask app does ad-hoc DDL. Adopt **Alembic** and run `alembic upgrade head` as a `runTask` step **before** the new service revision goes live, with a rollback hook on failure.

### 16. CI tests + lint gates
- Backend: `pytest` + `ruff`. Frontend: `eslint` + `vitest`. Gate merge on green.

### 17. SBOM + provenance
- `docker buildx build --sbom=true --provenance=true` and push attestations to ECR. Enable **AWS Signer** for image signing if compliance matters.

### 18. Domain & DNS
- Move DNS to **Route 53** (or whatever you use), CNAME `app.yourdomain.com` → the ALB.
- Frontend `VITE_BACKEND_URL` becomes `https://api.yourdomain.com` (or `""` after item #6).

### 19. Backups
- **Neon**: enable point-in-time recovery (paid) or run a nightly `pg_dump` to S3 via an ECS scheduled task. The same `1_dump_from_ec2.sh` works — just change host.
- **S3 uploads**: enable bucket **versioning** + lifecycle to Glacier after 90 days.

---

## P3 — Nice-to-haves

- **CloudFront** in front of the frontend ALB → global CDN + free TLS at edge + cache for `/assets/*`.
- **AWS Backup** automated snapshots.
- **OpenTelemetry**: emit traces to **AWS X-Ray** or **Honeycomb**. The ECS task def supports an `aws-otel-collector` sidecar.
- **Cost guardrails**: AWS Budgets with email alerts at \$50/\$100/\$200.
- **GitHub Environments**: gate `production` workflow behind a manual approval (free on private repos).
