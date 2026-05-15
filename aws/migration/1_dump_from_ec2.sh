#!/usr/bin/env bash
# 1_dump_from_ec2.sh — dumps the EC2 Postgres to a .sql file.
# Usage: ./1_dump_from_ec2.sh
set -euo pipefail

SRC_HOST="13.250.108.195"
SRC_PORT="5432"
SRC_USER="webappuser"
SRC_DB="on_boarding"

read -srp "Source DB password: " PGPASSWORD
echo
export PGPASSWORD

OUT="dump_${SRC_DB}_$(date +%Y%m%d_%H%M%S).sql"
echo ">>> Dumping into $OUT"
pg_dump --host="$SRC_HOST" --port="$SRC_PORT" --username="$SRC_USER" --dbname="$SRC_DB" \
  --no-owner --no-privileges --clean --if-exists \
  --format=plain --encoding=UTF8 --file="$OUT"
echo ">>> Done. Size: $(du -h "$OUT" | cut -f1)"
