# app/models/zone_model.py

import logging
from app import db
from sqlalchemy import text
class DuplicateZoneError(Exception):
    pass


class ZoneModel:

    # ======================================================
    # AUTO GENERATE ZONE ID
    # ======================================================


    @staticmethod
    def generate_zone_id():
        row = db.session.execute(
            text("""
                SELECT MAX(zone_id) AS max_id
                FROM zone_master
            """)
        ).fetchone()
    
        if row.max_id:
            # Extract numeric part from ZONE003
            last_number = int(row.max_id.replace("ZONE", ""))
        else:
            last_number = 0
    
        next_number = last_number + 1
    
        return f"ZONE{str(next_number).zfill(3)}"
    
    # ======================================================
    # GET ALL ZONES
    # ======================================================
    @staticmethod
    def get_all_zones():
        query = text("""
            SELECT
                z.id,
                z.zone_id,
                z.zone_name,
                z.status,

                COALESCE(
                    STRING_AGG(DISTINCT s.state_name, ', '),
                    ''
                ) AS state_names,

                COALESCE(
                    STRING_AGG(c.city_name, ', '),
                    ''
                ) AS city_names

            FROM zone_master z

            LEFT JOIN city_master_t c
                ON z.zone_id = c.zone_id

            LEFT JOIN state_master_t s
                ON c.state_id = s.state_id

            GROUP BY
                z.id,
                z.zone_id,
                z.zone_name,
                z.status

            ORDER BY z.id DESC
        """)

        rows = db.session.execute(query).mappings().all()
        return [dict(row) for row in rows]

    # ======================================================
    # GET SINGLE ZONE
    # ======================================================
    @staticmethod
    def get_zone_by_id(id):
        zone_query = text("""
            SELECT
                id,
                zone_id,
                zone_name,
                status
            FROM zone_master
            WHERE id = :id
        """)

        zone = db.session.execute(
            zone_query,
            {"id": id}
        ).mappings().fetchone()

        if not zone:
            return None

        city_query = text("""
            SELECT
                c.id,
                c.city_id,
                c.city_name,
                c.state_id,
                s.state_name
            FROM city_master_t c
            LEFT JOIN state_master_t s
                ON c.state_id = s.state_id
            WHERE c.zone_id = :zone_id
            ORDER BY c.city_name
        """)

        cities = db.session.execute(
            city_query,
            {"zone_id": zone["zone_id"]}
        ).mappings().all()

        result = dict(zone)
        result["cities"] = [dict(row) for row in cities]

        return result

    # ======================================================
    # INSERT ZONE
    # ======================================================
# ======================================================
# INSERT ZONEzone


         
    # ======================================================
 
 
 # ======================================================


