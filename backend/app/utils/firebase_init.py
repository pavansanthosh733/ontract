import firebase_admin
from firebase_admin import credentials
import logging

def initialize_firebase():
    try:
        firebase_admin.get_app()
        logging.info("✅ Firebase already initialized")
    except ValueError:
        cred = credentials.Certificate("serviceAccountKey.json")
        firebase_admin.initialize_app(cred)
        logging.info("Firebase initialized successfully")