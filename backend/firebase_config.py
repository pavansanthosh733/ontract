import firebase_admin
from firebase_admin import credentials

cred = credentials.Certificate("ontract-notifications-firebase-adminsdk-fbsvc-869313fec0.json")

firebase_admin.initialize_app(cred)