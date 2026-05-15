import os
from flask import Blueprint, jsonify, request
from app.controllers.workorder_mail_controller import WorkorderMailController

workorder_mail_bp = Blueprint("workorder_mail_bp", __name__)

EMAIL_USER = os.getenv("MAIL_USER")
EMAIL_PASS = os.getenv("MAIL_PASS")


@workorder_mail_bp.route("/send-acceptance-mail/<int:workorder_id>", methods=["POST"])
def send_acceptance_mail(workorder_id):
    """API route that triggers mail send."""
    data = request.get_json(silent=True)
    if not data:
        return jsonify({"error": "Invalid JSON"}), 400
    base_url = request.host_url.rstrip("/")
    resp, code = WorkorderMailController.send_assignment_email(
        workorder_id, data, base_url, EMAIL_USER, EMAIL_PASS
    )
    return jsonify(resp), code
