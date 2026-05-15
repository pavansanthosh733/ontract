# app/views/admin_routes.py
from flask import Blueprint, request, jsonify
from app.controllers.admin_controller import AdminController

admin_bp = Blueprint('admin_bp', __name__)

# ===== Auth =====
@admin_bp.route('/login', methods=['POST'])
def admin_login():
    data = request.get_json(force=True)
    res, status = AdminController.login(data.get('email'), data.get('password'))
    return jsonify(res), status

@admin_bp.route('/verify_otp', methods=['POST'])
def verify_admin_otp():
    data = request.get_json(force=True)
    res, status = AdminController.verify_otp(data.get('email'), data.get('otp'))
    return jsonify(res), status

# ===== Providers =====
@admin_bp.route('/providers', methods=['GET'])
def providers():
    res, status = AdminController.list_providers()
    return jsonify(res), status

@admin_bp.route('/approve_provider', methods=['POST'])
def approve_provider():
    email = request.get_json(force=True).get('email')
    res, status = AdminController.approve_provider(email)
    return jsonify(res), status

@admin_bp.route('/reject_provider', methods=['POST'])
def reject_provider():
    email = request.get_json(force=True).get('email')
    res, status = AdminController.reject_provider(email)
    return jsonify(res), status

@admin_bp.route('/send_message', methods=['POST'])
def send_message_provider():
    data = request.get_json(force=True)
    res, status = AdminController.send_message_provider(data.get('email'), data.get('message'))
    return jsonify(res), status

# ===== Contractors =====
@admin_bp.route('/contractors', methods=['GET'])
def contractors():
    res, status = AdminController.list_contractors()
    return jsonify(res), status

@admin_bp.route('/approve_contractor', methods=['POST'])
def approve_contractor():
    email = request.get_json(force=True).get('email')
    res, status = AdminController.approve_contractor(email)
    return jsonify(res), status

@admin_bp.route('/reject_contractor', methods=['POST'])
def reject_contractor():
    email = request.get_json(force=True).get('email')
    res, status = AdminController.reject_contractor(email)
    return jsonify(res), status

@admin_bp.route('/send_message_contractor', methods=['POST'])
def send_message_contractor():
    data = request.get_json(force=True)
    res, status = AdminController.send_message_contractor(data.get('email'), data.get('message'))
    return jsonify(res), status

@admin_bp.route('/standard_rates/upload_excel', methods=['POST'])
def upload_excel():
    if 'file' not in request.files:
        return jsonify({"error": "No file provided"}), 400
    uploaded = request.files['file']
    res, status = AdminController.upload_excel(uploaded)
    return jsonify(res), status

# List with pagination, filter, search
@admin_bp.route('/standard_rates', methods=['GET'])
def list_standard_rates():
    args = request.args.to_dict()
    res, status = AdminController.list_standard_rates(args)
    return jsonify(res), status

# Add single record
@admin_bp.route('/standard_rates', methods=['POST'])
def add_standard_rate():
    payload = request.get_json(force=True)
    res, status = AdminController.add_standard_rate(payload)
    return jsonify(res), status

# Update single record
@admin_bp.route('/standard_rates/<int:rate_id>', methods=['PUT'])
def update_standard_rate(rate_id):
    payload = request.get_json(force=True)
    res, status = AdminController.update_standard_rate(rate_id, payload)
    return jsonify(res), status

# Delete single record
@admin_bp.route('/standard_rates/<int:rate_id>', methods=['DELETE'])
def delete_standard_rate(rate_id):
    res, status = AdminController.delete_standard_rate(rate_id)
    return jsonify(res), status


# app/views/admin_routes.py

@admin_bp.route('/activate_user', methods=['PUT'])
def activate_user():
    email = request.get_json(force=True).get('email')
    res, status = AdminController.update_active_status(email, True)
    return jsonify(res), status


@admin_bp.route('/deactivate_user', methods=['PUT'])
def deactivate_user():
    email = request.get_json(force=True).get('email')
    res, status = AdminController.update_active_status(email, False)
    return jsonify(res), status

@admin_bp.route("/resend_otp", methods=["POST"])
def resend_admin_otp():
    data = request.get_json(force=True)
    res, status = AdminController.resend_otp(
        data.get("email")
    )
    return jsonify(res), status
