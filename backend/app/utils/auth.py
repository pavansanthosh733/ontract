import uuid
import jwt
import logging
from functools import wraps
from datetime import datetime, timezone
from flask import request, jsonify, current_app
from app.models.database import db


# ==============================================
# 🎭 ROLES CONSTANTS
# ==============================================
class Roles:
    ADMIN      = "admin"
    PROVIDER   = "provider"
    CONTRACTOR = "contractor"
    


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
    "/api/admin/resend_otp",
    "/api/admin/send_otp",
    "/api/admin/logout",
    "/api/admin/refresh",
    "/api/admin/workorders/rfq/create",
    "/api/workorder-type",
    
   
   
      

    # ✅ Provider auth routes
    "/api/verify_otp",
    "/api/login",
    "/api/signup",
    "/api/activate",
    "/api/resend_otp",
    "/api/forgot",
    "/api/reset-password",
    "/api/verify-reset-otp",
    "/api/refresh",
    "/api/logout",
    "/api/profile",
    "/api/update_profile",
    "/api/zone",
    "/api/workorders/respond-workorder",
    "/api/workorders",
    "/api/category",
    "/api/item",
    "/api/type",
    "/api/description",
    "/api/region",
    "/api/state",
    "/api/city",
    "/api/mark_read",




    # ✅ Contractor auth routes
    "/api/contractor/verify_otp",
    "/api/contractor/login",
    "/api/contractor/signup",
    "/api/contractor/contractor_signup",
    "/api/contractor/contractor_activate",
    "/api/contractor/company_profile",
    "/api/contractor/update_company_profile",
    "/api/contractor/activate",
    "/api/contractor/resend_otp",
    "/api/contractor/logout",
    "/api/contractor/refresh",
    "/api/contractor/category",
    "/api/contractor/region",
    "/api/contractor/state",
    "/api/contractor/city",
    "/api/contractor/items",
    "/api/contractor/types",
    "/api/contractor/description",
    "/api/contractor/update_company_bank",
    


    # ✅ Add these missing routes causing 401
    "/api/dashboard/completed-orders",        # ✅
    "/api/dashboard/service-coverage-details", # ✅
    "/api/contractor/gate_status",             # ✅
    "/api/contractor/unread_count",            # ✅
    "/api/contractor/gate-status",             # ✅
    "/api/save_token",                         # ✅

    # ✅ Workorder public routes
    
    
    "/api/get_image/",

    # ✅ Provider routes
    "/api/provider",
    "/api/notification",
    "/api/location",
    "/api/file",

    # ✅ Master data routes
   
    
    
    "/api/mapping",
    "/api/workorder-type",
    "/api/master",
    "/api/ai-report",
    
   
]


# ==============================================
# 🔑 HELPER — extract token from cookie OR header
# ==============================================
def _extract_token():

    print("=" * 80)
    print("PATH:", request.path)
    print("COOKIE HEADER:", request.headers.get("Cookie"))
    print("REQUEST COOKIES:", request.cookies)

    if request.path.startswith("/api/admin"):
        token = request.cookies.get("admin_access_token")
        print("ADMIN TOKEN:", token)

    elif request.path.startswith("/api/contractor"):
        token = request.cookies.get("contractor_access_token")
        print("CONTRACTOR TOKEN:", token)

    else:
        token = request.cookies.get("user_access_token")
        print("USER TOKEN:", token)

    if token:
        return token

    auth_header = request.headers.get("Authorization")
    print("AUTH HEADER:", auth_header)

    if auth_header and auth_header.startswith("Bearer "):
        return auth_header.split(" ")[1]

    return None


# ==============================================
# 🚫 JWT REVOCATION — DATABASE FUNCTIONS
# ==============================================
def is_token_revoked(jti: str) -> bool:
    """
    Check if token JTI exists in revoked_tokens_t table.
    Called on EVERY protected request.
    """
    try:
        with db.engine.connect() as conn:
            from sqlalchemy import text
            result = conn.execute(
                text("""
                    SELECT 1 FROM revoked_tokens_t
                    WHERE jti = :jti
                    AND expires_at > NOW()
                    LIMIT 1
                """),
                {"jti": jti}
            )
            return result.fetchone() is not None
    except Exception as e:
        logging.error(f"❌ Token revocation check failed: {e}")
        # Fail open — if DB check fails, don't block the request
        return False


def revoke_token(jti: str, user_id: str, role: str, expires_at: datetime):
    """
    Add token JTI to revoked_tokens_t.
    Called on logout.
    """
    try:
        with db.engine.connect() as conn:
            from sqlalchemy import text
            conn.execute(
                text("""
                    INSERT INTO revoked_tokens_t (jti, user_id, role, revoked_at, expires_at)
                    VALUES (:jti, :user_id, :role, NOW(), :expires_at)
                    ON CONFLICT (jti) DO NOTHING
                """),
                {
                    "jti":        jti,
                    "user_id":    str(user_id),
                    "role":       role,
                    "expires_at": expires_at
                }
            )
            conn.commit()
            logging.info(f"✅ Token revoked: jti={jti} user={user_id}")
    except Exception as e:
        logging.error(f"❌ Token revocation failed: {e}")


