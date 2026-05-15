from app.models.notification_model import NotificationModel

class NotificationController:
    @staticmethod
    def get_notifications(email):
        if not email:
            return {"error": "Email required"}, 400
        data = NotificationModel.get_all(email)
        return data, 200

    @staticmethod
    def unread_count(email):
        if not email:
            return {"error": "Email required"}, 400
        count = NotificationModel.unread_count(email)
        return {"count": count}, 200

    @staticmethod
    def mark_as_read(message_id):
        if not message_id:
            return {"error": "Message ID required"}, 400
        updated = NotificationModel.mark_read(message_id)
        if updated:
            return {"success": True}, 200
        return {"error": "Notification not found"}, 404
