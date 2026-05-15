import logging
from sqlalchemy import text
from sqlalchemy.exc import IntegrityError
from app import db


class DuplicateCityError(Exception):
    pass


class CityModel:

    @staticmethod
    def get_all_cities():
        logging.info("Fetching all cities with state + region name")

        sql = text("""
            SELECT
                a.*,
                b.state_name,
                c.region_name
            FROM city_master_t a
            JOIN state_master_t b
                ON a.state_id = b.state_id
            JOIN region_master_t c
                ON a.region_id = c.region_id
            ORDER BY a.city_id ASC
        """)

        result = db.session.execute(sql)
        return [dict(row._mapping) for row in result]

    @staticmethod
    def insert_city(city_name, region_id, state_id, status):

        city_name = (city_name or "").strip()

        try:
            # ================= DUPLICATE CHECK =================
            check_sql = text("""
                SELECT 1
                FROM city_master_t
                WHERE LOWER(TRIM(city_name)) =
                      LOWER(TRIM(:city_name))
                  AND region_id = :region_id
                  AND state_id = :state_id
                LIMIT 1
            """)

            exists = db.session.execute(check_sql, {
                "city_name": city_name,
                "region_id": region_id,
                "state_id": state_id
            }).first()

            if exists:
                raise DuplicateCityError(
                    "City already exists in this state"
                )

            # ================= INSERT =================
            sql = text("""
                INSERT INTO city_master_t (
                    city_name,
                    region_id,
                    state_id,
                    status
                )
                VALUES (
                    :city_name,
                    :region_id,
                    :state_id,
                    :status
                )
            """)

            db.session.execute(sql, {
                "city_name": city_name,
                "region_id": region_id,
                "state_id": state_id,
                "status": status
            })

            db.session.commit()
            return True

        except IntegrityError as e:
            db.session.rollback()

            raise DuplicateCityError(
                "City already exists in this state"
            ) from e

        except Exception:
            db.session.rollback()
            raise

    @staticmethod
    def update_city(id, status):

        try:
            sql = text("""
                UPDATE city_master_t
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
    def delete_city(id):

        try:
            sql = text("""
                DELETE FROM city_master_t
                WHERE id = :id
            """)

            db.session.execute(sql, {"id": id})

            db.session.commit()
            return True

        except Exception:
            db.session.rollback()
            raise

    @staticmethod
    def get_city_by_region_state(region_id, state_id):

        sql = text("""
            SELECT *
            FROM city_master_t
            WHERE region_id = :region
              AND state_id = :state
            ORDER BY city_id ASC
        """)

        rows = db.session.execute(sql, {
            "region": region_id,
            "state": state_id
        }).mappings().all()

        return [dict(r) for r in rows]