from cryptography.fernet import Fernet
from app.config import Config

cipher = Fernet(Config.ENCRYPTION_KEY.encode())

def encrypt_value(val):
    if not val:
        return None
    return cipher.encrypt(val.encode()).decode()

def decrypt_value(val):
    if not val:
        return None
    try:
        return cipher.decrypt(val.strip().encode()).decode()
    except Exception as e:
        print("❌ Decrypt failed:", e)
        return None

