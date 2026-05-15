from app.models.database import db
from sqlalchemy import text

class WorkOrderTypeModel:
    __tablename__ = "workorder_type_t"

    @staticmethod
    def create(data):
        workorder_type = data.get("WORKORDER_TYPE")
        status = data.get("STATUS", "ACTIVE")
        if not workorder_type:
            raise ValueError("WORKORDER_TYPE is required")

        # Get next workordertype_id
        sql_max = text("SELECT MAX(workordertype_id) AS max_id FROM workorder_type_t")
        result = db.session.execute(sql_max).fetchone()
        next_id = (result.max_id + 1) if result and result.max_id else 1

        sql_insert = text("""
            INSERT INTO workorder_type_t (workorder_type, workordertype_id, status)
            VALUES (:workorder_type, :workordertype_id, :status)
            RETURNING id, workorder_type, workordertype_id, status
        """)
        inserted = db.session.execute(sql_insert, {
            "workorder_type": workorder_type,
            "workordertype_id": next_id,
            "status": status
        }).fetchone()
        db.session.commit()
        return dict(inserted._mapping)

    @staticmethod
    def get_all():
        sql = text("SELECT * FROM workorder_type_t ORDER BY id ASC")
        result = db.session.execute(sql).fetchall()
        return [dict(row._mapping) for row in result]

    @staticmethod
    def get_by_id(id):
        sql = text("SELECT * FROM workorder_type_t WHERE id = :id")
        result = db.session.execute(sql, {"id": id}).fetchone()
        if not result:
            raise ValueError("Work Order Type not found")
        return dict(result._mapping)

    @staticmethod
    def update(id, data):
        sql_check = text("SELECT * FROM workorder_type_t WHERE id = :id")
        existing = db.session.execute(sql_check, {"id": id}).fetchone()
        if not existing:
            raise ValueError("Work Order Type not found")

        workorder_type = data.get("WORKORDER_TYPE", existing.workorder_type)
        status = data.get("STATUS", existing.status)

        sql_update = text("""
            UPDATE workorder_type_t
            SET workorder_type = :workorder_type,
                status = :status
            WHERE id = :id
            RETURNING id, workorder_type, workordertype_id, status
        """)
        updated = db.session.execute(sql_update, {
            "id": id,
            "workorder_type": workorder_type,
            "status": status
        }).fetchone()
        db.session.commit()
        return dict(updated._mapping)

    @staticmethod
    def delete(id):
        sql_check = text("SELECT * FROM workorder_type_t WHERE id = :id")
        existing = db.session.execute(sql_check, {"id": id}).fetchone()
        if not existing:
            raise ValueError("Work Order Type not found")

        sql_delete = text("DELETE FROM workorder_type_t WHERE id = :id")
        db.session.execute(sql_delete, {"id": id})
        db.session.commit()
        return True
