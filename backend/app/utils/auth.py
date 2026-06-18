import jwt
import logging
from functools import wraps
from flask import request, jsonify, current_app


# ==============================================
# 🔓 PUBLIC ROUTES (no token needed)
# ==============================================
PUBLIC_ROUTES = [

    # ✅ Health check
    "/api/health",

    # ✅ File uploads
    "/uploads/",

    # ✅ Admin auth routes
    "/api/admin/login",
    "/api/admin/verify_otp",
    "/api/admin/dev-login",
    "/api/admin/resend-otp",
    "/api/admin/send-otp",

    # ✅ Workorder public routes
    "/api/workorders/search",
    "/api/workorders/workorder-types",
    "/api/workorders/generate",
    "/api/workorders/generates",
    "/api/workorders/contractors",
    "/api/workorders/standard-rates",
    "/api/workorders/code/",
    "/api/workorders/send-acceptance-mail",
    "/api/workorders/contractors/by-area-type",
    "/api/workorders/contractors/by-region-category",

    # ✅ Mobile app provider routes (no login)
    "/api/workorders/provider/",
    "/api/workorders/admin-notification-close",

    # ✅ Provider routes
    "/api/provider",
    "/api/notification",
    "/api/location",
    "/api/file",

    # ✅ Testdb
    "/api/testdb",
]


# ==============================================
# 🌐 GLOBAL MIDDLEWARE
# Runs before every request automatically
# ==============================================
def register_auth_middleware(app):

    @app.before_request
    def check_token():

        # ✅ Always allow CORS preflight
        if request.method == "OPTIONS":
            return None

        # ✅ Skip public routes
        for public in PUBLIC_ROUTES:
            if request.path.startswith(public):
                logging.info(f"⚪ Public route, skipping auth: {request.path}")
                return None

        # ✅ Check Authorization header exists
        auth_header = request.headers.get("Authorization")

        if not auth_header:
            logging.warning(f"❌ No token on protected route: {request.path}")
            return jsonify({
                "success": False,
                "message": "Authorization token missing"
            }), 401

        # ✅ Validate token
        try:
            token = auth_header.split(" ")[1]

            payload = jwt.decode(
                token,
                current_app.config["SECRET_KEY"],
                algorithms=["HS256"]
            )

            # ✅ Attach user info to request
            request.user_id = payload["user_id"]
            request.role = payload.get("role")

            logging.info(
                f"✅ Auth passed: {request.path} "
                f"| user={request.user_id} "
                f"| role={request.role}"
            )

        except jwt.ExpiredSignatureError:
            logging.error(f"❌ Token expired on: {request.path}")
            return jsonify({
                "success": False,
                "message": "Token expired. Please login again."
            }), 401

        except jwt.InvalidTokenError as e:
            logging.error(f"❌ Invalid token on {request.path}: {e}")
            return jsonify({
                "success": False,
                "message": "Invalid token"
            }), 401

        except Exception as e:
            logging.error(f"❌ Token error on {request.path}: {e}")
            return jsonify({
                "success": False,
                "message": "Authentication failed"
            }), 401


# ==============================================
# 🔐 DECORATOR
# Keep this for any route that still needs it
# ==============================================
def token_required(f):

    @wraps(f)
    def decorated(*args, **kwargs):

        logging.info("🔐 TOKEN CHECK STARTED")

        auth_header = request.headers.get("Authorization")

        logging.info(f"Authorization Header: {auth_header}")

        if not auth_header:
            logging.warning("❌ Authorization token missing")
            return jsonify({
                "success": False,
                "message": "Authorization token missing"
            }), 401

        try:
            token = auth_header.split(" ")[1]

            logging.info(f"Token Received: {token[:20]}...")

            payload = jwt.decode(
                token,
                current_app.config["SECRET_KEY"],
                algorithms=["HS256"]
            )

            logging.info(f"✅ Token Validated Successfully")
            logging.info(f"User ID: {payload.get('user_id')}")
            logging.info(f"Role: {payload.get('role')}")

            request.user_id = payload["user_id"]
            request.role = payload.get("role")

        except jwt.ExpiredSignatureError:
            logging.error("❌ Token expired")
            return jsonify({
                "success": False,
                "message": "Token expired. Please login again."
            }), 401

        except jwt.InvalidTokenError as e:
            logging.error(f"❌ Invalid Token: {str(e)}")
            return jsonify({
                "success": False,
                "message": "Invalid token"
            }), 401

        except Exception as e:
            logging.error(f"❌ Token error: {str(e)}")
            return jsonify({
                "success": False,
                "message": "Authentication failed"
            }), 401

        return f(*args, **kwargs)

    return decorated