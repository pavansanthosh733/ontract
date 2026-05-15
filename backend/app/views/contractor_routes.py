from flask import Blueprint, request, jsonify,make_response
from app.controllers.contractor_controller import ContractorController

contractor_bp = Blueprint('contractor_bp', __name__)

@contractor_bp.route('/contractor_signup', methods=['POST'])
def signup():
    data = request.get_json()
    data["service_type"] = 1
    result, status = ContractorController.signup(data)
    return jsonify(result), status

@contractor_bp.route('/contractor_activate', methods=['POST'])
def activate():
    token = request.get_json().get('token')
    result, status = ContractorController.activate(token)
    return jsonify(result), status

@contractor_bp.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    
    email = data.get("email")
    password = data.get("password")

    if not email or not password:
        return jsonify({"error": "Email and password required"}), 400

    # NEW - only allow login for company users
    result, status = ContractorController.login(email, password)
    return jsonify(result), status

@contractor_bp.route('/verify_otp', methods=['POST'])
def verify_otp():
    data = request.get_json()
    result, status = ContractorController.verify_otp(data)

    response = make_response(jsonify(result), status)

    # ✅ set 90 day persistent cookie
    if status == 200 and "refresh_token" in result:
        response.set_cookie(
            "contractor_refresh_token",
            result["refresh_token"],
            httponly=True,
            secure=True,
            samesite="None",
            max_age=90 * 24 * 60 * 60,
            path="/"
        )

    return response



@contractor_bp.route('/refresh_token', methods=['POST'])
def refresh_token():
    refresh_token = (
    request.cookies.get("contractor_refresh_token")
    or request.headers.get("Authorization", "").replace("Bearer ", "")
)

    if not refresh_token:
        return jsonify({"error": "Refresh token missing"}), 401

    result, status = ContractorController.refresh_token(refresh_token)

    response = make_response(jsonify(result), status)

    # rotate refresh token cookie if backend returns new one
    if status == 200 and "refresh_token" in result:
        response.delete_cookie(
            "contractor_refresh_token",
            path="/"
        )

        response.set_cookie(
            "contractor_refresh_token",
            result["refresh_token"],
            httponly=True,
            secure=True,
            samesite="None",
            max_age=90 * 24 * 60 * 60,
            path="/"
        )

    return response


@contractor_bp.route('/logout', methods=['POST'])
def logout():
    refresh_token = (
    request.cookies.get("contractor_refresh_token")
    or request.headers.get("Authorization", "").replace("Bearer ", "")
)

    result, status = ContractorController.logout(refresh_token)

    response = make_response(jsonify(result), status)

    # remove persistent login cookie
    response.delete_cookie(
        "contractor_refresh_token",
        path="/"
    )

    return response

@contractor_bp.route('/resend_otp', methods=['POST'])
def resend_otp():
    data = request.get_json()
    result, status = ContractorController.resend_otp(data)
    return jsonify(result), status

@contractor_bp.route('/company_profile', methods=['POST'])
def profile():
    data = request.get_json()
    result, status = ContractorController.get_profile(data)
    return jsonify(result), status

@contractor_bp.route('/update_company_profile', methods=['POST'])
def update_company_profile():
    result, status = ContractorController.update_company_profile(request.form, request.files)
    return jsonify(result), status

@contractor_bp.route('/update_company_bank', methods=['POST'])
def update_company_bank():
    result, status = ContractorController.update_company_bank(request.form, request.files)
    return jsonify(result), status

# ---------- Notifications ----------
@contractor_bp.route('/contractor_notifications', methods=['GET'])
def get_notifications():
    email = request.args.get('email')
    result, status = ContractorController.get_notifications(email)
    return jsonify(result), status

@contractor_bp.route('/contractor_unread_count', methods=['GET'])
def unread_count():
    email = request.args.get('email')
    result, status = ContractorController.unread_count(email)
    return jsonify(result), status

@contractor_bp.route('/contractor_mark_read', methods=['POST'])
def mark_read():
    data = request.get_json()
    result, status = ContractorController.mark_as_read(data)
    return jsonify(result), status