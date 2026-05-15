from flask import Blueprint, request, jsonify
from app.controllers.notification_controller import NotificationController

notification_bp = Blueprint('notification_bp', __name__)

# ---------------- Get All Notifications ----------------
@notification_bp.route('/notifications', methods=['GET'])
def get_notifications():
    email = request.args.get('email')
    result, status = NotificationController.get_notifications(email)
    return jsonify(result), status


# ---------------- Get Unread Count ----------------
@notification_bp.route('/unread_count', methods=['GET'])
def unread_count():
    email = request.args.get('email')
    result, status = NotificationController.unread_count(email)
    return jsonify(result), status


# ---------------- Mark Notification as Read ----------------
@notification_bp.route('/mark_read', methods=['POST'])
def mark_read():
    data = request.get_json()
    message_id = data.get('message_id')
    result, status = NotificationController.mark_as_read(message_id)
    return jsonify(result), status
