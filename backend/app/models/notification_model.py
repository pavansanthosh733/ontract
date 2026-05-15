from sqlalchemy.sql import text
from app.models.database import db

class NotificationModel:

    @staticmethod
    def get_all(email):
        sql = text("""
            SELECT message_id, message, sent_at, is_read, notification_type
            FROM admin_messages_t
            WHERE email_id = :email
            ORDER BY sent_at DESC
        """)

        rows = db.session.execute(sql, {"email": email}).fetchall()
        return [dict(r._mapping) for r in rows]   # FIXED

    @staticmethod
    def unread_count(email):
        sql = text("""
            SELECT COUNT(*) AS count
            FROM admin_messages_t
            WHERE email_id = :email AND is_read = FALSE
        """)

        row = db.session.execute(sql, {"email": email}).fetchone()
        return row._mapping["count"] if row else 0   # FIXED

    @staticmethod
    def mark_read(message_id):
        sql = text("""
            UPDATE admin_messages_t 
            SET is_read = TRUE 
            WHERE message_id = :id
        """)

        result = db.session.execute(sql, {"id": message_id})
        db.session.commit()
        return result.rowcount > 0