def cleanup_expired_tokens():
    """
    Delete expired tokens from revoked_tokens_t.
    Call this on a schedule (e.g. daily) to keep table small.
    """
    try:
        with db.engine.connect() as conn:
            from sqlalchemy import text
            result = conn.execute(
                text("DELETE FROM revoked_tokens_t WHERE expires_at < NOW()")
            )
            conn.commit()
            logging.info(f"🧹 Cleaned up {result.rowcount} expired revoked tokens")
    except Exception as e:
        logging.error(f"❌ Token cleanup failed: {e}")


# ==============================================
# 🌐 GLOBAL MIDDLEWARE
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
                logging.info(f"⚪ Public route: {request.path}")
                return None

        # ✅ Extract token
        token = _extract_token()

        if not token:
            logging.warning(f"❌ No token on: {request.path}")
            return jsonify({
                "success": False,
                "message": "Authorization token missing"
            }), 401

        # ✅ Decode and validate token
        try:
            payload = jwt.decode(
                token,
                current_app.config["SECRET_KEY"],
                algorithms=["HS256"]
            )

            # ✅ JWT REVOCATION CHECK — runs on every request
            jti = payload.get("jti")
            if jti and is_token_revoked(jti):
                logging.warning(
                    f"🚫 Revoked token used: "
                    f"jti={jti} | "
                    f"path={request.path}"
                )
                return jsonify({
                    "success": False,
                    "message": "Token has been revoked. Please login again."
                }), 401

            request.user_id = payload["user_id"]
            request.role    = payload.get("role")
            request.jti     = jti

            # ==============================================
            # RBAC
            # ==============================================
            ROLE_RULES = {
                "/api/admin": {Roles.ADMIN},
                "/api/contractor": {Roles.ADMIN, Roles.CONTRACTOR},
                "/api/workorders": {Roles.ADMIN, Roles.PROVIDER, Roles.CONTRACTOR},
                "/api/region": {Roles.ADMIN, Roles.PROVIDER, Roles.CONTRACTOR},
                "/api/state": {Roles.ADMIN, Roles.PROVIDER, Roles.CONTRACTOR},
                "/api/city": {Roles.ADMIN, Roles.PROVIDER, Roles.CONTRACTOR},
                "/api/zone": {Roles.ADMIN, Roles.PROVIDER, Roles.CONTRACTOR},
                "/api/master": {Roles.ADMIN},
                "/api/mapping": {Roles.ADMIN},
                "/api/workorder-type": {Roles.ADMIN, Roles.PROVIDER},
                "/api/provider": {Roles.ADMIN, Roles.PROVIDER},
                "/api/notification": {Roles.ADMIN, Roles.PROVIDER, Roles.CONTRACTOR},
                "/api/dashboard": {Roles.ADMIN, Roles.PROVIDER, Roles.CONTRACTOR},
                "/api/invoice": {Roles.ADMIN, Roles.PROVIDER},
                "/api/ai-report": {Roles.ADMIN},
            }

            for api, allowed_roles in ROLE_RULES.items():

                if request.path.startswith(api):

                    if request.role not in allowed_roles:

                        logging.warning(
                            f"RBAC FAILED | "
                            f"Role={request.role} | "
                            f"Path={request.path}"
                        )

                        return jsonify({
                            "success": False,
                            "message": "Access denied."
                        }), 403

                    break

            logging.info(
                f"✅ Auth passed: {request.path} "
                f"| user={request.user_id} "
                f"| role={request.role}"
            )

        except jwt.ExpiredSignatureError:
            logging.error(f"❌ Token expired: {request.path}")
            return jsonify({
                "success": False,
                "message": "Token expired. Please login again."
            }), 401

        except jwt.InvalidTokenError as e:
            logging.error(f"❌ Invalid token: {request.path}: {e}")
            return jsonify({
                "success": False,
                "message": "Invalid token"
            }), 401

        except Exception as e:
            logging.error(f"❌ Token error: {request.path}: {e}")
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

        token = _extract_token()

        if not token:
            return jsonify({
                "success": False,
                "message": "Authorization token missing"
            }), 401

        try:
            payload = jwt.decode(
                token,
                current_app.config["SECRET_KEY"],
                algorithms=["HS256"]
            )

            # ✅ Revocation check
            jti = payload.get("jti")
            if jti and is_token_revoked(jti):
                return jsonify({
                    "success": False,
                    "message": "Token has been revoked. Please login again."
                }), 401

            request.user_id = payload["user_id"]
            request.role    = payload.get("role")
            request.jti     = jti

        except jwt.ExpiredSignatureError:
            return jsonify({"success": False, "message": "Token expired."}), 401

        except jwt.InvalidTokenError:
            return jsonify({"success": False, "message": "Invalid token"}), 401

        except Exception as e:
            return jsonify({"success": False, "message": "Authentication failed"}), 401

        return f(*args, **kwargs)
    return decorated





# ==============================================
# 🛡️ RBAC — ROLE REQUIRED DECORATOR
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
    "revoke_token",
    "cleanup_expired_tokens",
    "Roles",
]