import jwt
import uuid
from datetime import datetime, timedelta
from flask import current_app


ACCESS_TOKEN_EXPIRY_MINUTES = 15
REFRESH_TOKEN_EXPIRY_DAYS = 7


def create_access_token(user_id, role, email=None):
    payload = {
        "jti": str(uuid.uuid4()),
        "user_id": user_id,
        "role": role,
        "type": "access",
        "exp": datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRY_MINUTES)
    }

    if email:
        payload["email"] = email

    return jwt.encode(
        payload,
        current_app.config["SECRET_KEY"],
        algorithm="HS256"
    )


def create_refresh_token(user_id, role):
    expires_at = datetime.utcnow() + timedelta(days=REFRESH_TOKEN_EXPIRY_DAYS)

    payload = {
        "jti": str(uuid.uuid4()),
        "user_id": user_id,
        "role": role,
        "type": "refresh",
        "exp": expires_at
    }

    token = jwt.encode(
        payload,
        current_app.config["SECRET_KEY"],
        algorithm="HS256"
    )

    return token, expires_at


def verify_token(token):
    return jwt.decode(
        token,
        current_app.config["SECRET_KEY"],
        algorithms=["HS256"]
    )