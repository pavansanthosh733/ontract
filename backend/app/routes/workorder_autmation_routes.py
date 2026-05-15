"""
Automation Routes - Add this to your routes folder
File: app/routes/workorder_automation_routes.py
"""

from flask import Blueprint, jsonify, request
from app.controllers.workorder_automation_controller import (
    handle_get_assignment_attempts,
    handle_trigger_manual_retry,
    handle_stop_automation
)

# Blueprint Registration
automation_bp = Blueprint("automation_bp", __name__)


# ----------------------------------------------------------------------
# ROUTE 1: GET ASSIGNMENT ATTEMPTS FOR A WORKORDER
# ----------------------------------------------------------------------
@automation_bp.route("/workorders/<int:workorder_id>/assignment-attempts", methods=["GET"])
def get_assignment_attempts(workorder_id):
    """
    Get all automated assignment attempts for a workorder.
    Shows timeline of contractors contacted and their responses.
    """
    response_data, status_code = handle_get_assignment_attempts(workorder_id)
    return jsonify(response_data), status_code


# ----------------------------------------------------------------------
# ROUTE 2: MANUALLY RETRY AUTOMATION (ADMIN ONLY)
# ----------------------------------------------------------------------
@automation_bp.route("/workorders/<int:workorder_id>/retry-automation", methods=["POST"])
def retry_automation(workorder_id):
    """
    Manually trigger automation retry for a failed workorder.
    Admin can use this if automation stopped unexpectedly.
    """
    base_url = request.host_url.rstrip("/")
    response_data, status_code = handle_trigger_manual_retry(workorder_id, base_url)
    return jsonify(response_data), status_code


# ----------------------------------------------------------------------
# ROUTE 3: STOP ONGOING AUTOMATION (ADMIN ONLY)
# ----------------------------------------------------------------------
@automation_bp.route("/workorders/<int:workorder_id>/stop-automation", methods=["POST"])
def stop_automation(workorder_id):
    """
    Stop ongoing automation for a workorder.
    Used when admin wants to manually assign instead.
    """
    response_data, status_code = handle_stop_automation(workorder_id)
    return jsonify(response_data), status_code