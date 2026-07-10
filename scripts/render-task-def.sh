#!/usr/bin/env bash
# render-task-def.sh
# Substitutes __PLACEHOLDER__ tokens in a task-definition JSON using
# values from the environment. Used by the DEMO GitHub Actions workflow
# so that env vars from GitHub Secrets land inside the ECS task def
# as plain `environment` entries.
#
# Usage: ./render-task-def.sh <input.json> <output.json>
#
# NOTE (production): this is NOT how you should ship real secrets.
# In prod, swap to AWS Secrets Manager and use the `secrets` block in
# the task def — see PRODUCTION_BACKLOG.md.
set -euo pipefail

IN="$1"
OUT="$2"

# Use python so we don't have to worry about JSON-escaping inside sed.
python3 - "$IN" "$OUT" <<'PY'
import json, os, sys

src, dst = sys.argv[1], sys.argv[2]
with open(src) as f:
    data = json.load(f)

# Every key we want to substitute, mapped to its env var.
SUBS = {
    "__AWS_ACCOUNT_ID__":   os.environ.get("AWS_ACCOUNT_ID", ""),
    "__AWS_REGION__":       os.environ.get("AWS_REGION", ""),
    "__DATABASE_URL__":     os.environ.get("DATABASE_URL", ""),
    "__SECRET_KEY__":       os.environ.get("SECRET_KEY", ""),
    "__ENCRYPTION_KEY__":   os.environ.get("ENCRYPTION_KEY", ""),
    "__SMTP_HOST__":        os.environ.get("SMTP_HOST", ""),
    "__SMTP_PORT__":        os.environ.get("SMTP_PORT", "587"),
    "__SMTP_USER__":        os.environ.get("SMTP_USER", ""),
    "__SMTP_PASSWORD__":    os.environ.get("SMTP_PASSWORD", ""),
    "__FROM_EMAIL__":       os.environ.get("FROM_EMAIL", ""),
    "__ALLOWED_ORIGINS__":  os.environ.get("ALLOWED_ORIGINS", "*"),
    "__PUBLIC_BASE_URL__":  os.environ.get("PUBLIC_BASE_URL", ""),
    "__FRONTEND_URL__":     os.environ.get("FRONTEND_URL", ""),
    "__FLASK_ENV__": os.environ.get("FLASK_ENV", ""),
    "__FIREBASE_SERVICE_ACCOUNT_JSON__":
                            os.environ.get("FIREBASE_SERVICE_ACCOUNT_JSON", ""),
}

def walk(node):
    if isinstance(node, dict):
        return {k: walk(v) for k, v in node.items()}
    if isinstance(node, list):
        return [walk(v) for v in node]
    if isinstance(node, str):
        for k, v in SUBS.items():
            if k in node:
                node = node.replace(k, v)
        return node
    return node

with open(dst, "w") as f:
    json.dump(walk(data), f, indent=2)
print(f"Rendered → {dst}")
PY
