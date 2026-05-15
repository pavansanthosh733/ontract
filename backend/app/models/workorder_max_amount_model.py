import logging
from app.models.database import db
from sqlalchemy import text


class WorkorderMaxAmountModel:

    @staticmethod
    def get_active_max_amount():
        sql = text("""
            SELECT *
            FROM workorder_max_amount_t
            WHERE status = 'Active'
            ORDER BY id DESC
            LIMIT 1
        """)
        result = db.session.execute(sql).fetchone()
        return dict(result._mapping) if result else None

    @staticmethod
    def create_max_amount(max_amount, currency_code, status, created_by):
        sql = text("""
            INSERT INTO workorder_max_amount_t
            (max_amount, currency_code, status, created_by)
            VALUES
            (:max_amount, :currency_code, :status, :created_by)
        """)
        db.session.execute(sql, {
            "max_amount": max_amount,
            "currency_code": currency_code,
            "status": status,
            "created_by": created_by
        })
        db.session.commit()
        return True

    @staticmethod
    def update_max_amount(id, max_amount, currency_code, status, updated_by):
        sql = text("""
            UPDATE workorder_max_amount_t
            SET max_amount = :max_amount,
                currency_code = :currency_code,
                status = :status,
                updated_by = :updated_by,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = :id
        """)
        db.session.execute(sql, {
            "id": id,
            "max_amount": max_amount,
            "currency_code": currency_code,
            "status": status,
            "updated_by": updated_by
        })
        db.session.commit()
        return True

    # 🔥 HARD DELETE (NO SOFT DELETE)
    @staticmethod
    def delete_max_amount(id):
        sql = text("""
            DELETE FROM workorder_max_amount_t
            WHERE id = :id
        """)
        db.session.execute(sql, {"id": id})
        db.session.commit()
        return True

    @staticmethod
    def get_all_configs():
        sql = text("""
            SELECT *
            FROM workorder_max_amount_t
            ORDER BY created_at DESC
        """)
        result = db.session.execute(sql)
        return [dict(row._mapping) for row in result]