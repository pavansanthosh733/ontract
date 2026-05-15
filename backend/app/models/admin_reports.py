from sqlalchemy.sql import text
from app.models.database import db
from datetime import datetime


class WorkorderReportModel:
    
        # ✅ GET CONTRACTORS (for dropdown)
    @staticmethod
    def get_contractors():
        query = text("""
            SELECT user_uid, name, email_id
            FROM users_t
            ORDER BY name
        """)

        result = db.session.execute(query)
        rows = result.fetchall()
        columns = result.keys()

        return [dict(zip(columns, row)) for row in rows]
    
    
    
    
        # ✅ CONTRACTOR REPORT
    @staticmethod
    def get_contractor_report(start_date, end_date, contractor_id):

        start_date = datetime.fromisoformat(start_date)
        end_date = datetime.fromisoformat(end_date)

        query = text("""
        SELECT DISTINCT
            a.workorder,
            a.status,
            a.created_t AS created_time,
            b.category_name,
            c.item_name,
            d.type_name,
            e.description_name,
            f.region_name,
            g.state_name,
            h.city_name,
            a.client,
            a.address,
            j.contractor_name,
            a.ticket_assignment_type,
            k.service_rate,
            a.requested_time_close,
            a.remarks,
            i.name AS workorder_created_person_name

        FROM workorder_t a

        LEFT JOIN category_master_t b ON a.category = b.category_id
        LEFT JOIN item_master_t c ON a.item = c.item_id
        LEFT JOIN type_master_t d ON a.type = d.type_id
        LEFT JOIN description_master_t e ON a.description = e.description_id
        LEFT JOIN region_master_t f ON a.region = f.region_id
        LEFT JOIN state_master_t g ON a.state = g.state_id
        LEFT JOIN city_master_t h ON a.city = h.city_id

        -- SAFE JOIN
        LEFT JOIN admins_t i 
        ON CASE 
            WHEN a.created_by ~ '^[0-9]+$' 
            THEN a.created_by::bigint 
        END = i.admin_id

        LEFT JOIN workorder_life_cycle_t j ON a.workorder = j.workorder

        LEFT JOIN services_t k 
            ON lower(trim(b.category_name)) = lower(trim(k.category_name))
            AND lower(trim(c.item_name)) = lower(trim(k.item_name))
            AND lower(trim(d.type_name)) = lower(trim(k.type_name))
            AND lower(trim(e.description_name)) = lower(trim(k.description_name))
            AND j.contractor_id = k.user_uid
            AND lower(trim(f.region_name)) = lower(trim(k.region))
            AND lower(trim(g.state_name)) = lower(trim(k.state))
            AND lower(trim(h.city_name)) = lower(trim(k.city))

        WHERE a.created_t BETWEEN :start_date AND :end_date
          AND j.contractor_id = :contractor_id
          AND a.status NOT IN ('Rejected')
        """)

        result = db.session.execute(query, {
            "start_date": start_date,
            "end_date": end_date,
            "contractor_id": contractor_id
        })

        rows = result.fetchall()
        columns = result.keys()

        return [dict(zip(columns, row)) for row in rows]
    
    

    @staticmethod
    def get_report(start_date, end_date):

        # ✅ Convert frontend ISO format → Python datetime
        start_date = datetime.fromisoformat(start_date)
        end_date = datetime.fromisoformat(end_date)

        query = text("""
        SELECT 
            a.workorder,
            a.status,
            a.created_t AS created_time,
            b.category_name,
            c.item_name,
            d.type_name,
            e.description_name,
            f.region_name,
            g.state_name,
            h.city_name,
            a.client,
            a.address,
            j.contractor_name,
            a.ticket_assignment_type,
            k.price_rm,
            a.requested_time_close,
            a.remarks,
            i.name AS workorder_created_person_name

        FROM workorder_t a

        LEFT JOIN category_master_t b ON a.category = b.category_id
        LEFT JOIN item_master_t c ON a.item = c.item_id
        LEFT JOIN type_master_t d ON a.type = d.type_id
        LEFT JOIN description_master_t e ON a.description = e.description_id
        LEFT JOIN region_master_t f ON a.region = f.region_id
        LEFT JOIN state_master_t g ON a.state = g.state_id
        LEFT JOIN city_master_t h ON a.city = h.city_id

        -- ✅ SAFE JOIN (prevents bigint error)
        LEFT JOIN admins_t i 
        ON CASE 
            WHEN a.created_by ~ '^[0-9]+$' 
            THEN a.created_by::bigint 
        END = i.admin_id

        LEFT JOIN workorder_life_cycle_t j ON a.workorder = j.workorder

        LEFT JOIN standard_rates_t k 
            ON lower(trim(b.category_name)) = lower(trim(k.category))
            AND lower(trim(c.item_name)) = lower(trim(k.item))
            AND lower(trim(d.type_name)) = lower(trim(k.type))
            AND lower(trim(e.description_name)) = lower(trim(k.description))
            AND lower(trim(a.client)) = lower(trim(k.client))

        WHERE a.created_t BETWEEN :start_date AND :end_date
          AND a.status NOT IN ('Rejected')
        """)

        result = db.session.execute(query, {
            "start_date": start_date,
            "end_date": end_date
        })

        rows = result.fetchall()
        columns = result.keys()

        return [dict(zip(columns, row)) for row in rows]
    
    
    
    # ✅ SUMMARY REPORT (YEAR / MONTH / WEEK / CATEGORY / DEPARTMENT)
    @staticmethod
    def get_summary_report(category=None, year=None, month=None):
    
        conditions = ["a.status = 'CLOSED'"]
        params = {}
    
        # 🔹 YEAR FILTER (based on completed time)
        if year:
            conditions.append("EXTRACT(YEAR FROM j.workorder_completed_time) = :year")
            params["year"] = int(year)
    
        # 🔹 MONTH FILTER
        if month:
            conditions.append("EXTRACT(MONTH FROM j.workorder_completed_time) = :month")
            params["month"] = int(month)
    
        # 🔹 CATEGORY FILTER (using category_id)
        if category:
            conditions.append("a.category = :category_id")
            params["category_id"] = int(category)
    
        where_clause = " AND ".join(conditions)
    
        query = text(f"""
        SELECT 
            a.workorder,
            a.status,
            a.created_t,
            a.requested_time_close,
            a.remarks,
            b.category_name,
            c.item_name,
            d.type_name,
            e.description_name,
            f.region_name,
            g.state_name,
            h.city_name,
            a.client,
            a.address,
            j.contractor_name,
            j.contractor_id,
            j.workorder_completed_time,
            k.price_rm
    
        FROM workorder_t a
    
        LEFT JOIN workorder_life_cycle_t j 
            ON a.workorder = j.workorder
    
        LEFT JOIN category_master_t b ON a.category = b.category_id
        LEFT JOIN item_master_t c ON a.item = c.item_id
        LEFT JOIN type_master_t d ON a.type = d.type_id
        LEFT JOIN description_master_t e ON a.description = e.description_id
        LEFT JOIN region_master_t f ON a.region = f.region_id
        LEFT JOIN state_master_t g ON a.state = g.state_id
        LEFT JOIN city_master_t h ON a.city = h.city_id
    
        LEFT JOIN standard_rates_t k 
            ON lower(trim(b.category_name)) = lower(trim(k.category))
            AND lower(trim(c.item_name)) = lower(trim(k.item))
            AND lower(trim(d.type_name)) = lower(trim(k.type))
            AND lower(trim(e.description_name)) = lower(trim(k.description))
            AND lower(trim(a.client)) = lower(trim(k.client))
    
        WHERE {where_clause}
        ORDER BY j.workorder_completed_time DESC
        """)
    
        result = db.session.execute(query, params)
    
        rows = result.fetchall()
        columns = result.keys()
    
        return [dict(zip(columns, row)) for row in rows]
    
    
    
    @staticmethod
    def get_categories():
        query = text("""
            SELECT category_id, category_name
            FROM category_master_t
            ORDER BY category_name
        """)
    
        result = db.session.execute(query)
        rows = result.fetchall()
        columns = result.keys()
    
        return [dict(zip(columns, row)) for row in rows]
    
    
    
        # ✅ FULL WORKORDER RATE COMPARISON REPORT
    # ✅ FULL WORKORDER RATE COMPARISON REPORT
    @staticmethod
    def get_rate_comparison_report(start_date, end_date):
    
        try:
            # 🔹 Convert ISO → datetime
            start_date = datetime.fromisoformat(start_date)
            end_date = datetime.fromisoformat(end_date)
    
            query = text("""
            SELECT 
                a.workorder,
                a.status,
                a.created_t AS created_time,
                b.category_name,
                c.item_name,
                d.type_name,
                e.description_name,
                f.region_name,
                g.state_name,
                h.city_name,
                a.client,
                a.address,
                j.contractor_name,
                a.ticket_assignment_type,
    
                -- ✅ NULL SAFE VALUES
                COALESCE(k.price_rm, 0) AS price_rm,
                COALESCE(l.service_rate, 0) AS service_rate,
    
                -- ✅ SAFE DIFFERENCE
                COALESCE(k.price_rm, 0) - COALESCE(l.service_rate, 0) AS difference_rate,
    
                a.requested_time_close,
                a.remarks,
                i.name AS workorder_created_person_name
    
            FROM workorder_t a
    
            LEFT JOIN category_master_t b ON a.category = b.category_id
            LEFT JOIN item_master_t c ON a.item = c.item_id
            LEFT JOIN type_master_t d ON a.type = d.type_id
            LEFT JOIN description_master_t e ON a.description = e.description_id
            LEFT JOIN region_master_t f ON a.region = f.region_id
            LEFT JOIN state_master_t g ON a.state = g.state_id
            LEFT JOIN city_master_t h ON a.city = h.city_id
    
            -- ✅ SAFE JOIN (prevents bigint error)
            LEFT JOIN admins_t i 
            ON CASE 
                WHEN a.created_by ~ '^[0-9]+$' 
                THEN a.created_by::bigint 
            END = i.admin_id
    
            LEFT JOIN workorder_life_cycle_t j ON a.workorder = j.workorder
    
            LEFT JOIN standard_rates_t k 
                ON lower(trim(b.category_name)) = lower(trim(k.category))
                AND lower(trim(c.item_name)) = lower(trim(k.item))
                AND lower(trim(d.type_name)) = lower(trim(k.type))
                AND lower(trim(e.description_name)) = lower(trim(k.description))
                AND lower(trim(a.client)) = lower(trim(k.client))
    
            LEFT JOIN services_t l 
                ON lower(trim(b.category_name)) = lower(trim(l.category_name))
                AND lower(trim(c.item_name)) = lower(trim(l.item_name))
                AND lower(trim(d.type_name)) = lower(trim(l.type_name))
                AND lower(trim(e.description_name)) = lower(trim(l.description_name))
                AND lower(trim(f.region_name)) = lower(trim(l.region))
                AND lower(trim(g.state_name)) = lower(trim(l.state))
                AND lower(trim(h.city_name)) = lower(trim(l.city))
    
            WHERE a.created_t BETWEEN :start_date AND :end_date
              AND a.status NOT IN ('Rejected')
            """)
    
            result = db.session.execute(query, {
                "start_date": start_date,
                "end_date": end_date
            })
    
            rows = result.fetchall()
            columns = result.keys()
    
            return [dict(zip(columns, row)) for row in rows]
    
        except Exception as e:
            import traceback
            print("MODEL ERROR:", str(e))
            traceback.print_exc()
            raise e