# ======================================================
# INSERT ZONE
# ======================================================
    @staticmethod
    def insert_zone(zone_name, status, state_id, city_ids):
        try:
            zone_name = (zone_name or "").strip()
    
            # Duplicate zone name check
            duplicate = db.session.execute(
                text("""
                    SELECT 1
                    FROM zone_master
                    WHERE LOWER(TRIM(zone_name)) = LOWER(TRIM(:zone_name))
                    LIMIT 1
                """),
                {"zone_name": zone_name}
            ).fetchone()
    
            if duplicate:
                raise DuplicateZoneError("Zone already exists")
    
            # Generate Zone ID
            zone_id = ZoneModel.generate_zone_id()
    
            # -----------------------------------
            # Insert zone_master
            # -----------------------------------
            db.session.execute(
                text("""
                    INSERT INTO zone_master
                    (
                        zone_id,
                        zone_name,
                        status
                    )
                    VALUES
                    (
                        :zone_id,
                        :zone_name,
                        :status
                    )
                """),
                {
                    "zone_id": zone_id,
                    "zone_name": zone_name,
                    "status": status
                }
            )
    
            # -----------------------------------
            # Loop Cities
            # -----------------------------------
            for city_id in city_ids:
    
                # Check city already assigned
                city = db.session.execute(
                    text("""
                        SELECT zone_id
                        FROM city_master_t
                        WHERE city_id = :city_id
                    """),
                    {"city_id": city_id}
                ).fetchone()
    
                if city and city[0]:
                    raise Exception(f"City {city_id} already mapped")
    
                # Update city_master_t
                db.session.execute(
                    text("""
                        UPDATE city_master_t
                        SET zone_id = :zone_id
                        WHERE city_id = :city_id
                    """),
                    {
                        "zone_id": zone_id,
                        "city_id": city_id
                    }
                )
    
                # Insert zone_city_mapping
                db.session.execute(
                    text("""
                        INSERT INTO zone_city_mapping
                        (
                            zone_id,
                            state_id,
                            city_id,
                            status
                        )
                        VALUES
                        (
                            :zone_id,
                            :state_id,
                            :city_id,
                            :status
                        )
                    """),
                    {
                        "zone_id": zone_id,
                        "state_id": state_id,
                        "city_id": city_id,
                        "status": status
                    }
                )
    
            db.session.commit()
            return True
    
        except DuplicateZoneError:
            db.session.rollback()
            raise
    
        except Exception as e:
            db.session.rollback()
            logging.error(e)
            raise Exception(str(e))      
        # ======================================================
    # UPDATE ZONE
    # ======================================================
    @staticmethod
    def update_zone(id, zone_name, status):
        try:
            db.session.execute(
                text("""
                    UPDATE zone_master
                    SET
                        zone_name = :zone_name,
                        status = :status,
                        updated_at = CURRENT_TIMESTAMP
                    WHERE id = :id
                """),
                {
                    "zone_name": zone_name,
                    "status": status,
                    "id": id
                }
            )

            db.session.commit()

        except Exception as e:
            db.session.rollback()
            raise Exception(str(e))

    # ======================================================
    # DELETE ZONE
    # ======================================================
    @staticmethod
    def delete_zone(id):
        try:
            row = db.session.execute(
                text("""
                    SELECT zone_id
                    FROM zone_master
                    WHERE id = :id
                """),
                {"id": id}
            ).fetchone()

            if not row:
                raise Exception("Zone not found")

            zone_id = row[0]

            # Free cities
            db.session.execute(
                text("""
                    UPDATE city_master_t
                    SET zone_id = NULL
                    WHERE zone_id = :zone_id
                """),
                {"zone_id": zone_id}
            )

            # Delete mapping
            db.session.execute(
                text("""
                    DELETE FROM zone_city_mapping
                    WHERE zone_id = :zone_id
                """),
                {"zone_id": zone_id}
            )

            # Delete zone
            db.session.execute(
                text("""
                    DELETE FROM zone_master
                    WHERE id = :id
                """),
                {"id": id}
            )

            db.session.commit()

        except Exception as e:
            db.session.rollback()
            raise Exception(str(e))

    # ======================================================
    # REMOVE CITY FROM ZONE
    # ======================================================
    @staticmethod
    def remove_city_from_zone(zone_id, city_id):
        try:
            db.session.execute(
                text("""
                    UPDATE city_master_t
                    SET zone_id = NULL
                    WHERE zone_id = :zone_id
                      AND city_id = :city_id
                """),
                {
                    "zone_id": zone_id,
                    "city_id": city_id
                }
            )

            db.session.execute(
                text("""
                    DELETE FROM zone_city_mapping
                    WHERE zone_id = :zone_id
                      AND city_id = :city_id
                """),
                {
                    "zone_id": zone_id,
                    "city_id": city_id
                }
            )

            db.session.commit()

        except Exception as e:
            db.session.rollback()
            raise Exception(str(e))

    # ======================================================
    # AVAILABLE CITIES BY STATE
    # ======================================================
    @staticmethod
    def get_available_cities_by_state(state_id):
        query = text("""
            SELECT
                id,
                city_id,
                city_name
            FROM city_master_t
            WHERE state_id = :state_id
              AND zone_id IS NULL
              AND status = 'Active'
            ORDER BY city_name
        """)

        rows = db.session.execute(
            query,
            {"state_id": state_id}
        ).mappings().all()

        return [dict(row) for row in rows]

    # ======================================================
    # ADD MORE CITIES TO EXISTING ZONE
    # ======================================================
    @staticmethod
    def add_more_cities(zone_id, city_ids):
        try:
            zone = db.session.execute( 
                text("""
                    SELECT status
                    FROM zone_master
                    WHERE zone_id = :zone_id
                """),
                {"zone_id": zone_id}
            ).fetchone()

            if not zone:
                raise Exception("Zone not found")

            status = zone[0]

            for city_id in city_ids:

                db.session.execute(
                    text("""
                        UPDATE city_master_t
                        SET zone_id = :zone_id
                        WHERE city_id = :city_id
                          AND zone_id IS NULL
                    """),
                    {
                        "zone_id": zone_id,
                        "city_id": city_id
                    }
                )

                db.session.execute(
                    text("""
                        INSERT INTO zone_city_mapping
                        (
                            zone_id,
                            state_id,
                            city_id,
                            status
                         )
                        SELECT
                            :zone_id,
                            state_id,
                            city_id,
                            :status
                        FROM city_master_t
                        WHERE city_id = :city_id
                    """),
                    {
                        "zone_id": zone_id,
                        "city_id": city_id,
                        "status": status
                    }
                )

            db.session.commit()

        except Exception as e:
            db.session.rollback()
            raise Exception(str(e))
        
        
# ======================================================
# GET ALL STATES
# ======================================================
    @staticmethod
    def get_all_states():
        query = text("""
            SELECT
                id,
                state_id,
                state_name
            FROM state_master_t
            WHERE status = 'Active'
            ORDER BY state_name
        """)
    
        rows = db.session.execute(query).mappings().all()
    
        return [dict(row) for row in rows]