from app import db
from sqlalchemy import text
import logging

class Contractor(db.Model):
    __tablename__ = "providers_t"
    __table_args__ = {'extend_existing': True}

    provider_id = db.Column(db.String(50), primary_key=True)
    full_name = db.Column(db.String(255))
    service_locations = db.Column(db.String(255))
    rate = db.Column(db.Float)
    status = db.Column(db.String(50))
    email_id = db.Column(db.String(255))
    services = db.Column(db.String(255))  # e.g. "Electrical,Carpentry,Plumbing"

    def to_dict(self):
        return {
            "provider_id": self.provider_id,
            "full_name": self.full_name,
            "service_locations": self.service_locations,
            "rate": self.rate,
            "status": self.status,
            "email_id": self.email_id,
            "services": self.services,
        }

    # ✅ Get contractors by area + service types
    @classmethod
    def get_by_area_and_service(cls, area, worktypes=None):
        """
        Fetch contractors filtered by both area and one or more service types.
        Supports comma-separated service list like 'Electricion,CARPENTARY'.
        """
        try:
            logging.info(f"[Contractor] area={area}, worktypes={worktypes}")

            # Base SQL
            sql = """
                SELECT provider_id, full_name, service_locations, rate, status, email_id, services
                FROM providers_t
                WHERE LOWER(service_locations) LIKE LOWER(:area)
                  AND status = 'active'
            """
            params = {"area": f"%{area}%"}

            # ✅ Add type filter if provided
            if worktypes:
                worktypes_list = [w.strip().lower() for w in worktypes.split(",") if w.strip()]
                if worktypes_list:
                    # PostgreSQL array containment check
                    sql += (
                        " AND string_to_array(LOWER(services), ',') @> ARRAY["
                        + ",".join([f"LOWER('{w}')" for w in worktypes_list])
                        + "]"
                    )

            result = db.session.execute(text(sql), params)
            rows = result.fetchall()
            contractors = [dict(row._mapping) for row in rows]

            logging.info(f"[Contractor] Found {len(contractors)} matching contractors")
            return contractors, None

        except Exception as e:
            logging.error(f"[Contractor] Error: {e}", exc_info=True)
            return None, str(e)