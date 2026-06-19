# app/models/workorder.py
from .database import db
from flask_bcrypt import Bcrypt
from sqlalchemy import text, func, LargeBinary
from datetime import datetime, timedelta
from decimal import Decimal
from sqlalchemy.dialects.postgresql import JSON
import json
import base64
import logging
import os
import threading
bcrypt = Bcrypt()
from time import time
from urllib.parse import quote
from sqlalchemy.dialects.postgresql import JSON, JSONB
from flask import current_app
from app.utils.workorder_certificate import generate_workorder_completion_certificate
from app.utils.email_utils import send_workorder_closure_email
from app.utils.datetime_utils import format_datetime, now_local
from zoneinfo import ZoneInfo


from .workorder_mail_model import (
    build_creation_email_html,
    send_email_with_attachments_creation,
    insert_email_notification_log
)


def run_async_with_app_context(func, *args, **kwargs):
    app = current_app._get_current_object()
    thread = threading.Thread(
        target=lambda: run_inside_app(func, app, *args, **kwargs),
        daemon=True
    )
    thread.start()

def run_inside_app(func, app, *args, **kwargs):
    with app.app_context():
        func(*args, **kwargs)

EMAIL_ASYNC = os.getenv("EMAIL_ASYNC", "true").lower() in ("1", "true", "yes")

def now_ist():
    return now_local()


def to_ist_safe(value):
    return format_datetime(value)

# Check all times
print("\n" + "=" * 80)
print("SERVER LOCAL TIME  :", datetime.now())
print("UTC TIME           :", datetime.utcnow())
print("KUALA LUMPUR TIME  :", datetime.now(ZoneInfo("Asia/Kuala_Lumpur")))
print("now_ist() VALUE    :", now_ist())
print("=" * 80 + "\n")




