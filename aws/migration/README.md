# Postgres Migration — EC2 → Free Managed Postgres

You wanted three options: **AWS RDS free tier**, **Neon**, **Supabase**.
For a demo, **Neon is the best fit** (free forever, no time bomb).

| Option           | Free quota                                | Good for                          | Trade-off                                              |
| ---------------- | ----------------------------------------- | --------------------------------- | ------------------------------------------------------ |
| **Neon** ✅      | 0.5 GB DB, autoscaling compute, no limit  | demos + small prod, branching     | Compute auto-suspends → ~300 ms first query after idle |
| **Supabase**     | 500 MB DB, 1 GB files                     | demos needing extras (auth, etc.) | DB pauses after 7 days of inactivity                   |
| **AWS RDS free** | `db.t3.micro`, 20 GB, **12 months only**  | keep-it-all-in-AWS demos          | Becomes ~\$15-25/mo after 12 months                    |

---

## Steps (same for all three)

### 1. Create the target DB

* **Neon**: <https://console.neon.tech> → new project → pick AWS region close to your ECS → copy the **Direct** connection URL (for the restore) and the **Pooled** URL (for the app).
* **Supabase**: <https://supabase.com> → project → Settings → Database → "Connection string" → URI.
* **RDS**: console → Create database → Free tier → PostgreSQL → in the same VPC as ECS, SG allowing 5432 from the backend task SG only.

### 2. Dump from EC2

```bash
chmod +x 1_dump_from_ec2.sh 2_restore_to_target.sh
./1_dump_from_ec2.sh         # prompts for the EC2 DB password
# → dump_on_boarding_YYYYMMDD_HHMMSS.sql
```

### 3. Restore into the new DB

```bash
./2_restore_to_target.sh dump_on_boarding_YYYYMMDD_HHMMSS.sql
# paste the *Direct* connection URL when prompted
```

### 4. Re-point the demo app

1. Update the `DATABASE_URL` **GitHub Secret** to the new (Pooled) URL.
2. **Actions** → "Deploy Backend" → **Run workflow** (or just push a commit).
3. Smoke test once the new task is healthy:
   ```bash
   curl http://your-backend-alb-dns/api/testdb/ping
   ```
4. When happy, **snapshot and shut down the EC2 Postgres**.

> The dump file is your rollback. If anything misbehaves, flip the Secret back to the EC2 URL and re-run the workflow — zero data loss because the EC2 DB was untouched.

---

## Common gotchas

* **`pg_dump: server version mismatch`** → install Postgres client `>=14`. macOS: `brew install postgresql@16`. Ubuntu: `sudo apt-get install postgresql-client-16`.
* **Neon restore stalls** → use the **Direct** connection URL, not the pooled one, for `psql -f`.
* **Permission denied for schema public** on Supabase → re-run the dump with `--no-owner --no-privileges` (already done in `1_dump_from_ec2.sh`).
* **SSL required** → append `?sslmode=require` to the URL when using the app.
