from flask import Blueprint, request, jsonify,make_response
from app.controllers.contractor_controller import ContractorController
from app.config import Config
from flask import current_app

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

@contractor_bp.route("/verify_otp", methods=["POST"])
def verify_otp():
    data = request.get_json()
    return ContractorController.verify_otp(data)

   


@contractor_bp.route("/refresh", methods=["POST"])
def refresh():
    return ContractorController.refresh()


@contractor_bp.route("/logout", methods=["POST"])
def logout():
    return ContractorController.logout()

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


@contractor_bp.route("/contractor_gate_status", methods=["GET"])
def contractor_gate_status():
    user_uid = request.args.get("user_uid")
    result, status = ContractorController.get_contractor_gate_status(user_uid)
    return jsonify(result), status