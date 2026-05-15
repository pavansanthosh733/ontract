from flask import Blueprint, jsonify, request
from app.models.user_dashboard_model import DashboardModel
import logging

user_dashboard_bp = Blueprint("user_dashboard_bp", __name__)

@user_dashboard_bp.route("/dashboard/completed-orders", methods=["GET"])
def get_completed_orders():
    try:
        user_uid = request.args.get("user_uid")

        if not user_uid:
            return jsonify({
                "success": False,
                "message": "user_uid is required"
            }), 400

        count = DashboardModel.get_completed_orders_count(user_uid)

        return jsonify({
            "success": True,
            "completed_orders": count
        }), 200

    except Exception as e:
        logging.error("Error fetching completed orders", exc_info=True)
        return jsonify({
            "success": False,
            "message": "Failed to fetch completed orders"
        }), 500
        
        
@user_dashboard_bp.route("/dashboard/service-coverage-details", methods=["GET"])
def get_service_coverage_details():
    try:
        user_uid = request.args.get("user_uid")

        if not user_uid:
            return jsonify({
                "success": False,
                "message": "user_uid is required"
            }), 400

        data = DashboardModel.get_service_coverage_details(user_uid)

        return jsonify({
            "success": True,
            "regions": data["regions"],
            "services": data["services"]
        })

    except Exception as e:
        logging.error(f"Service coverage details error: {e}")
        return jsonify({
            "success": False,
            "message": "Failed to fetch service coverage details"
        }), 500

