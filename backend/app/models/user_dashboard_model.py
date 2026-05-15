from app.models.database import db
from sqlalchemy import text

class DashboardModel:

    @staticmethod
    def get_completed_orders_count(provider_id=None):

        if provider_id:
            query = text("""
                SELECT COUNT(*) 
                FROM workorder_life_cycle_t
                WHERE status = 'CLOSED'
                AND contractor_id = :provider_id
            """)
            result = db.session.execute(query, {"provider_id": provider_id}).scalar()
        else:
            query = text("""
                SELECT COUNT(*) 
                FROM workorder_life_cycle_t
                WHERE status = 'CLOSED'
            """)
            result = db.session.execute(query).scalar()

        return result or 0
    

    @staticmethod
    def get_service_coverage_details(user_uid):
        query = text("""
            SELECT DISTINCT region, category_name
            FROM services_t
            WHERE user_uid = :user_uid
            ORDER BY region, category_name
        """)

        rows = db.session.execute(query, {
            "user_uid": user_uid
        }).mappings().all()

        regions = sorted({row["region"] for row in rows if row["region"]})
        services = sorted({row["category_name"] for row in rows if row["category_name"]})

        return {
            "regions": regions,
            "services": services
        }

