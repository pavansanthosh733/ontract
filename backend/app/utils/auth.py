import jwt
import logging
from functools import wraps
from flask import request, jsonify, current_app


# ==============================================
# 🎭 ROLES CONSTANTS
# ==============================================
class Roles:
    ADMIN      = "admin"
    MANAGER    = "manager"
    PROVIDER   = "provider"
    CONTRACTOR = "contractor"
    USER       = "user"


# ==============================================
# 🔓 PUBLIC ROUTES (no token needed)
# ==============================================
PUBLIC_ROUTES = [

    # ✅ Health check
    "/api/health",

    # ✅ File uploads
    "/uploads/",

    # ✅ Testdb
    "/api/testdb",

    # ✅ Admin auth routes
    "/api/admin/login",
    "/api/admin/verify_otp",
    "/api/admin/dev-login",
    "/api/admin/resend-otp",
    "/api/admin/send-otp",
    "/api/workorders/admin/",

    # ✅ Provider auth routes
    "/api/verify_otp",
    "/api/login",
    "/api/signup",
    "/api/activate",
    "/api/resend_otp",
    "/api/forgot",
    "/api/reset-password",
    "/api/verify-reset-otp",

    # ✅ Contractor auth routes
    "/api/contractor/verify_otp",
    "/api/contractor/login",
    "/api/contractor/signup",
    "/api/contractor/activate",
    "/api/contractor/resend_otp",
    "/api/contractor/logout",

    # ✅ Provider logout
    "/api/logout",

    # ✅ Add these missing routes causing 401
    "/api/dashboard/completed-orders",        # ✅
    "/api/dashboard/service-coverage-details", # ✅
    "/api/contractor/gate_status",             # ✅
    "/api/contractor/unread_count",            # ✅
    "/api/contractor/gate-status",             # ✅
    "/api/save_token",                         # ✅

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
    "/api/workorders/provider/",
    "/api/workorders/admin-notification-close",

    # ✅ Provider routes
    "/api/provider",
    "/api/notification",
    "/api/location",
    "/api/file",

    # ✅ Master data routes
    "/api/region",
    "/api/state",
    "/api/city",
    "/api/zone",
    "/api/mapping",
    "/api/workorder-type",
    "/api/master",
    "/api/ai-report",
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

            request.user_id = payload["user_id"]
            request.role    = payload.get("role")

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
# 🔐 TOKEN REQUIRED DECORATOR
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
            request.role    = payload.get("role")

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


# ==============================================
# 🛡️ RBAC — PROTECT ENTIRE BLUEPRINT AT ONCE
# ==============================================
def protect_blueprint(bp, *allowed_roles):
    """
    Protects ALL routes in a blueprint at once.
    Usage in __init__.py:
        protect_blueprint(workorder_bp, Roles.ADMIN, Roles.MANAGER)
    """
    @bp.before_request
    def check_role():
        user_role = getattr(request, "role", None)
        user_id   = getattr(request, "user_id", None)

        if user_role not in allowed_roles:
            logging.warning(
                f"🚫 Access denied: "
                f"user_id={user_id} | "
                f"role='{user_role}' | "
                f"path={request.path} | "
                f"allowed={allowed_roles}"
            )
            return jsonify({
                "success": False,
                "message": "Access denied. You don't have permission."
            }), 403

        logging.info(
            f"✅ Role OK: "
            f"user_id={user_id} | "
            f"role='{user_role}' | "
            f"path={request.path}"
        )


# ==============================================
# 🛡️ RBAC — ROLE REQUIRED DECORATOR
# (use this if one route needs different role)
# ==============================================
def role_required(*allowed_roles):
    def decorator(f):
        @wraps(f)
        def decorated(*args, **kwargs):
            user_role = getattr(request, "role", None)
            user_id   = getattr(request, "user_id", None)

            if user_role not in allowed_roles:
                logging.warning(
                    f"🚫 Access denied: "
                    f"user_id={user_id} | "
                    f"role='{user_role}' | "
                    f"path={request.path}"
                )
                return jsonify({
                    "success": False,
                    "message": "Access denied. You don't have permission."
                }), 403

            return f(*args, **kwargs)
        return decorated
    return decorator


# ==============================================
# ✅ EXPORTS
# ==============================================
__all__ = [
    "register_auth_middleware",
    "token_required",
    "role_required",
    "protect_blueprint",
    "Roles",
]