class WorkOrder(db.Model):
    __tablename__ = "workorder_t"
    __table_args__ = {"extend_existing": True}

    id = db.Column(db.Integer, primary_key=True)
    workorder = db.Column(db.String(1000))
    created_t = db.Column(db.DateTime, default=datetime.utcnow)

    status = db.Column(db.String(100))

    category = db.Column(db.String(2000))
    item = db.Column(db.String(2000))
    type = db.Column(db.String(2000))
    description = db.Column(db.String(2000))

    region = db.Column(db.String(2000))
    state = db.Column(db.String(2000))
    city = db.Column(db.String(2000))

    client = db.Column(db.String(2000))
    address = db.Column(db.String(2000))

    ticket_assignment_type = db.Column(db.String(100))

    requested_time_close = db.Column(db.String(100))
    remarks = db.Column(db.String(4000))
    detailed_description = db.Column(db.Text)

    creation_time_image = db.Column(JSONB)
    closing_images = db.Column(JSONB)
    created_by = db.Column(db.String(100))


    def __repr__(self):
        return f"<WorkOrder {self.workorder}>"

    @classmethod
    def create(cls, data):
        try:
            workorder_code = cls.generates_workorder_id()
            created_time = now_ist()

            print(f"[CREATE WO] Workorder: {workorder_code}")
            print(f"[CREATE WO] created_t being inserted: {created_time}")
            print(f"[CREATE WO] requested_time_close: {data.get('REQUESTED_TIME_CLOSING')}")

            sql = text("""
                INSERT INTO workorder_t (workorder,created_t,status,category,item,type,description,region,
                state,city,client,address,ticket_assignment_type,requested_time_close,remarks,detailed_description,
                creation_time_image,closing_images,created_by,standard_rate_id,rate_snapshot)
                VALUES (:workorder,:created_t,:status,:category,:item,:type,:description,:region,:state,:city,:client,
                :address,:ticket_assignment_type,:requested_time_close,:remarks,:detailed_description,:creation_time_image,:closing_images,
                :created_by,:standard_rate_id,:rate_snapshot)
                RETURNING *;
            """)

            params = {
                "workorder": workorder_code,
                "created_t":  now_ist(),
                "status": data.get("STATUS", "OPEN"),
                "category": data.get("CATEGORY_ID"),
                "item": data.get("ITEM_ID"),
                "type": data.get("TYPE_ID"),
                "description": data.get("DESCRIPTION_ID"),
                "region": data.get("REGION_ID"),
                "state": data.get("STATE_ID"),
                "city": data.get("CITY_ID"),
                "client": data.get("CLIENT"),
                "address": data.get("ADDRESS"),
                "ticket_assignment_type": data.get("ticket_assignment_type", "auto"),
                "requested_time_close": data.get("REQUESTED_TIME_CLOSING"),
                "remarks": data.get("REMARKS"),
                "detailed_description": data.get("DETAILED_DESCRIPTION", ""),
                "creation_time_image": json.dumps(data.get("creation_time_image", [])),
                "closing_images": json.dumps([]),
                "created_by": data.get("created_by"),
                "standard_rate_id": data.get("STANDARD_RATE_ID"),
                "rate_snapshot": data.get("RATE_SNAPSHOT")
            }

            result = db.session.execute(sql, params)
            row = result.fetchone()
            db.session.commit()

            wo = dict(row._mapping)
            
            print("\n========== DB RETURN ==========")
            print("WORKORDER :", wo.get("workorder"))
            print("CREATED_T :", wo.get("created_t"))
            print("STATUS    :", wo.get("status"))
            print("================================\n")

            # ----------------------------
            # SEND MAIL ONLY IF AUTO
            # ---------------------------
            if wo.get("ticket_assignment_type") == "auto":
                max_amount = cls.max_amount()
                logging.info(f"check theamount: '{max_amount}'")
                client_amount = cls.client_amount(wo.get("client"))
                logging.info(f"Client amount: {client_amount}")
                
                if max_amount is None or client_amount is None:
                    logging.warning("Amount comparison skipped — missing values")
                    run_async_with_app_context(cls.send_auto_email_after_creation, wo,client_amount)

                elif client_amount > max_amount:
                    cls.workorder_insert_admin_notification(wo.get("workorder"))

                else:
                    run_async_with_app_context(cls.send_auto_email_after_creation, wo,client_amount)

            else:
                logging.info(f"Email skipped — ticket_assignment_type is '{wo.get('ticket_assignment_type')}'")

            return wo, None

        except Exception as e:
            db.session.rollback()
            return None, str(e)
            
            
    @classmethod
    def workorder_insert_admin_notification(cls, workorder):
        sql = text("""
            INSERT INTO admin_notifications_t (workorder, notification_type, message, created_at)
            VALUES (:workorder, 'WORKORDER_ASSIGN',
            'Workorder exceeded max amount limit. Multiple technicians may be assigned.',
            CURRENT_TIMESTAMP)
        """)

        db.session.execute(sql, {"workorder": workorder})

        # 🔥 ALSO UPDATE WORKORDER TO MANUAL
        # update_sql = text("""
        #     UPDATE workorder_t SET ticket_assignment_type = 'manual' WHERE workorder = :workorder
        # """)
        # db.session.execute(update_sql, {"workorder": workorder})

        db.session.commit()

    
    @classmethod
    def client_amount(cls, client):
        logging.info(f"checktheclientname: '{client}'")
        sql = text("""
            SELECT price_rm FROM standard_rates_t WHERE client = :client;
        """)
        row = db.session.execute(sql, {"client": client}).mappings().first()
        return row["price_rm"] if row else None
    
    @classmethod
    def max_amount(cls):
        sql = text("""
            SELECT max_amount
            FROM workorder_max_amount_t;
        """)
        row = db.session.execute(sql).mappings().first()
        return row["max_amount"] if row else None




    @classmethod
    def get_provider_for_workorder(cls, category_id,item_id,type_id,description_id,
            region_id,state_id,city_id):
        logging.info(f"check the input get_provider_for_workorder")
        sql = text("""
            SELECT a.user_uid,a.email_id,a.name,b.service_rate,c.region_name,d.state_name,e.city_name,
            f.category_name, g.item_name,h.type_name,i.description_name
            FROM users_t a JOIN services_t b ON a.user_uid = b.user_uid
            JOIN region_master_t c ON b.region = c.region_name
            JOIN state_master_t d ON b.state = d.state_name
            JOIN city_master_t e ON b.city = e.city_name
            JOIN category_master_t f ON f.category_name = b.category_name
            JOIN item_master_t g ON b.item_name = g.item_name
            JOIN type_master_t h ON b.type_name = h.type_name
            JOIN description_master_t i ON b.description_name = i.description_name
            WHERE f.category_id = :category_id AND g.item_id = :item_id AND h.type_id = :type_id 
            AND i.description_id = :description_id AND c.region_id = :region_id AND d.state_id = :state_id
            AND e.city_id = :city_id
            order by b.service_rate asc limit 1
        """)
        rows = db.session.execute(sql, {
            "category_id": category_id,
            "item_id": item_id,
            "type_id": type_id,
            "description_id": description_id,
            "region_id": region_id,
            "state_id": state_id,
            "city_id": city_id
        }).mappings().all()

        return rows[0] if rows else None




    @classmethod
    def get_existing_provider_workorder(cls,category_id,item_id,type_id,description_id,region_id,state_id,
        city_id,client,ticket_assignment_type):
        logging.info("check the input get_existing_provider_workorder")
        sql = text("""
            SELECT c.*,d.category_name,e.item_name,f.type_name,g.description_name,h.region_name,
            i.state_name,j.city_name
            FROM workorder_t a JOIN workorder_life_cycle_t b ON a.workorder = b.workorder
            JOIN users_t c ON b.contractor_id = c.user_uid
            JOIN category_master_t d ON a.category = d.category_id
            JOIN item_master_t e ON a.item = e.item_id
            JOIN type_master_t f ON a.type = f.type_id
            JOIN description_master_t g ON a.description = g.description_id
            JOIN region_master_t h ON a.region = h.region_id
            JOIN state_master_t i ON a.state = i.state_id
            JOIN city_master_t j ON a.city = j.city_id
            WHERE a.category = :category_id AND a.item = :item_id AND a.type = :type_id 
            AND a.description = :description_id AND a.region = :region_id AND a.state = :state_id 
            AND a.city = :city_id AND a.client = :client 
            AND (lower(b.status) = lower('ACCEPTED') 
            OR lower(b.status) = lower('closed')) AND c.active_status = 'true'
            ORDER BY b.created_t DESC LIMIT 1;
        """)

        rows = db.session.execute(sql, {
            "category_id": category_id,
            "item_id": item_id,
            "type_id": type_id,
            "description_id": description_id,
            "region_id": region_id,
            "state_id": state_id,
            "city_id": city_id,
            "client": client,
            "ticket_assignment_type": ticket_assignment_type,
            "status_accepted": "ACCEPTED",
            "status_closed": "CLOSED",
        }).mappings().all()

        return rows[0] if rows else None

    
    
    @classmethod
    def get_expiry_minutes(cls, region_id):
        logging.info(f"check the input get_expiry_minutes")
        sql = text("""
            SELECT a.expiry_minutes FROM link_expiry_t a
            JOIN region_master_t b ON a.region = b.region_name
            WHERE b.region_id = :region_id
        """)

        row = db.session.execute(sql, {"region_id": region_id}).fetchone()
        return row[0] if row else 15



    @classmethod
    def send_auto_email_after_creation(cls, workorder, client_amount):
        try:
            logging.info("AUTO EMAIL TRIGGERED FOR WO: %s", workorder["workorder"])

            from decimal import Decimal

            category_id = workorder["category"]
            item_id = workorder["item"]
            type_id = workorder["type"]
            description_id = workorder["description"]
            region_id = workorder["region"]
            state_id = workorder["state"]
            city_id = workorder["city"]
            client = workorder["client"]
            ticket_assignment_type = workorder["ticket_assignment_type"]

            # ------------------------------------------------------
            # 1️⃣ FIRST CHECK EXISTING PROVIDER
            # ------------------------------------------------------
            existing_provider = cls.get_existing_provider_workorder(
                category_id, item_id, type_id,
                description_id, region_id, state_id,
                city_id, client, ticket_assignment_type
            )

            if existing_provider:
                provider = dict(existing_provider)
                logging.info("Using existing provider from lifecycle (Skipping percentage check)")

            else:
                # ------------------------------------------------------
                # 2️⃣ FETCH NEW PROVIDER
                # ------------------------------------------------------
                provider = cls.get_provider_for_workorder(
                    category_id, item_id, type_id,
                    description_id, region_id,
                    state_id, city_id
                )

                logging.info(f"Provider from auto selection: {provider}")

                if not provider:
                    logging.warning("No provider found for category/region")
                    return

                provider = dict(provider)

                # ------------------------------------------------------
                # ⭐ APPLY PERCENTAGE ONLY FOR AUTO PROVIDER
                # ------------------------------------------------------
                service_rate = provider.get("service_rate", Decimal("0.00"))
                percentage = cls.get_active_percentage()

                adjusted_amount = service_rate * (
                    Decimal("1") + (percentage / Decimal("100"))
                )

                logging.info(f"Service rate: {service_rate}")
                logging.info(f"Adjusted amount: {adjusted_amount}")
                logging.info(f"Client amount: {client_amount}")

                # ------------------------------------------------------
                # Compare budget
                # ------------------------------------------------------
                if client_amount is None:
                    logging.warning("Client amount is None. Cannot compare.")
                    return

                client_amount_decimal = Decimal(str(client_amount))

                if adjusted_amount > client_amount_decimal:
                    logging.warning("Client budget too low. Inserting admin notification and stopping.")

                    admin_sql = text("""
                        INSERT INTO admin_notifications_t
                        (workorder, notification_type, message, created_at)
                        VALUES (
                            :workorder,
                            'WORKORDER_BUDGET_TOO_LOW',
                            'The provided work order amount is lower than the contractor service rates. No contractors are available for this budget.',
                            CURRENT_TIMESTAMP
                        )
                    """)

                    db.session.execute(admin_sql, {
                        "workorder": workorder["workorder"]
                    })

                    db.session.commit()
                    return   # 🔥 STOP HERE (No email, No assignment)

            # ------------------------------------------------------
            # ✅ EMAIL + ASSIGNMENT CONTINUES HERE
            # ------------------------------------------------------

            provider["client"] = client

            expiry_minutes = cls.get_expiry_minutes(region_id)

            ts = int(time())
            base_url = os.getenv("PUBLIC_BASE_URL", "https://yourdomain.com")

            response_url = (
                f"{base_url}/api/workorders/respond-workorder/{workorder['id']}?"
                f"contractor_id={provider['user_uid']}&"
                f"contractor_name={quote(provider['name'])}&"
                f"timestamp={ts}"
            )

            html = build_creation_email_html(
                workorder, provider, response_url, expiry_minutes
            )

            status, _, _ = send_email_with_attachments_creation(
                workorder,
                provider["email_id"],
                provider["name"],
                html
            )

            insert_email_notification_log(
                workorder["workorder"],
                provider["name"],
                provider["email_id"],
                status
            )

            # Insert assignment
            assign_sql = text("""
                INSERT INTO workorder_assignment_t
                ("WORKORDER_ID", provider_id, assigned_at, assignment_status, expiry_time)
                VALUES (:wid, :pid, :assigned_at, 'PENDING', :expiry);
            """)

            db.session.execute(assign_sql, {
                "wid": workorder["workorder"],
                "pid": provider["user_uid"],
                "assigned_at": now_ist(),
                "expiry": now_ist() + timedelta(minutes=expiry_minutes)
            })

            db.session.commit()
            logging.info("Assignment inserted successfully.")

        except Exception as e:
            db.session.rollback()
            logging.error("EMAIL ERROR / ASSIGNMENT INSERT ERROR: %s", e, exc_info=True)
            
            
    @classmethod
    def get_active_percentage(cls):
        sql = text("""
            SELECT percentage FROM provider_rate_percentage_t WHERE status = 'active'
        """)
        result = db.session.execute(sql).fetchone()
        if result:
            return result[0]  # Already Decimal from DB
        return Decimal("0.00")


    @classmethod
    def generates_workorder_id(cls):
        today_str = datetime.now().strftime("%d%m%Y")
        prefix = "W"
        like_pattern = f"{today_str}{prefix}%"

        sql_last = text("""
            SELECT workorder
            FROM workorder_t
            WHERE workorder LIKE :pattern
            ORDER BY id DESC
            LIMIT 1
            FOR UPDATE
        """)

        result = db.session.execute(sql_last, {"pattern": like_pattern}).fetchone()

        if result and result[0]:
            last_serial = int(result[0][-6:])
        else:
            last_serial = 0

        new_serial = str(last_serial + 1).zfill(6)
        return f"{today_str}{prefix}{new_serial}"


    @classmethod
    def get_all(cls):
        logging.info("Dashboard Model: Fetching workorders with joins...")
        try:
            sql = text("""
                SELECT w.*,c.category_name,r.region_name
                FROM workorder_t w
                LEFT JOIN category_master_t c ON w.category = c.category_id
                LEFT JOIN region_master_t r ON w.region = r.region_id
                where lower(w.status) in ('open','rejected')
                ORDER BY w.id DESC
            """)

            rows = db.session.execute(sql).mappings().all()
            results = [dict(row) for row in rows]
            return results, None

        except Exception as e:
            return None, str(e)



    @classmethod
    def get_by_id(cls, id):
        logging.info(f"check the input of assign")
        try:
            sql = text("SELECT * FROM workorder_t WHERE id = :id")
            row = db.session.execute(sql, {"id": id}).mappings().fetchone()

            if not row:
                return None

            # Build model instance
            workorder = cls(**row)
            return workorder

        except Exception as e:
            logging.exception("get_by_id error")
            return None


    
    @classmethod
    def get_by_workorder(cls, workorder_code):
        logging.info(f"Fetching workorder by code: {workorder_code}")

        try:
            sql = text("""
                SELECT 
                    w.*,
                    c.category_name,
                    r.region_name
                FROM workorder_t w
                LEFT JOIN category_master_t c ON w.category = c.category_id
                LEFT JOIN region_master_t r ON w.region = r.region_id
                WHERE w.workorder = :workorder
                LIMIT 1;
            """)

            row = db.session.execute(sql, {"workorder": workorder_code}).mappings().fetchone()

            return dict(row) if row else None

        except Exception as e:
            logging.exception("get_by_workorder error")
            return None



    @classmethod
    def get_next_id(cls):
        """Fetch next ID using raw SQL"""
        try:
            sql = text("SELECT MAX(id) AS max_id FROM workorder_t")
            row = db.session.execute(sql).fetchone()
            max_id = row[0] if row and row[0] is not None else 0
            return (max_id + 1)
        except Exception as e:
            logging.exception("get_next_id error")
            # fallback to 1 on error
            return 1


    def update(self, data):
        """Update workorder"""
        try:
            for key, value in data.items():
                if hasattr(self, key):
                    setattr(self, key, value)
            db.session.commit()
            return True, None
        except Exception as e:
            db.session.rollback()
            return False, str(e)

    def delete(self):
        """Delete workorder"""
        try:
            db.session.delete(self)
            db.session.commit()
            return True, None
        except Exception as e:
            db.session.rollback()
            return False, str(e)


    # ──────────────────────────────────────────────
    # Master data helpers
    # ─────────────────────────────────────────────
    @classmethod
    def get_workorder_types(cls):
        """Fetch all active workorder types"""
        try:
            result = db.session.execute(
                text("SELECT WORKORDER_TYPE FROM WORKORDER_TYPE_T WHERE STATUS='ACTIVE'")
            ).fetchall()
            return [r[0] for r in result], None
        except Exception as e:
            return None, str(e)

    @classmethod
    def get_workorder_areas(cls):
        """Fetch all active workorder areas"""
        try:
            result = db.session.execute(
                text("SELECT WORKORDER_AREA FROM WORKORDER_AREA_T WHERE STATUS='ACTIVE'")
            ).fetchall()
            return [r[0] for r in result], None
        except Exception as e:
            return None, str(e)


    @classmethod
    def search_by_workorder_raw(cls, query):
        logging.info(f"searchquery functionality bro:'{query}'")

        try:

            workorder_sql = text("""
                SELECT a.*,c.region_name,e.state_name,f.city_name,d.category_name,
                g.item_name,h.type_name,i.description_name FROM workorder_t a
                LEFT JOIN region_master_t c ON a.region = c.region_id
                LEFT JOIN state_master_t e ON a.state = e.state_id
                LEFT JOIN city_master_t f ON a.city = f.city_id
                LEFT JOIN category_master_t d ON a.category = d.category_id
                LEFT JOIN item_master_t g ON a.item = g.item_id
                LEFT JOIN type_master_t h ON a.type = h.type_id
                LEFT JOIN description_master_t i ON a.description = i.description_id
                WHERE a.workorder = :query
            """)

            # ==================================================
            # ASSIGNMENT HISTORY
            # ==================================================
            assignment_sql = text("""
                SELECT wa.*,u.name AS contractor_name FROM workorder_assignment_t wa
                LEFT JOIN users_t u ON u.user_uid = wa.provider_id
                WHERE wa."WORKORDER_ID" = :query ORDER BY wa.assigned_at
            """)

            # ==================================================
            # LIFECYCLE HISTORY
            # ==================================================
            lifecycle_sql = text("""
                SELECT lc.*,u.name AS contractor_name FROM workorder_life_cycle_t lc
                LEFT JOIN users_t u ON u.user_uid = lc.contractor_id
                WHERE lc.workorder = :query ORDER BY lc.created_t
            """)

            workorder = db.session.execute(workorder_sql,{"query": query}).mappings().first()

            if not workorder:
                return [], None

            assignments = db.session.execute(assignment_sql,{"query": query}).mappings().all()
            lifecycles = db.session.execute(lifecycle_sql,{"query": query}).mappings().all()
            response = dict(workorder)

            # ==================================================
            # DATETIME CONVERSION
            # ==================================================
            for key, value in response.items():
                if isinstance(value, datetime):
                    response[key] = value.isoformat()

            # ==================================================
            # IMAGE CONVERSION
            # ==================================================
            if (
                "image" in response
                and response["image"]
                and isinstance(response["image"], (bytes, bytearray))
            ):
                response["image"] = base64.b64encode(
                    response["image"]
                ).decode("utf-8")

            # ==================================================
            # ASSIGNMENT HISTORY
            # ==================================================
            assignment_history = []

            for row in assignments:

                assignment_history.append({
                    "contractor_id": row.get("provider_id"),
                    "contractor_name": row.get("contractor_name"),
                    "assigned_at": (
                        row.get("assigned_at").isoformat()
                        if row.get("assigned_at")
                        else None
                    ),
                    "expiry_time": (
                        row.get("expiry_time").isoformat()
                        if row.get("expiry_time")
                        else None
                    ),
                    "assignment_status": row.get("assignment_status")
                })

            # ==================================================
            # TIMELINE
            # ==================================================
            timeline = []

            # ASSIGNMENT EVENTS
            for row in assignments:

                assignment_status = row.get("assignment_status")

                if assignment_status not in ["REJECTED", "EXPIRED"]:
                    continue

                remarks = None

                matching_lifecycle = next(
                    (
                        lc for lc in lifecycles
                        if lc.get("status") == assignment_status
                        and str(lc.get("contractor_id")) == str(row.get("provider_id"))
                    ),
                    None
                )

                if matching_lifecycle:
                    remarks = (
                        matching_lifecycle.get("contractor_remarks")
                        or matching_lifecycle.get("remarks")
                    )

                timeline.append({
                    "status": assignment_status,
                    "time": (
                        row.get("assigned_at").isoformat()
                        if row.get("assigned_at")
                        else None
                    ),
                    "expiry_time": (
                        row.get("expiry_time").isoformat()
                        if row.get("expiry_time")
                        else None
                    ),
                    "contractor_id": row.get("provider_id"),
                    "contractor_name": row.get("contractor_name"),
                    "remarks": remarks
                })
                
            # LIFECYCLE EVENTS
            for row in lifecycles:

                lifecycle_status = row.get("status")

                # Skip statuses already represented by assignment table
                if lifecycle_status in [
                    "REJECTED",
                    "EXPIRED",
                ]:
                    continue

                event_time = (
                    row.get("workorder_close_time")
                    or row.get("workorder_reopen_time")
                    or row.get("workorder_completed_time")
                    or row.get("created_t")
                )

                print(
                    lifecycle_status,
                    row.get("remarks"),
                    row.get("contractor_remarks"),
                    row.get("admin_remarks")
                )

                timeline.append({
                    "status": lifecycle_status,
                    "time": (
                        event_time.isoformat()
                        if event_time
                        else None
                    ),
                    "remarks": (
                        row.get("admin_remarks")
                        or row.get("contractor_remarks")
                        or row.get("remarks")
                    ),
                    "contractor_name": row.get("contractor_name"),
                    "contractor_id": row.get("contractor_id")
                })

            # ==================================================
            # SORT TIMELINE
            # ==================================================
            timeline = sorted(
                timeline,
                key=lambda x: x["time"] if x["time"] else ""
            )

            response["assignment_history"] = assignment_history
            response["timeline"] = timeline

            return [response], None

        except Exception as e:
            print(f"[ERROR] search_by_workorder_raw exception: {e}")
            return None, str(e)


    # ──────────────────────────────────────────────
    # Utility
    # ─────────────────────────────────────────────
    @staticmethod
    def get_child_workorders_with_contractor(parent_wo):
        query = text("""
            SELECT a.*,b.contractor_id,b.contractor_name,b.contractor_remarks,
            b.status AS lifecycle_status,b.remarks AS lifecycle_remarks,
            b.created_t AS lifecycle_created_t FROM public.workorder_t a
            LEFT JOIN public.workorder_life_cycle_t b ON a."workorder" = b."workorder"
            WHERE a.parent_workorder = :parent_wo
        """)

        result = db.session.execute(query, {"parent_wo": parent_wo})
        rows = result.fetchall()
        return [dict(row._mapping) for row in rows]


    # ──────────────────────────────────────────────
    # Serialization
    # ─────────────────────────────────────────────
    def to_dict(self):
        return {
            "id": self.id,
            "workorder": self.workorder,
            "created_t": self.created_t.isoformat() if self.created_t else None,
            "status": self.status,
            "category": self.category,
            "item": self.item,
            "type": self.type,
            "description": self.description,
            "region": self.region,
            "state": self.state,
            "city": self.city,
            "client": self.client,
            "address": self.address,
            "ticket_assignment_type": self.ticket_assignment_type,
            "requested_time_close": self.requested_time_close,
            "remarks": self.remarks,
            "detailed_description": self.detailed_description,
            "creation_time_image": self.creation_time_image if self.creation_time_image else [],
            "closing_images": self.closing_images if self.closing_images else [],
            "created_by": self.created_by
        }

    @classmethod
    def get_filtered_workorders(cls, status, from_date, to_date):
        try:
            logging.info("Dashboard Filter Query Triggered")

            sql = text("""
                SELECT DISTINCT ON (w.workorder) w.*,c.category_name,r.region_name,
                u.name AS contractor_name,u.user_uid AS contractor_id,wa.assignment_status,
                wa.assigned_at FROM workorder_t w
                LEFT JOIN category_master_t c ON w.category = c.category_id
                LEFT JOIN region_master_t r ON w.region = r.region_id
                LEFT JOIN workorder_assignment_t wa ON wa."WORKORDER_ID" = w.workorder
                LEFT JOIN users_t u ON wa.provider_id = u.user_uid
                WHERE w.created_t BETWEEN :from_dt AND :to_dt
                AND (:status = 'All' OR LOWER(w.status) = LOWER(:status))
                ORDER BY w.workorder,wa.assigned_at DESC NULLS LAST,w.id DESC
            """)

            rows = db.session.execute(
                sql,
                {
                    "from_dt": from_date,
                    "to_dt": to_date,
                    "status": status
                }
            ).mappings().all()

            return [dict(row) for row in rows], None

        except Exception as e:
            logging.error(
                "get_filtered_workorders error: %s",
                e,
                exc_info=True
            )

            return None, str(e)
        
        
        
    @classmethod
    def count_closed(cls):
        try:
            sql = text("""SELECT COUNT(*) FROM workorder_t WHERE LOWER(status) = 'closed'""")
            result = db.session.execute(sql).scalar()
            return result, None
        except Exception as e:
            return None, str(e)
    @classmethod
    def count_today(cls):
        try:
            sql = text("""
                SELECT COUNT(*) FROM workorder_t WHERE DATE(created_t) = CURRENT_DATE
            """)
            result = db.session.execute(sql).scalar()
            return result, None
        except Exception as e:
            return None, str(e)
        
    @classmethod
    def count_open(cls):
        try:
            sql = text("""
                SELECT COUNT(*) FROM workorder_t WHERE LOWER(status) IN ('open', 'accepted')
            """)
            result = db.session.execute(sql).scalar()
            return result, None
        except Exception as e:
            return None, str(e)
    
    @classmethod
    def count_total(cls):
        try:
            sql = text("SELECT COUNT(*) FROM workorder_t")
            result = db.session.execute(sql).scalar()
            return result, None
        except Exception as e:
            return None, str(e)

    @staticmethod
    def get_standard_rates(category_id, item_id, type_id, description_id):
        try:

            if not all([category_id,item_id,type_id,description_id]):
                return []

            query = text("""
                SELECT sr.id AS standard_rate_id,sr.client,sr.price_rm FROM standard_rates_t sr
                JOIN category_master_t c ON c.category_id = :category_id
                JOIN item_master_t i ON i.item_id = :item_id
                JOIN type_master_t t ON t.type_id = :type_id
                JOIN description_master_t d ON d.description_id = :description_id
                WHERE LOWER(TRIM(sr.category)) = LOWER(TRIM(c.category_name))
                AND LOWER(TRIM(sr.item)) = LOWER(TRIM(i.item_name))
                AND LOWER(TRIM(sr.type)) = LOWER(TRIM(t.type_name))
                AND LOWER(TRIM(sr.description)) = LOWER(TRIM(d.description_name))
                AND sr.is_active = TRUE ORDER BY sr.id DESC
            """)

            rows = db.session.execute(
                query,
                {
                    "category_id": category_id,
                    "item_id": item_id,
                    "type_id": type_id,
                    "description_id": description_id
                }
            ).fetchall()

            return [
                {
                    "standard_rate_id": r.standard_rate_id,
                    "client": r.client,
                    "price_rm": float(r.price_rm or 0)
                }
                for r in rows
                if r.client
            ]

        except Exception as e:
            print("[ERROR] get_standard_rates:", e)
            return []


    @classmethod
    def get_by_workorder_code(cls, workorder):
        try:
            sql = text("""
                SELECT w.*,c.category_name,i.item_name,t.type_name,d.description_name,
                r.region_name,s.state_name,ci.city_name FROM workorder_t w
                LEFT JOIN category_master_t c ON w.category = c.category_id
                LEFT JOIN item_master_t i ON w.item = i.item_id
                LEFT JOIN type_master_t t ON w.type = t.type_id
                LEFT JOIN description_master_t d ON w.description = d.description_id
                LEFT JOIN region_master_t r ON w.region = r.region_id
                LEFT JOIN state_master_t s ON w.state = s.state_id
                LEFT JOIN city_master_t ci ON w.city = ci.city_id
                WHERE w.workorder = :workorder LIMIT 1
            """)
    
            row = db.session.execute(sql, {"workorder": workorder}).mappings().fetchone()
    
            if not row:
                return None, "Workorder not found"
    
            return dict(row), None
    
        except Exception as e:
            return None, str(e)
    

    @classmethod
    def get_contractors_by_region_category_name(cls, region_name, category_name):
        try:
            sql = text("""
                SELECT 
                    a.user_uid AS provider_id,
                    a.email_id,
                    a.name AS full_name,
                    a.average_rating,
                    a.total_ratings,
                    b.service_rate AS rate,
                    b.city,
                    c.region_name,
                    d.category_name,
                    b.region AS service_locations,
    
                    cd.company_id,
                    cd.company_name,
                    cd.brn_number,
                    cd.logo_path,
                    cd.certificate_path,
                    cd.updated_at
                FROM users_t a
                INNER JOIN services_t b 
                    ON a.user_uid = b.user_uid
                INNER JOIN region_master_t c 
                    ON b.region = c.region_name
                INNER JOIN category_master_t d 
                    ON d.category_name = b.category_name
                LEFT JOIN company_details_t cd
                    ON cd.user_uid = a.user_uid
                WHERE c.region_name = :region_name
                  AND d.category_name = :category_name
                  and a.active_status='t'
                ORDER BY b.service_rate ASC, a.average_rating DESC
                LIMIT 6
            """)
    
            rows = db.session.execute(
                sql,
                {
                    "region_name": region_name,
                    "category_name": category_name
                }
            ).mappings().all()
    
            return [dict(row) for row in rows], None
    
        except Exception as e:
            return None, str(e)   
        
        
        
    @classmethod
    def close_workorder(cls, workorder_code, images):
        try:
            images_json = json.dumps(images)  # list → JSON string
    
            # 🔹 1. Update main workorder table
            sql_workorder = text("""
                UPDATE workorder_t SET status = 'CLOSED',
                closing_images = CAST(:images AS JSONB) WHERE workorder = :workorder
                RETURNING *;
            """)
    
            row = db.session.execute(sql_workorder, {
                "images": images_json,
                "workorder": workorder_code
            }).mappings().fetchone()
    
            if not row:
                db.session.rollback()
                return None, "Workorder not found"
    
            # 🔹 2. Update lifecycle table
            sql_lifecycle = text("""
                UPDATE workorder_life_cycle_t SET status = 'CLOSED',
                workorder_close_time = (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Kolkata')
                WHERE id = (SELECT id FROM workorder_life_cycle_t
                WHERE workorder = :workorder ORDER BY created_t DESC LIMIT 1);

            """)
    
            db.session.execute(sql_lifecycle, {"workorder": workorder_code})
    
            # 🔹 3. Update assignment table (ONLY ACCEPTED → CLOSED)
            sql_assignment = text("""
                UPDATE workorder_assignment_t SET assignment_status = 'CLOSED'
                WHERE "WORKORDER_ID" = :workorder AND assignment_status = 'ACCEPTED';
            """)
    
            db.session.execute(sql_assignment, {"workorder": workorder_code})
            db.session.commit()
            return dict(row), None
    
        except Exception as e:
            db.session.rollback()
            return None, str(e)
     
    @staticmethod
    def count_individual():
        try:
            sql = text("SELECT COUNT(*) FROM users_t WHERE service_type = '0'")
            result = db.session.execute(sql).scalar()
            return result, None
        except Exception as e:
            return None, str(e)
        
    @staticmethod
    def count_company():
        try:
            sql = text("SELECT COUNT(*) FROM users_t WHERE service_type = '1'")
            result = db.session.execute(sql).scalar()
            return result, None
        except Exception as e:
            return None, str(e)
        
        
    @staticmethod
    def get_pending_workorders_by_provider(provider_id):
        try:
            sql = text("""
                SELECT * FROM workorder_assignment_t WHERE provider_id = :provider_id
                AND assignment_status = 'PENDING' ORDER BY assigned_at DESC
            """)
    
            result = db.session.execute(sql, {"provider_id": provider_id}).mappings().all()
    
            rows = []
            for row in result:
                r = dict(row)
    
                if r.get("assigned_at"):
                    r["assigned_at"] = format_datetime(r["assigned_at"])

                if r.get("expiry_time"):
                    r["expiry_time"] = format_datetime(r["expiry_time"])
    
                rows.append(r)
    
            return rows
    
        except Exception as e:
            logging.error(f"Error fetching pending workorders: {e}")
            return []
    
    @staticmethod
    def get_assigned_workorder_details(workorder_id):
        try:
            sql = text("""
                SELECT a.workorder,a.creation_time_image,b.region_name,c.category_name,a.remarks,a.detailed_description,a.requested_time_close,
                d.item_name,e.type_name,f.description_name,g.state_name,h.city_name,a.client
                FROM workorder_t a JOIN region_master_t b ON a.region = b.region_id
                JOIN category_master_t c ON a.category = c.category_id
                JOIN item_master_t d ON a.item = d.item_id
                JOIN type_master_t e ON a.type = e.type_id
                JOIN description_master_t f ON a.description = f.description_id
                JOIN state_master_t g ON a.state = g.state_id
                JOIN city_master_t h ON a.city = h.city_id
                WHERE a.workorder = :workorder_id
            """)

            result = db.session.execute(
                sql, {"workorder_id": workorder_id}
            ).mappings().all()

            rows = []
            for r in result:
                r = dict(r)

                if r.get("requested_time_close"):
                    r["requested_time_close"] = format_datetime(r["requested_time_close"])

                rows.append(r)

            return rows

        except Exception as e:
            logging.error(
                f"Error fetching assigned workorder details: {e}",
                exc_info=True
            )
            raise       
        
    @staticmethod
    def get_open_workorders_by_provider(provider_id):
        try:
            sql = text("""
                SELECT a.workorder,d.assignment_status,d.assigned_at,a.requested_time_close,b.region_name,
                c.category_name,a.remarks,a.detailed_description,a.client,e.item_name,f.type_name,g.description_name,h.state_name,
                i.city_name FROM workorder_t a JOIN region_master_t b ON a.region = b.region_id
                JOIN category_master_t c ON a.category = c.category_id
                JOIN workorder_assignment_t d ON d."WORKORDER_ID" = a.workorder
                JOIN item_master_t e ON a.item = e.item_id
                JOIN type_master_t f ON a.type = f.type_id
                JOIN description_master_t g ON a.description = g.description_id
                JOIN state_master_t h ON a.state = h.state_id
                JOIN city_master_t i ON a.city = i.city_id
                WHERE d.provider_id = :provider_id AND LOWER(d.assignment_status) = 'accepted'
                ORDER BY d.assigned_at DESC
            """)
    
            result = db.session.execute(
                sql, {"provider_id": provider_id}
            ).mappings().all()
    
            rows = []
            for row in result:
                r = dict(row)
    
                r["assigned_at"] = to_ist_safe(r.get("assigned_at"))
                r["requested_time_close"] = to_ist_safe(r.get("requested_time_close"))
    
                rows.append(r)
    
            return rows
    
        except Exception as e:
            logging.error(f"Error fetching open workorders: {e}", exc_info=True)
            return []
    
    @staticmethod
    def get_closed_workorders_by_provider(provider_id):
        logging.info(f"get_closed_workorder: '{provider_id}'")
        try:
            sql = text("""
                SELECT a.*,b.*,c.region_name,d.category_name,e.item_name,f.type_name,
                g.description_name,h.state_name,i.city_name
                FROM workorder_life_cycle_t a JOIN workorder_t b ON a.workorder = b.workorder
                JOIN region_master_t c ON c.region_id = b.region
                JOIN category_master_t d ON d.category_id = b.category
                JOIN item_master_t e ON b.item = e.item_id
                JOIN type_master_t f ON b.type = f.type_id
                JOIN description_master_t g ON b.description = g.description_id
                JOIN state_master_t h ON b.state = h.state_id
                JOIN city_master_t i ON b.city = i.city_id
                WHERE a.contractor_id = :provider_id AND a.status = 'CLOSED';                
            """) 
            result = db.session.execute(
                sql, {"provider_id": provider_id}
            ).mappings().all()
    
            rows = []
            for row in result:
                r = dict(row)
    
                # 🔥 Convert datetime fields to IST
                for key in [
                    "created_t",
                    "updated_t",
                    "workorder_close_time",
                    "assigned_at",
                    "expiry_time",
                    "requested_time_close"
                ]:
                    if key in r:
                        r[key] = to_ist_safe(r.get(key))
    
                rows.append(r)
    
            return rows
    
        except Exception as e:
            logging.error(
                f"Error fetching closed workorders: {e}",
                exc_info=True
            )
            return []   
        
    @staticmethod
    def get_all_workorder_lifecycle(from_date=None, to_date=None, status=None):
        try:
            sql = """
                SELECT
                    a."WORKORDER_ID",
                    b.name,
                    a.assigned_at,
                    a.assignment_status,
                    a.expiry_time
                FROM workorder_assignment_t a
                JOIN users_t b ON a.provider_id = b.user_uid
                WHERE 1=1
            """

            params = {}

            if from_date and to_date:
                sql += """
                    AND DATE(a.assigned_at) BETWEEN :from_date AND :to_date
                """
                params["from_date"] = from_date
                params["to_date"] = to_date

            if status and status != "All":
                sql += """
                    AND a.assignment_status = :status
                """
                params["status"] = status

            sql += " ORDER BY a.assigned_at DESC"

            result = db.session.execute(text(sql), params).mappings().all()
            return [dict(row) for row in result], None

        except Exception as e:
            return None, str(e)
        
        
    @staticmethod
    def get_closed_notifications():
        try:
            sql = text("""
                SELECT
                    id,
                    workorder,
                    notification_type,
                    message,
                    created_at
                FROM admin_notifications_t
                WHERE notification_type = 'WORKORDER_CLOSE'
                ORDER BY created_at DESC
            """)

            rows = db.session.execute(sql).mappings().all()

            return [dict(row) for row in rows]

        except Exception as e:
            logging.error("get_closed_notifications error", exc_info=True)
            return []

    @staticmethod
    def get_assigned_notifications():
        try:
            sql = text("""
                SELECT
                    id,
                    workorder,
                    notification_type,
                    message,
                    created_at
                FROM admin_notifications_t
                WHERE notification_type = 'WORKORDER_ASSIGN'
                ORDER BY created_at DESC
            """)

            rows = db.session.execute(sql).mappings().all()
            return [dict(row) for row in rows]

        except Exception as e:
            logging.error("get_assigned_notifications error", exc_info=True)
            return []


    @staticmethod
    def get_invoice_notifications():
        try:
            sql = text("""
                SELECT
                    id,
                    workorder,
                    notification_type,
                    message,
                    created_at
                FROM admin_notifications_t
                WHERE notification_type = 'INVOICE_GENERATED'
                ORDER BY created_at DESC
            """)

            rows = db.session.execute(sql).mappings().all()
            return [dict(row) for row in rows]

        except Exception as e:
            logging.error("get_invoice_notifications error", exc_info=True)
            return []
        
        
    @staticmethod
    def check_duplicate_open_workorder(data):
        logging.info(f"checking the here it is coming: '{data}'")

        sql = text("""
            SELECT workorder FROM workorder_t WHERE category = :CATEGORY_ID AND item = :ITEM_ID
            AND type = :TYPE_ID AND description = :DESCRIPTION_ID AND region = :REGION_ID
            AND state = :STATE_ID AND city = :CITY_ID AND client = :CLIENT AND status = 'OPEN'
            ORDER BY created_t ASC
        """)

        result = db.session.execute(sql, {
            "CATEGORY_ID": data["CATEGORY_ID"],
            "ITEM_ID": data["ITEM_ID"],
            "TYPE_ID": data["TYPE_ID"],
            "DESCRIPTION_ID": data["DESCRIPTION_ID"],
            "REGION_ID": data["REGION_ID"],
            "STATE_ID": data["STATE_ID"],
            "CITY_ID": data["CITY_ID"],
            "CLIENT": data["CLIENT"],
        })
        rows = result.fetchall()
        workorders = [row[0] for row in rows]
        logging.info(f"Duplicate open workorders found: {workorders}")
        return workorders
    
    
    @staticmethod
    def get_contractors_by_workorder(workorder_id):
        try:
            sql = text("""
                SELECT a.id,g.email_id,g.name,g.user_uid,b.category_name,c.item_name,d.type_name,e.description_name,
                f.region,f.state,f.city,f.service_rate AS rate
                FROM workorder_t a LEFT JOIN category_master_t b ON a.category = b.category_id
                LEFT JOIN item_master_t c ON a.item = c.item_id
                LEFT JOIN type_master_t d ON a.type = d.type_id
                LEFT JOIN description_master_t e ON a.description = e.description_id
                LEFT JOIN services_t f ON f.category_name = b.category_name
                AND f.item_name = c.item_name AND f.type_name = d.type_name
                AND f.description_name = e.description_name
                LEFT JOIN users_t g ON g.user_uid = f.user_uid
                WHERE a.workorder = :workorder_id
                order by service_rate asc limit 3
            """)

            rows = db.session.execute(
                sql,
                {"workorder_id": workorder_id}
            ).mappings().all()

            return [dict(row) for row in rows]

        except Exception as e:
            logging.error(
                "get_contractors_by_workorder error",
                exc_info=True
            )
            return []


    @staticmethod
    def get_invoice_workorder_details(workorder):
        try:
            sql = text("""
                SELECT wo.workorder,u.name,u.user_uid,u.tin_number,p.id_number,
                c.category_name AS category,e.item_name,f.type_name,d.description_name AS description,
                r.region_name AS region_name,s.state_name AS state,sr.client AS client,sr.price_rm
                FROM workorder_t wo 
                LEFT JOIN workorder_life_cycle_t wlc
                ON wlc.workorder = wo.workorder

                LEFT JOIN users_t u
                ON wlc.contractor_id = u.user_uid 

                LEFT JOIN providers_t p
                ON p.user_uid = u.user_uid
                LEFT JOIN description_master_t d ON wo.description = d.description_id 
                LEFT JOIN category_master_t c ON c.category_id = wo.category
                LEFT JOIN item_master_t e ON  e.item_id = wo.item
                LEFT JOIN type_master_t f ON  f.type_id = wo.type
                LEFT JOIN region_master_t r ON wo.region = r.region_id
                LEFT JOIN state_master_t s ON wo.state = s.state_id
                LEFT JOIN standard_rates_t sr ON sr.client = wo.client and
                    lower(c.category_name) = lower(sr.category)
                    and lower(e.item_name) = lower(sr.item)
                    and lower(f.type_name) = lower(sr.type)
                    and lower(d.description_name) = lower(sr.description)
                WHERE TRIM(LOWER(wo.workorder))
                =
                TRIM(LOWER(:workorder)) LIMIT 1
            """)

            row = db.session.execute(
                sql,
                {"workorder": workorder}
            ).mappings().first()

            return dict(row) if row else None

        except Exception:
            logging.error("get_invoice_workorder_details error", exc_info=True)
            return None        




    @staticmethod
    def create_invoice(data):
        try:
            sql = text("""
                INSERT INTO invoice_t (
                    invoice_no,
                    workorder,
                    contractor_id,
                    contractor_name,
                    billing_address,
                    invoice_date
                )
                VALUES (
                    :invoice_no,
                    :workorder,
                    :contractor_id,
                    :contractor_name,
                    :billing_address,
                    :invoice_date
                )
                RETURNING *;
            """)

            row = db.session.execute(sql, {
                "invoice_no": data["invoice_no"],
                "workorder": data["workorder"],
                "contractor_id": data["contractor_id"],
                "contractor_name": data["contractor_name"],
                "billing_address": data["billing_address"],
                "invoice_date": datetime.today().date()
            }).mappings().first()

            db.session.commit()
            return dict(row)

        except Exception as e:
            db.session.rollback()
            logging.error("create_invoice error", exc_info=True)
            return None
        



    @classmethod
    def workorder_insert_admin_notification_close(cls, workorder, message, saved_images, provider_id):
        logging.info(f"admin_ → workorder: {workorder}, images: {saved_images}")
        try:
            sql_check = text("""
                SELECT id FROM admin_notifications_t WHERE workorder = :workorder
                LIMIT 1;
            """)

            existing = db.session.execute(sql_check,{"workorder": workorder}).fetchone()

            if existing:
                sql_notification = text("""
                    UPDATE admin_notifications_t SET notification_type = 'WORKORDER_CLOSE',
                    message = :message,updated_at = CURRENT_TIMESTAMP
                    WHERE workorder = :workorder;
                """)

                db.session.execute(sql_notification, {
                    "workorder": workorder,
                    "message": message
                })

            else:
                sql_notification = text("""
                    INSERT INTO admin_notifications_t(workorder,notification_type,message,
                    created_by,created_at) VALUES (:workorder,'WORKORDER_CLOSE',:message,
                        :provider_id,CURRENT_TIMESTAMP);
                """)

                db.session.execute(sql_notification, {
                    "workorder": workorder,
                    "message": message,
                    "provider_id": provider_id
                })

            # -----------------------------------
            # Update workorder
            images_json = json.dumps(saved_images)

            sql_workorder = text("""
                UPDATE workorder_t SET status = 'COMPLETED',
                closing_images = CAST(:images AS JSONB) WHERE workorder = :workorder
                RETURNING *;
            """)

            row = db.session.execute(
                sql_workorder,
                {
                    "images": images_json,
                    "workorder": workorder
                }
            ).mappings().fetchone()

            if not row:
                db.session.rollback()
                return None, "Workorder not found"

            # -----------------------------------
            # Update lifecycle
            sql_lifecycle = text("""
                INSERT INTO workorder_life_cycle_t (workorder,created_t,status,contractor_id,
                contractor_remarks,workorder_completed_time) VALUES (:workorder,
                CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Kolkata','COMPLETED',
                :provider_id,:message,(CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Kolkata'));
            """)

            db.session.execute(sql_lifecycle, {"workorder": workorder,"provider_id": provider_id,
                "message": message
            })

            # -----------------------------------
            # ACCEPTED / REOPEN → COMPLETED
            sql_assignment = text("""
                UPDATE workorder_assignment_t SET assignment_status = 'COMPLETED'
                WHERE "WORKORDER_ID" = :workorder AND provider_id = :provider_id
                AND assignment_status IN ('ACCEPTED', 'REOPEN')
            """)

            db.session.execute(sql_assignment, {
                "workorder": workorder,
                "provider_id": provider_id
            })

            db.session.commit()

            admin_email,admin_id, email_err = cls.get_admin_email_by_workorder(workorder)
            if email_err:
                logging.warning(f"Admin email fetch warning: {email_err}")
    
            return dict(row), admin_email,admin_id, None

        except Exception as e:
            db.session.rollback()
            logging.exception("Admin Notification Close DB Error")
            return None, str(e)


    # =========================================================
    # 2️⃣ ADMIN REOPEN WORKORDER
    # COMPLETED → REOPEN
    # =========================================================
    @classmethod
    def workorder_insert_admin_notification_reopen(cls,workorder,admin_remarks):
        logging.info(f"🔁 Admin Reopen → workorder={workorder}")

        try:
            sql_workorder = text("""
                UPDATE workorder_t SET status = 'REOPEN'WHERE workorder = :workorder
                RETURNING *;
            """)

            row = db.session.execute(sql_workorder,{"workorder": workorder}).mappings().fetchone()

            if not row:
                db.session.rollback()
                return None, "Workorder not found"

            # -----------------------------------
            # Lifecycle insert
            sql_fetch = text("""
                SELECT * FROM workorder_life_cycle_t WHERE workorder = :workorder
                AND status = 'COMPLETED' ORDER BY id DESC LIMIT 1;
            """)

            completed_row = db.session.execute(sql_fetch,{"workorder": workorder}).mappings().fetchone()

            if completed_row:

                sql_insert = text("""
                    INSERT INTO workorder_life_cycle_t (workorder,created_t,requested_time_close,
                    remarks,status,contractor_name,contractor_id,contractor_remarks,
                    workorder_reopen_time,admin_remarks) VALUES (:workorder,
                    (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Kolkata'),:requested_time_close,
                    :remarks,'REOPEN',:contractor_name,:contractor_id,:contractor_remarks,
                    (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Kolkata'),:admin_remarks);
                """)

                db.session.execute(sql_insert, {
                    "workorder": completed_row["workorder"],
                    "requested_time_close": completed_row["requested_time_close"],
                    "remarks": completed_row["remarks"],
                    "contractor_name": completed_row["contractor_name"],
                    "contractor_id": completed_row["contractor_id"],
                    "contractor_remarks": completed_row["contractor_remarks"],
                    "admin_remarks": admin_remarks
                })

            # -----------------------------------
            # COMPLETED → REOPEN
            sql_assignment = text("""
                UPDATE workorder_assignment_t SET assignment_status = 'REOPEN'
                WHERE "WORKORDER_ID" = :workorder AND assignment_status = 'COMPLETED'
            """)

            db.session.execute(sql_assignment,{"workorder": workorder})

            sql_admin_notification = text("""
                UPDATE admin_notifications_t SET notification_type = 'REOPEN'
                WHERE workorder = :workorder;
            """)

            db.session.execute(sql_admin_notification,{"workorder": workorder})
            db.session.commit()

            return dict(row), None

        except Exception as e:
            db.session.rollback()
            logging.exception("Admin Notification Reopen DB Error")
            return None, str(e)


    # =========================================================
    # 3️⃣ ADMIN FINAL CLOSE
    # ONLY COMPLETED → CLOSED
    # =========================================================
    @classmethod
    def workorder_update_admin_notification_close(cls,workorder,admin_remarks):
        logging.info(f"🔒 Admin Close → workorder={workorder}")

        try:
            sql_workorder = text("""
                UPDATE workorder_t
                SET status = 'CLOSED'
                WHERE workorder = :workorder
                RETURNING *;
            """)

            row = db.session.execute(
                sql_workorder,
                {"workorder": workorder}
            ).mappings().fetchone()

            if not row:
                db.session.rollback()
                return None, "Workorder not found"

            # -----------------------------------
            # Lifecycle update
            completed_row = db.session.execute(
                text("""
                    SELECT * FROM workorder_life_cycle_t WHERE workorder = :workorder
                    AND status = 'COMPLETED' ORDER BY id DESC LIMIT 1
                """),
                {"workorder": workorder}).mappings().fetchone()

            if not completed_row:
                return None, "Completed lifecycle record not found"

            db.session.execute(
                text("""
                    INSERT INTO workorder_life_cycle_t (workorder,contractor_id,status,
                    workorder_close_time,admin_remarks) VALUES (:workorder,:contractor_id,
                    'CLOSED',(CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Kolkata'),:admin_remarks)
                """),
                {
                    "workorder": workorder,
                    "contractor_id": completed_row["contractor_id"],
                    "admin_remarks": admin_remarks
                }
            )

            # -----------------------------------
            # ONLY COMPLETED → CLOSED
            sql_assignment = text("""
                UPDATE workorder_assignment_t SET assignment_status = 'CLOSED'
                WHERE "WORKORDER_ID" = :workorder AND assignment_status = 'COMPLETED'
            """)

            db.session.execute(sql_assignment,{"workorder": workorder})

            # -----------------------------------
            # Notification update
            sql_admin_notification = text("""
                UPDATE admin_notifications_t SET notification_type = 'CLOSED'
                WHERE workorder = :workorder;
            """)

            db.session.execute(sql_admin_notification,{"workorder": workorder})
            db.session.commit()
            return dict(row), None

        except Exception as e:
            db.session.rollback()
            logging.exception("Admin Notification Close DB Error")
            return None, str(e)       

        
    @staticmethod
    def get_completed_workorders_by_provider(provider_id):
        logging.info(f"get_completed_workorders_by_provider: '{provider_id}'")
        try:
            sql = text("""
                SELECT a.*,b.*,j.status AS lifecycle_status,j.created_t AS lifecycle_created_t,
                j.contractor_remarks,j.admin_remarks,j.workorder_completed_time,
                j.workorder_reopen_time,c.region_name,d.category_name,e.item_name,
                f.type_name,g.description_name,h.state_name,i.city_name
                FROM workorder_assignment_t a
                JOIN workorder_t b ON a."WORKORDER_ID" = b.workorder
                JOIN workorder_life_cycle_t j ON j.id = (SELECT MAX(wl.id) FROM workorder_life_cycle_t wl
                WHERE wl.workorder = b.workorder AND wl.status = 'COMPLETED')
                JOIN region_master_t c ON c.region_id = b.region
                JOIN category_master_t d ON d.category_id = b.category
                JOIN item_master_t e ON b.item = e.item_id
                JOIN type_master_t f ON b.type = f.type_id
                JOIN description_master_t g ON b.description = g.description_id
                JOIN state_master_t h ON b.state = h.state_id
                JOIN city_master_t i ON b.city = i.city_id
                WHERE a.provider_id = :provider_id AND b.status = 'COMPLETED';
            """) 
            result = db.session.execute(
                sql, {"provider_id": provider_id}
            ).mappings().all()
    
            rows = []
            for row in result:
                r = dict(row)
    
                # 🔥 Convert datetime fields to IST
                for key in ["created_t","updated_t","workorder_close_time","assigned_at","expiry_time",
                    "requested_time_close"
                ]:
                    if key in r:
                        r[key] = to_ist_safe(r.get(key))
    
                rows.append(r)
    
            return rows
    
        except Exception as e:
            logging.error(
                f"Error fetching closed workorders: {e}",
                exc_info=True
            )
            return []
        
        
    @staticmethod
    def get_completed_workorder_details_admin(workorder):
        logging.info(f"get_completed_workorder_details_admin → {workorder}")

        try:
            sql = text("""
                SELECT a.*,b.*,c.region_name,d.category_name,e.item_name,f.type_name,g.description_name,
                b.detailed_description,
                h.state_name,i.city_name FROM workorder_life_cycle_t a
                JOIN workorder_t b ON a.workorder = b.workorder
                JOIN region_master_t c ON c.region_id = b.region
                JOIN category_master_t d ON d.category_id = b.category
                JOIN item_master_t e ON b.item = e.item_id
                JOIN type_master_t f ON b.type = f.type_id
                JOIN description_master_t g ON b.description = g.description_id
                JOIN state_master_t h ON b.state = h.state_id
                JOIN city_master_t i ON b.city = i.city_id
                WHERE a.status = 'COMPLETED' AND a.workorder = :workorder
                ORDER BY a.created_t DESC LIMIT 1
            """)

            result = db.session.execute(
                sql, {"workorder": workorder}
            ).mappings().fetchone()

            if not result:
                return []

            r = dict(result)

            for key in ["created_t","updated_t","workorder_close_time","assigned_at","expiry_time",
                "requested_time_close","workorder_completed_time"
            ]:
                if key in r:
                    r[key] = to_ist_safe(r.get(key))

            return [r]

        except Exception as e:
            logging.exception("DB error in completed workorder admin")
            raise e
        
        
    @staticmethod
    def get_reopen_workorders_for_provider(provider_id):
        logging.info(f"get_reopen_workorders_for_provider: '{provider_id}'")
        try:
            sql = text("""
                SELECT a.*,b.*,j.*,c.region_name,d.category_name,e.item_name,f.type_name,
                g.description_name,h.state_name,i.city_name
                FROM workorder_assignment_t a
                JOIN workorder_t b ON a."WORKORDER_ID" = b.workorder
                JOIN workorder_life_cycle_t j ON j.id = (SELECT MAX(wl.id) FROM workorder_life_cycle_t wl
                WHERE wl.workorder = b.workorder AND wl.status = 'REOPEN')
                JOIN region_master_t c ON c.region_id = b.region
                JOIN category_master_t d ON d.category_id = b.category
                JOIN item_master_t e ON b.item = e.item_id
                JOIN type_master_t f ON b.type = f.type_id
                JOIN description_master_t g ON b.description = g.description_id
                JOIN state_master_t h ON b.state = h.state_id
                JOIN city_master_t i ON b.city = i.city_id
                WHERE a.provider_id = :provider_id AND b.status = 'REOPEN';
            """)
            result = db.session.execute(
                sql, {"provider_id": provider_id}
            ).mappings().all()
    
            rows = []
            for row in result:
                r = dict(row)
                for key in ["created_t","updated_t","workorder_close_time","assigned_at","expiry_time",
                    "requested_time_close"
                ]:
                    if key in r:
                        r[key] = to_ist_safe(r.get(key))
    
                rows.append(r)
   
            return rows
    
        except Exception as e:
            logging.error(
                f"Error fetching closed workorders: {e}",
                exc_info=True
            )
            return []
        
        
        
        

    @staticmethod
    def get_close_workorder_emails(workorder_id):
    
        try:
            logging.info("✅ Fetching emails for workorder close certificate...")
            logging.info(f"Workorder ID received: {workorder_id}")
    
            # ✅ STEP 1: Get created_by (Admin ID)
            sql_created_by = text("""
                SELECT created_by
                FROM workorder_t
                WHERE workorder = :workorder_id
            """)
    
            result_created = db.session.execute(
                sql_created_by,
                {"workorder_id": workorder_id}
            ).fetchone()
    
            if not result_created:
                return None, "Workorder not found"
    
            admin_id = result_created.created_by
            logging.info(f"✅ Admin ID (created_by): {admin_id}")
    
            # ✅ STEP 2: Get provider_id
            sql_provider = text("""
                SELECT provider_id
                FROM workorder_assignment_t
                WHERE "WORKORDER_ID" = :workorder_id
            """)
    
            result_provider = db.session.execute(
                sql_provider,
                {"workorder_id": workorder_id}
            ).fetchone()
    
            if not result_provider:
                return None, "Provider not assigned for this workorder"
    
            provider_uid = result_provider.provider_id
            logging.info(f"✅ Provider UID: {provider_uid}")
    
            # ✅ STEP 3: Provider Email (Must)
            sql_provider_email = text("""
                SELECT email_id
                FROM users_t
                WHERE user_uid = :uid
            """)
    
            provider_result = db.session.execute(
                sql_provider_email,
                {"uid": provider_uid}
            ).fetchone()
    
            if not provider_result:
                return None, "Provider email not found"
    
            provider_email = provider_result.email_id
            logging.info(f"✅ Provider Email: {provider_email}")
    
            # ✅ STEP 4: Admin Email (Optional)
            admin_email = None
    
            # Only fetch admin email if admin_id is valid
            if admin_id and str(admin_id).lower() != "undefined":
    
                sql_admin_email = text("""
                    SELECT email
                    FROM admins_t
                    WHERE admin_id = :admin_id
                """)
    
                admin_result = db.session.execute(
                    sql_admin_email,
                    {"admin_id": admin_id}
                ).fetchone()
    
                if admin_result:
                    admin_email = admin_result.email
                    logging.info(f"✅ Admin Email: {admin_email}")
                else:
                    logging.warning("⚠️ Admin email not found, skipping")
    
            else:
                logging.warning("⚠️ Admin ID is undefined, skipping admin email")
    
            # ✅ FINAL EMAIL LIST
            emails = [provider_email]
    
            if admin_email:
                emails.append(admin_email)
    
            logging.info(f"✅ Emails to send certificate: {emails}")
    
            return emails, None
    
        except Exception as e:
            logging.exception("❌ Error while fetching close workorder emails")
            return None, str(e)
       
        
    @staticmethod
    def send_workorder_closure_certificate(workorder_no, emails, admin_remarks):
        """
        ✅ Generates closure certificate PDF
        ✅ Saves into uploads/closing_certificates/
        ✅ Stores certificate path in DB (workorder_t.closing_certificate)
        ✅ Sends certificate to provider + admin emails
        """

        try:
            logging.info("✅ Starting Workorder Closure Certificate Process...")
            
            
            # 1️⃣ Fetch workorder details
            sql_fetch = text("""
                SELECT
                    workorder, client, address,
                    ticket_assignment_type,
                    created_by, remarks,
                    status, created_t, requested_time_close
                FROM workorder_t
                WHERE workorder = :workorder
            """)
            
            result = db.session.execute(
                sql_fetch,
                {"workorder": workorder_no}
            ).fetchone()
            
            if not result:
                return False, "Workorder not found"
            
            # 2️⃣ Build certificate data
            details = {
                "Client": result.client,
                "Address": result.address,
                # "Assignment Type": result.ticket_assignment_type.upper(),
                "Created By": result.created_by,
                # "Remarks": result.remarks,
                "Status": "Closed Successfully",
                "Created On": result.created_t.strftime("%d-%m-%Y %H:%M"),
                "Admin Closure Remarks": admin_remarks
            }
            
            logging.info(f"✅ Certificate PDF Generated: {details}")
            
            # 3️⃣ Generate PDF
            pdf_path = generate_workorder_completion_certificate(
                details,
                workorder_no
            )
            

            logging.info(f"✅ Certificate PDF Generated: {pdf_path}")

            # ---------------------------------------------------
            # ✅ STEP 3: Store Certificate Path in DB
            # Store only frontend-accessible path
            # ---------------------------------------------------
            db_certificate_path = (
                f"/uploads/closing_certificates/"
                f"workorder_{workorder_no}_certificate.pdf"
            )

            sql_update = text("""
                UPDATE workorder_t
                SET closing_certificate = :cert_path
                WHERE workorder = :workorder
            """)

            db.session.execute(sql_update, {
                "cert_path": db_certificate_path,
                "workorder": workorder_no
            })

            db.session.commit()

            logging.info("✅ Certificate Path Stored in DB Successfully")

            # ---------------------------------------------------
            # ✅ STEP 4: Send Certificate Email to All Recipients
            # ---------------------------------------------------
            for mail in emails:
                send_workorder_closure_email(
                    mail,
                    workorder_no,
                    admin_remarks,
                    pdf_path
                )

                logging.info(f"✅ Closure Certificate Sent To: {mail}")

            # ---------------------------------------------------
            # ✅ FINAL SUCCESS
            # ---------------------------------------------------
            return True, None

        except Exception as e:
            db.session.rollback()
            logging.exception("❌ Error in Workorder Closure Certificate Process")

            return False, str(e)
        
        
    @staticmethod
    def get_overrated_notifications():
        try:
            sql = text("""
                SELECT id,workorder,notification_type,message,created_at
                FROM admin_notifications_t WHERE notification_type = 'WORKORDER_BUDGET_TOO_LOW'
                ORDER BY created_at DESC
            """)

            rows = db.session.execute(sql).mappings().all()
            return [dict(row) for row in rows]

        except Exception as e:
                logging.error("get_overrated_notifications error", exc_info=True)
                return []
            
            
    @staticmethod
    def get_admin_overrated_workorder_details(workorder_id):
        try:
            sql = text("""
                SELECT a.workorder,a.creation_time_image,b.region_name,c.category_name,a.remarks,
                a.requested_time_close,d.item_name,e.type_name,f.description_name,g.state_name,
                h.city_name,a.client,i.price_rm AS standard_rate
                FROM workorder_t a JOIN region_master_t b ON a.region = b.region_id
                JOIN category_master_t c ON a.category = c.category_id
                JOIN item_master_t d ON a.item = d.item_id
                JOIN type_master_t e ON a.type = e.type_id
                JOIN description_master_t f ON a.description = f.description_id
                JOIN state_master_t g ON a.state = g.state_id 
                JOIN city_master_t h ON a.city = h.city_id
                LEFT JOIN standard_rates_t i ON LOWER(TRIM(c.category_name)) = LOWER(TRIM(i.category))
                AND LOWER(TRIM(d.item_name)) = LOWER(TRIM(i.item)) 
                AND LOWER(TRIM(e.type_name)) = LOWER(TRIM(i.type))
                AND LOWER(TRIM(f.description_name)) = LOWER(TRIM(i.description))
                AND LOWER(TRIM(a.client)) = LOWER(TRIM(i.client))
                WHERE a.workorder = :workorder_id
            """)

            result = db.session.execute(
                sql, {"workorder_id": workorder_id}
            ).mappings().first()

            if not result:
                return None

            row = dict(result)

            if row.get("requested_time_close"):
                row["requested_time_close"] = format_datetime(row["requested_time_close"])

            return row

        except Exception as e:
            logging.error(
                f"Error fetching admin overrated workorder details: {e}",
                exc_info=True
            )
            raise


    @staticmethod
    def get_category_usage(category_id):
        try:
            sql = text("""
                SELECT COUNT(1) AS count FROM WORKORDER_T WHERE CATEGORY = :category_id
            """)

            result = db.session.execute(
                sql, {"category_id": category_id}
            ).mappings().first()

            return result["count"] > 0

        except Exception as e:
            logging.error("get_category_usage error", exc_info=True)
            return False
        
    @staticmethod
    def get_item_usage(category_id, item_id):
        try:
            sql = text("""
                SELECT COUNT(1) AS count FROM WORKORDER_T WHERE CATEGORY = :category_id 
                AND item = :item_id
            """)

            result = db.session.execute(
                sql,
                {
                    "category_id": category_id,
                    "item_id": item_id
                }
            ).mappings().first()

            return result["count"] > 0

        except Exception as e:
            logging.error("get_item_usage error", exc_info=True)
            return False

    @staticmethod
    def get_type_usage(category_id, item_id, type_id):
        try:
            sql = text("""
                SELECT COUNT(1) AS count FROM WORKORDER_T WHERE CATEGORY = :category_id 
                AND item = :item_id AND type = :type_id
            """)

            result = db.session.execute(
                sql,
                {
                    "category_id": category_id,
                    "item_id": item_id,
                    "type_id": type_id
                }
            ).mappings().first()

            return result["count"] > 0

        except Exception as e:
            logging.error("get_type_usage error", exc_info=True)
            return False

    
    @staticmethod
    def get_description_usage(category_id, item_id, type_id, description_id):
        try:
            sql = text("""
                SELECT COUNT(1) AS count FROM WORKORDER_T WHERE CATEGORY = :category_id 
                AND item = :item_id AND type = :type_id AND description = :description_id
            """)

            result = db.session.execute(
                sql,
                {
                    "category_id": category_id,
                    "item_id": item_id,
                    "type_id": type_id,
                    "description_id": description_id
                }
            ).mappings().first()

            return result["count"] > 0

        except Exception as e:
            logging.error("get_description_usage error", exc_info=True)
            return False
    
    
    
    @staticmethod
    def create_admin(req_data):
        try:
            # Validate required fields
            full_name = req_data.get("fullName")
            email = req_data.get("email")
            password = req_data.get("password")
            mobile = req_data.get("mobile")
            modules = req_data.get("modules", [])

            if not full_name or not email or not password or not mobile:
                return {
                    "success": False,
                    "message": "All required fields must be provided"
                }

            # Check if email already exists
            check_sql = text("""
                SELECT admin_id FROM admins_t WHERE LOWER(email) = LOWER(:email)
            """)

            existing_admin = db.session.execute(
                check_sql,
                {"email": email}
            ).mappings().first()

            if existing_admin:
                return {
                    "success": False,
                    "message": "Email already exists"
                }

            # 🔥 USE BCRYPT INSTEAD OF generate_password_hash
            hashed_password = bcrypt.generate_password_hash(
                password
            ).decode("utf-8")

            # Prepare insert data
            insert_data = {
                "name": full_name,
                "email": email,
                "password_hash": hashed_password,
                "mobile": mobile,
                "modules": ",".join(modules) if isinstance(modules, list) else str(modules)
            }

            # Insert admin
            insert_sql = text("""
                INSERT INTO admins_t (name,email,password_hash,mobile,modules)
                VALUES (:name,:email,:password_hash,:mobile,:modules)
                RETURNING admin_id
            """)

            result = db.session.execute(
                insert_sql,
                insert_data
            ).fetchone()

            db.session.commit()

            if not result:
                return {
                    "success": False,
                    "message": "Admin creation failed"
                }

            return {
                "success": True,
                "admin_id": result[0],
                "message": "Admin created successfully"
            }

        except Exception as e:
            db.session.rollback()
            logging.error("create_admin error", exc_info=True)

            return {
                "success": False,
                "message": str(e)
            }
        


    @staticmethod
    def get_admin_by_email(email):
        try:
            sql = text("""
                SELECT admin_id,name,email,mobile,modules
                FROM admins_t WHERE LOWER(email) = LOWER(:email)
            """)

            admin = db.session.execute(
                sql,
                {"email": email}
            ).mappings().first()

            if not admin:
                return {
                    "success": False,
                    "message": "User not found"
                }

            modules_list = (
                [module.strip() for module in admin["modules"].split(",")]
                if admin["modules"]
                else []
            )

            return {
                "success": True,
                "data": {
                    "admin_id": admin["admin_id"],
                    "fullName": admin["name"],
                    "email": admin["email"],
                    "mobile": admin["mobile"],
                    "modules": modules_list
                }
            }

        except Exception as e:
            logging.error("get_admin_by_email error", exc_info=True)

            return {
                "success": False,
                "message": str(e)
            }


    # =========================================================
    # MODEL
    # UPDATE USER
    # =========================================================

    @staticmethod
    def update_admin(req_data):
        try:
            email = req_data.get("email")

            if not email:
                return {
                    "success": False,
                    "message": "Email is required"
                }

            full_name = req_data.get("fullName")
            mobile = req_data.get("mobile")
            modules = req_data.get("modules", [])

            sql = text("""
                UPDATE admins_t SET name = :name,mobile = :mobile,modules = :modules
                WHERE LOWER(email) = LOWER(:email)
            """)

            db.session.execute(sql, {
                "name": full_name,
                "mobile": mobile,
                "modules": ",".join(modules),
                "email": email
            })

            db.session.commit()

            return {
                "success": True,
                "message": "User updated successfully"
            }

        except Exception as e:
            db.session.rollback()
            logging.error("update_admin error", exc_info=True)

            return {
                "success": False,
                "message": str(e)
            }
    @classmethod
    def withdraw_workorder(cls, workorder, reason):

        try:

            sql = text("""
                UPDATE workorder_t SET status = 'WITHDRAW',withdraw_reason = :reason,
                withdrawn_at = CURRENT_TIMESTAMP, ticket_assignment_type = 'manual'
                WHERE workorder = :workorder
                RETURNING *;
            """)

            row = db.session.execute(
                sql,
                {
                    "workorder": workorder,
                    "reason": reason
                }
            ).mappings().fetchone()

            if not row:
                db.session.rollback()
                return False, "Workorder not found"

            result = db.session.execute(
                text("""
                    UPDATE workorder_assignment_t SET assignment_status = 'WITHDRAW'
                    WHERE "WORKORDER_ID" = :workorder AND UPPER(assignment_status)
                      IN ('PENDING','ACCEPTED')
                """),
                {
                    "workorder": workorder
                }
            )

            logging.info(f"Assignment rows updated to WITHDRAW: "
                f"{result.rowcount}"
            )

            db.session.commit()

            logging.info(f"Workorder {workorder} withdrawn successfully "
                f"and moved to MANUAL assignment"
            )

            return True, None

        except Exception as e:

            db.session.rollback()

            logging.exception("Withdraw Workorder Error")

            raise
        


    @classmethod
    def get_admin_email_by_workorder(cls, workorder):
        try:
            sql = text("""
                SELECT a.email
                FROM workorder_t w
                JOIN admins_t a
                    ON a.admin_id = CAST(w.created_by AS BIGINT)
                WHERE w.workorder = :workorder
                LIMIT 1;
            """)

            row = db.session.execute(
                sql,
                {"workorder": workorder}
            ).fetchone()

            if not row:
                return None, None, "Admin email not found for this workorder"
    
            return row[0], row[1], None
    
        except Exception as e:
            logging.exception("Error while fetching admin email by workorder")
            return None, None, str(e)    
            
        
    @classmethod
    def get_contractor_details_for_reopen(cls, workorder):
        try:
            sql = text("""
                SELECT u.email_id
                FROM workorder_assignment_t wa
                JOIN users_t u
                    ON u.user_uid = wa.provider_id
                WHERE wa."WORKORDER_ID" = :workorder
                ORDER BY wa.assigned_at DESC
                LIMIT 1;
            """)
    
            row = db.session.execute(sql,{"workorder": workorder}).fetchone()

            if not row:
                return None, None, (
                    "Contractor not found"
                )
    
            return row[0], row[1], None
    
        except Exception as e:
            logging.exception(
                "Error fetching contractor details"
            )
            return None, None, str(e)
        
        
        
        
    @classmethod
    def create_contractor_rating(
        cls,
        workorder,
        rating,
        feedback,
        rated_by_admin_id
    ):
        try:
            logging.info(
                "Create contractor rating start: workorder=%s, rating=%s, feedback=%r, rated_by_admin_id=%s",
                workorder,
                rating,
                feedback,
                rated_by_admin_id,
            )
    
            workorder_row = db.session.execute(
                text("""
                    SELECT
                        created_by,
                        closed_by
                    FROM workorder_t
                    WHERE workorder = :workorder
                    LIMIT 1
                """),
                {
                    "workorder": workorder
                }
            ).mappings().first()
    
            logging.info(
                "Workorder lookup result for contractor rating: %r",
                dict(workorder_row) if workorder_row else None,
            )
    
            if not workorder_row:
                return None, "Workorder not found"
    
            workorder_created_by = workorder_row["created_by"]
            contractor_id = workorder_row["closed_by"]
    
            if not contractor_id:
                return None, "Contractor not found on workorder"
    
            existing_rating = db.session.execute(
                text("""
                    SELECT id
                    FROM contractor_ratings
                    WHERE workorder = :workorder
                    LIMIT 1
                """),
                {
                    "workorder": workorder
                }
            ).fetchone()
    
            if existing_rating:
                return None, (
                    "Contractor rating already exists "
                    "for this workorder"
                )
    
            db.session.execute(
                text("""
                    INSERT INTO contractor_ratings
                    (
                        workorder,
                        contractor_id,
                        workorder_created_by,
                        rated_by_admin_id,
                        rating,
                        feedback,
                        created_at
                    )
                    VALUES
                    (
                        :workorder,
                        :contractor_id,
                        :workorder_created_by,
                        :rated_by_admin_id,
                        :rating,
                        :feedback,
                        :created_at
                    )
                """),
                {
                    "workorder": workorder,
                    "contractor_id": contractor_id,
                    "workorder_created_by": workorder_created_by,
                    "rated_by_admin_id": rated_by_admin_id,
                    "rating": rating,
                    "feedback": feedback,
                    "created_at": now_ist()
                }
            )
    
            contractor_row = db.session.execute(
                text("""
                    SELECT
                        average_rating,
                        total_ratings,
                        completed_workorders_count
                    FROM users_t
                    WHERE user_uid = :contractor_id
                    LIMIT 1
                """),
                {
                    "contractor_id": contractor_id
                }
            ).mappings().first()
    
            if not contractor_row:
                db.session.rollback()
                return None, "Contractor not found"
    
            current_average = float(
                contractor_row["average_rating"] or 0
            )
    
            total_ratings = int(
                contractor_row["total_ratings"] or 0
            )
    
            completed_workorders_count = int(
                contractor_row["completed_workorders_count"] or 0
            )
    
            new_total_ratings = total_ratings + 1
    
            new_average_rating = round(
                (
                    (current_average * total_ratings)
                    + float(rating)
                ) / new_total_ratings,
                2
            )
    
            db.session.execute(
                text("""
                    UPDATE users_t
                    SET
                        average_rating = :average_rating,
                        total_ratings = :total_ratings,
                        completed_workorders_count =
                            :completed_workorders_count
                    WHERE user_uid = :contractor_id
                """),
                {
                    "average_rating": new_average_rating,
                    "total_ratings": new_total_ratings,
                    "completed_workorders_count":
                        completed_workorders_count + 1,
                    "contractor_id": contractor_id
                }
            )
    
            db.session.commit()
    
            return {
                "workorder": workorder,
                "contractor_id": contractor_id,
                "workorder_created_by": workorder_created_by,
                "rated_by_admin_id": rated_by_admin_id,
                "rating": rating,
                "average_rating": new_average_rating,
                "total_ratings": new_total_ratings,
                "completed_workorders_count":
                    completed_workorders_count + 1
            }, None
    
        except Exception as e:
            db.session.rollback()
    
            logging.exception(
                "Create Contractor Rating Error"
            )
    
            return None, str(e)
        
        
    @staticmethod
    def get_contractor_rating_summary(user_uid):
    
        sql = text("""
            SELECT
                COALESCE(u.average_rating, 0) AS average_rating,
        
                COALESCE((
                    SELECT SUM(rating)
                    FROM contractor_ratings cr
                    WHERE cr.contractor_id = u.user_uid
                ), 0) AS total_ratings,
        
                COALESCE(u.completed_workorders_count, 0)
                    AS completed_workorders_count
        
            FROM users_t u
            WHERE u.user_uid = :user_uid
        """)
    
        row = db.session.execute(
            sql,
            {"user_uid": user_uid}
        ).mappings().first()
    
        if not row:
            return {
                "average_rating": 0,
                "total_ratings": 0,
                "completed_workorders_count": 0,
                "badge": "Bronze"
            }
    
        avg = float(row["average_rating"] or 0)
    
        badge = "Bronze"
    
        if avg >= 4.5:
            badge = "Gold"
        elif avg >= 3.5:
            badge = "Silver"
    
        return {
            "average_rating": round(avg, 2),
            "total_ratings": row["total_ratings"],
            "completed_workorders_count":
                row["completed_workorders_count"],
            "badge": badge
        }
        
        
    @staticmethod
    def get_contractor_ratings(user_uid):
    
        sql = text("""
            SELECT
                workorder,
                rating,
                feedback,
                created_at
            FROM contractor_ratings
            WHERE contractor_id = :user_uid
            ORDER BY created_at DESC
        """)
    
        rows = db.session.execute(
            sql,
            {"user_uid": user_uid}
        ).mappings().all()
    
        return [
            {
                "workorder": r["workorder"],
                "rating": float(r["rating"]),
                "feedback": r["feedback"],
                "created_at":
                    r["created_at"].strftime(
                        "%d-%m-%Y %H:%M"
                    ) if r["created_at"] else None
            }
            for r in rows
        ]
        
        
    @staticmethod
    def get_low_ratings(user_uid):
    
        sql = text("""
            SELECT
                workorder,
                rating,
                feedback,
                created_at
            FROM contractor_ratings
            WHERE contractor_id = :user_uid
              AND rating < 4
            ORDER BY rating ASC
        """)
    
        rows = db.session.execute(
            sql,
            {"user_uid": user_uid}
        ).mappings().all()
    
        return [dict(r) for r in rows]
    
    

    @classmethod
    def save_assignment_audit(
        cls,
        workorder,
        assignment_reason,
        suggested_contractors,
        selected_contractor
    ):
        try:
            print("=" * 100)
            print("Inside save_assignment_audit model")
    
            print(f"Workorder: {workorder}")
            print(f"Assignment Reason: {assignment_reason}")
    
            selected_contractor_id = selected_contractor.get(
                "contractor_id"
            )
    
            print(
                f"Selected Contractor ID: "
                f"{selected_contractor_id}"
            )
    
            print(
                f"Suggested Contractors Count: "
                f"{len(suggested_contractors)}"
            )
    
            sql = text("""
                INSERT INTO contractor_assignment_audit_t
                (
                    workorder,
                    selected_contractor_id,
                    assignment_reason,
                    suggested_contractors,
                    selected_contractor
                )
                VALUES
                (
                    :workorder,
                    :selected_contractor_id,
                    :assignment_reason,
                    CAST(:suggested_contractors AS JSONB),
                    CAST(:selected_contractor AS JSONB)
                )
                RETURNING audit_id
            """)
    
            result = db.session.execute(
                sql,
                {
                    "workorder": workorder,
                    "selected_contractor_id": selected_contractor_id,
                    "assignment_reason": assignment_reason,
                    "suggested_contractors": json.dumps(
                        suggested_contractors
                    ),
                    "selected_contractor": json.dumps(
                        selected_contractor
                    ),
                }
            )
    
            audit_id = result.scalar()
    
            db.session.commit()
    
            print(
                f"Assignment audit saved successfully."
            )
            print(f"Generated Audit ID: {audit_id}")
            print("=" * 100)
    
            return {
                "audit_id": audit_id
            }, None
    
        except Exception as e:
            db.session.rollback()
    
            print("=" * 100)
            print(
                "Exception occurred in "
                "save_assignment_audit"
            )
            print(str(e))
            print("=" * 100)
    
            return None, str(e)
        
        
    @classmethod
    def get_assignment_audit(cls):
        try:
    
            print("=" * 100)
            print("Inside get_assignment_audit model")
    
            sql = text("""
                SELECT
                    audit_id,
                    workorder,
                    selected_contractor_id,
                    assignment_reason,
                    suggested_contractors,
                    selected_contractor,
                    created_at
                FROM contractor_assignment_audit_t
                ORDER BY created_at DESC
            """)
    
            print("Executing assignment audit query...")
    
            rows = db.session.execute(
                sql
            ).mappings().all()
    
            print(
                f"Fetched {len(rows)} "
                f"audit records"
            )
    
            result = []
    
            for row in rows:
    
                audit = dict(row)
    
                print(
                    f"Processing Workorder: "
                    f"{audit.get('workorder')}"
                )
    
                # JSONB safety handling
                if audit.get(
                    "suggested_contractors"
                ) is None:
                    audit[
                        "suggested_contractors"
                    ] = []
    
                if audit.get(
                    "selected_contractor"
                ) is None:
                    audit[
                        "selected_contractor"
                    ] = {}
    
                result.append(audit)
    
            print(
                "Successfully processed "
                "audit records"
            )
    
            print("=" * 100)
    
            return result, None
    
        except Exception as e:
    
            print("=" * 100)
            print(
                "Exception in "
                "get_assignment_audit model"
            )
            print(str(e))
            print("=" * 100)
    
            return None, str(e)
        #workorder_bp.route("/admin/notifications/overrated", methods=["GET"]) donee