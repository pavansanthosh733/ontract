import os
from dotenv import load_dotenv

load_dotenv()
print(os.getenv("DATABASE_URL"))
BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))

class Config:

    UPLOAD_FOLDER = os.path.join(BASE_DIR, "uploads")
    PUBLIC_BASE_URL = os.getenv("PUBLIC_BASE_URL", "")
    # ------------------------ DATABASE ------------------------
    SQLALCHEMY_DATABASE_URI = os.getenv("DATABASE_URL")
    SQLALCHEMY_TRACK_MODIFICATIONS = False

    # ------------------------ EMAIL ---------------------------
    EMAIL_CONFIG = {
        'sender_email': os.getenv('SMTP_USER'),
        'sender_password': os.getenv('SMTP_PASSWORD'),
        'smtp_server': os.getenv('SMTP_HOST'),
        'smtp_port': int(os.getenv('SMTP_PORT', 587))
    }

    FROM_EMAIL = os.getenv('FROM_EMAIL', 'info@jhaishna.com')

    # ------------------------ FRONTEND ------------------------
    # ❗ ALWAYS use same domain for activation links
    FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")

    # ------------------------ CORS ----------------------------
    ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "https://onboarding-frontend-mu.vercel.app").split(",")

    # ------------------------ SECURITY ------------------------
    ENCRYPTION_KEY = os.getenv('ENCRYPTION_KEY', 'cvI_hj-yDtPL1Z2lFlRBTBzTE72Hw1U0DTKw2U5uh3s=')

    SECRET_KEY = os.getenv("SECRET_KEY", "super-secret-dev-key")

    SESSION_COOKIE_NAME = "admin_session"
    SESSION_COOKIE_HTTPONLY = True
    SESSION_COOKIE_SAMESITE = "None"
    SESSION_COOKIE_SECURE = False  # Change to True when using HTTPS
 
    # ------------------------ FILE UPLOAD ---------------------