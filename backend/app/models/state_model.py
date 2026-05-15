import logging
from sqlalchemy import text
from sqlalchemy.exc import IntegrityError
from app import db


class DuplicateStateError(Exception):
    pass


class StateModel:

    @staticmethod
    def get_all_states():
        logging.info("Fetching all states with region name")

        sql = text("""
            SELECT
                a.*,
                b.region_name
            FROM state_master_t a
            JOIN region_master_t b
                ON a.region_id = b.region_id
            ORDER BY a.state_id ASC
        """)

        result = db.session.execute(sql)
        return [dict(row._mapping) for row in result]

    @staticmethod
    def insert_state(state_name, region_id, status):
        state_name = (state_name or "").strip()

        try:
            # Duplicate check
            check_sql = text("""
                SELECT 1
                FROM state_master_t
                WHERE LOWER(TRIM(state_name)) = LOWER(TRIM(:state_name))
                  AND region_id = :region_id
                LIMIT 1
            """)

            exists = db.session.execute(check_sql, {
                "state_name": state_name,
                "region_id": region_id
            }).first()

            if exists:
                raise DuplicateStateError("State already exists in this region")

            sql = text("""
                INSERT INTO state_master_t (state_name, region_id, status)
                VALUES (:name, :region_id, :status)
            """)

            db.session.execute(sql, {
                "name": state_name,
                "region_id": region_id,
                "status": status
            })
            db.session.commit()
            return True

        except IntegrityError as e:
            db.session.rollback()
            raise DuplicateStateError("State already exists in this region") from e

        except Exception:
            db.session.rollback()
            raise

    @staticmethod
    def update_state(id, status):
        try:
            sql = text("""
                UPDATE state_master_t
                SET status = :status
                WHERE id = :id
            """)

            db.session.execute(sql, {
                "id": id,
                "status": status
            })
            db.session.commit()
            return True

        except Exception:
            db.session.rollback()
            raise

    @staticmethod
    def delete_state(id):
        try:
            sql = text("DELETE FROM state_master_t WHERE id = :id")
            db.session.execute(sql, {"id": id})
            db.session.commit()
            return True

        except Exception:
            db.session.rollback()
            raise

    @staticmethod
    def get_states_by_region(region_id):
        sql = text("""
            SELECT *
            FROM state_master_t
            WHERE region_id = :region_id
            ORDER BY state_id ASC
        """)
        result = db.session.execute(sql, {"region_id": region_id})
        return [dict(row._mapping) for row in result]

    @staticmethod
    def get_id_types():
        sql = text("""
            SELECT id_type
            FROM identity_document_types_t
            WHERE status = 'Active'
        """)
        result = db.session.execute(sql)
        return [row.id_type for row in result]