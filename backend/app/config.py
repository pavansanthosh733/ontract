import os
from dotenv import load_dotenv

load_dotenv()
BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))


class Config:
    UPLOAD_FOLDER = os.path.join(BASE_DIR, "uploads")
    PUBLIC_BASE_URL = os.getenv("PUBLIC_BASE_URL", "")

    SQLALCHEMY_DATABASE_URI = os.getenv("DATABASE_URL")
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SQLALCHEMY_ENGINE_OPTIONS = {"pool_pre_ping": True, "pool_recycle": 280}

    EMAIL_CONFIG = {
        "sender_email": os.getenv("SMTP_USER"),
        "sender_password": os.getenv("SMTP_PASSWORD"),
        "smtp_server": os.getenv("SMTP_HOST"),
        "smtp_port": int(os.getenv("SMTP_PORT", "587")),
        "use_ssl": os.getenv(
            "SMTP_USE_SSL",
            "false"
        ).lower() == "true",
    }
    FROM_EMAIL = os.getenv("FROM_EMAIL", "info@jhaishna.com")
    FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")

    ALLOWED_ORIGINS = [
        o.strip()
        for o in os.getenv("ALLOWED_ORIGINS", "*").split(",")
        if o.strip()
    ]

    ENCRYPTION_KEY = os.getenv("ENCRYPTION_KEY")
    SECRET_KEY = os.getenv("SECRET_KEY")

    SESSION_COOKIE_NAME = "admin_session"
    SESSION_COOKIE_HTTPONLY = True
    SESSION_COOKIE_SAMESITE = "None"
    SESSION_COOKIE_SECURE = True
