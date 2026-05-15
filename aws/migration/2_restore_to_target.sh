#!/usr/bin/env bash
# 2_restore_to_target.sh <dump.sql>
# Restores a pg_dump file into a managed Postgres (Neon/Supabase/RDS).
set -euo pipefail
[[ $# -lt 1 ]] && { echo "Usage: $0 <dump.sql>"; exit 1; }
read -rp "Target DATABASE_URL: " TARGET_URL
psql "$TARGET_URL" -v ON_ERROR_STOP=1 -f "$1"
psql "$TARGET_URL" -c "\dt"
echo ">>> Restore complete."
