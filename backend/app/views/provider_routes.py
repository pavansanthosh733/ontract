from flask import Blueprint, request, jsonify
from app.controllers.provider_controller import ProviderController
from app.utils.file_utils import save_uploaded_file

provider_bp = Blueprint("provider_bp", __name__)


# ==================================================================
#                             AUTH ROUTES
# ==================================================================

@provider_bp.route("/signup", methods=["POST"])
def signup():
    data = request.get_json()
    data["service_type"] = 0
    result, status = ProviderController.signup(data)
    return jsonify(result), status


@provider_bp.route("/activate", methods=["POST"])
def activate_account():
    token = request.get_json().get("token")
    if not token:
        return jsonify({"error": "Token required"}), 400
    result, status = ProviderController.activate_account(token)
    return jsonify(result), status


@provider_bp.route("/login", methods=["POST"])
def login():
    data = request.get_json()
    email = data.get("email")
    password = data.get("password")

    if not email or not password:
        return jsonify({"error": "Email and password required"}), 400

    result, status = ProviderController.login(email, password)
    return jsonify(result), status


@provider_bp.route("/verify_otp", methods=["POST"])
def verify_otp():
    data = request.get_json()
    return ProviderController.verify_otp(
        data["email"],
        data["otp"]
    )
@provider_bp.route("/refresh", methods=["POST"])
def refresh():
    return ProviderController.refresh()

@provider_bp.route("/logout", methods=["POST"])
def logout():
    return ProviderController.logout()

@provider_bp.route("/save_token", methods=["POST"])
def save_token():
    data = request.get_json()

    user_id = data.get("user_id")
    fcm_token = data.get("fcm_token")
    device_type = data.get("device_type", "web")
    role = data.get("role")

    result, status = ProviderController.save_token(user_id,fcm_token,device_type,role)

    return jsonify(result), status

@provider_bp.route("/resend_otp", methods=["POST"])
def resend_otp():
    email = request.get_json().get("email")
    if not email:
        return jsonify({"error": "Email required"}), 400

    result, status = ProviderController.resend_otp(email)
    return jsonify(result), status


@provider_bp.route("/forgot_send_otp", methods=["POST"])
def forgot_send_otp():
    email = request.get_json().get("email")
    if not email:
        return jsonify({"error": "Email required"}), 400

    result, status = ProviderController.forgot_send_otp(email)
    return jsonify(result), status


@provider_bp.route("/verify_reset_otp", methods=["POST"])
def verify_reset_otp():
    data = request.get_json()
    email = data.get("email")
    otp = data.get("otp")

    if not email or not otp:
        return jsonify({"error": "Email and OTP required"}), 400

    result, status = ProviderController.verify_reset_otp(email, otp)
    return jsonify(result), status


@provider_bp.route("/reset_password", methods=["POST"])
def reset_password():
    data = request.get_json()
    email = data.get("email")
    token = data.get("reset_token")
    password = data.get("password")

    if not all([email, token, password]):
        return jsonify({"error": "Email, token, and password required"}), 400

    result, status = ProviderController.reset_password(email, token, password)
    return jsonify(result), status


# ==================================================================
#                          BANK ROUTES
# ==================================================================

@provider_bp.route("/update_bank", methods=["POST"])
def update_bank():
    try:
        form = request.form

        email = form.get("email")
        bank_name = form.get("bank_name")
        holder_name = form.get("holder_name")
        account_number = form.get("account_number")
        swift = form.get("swift", "").upper()
        bank_statement = request.files.get("bank_statement")

        if not all([email, bank_name, holder_name, account_number, swift, bank_statement]):
            return jsonify({"error": "All bank fields and statement required"}), 400

        file_info = save_uploaded_file(
            bank_statement,
            "provider_bank_statements",
            "/uploads/provider_bank_statements"
        )
        
        result, status = ProviderController.update_bank(
            email,
            bank_name,
            holder_name,
            account_number,
            swift,
            file_info["file_path"]
        )

        return jsonify(result), status

    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ==================================================================
#                        PROFILE ROUTES
# ==================================================================

@provider_bp.route("/profile", methods=["POST"])
def get_profile():
    email = request.get_json().get("email")

    if not email:
        return jsonify({"error": "Email required"}), 400

    result, status = ProviderController.get_profile(email)
    return jsonify(result), status


@provider_bp.route("/update_profile", methods=["POST"])
def update_profile():
    try:
        form = request.form
        files = request.files
        

        email = form.get("email")
        if not email:
            return jsonify({"error": "Email required"}), 400

        result, status = ProviderController.update_profile(form, files)
        return jsonify(result), status

    except Exception as e:
        return jsonify({"error": str(e)}), 500
    
    
@provider_bp.route("provider/provider_gate_status", methods=["GET"])
def contractor_gate_status():
    user_uid = request.args.get("user_uid")
    result, status = ProviderController.get_contractor_gate_status(user_uid)
    return jsonify(result), status
