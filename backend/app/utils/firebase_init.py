"""
DEMO firebase_init:
- Reads JSON from FIREBASE_SERVICE_ACCOUNT_JSON env var (set in the
  ECS task definition, value comes from a GitHub Secret),
- Writes it to FIREBASE_CREDENTIALS_PATH (default /app/serviceAccountKey.json),
- Falls back to a local file for dev.
"""
import os
import json
import logging

import firebase_admin
from firebase_admin import credentials


def _resolve_credentials_path() -> str:
    path = os.getenv("FIREBASE_CREDENTIALS_PATH", "/app/serviceAccountKey.json")
    raw = os.getenv("FIREBASE_SERVICE_ACCOUNT_JSON")
    if raw and not os.path.exists(path):
        json.loads(raw)  # validate
        os.makedirs(os.path.dirname(path) or ".", exist_ok=True)
        with open(path, "w", encoding="utf-8") as f:
            f.write(raw)
        logging.info("Firebase creds materialised → %s", path)
    if not os.path.exists(path):
        legacy = "serviceAccountKey.json"
        if os.path.exists(legacy):
            return legacy
        raise FileNotFoundError(
            f"Firebase credentials not found at {path}; set FIREBASE_SERVICE_ACCOUNT_JSON."
        )
    return path


def initialize_firebase():
    try:
        firebase_admin.get_app()
        logging.info("Firebase already initialized")
    except ValueError:
        cred = credentials.Certificate(_resolve_credentials_path())
        firebase_admin.initialize_app(cred)
        logging.info("Firebase initialized")
