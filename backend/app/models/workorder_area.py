from app.models.database import db
from sqlalchemy import text

class WorkOrderArea:
    __tablename__ = "workorder_area_t"

    @staticmethod
    def create(data):
        workorder_area = data.get("WORKORDER_AREA")
        status = data.get("STATUS", "ACTIVE")
        if not workorder_area:
            raise ValueError("WORKORDER_AREA is required")

        # Get next workorder_area_id
        sql_max = text("SELECT MAX(workorder_area_id) AS max_id FROM workorder_area_t")
        result = db.session.execute(sql_max).fetchone()
        next_id = (result.max_id + 1) if result and result.max_id else 1

        sql_insert = text("""
            INSERT INTO workorder_area_t (workorder_area, workorder_area_id, status)
            VALUES (:workorder_area, :workorder_area_id, :status)
            RETURNING id, workorder_area, workorder_area_id, status
        """)
        inserted = db.session.execute(sql_insert, {
            "workorder_area": workorder_area,
            "workorder_area_id": next_id,
            "status": status
        }).fetchone()
        db.session.commit()
        return dict(inserted._mapping)

    @staticmethod
    def get_all():
        sql = text("SELECT id, workorder_area, workorder_area_id, status FROM workorder_area_t ORDER BY id ASC")
        result = db.session.execute(sql).fetchall()
        return [dict(row._mapping) for row in result]

    @staticmethod
    def get_by_id(id):
        sql = text("SELECT id, workorder_area, workorder_area_id, status FROM workorder_area_t WHERE id = :id")
        result = db.session.execute(sql, {"id": id}).fetchone()
        if not result:
            raise ValueError("Work Order Area not found")
        return dict(result._mapping)

    @staticmethod
    def update(id, data):
        sql_check = text("SELECT * FROM workorder_area_t WHERE id = :id")
        existing = db.session.execute(sql_check, {"id": id}).fetchone()
        if not existing:
            raise ValueError("Work Order Area not found")

        workorder_area = data.get("WORKORDER_AREA", existing.workorder_area)
        status = data.get("STATUS", existing.status)

        sql_update = text("""
            UPDATE workorder_area_t
            SET workorder_area = :workorder_area,
                status = :status
            WHERE id = :id
            RETURNING id, workorder_area, workorder_area_id, status
        """)
        updated = db.session.execute(sql_update, {
            "id": id,
            "workorder_area": workorder_area,
            "status": status
        }).fetchone()
        db.session.commit()
        return dict(updated._mapping)

    @staticmethod
    def delete(id):
        sql_check = text("SELECT * FROM workorder_area_t WHERE id = :id")
        existing = db.session.execute(sql_check, {"id": id}).fetchone()
        if not existing:
            raise ValueError("Work Order Area not found")

        sql_delete = text("DELETE FROM workorder_area_t WHERE id = :id")
        db.session.execute(sql_delete, {"id": id})
        db.session.commit()
        return True
