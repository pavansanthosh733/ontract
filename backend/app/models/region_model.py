import logging
from sqlalchemy import text
from sqlalchemy.exc import IntegrityError
from app import db


class DuplicateRegionError(Exception):
    pass


class RegionModel:

    @staticmethod
    def get_all_regions():
        logging.info("Fetching all regions")

        sql = text("""
            SELECT *
            FROM region_master_t
            ORDER BY region_id ASC
        """)

        result = db.session.execute(sql)
        return [dict(row._mapping) for row in result]

    @staticmethod
    def insert_region(region_name, status):

        region_name = (region_name or "").strip()

        try:
            # ================= DUPLICATE CHECK =================
            check_sql = text("""
                SELECT 1
                FROM region_master_t
                WHERE LOWER(TRIM(region_name)) =
                      LOWER(TRIM(:region_name))
                LIMIT 1
            """)

            exists = db.session.execute(check_sql, {
                "region_name": region_name
            }).first()

            if exists:
                raise DuplicateRegionError(
                    "Region already exists"
                )

            # ================= INSERT =================
            sql = text("""
                INSERT INTO region_master_t (
                    region_name,
                    status
                )
                VALUES (
                    :name,
                    :status
                )
            """)

            db.session.execute(sql, {
                "name": region_name,
                "status": status
            })

            db.session.commit()
            return True

        except IntegrityError as e:
            db.session.rollback()

            raise DuplicateRegionError(
                "Region already exists"
            ) from e

        except Exception:
            db.session.rollback()
            raise

    @staticmethod
    def update_region(id, region_name, status):

        region_name = (region_name or "").strip()

        try:
            sql = text("""
                UPDATE region_master_t
                SET region_name = :name,
                    status = :status
                WHERE id = :id
            """)

            db.session.execute(sql, {
                "id": id,
                "name": region_name,
                "status": status
            })

            db.session.commit()
            return True

        except IntegrityError as e:
            db.session.rollback()

            raise DuplicateRegionError(
                "Region already exists"
            ) from e

        except Exception:
            db.session.rollback()
            raise

    @staticmethod
    def delete_region(id):

        try:
            sql = text("""
                DELETE FROM region_master_t
                WHERE id = :id
            """)

            db.session.execute(sql, {"id": id})

            db.session.commit()
            return True

        except Exception:
            db.session.rollback()
            raise