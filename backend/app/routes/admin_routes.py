from flask import Blueprint, request
from app.controllers.admin_controller import AdminController

admin_bp = Blueprint("admin", __name__, url_prefix="/api/admin")

# ---- COMPANY USER COUNT ----
@admin_bp.route("/users/count/company", methods=["GET"])
def count_company_users():
    return AdminController.get_company_count()

# ---- INDIVIDUAL USER COUNT ----
@admin_bp.route("/users/count/individual", methods=["GET"])
def count_individual_users():
    return AdminController.get_individual_count()

# ---- ACTIVE USERS COUNT ----
@admin_bp.route("/users/count/active", methods=["GET"])
def count_active_users():
    return AdminController.get_active_users_count()

# ---- TODAY USERS COUNT ----
@admin_bp.route("/users/count/today", methods=["GET"])
def count_today_users():
    return AdminController.get_today_users_count()

# ---- USERS BY DATE ----
@admin_bp.route("/users/by-date", methods=["GET"])
def get_users_by_date():
    created_date = request.args.get("date")
    if not created_date:
        return {"error": "date parameter required (YYYY-MM-DD)"}, 400
    return AdminController.get_users_by_date(created_date)

# ---- ACTIVE USER LIST ----
@admin_bp.route("/users/active", methods=["GET"])
def get_active_users_list():
    return AdminController.get_active_users()