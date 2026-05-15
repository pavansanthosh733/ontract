from app import create_app
from app.utils.firebase_init import initialize_firebase

# 🔥 Initialize Firebase BEFORE app starts
initialize_firebase()

app = create_app(include_admin=True)

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)