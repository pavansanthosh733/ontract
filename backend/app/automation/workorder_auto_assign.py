import os
import logging
from datetime import datetime, timedelta, timezone
from dotenv import load_dotenv
from apscheduler.schedulers.background import BackgroundScheduler
from sqlalchemy import text
from app.models.database import db
from app.controllers.workorder_mail_controller import (
    handle_send_acceptance_mail_auto,
    handle_send_admin_no_acceptance_mail
)

# -------------------------------
# IST TIMEZONE CONFIG
# -------------------------------
IST = timezone(timedelta(hours=5, minutes=30))

def now_ist():
    return datetime.now(IST)

scheduler = None


# ============================================================
#                 AUTO ASSIGNMENT MAIN FUNCTION
# ============================================================
def reassign_expired_workorders(app):

    load_dotenv()

    try:
        logging.info(f"[AUTO] Auto-assignment started at {now_ist()}")

        with app.app_context():

            # ---------------------------------------------------
            # (1) MARK EXPIRED ASSIGNMENTS
            # ---------------------------------------------------
            mark_sql = text("""
                UPDATE workorder_assignment_t
                SET assignment_status = 'EXPIRED'
                WHERE assignment_status = 'PENDING'
                AND expiry_time < CURRENT_TIMESTAMP;
            """)

            res = db.session.execute(mark_sql)
            db.session.commit()
            logging.info(f"[AUTO] Marked {res.rowcount} expired assignments.")

            # ---------------------------------------------------
            # (2) FETCH WORKORDERS FOR AUTO ASSIGNMENT
            # ---------------------------------------------------
            wo_sql = text("""
                SELECT *
                FROM workorder_t
                WHERE ticket_assignment_type = 'auto'
                AND lower(status) in ('open','rejected')
            """)

            workorders = db.session.execute(wo_sql).mappings().all()
            logging.info(f"[AUTO] {len(workorders)} workorders found.")

            if not workorders:
                return

            # ---------------------------------------------------
            # (3) PROCESS EACH WORKORDER
            # ---------------------------------------------------
            for wr in workorders:

                workorder_code = wr["workorder"]
                
                region_id = wr["region"]
                category_id = wr["category"]
                wo_created_at = wr.get("created_t")
                
                logging.info(f"[AUTO] Processing WO {workorder_code}")

                # ---------------------------------------------------
                # (4) CHECK LATEST ASSIGNMENT STATUS
                # ---------------------------------------------------
                last_sql = text("""
                    SELECT provider_id, assignment_status
                    FROM workorder_assignment_t
                    WHERE "WORKORDER_ID" = :wid
                    ORDER BY assigned_at DESC
                    LIMIT 1;
                """)

                latest = db.session.execute(
                    last_sql, {"wid": workorder_code}
                ).fetchone()

                status = latest.assignment_status if latest else None
                logging.info(f"[AUTO] Last Status = {status}")

                if status == "PENDING":
                    continue  # still waiting

                # ---------------------------------------------------
                # (5) FETCH CONTRACTORS FOR REGION + CATEGORY
                # ---------------------------------------------------
                provider_sql = text("""
                    SELECT 
                        a.user_uid AS provider_id,
                        a.name AS full_name,
                        a.email_id,
                        b.service_rate,
                        c.region_name,
                        d.category_name
                    FROM users_t a
                    JOIN services_t b ON a.user_uid = b.user_uid
                    JOIN region_master_t c ON b.region = c.region_name
                    JOIN category_master_t d ON d.category_name = b.category_name
                    WHERE d.category_id = :cat
                    AND c.region_id = :reg
                
                    -- ✅ FAIR ASSIGNMENT LOCK
                    AND COALESCE(a.updated_at, a.created_at) <= :wo_created_at
                
                    ORDER BY b.service_rate ASC;
                """)

                providers = db.session.execute(
                    provider_sql,
                    {
                        "cat": category_id,
                        "reg": region_id,
                        "wo_created_at": wo_created_at
                    }
                ).mappings().all()

                if not providers:
                    logging.warning(
                        f"[AUTO] No contractors found for cat={category_id}, region={region_id}"
                    )
                    continue

                # ---------------------------------------------------
                # (6) FETCH EXPIRY MINUTES FOR REGION
                # ---------------------------------------------------
                expiry_sql = text("""
                    SELECT a.expiry_minutes
                    FROM link_expiry_t a
                    JOIN region_master_t b ON a.region = b.region_name
                    WHERE b.region_id = :rid
                """)

                rr = db.session.execute(expiry_sql, {"rid": region_id}).fetchone()
                expiry_minutes = rr.expiry_minutes if rr else 15

                logging.info(f"[AUTO] Expiry = {expiry_minutes} minutes")

                # ---------------------------------------------------
                # (7) ASSIGN FIRST AVAILABLE CONTRACTOR
                # ---------------------------------------------------
                assigned_to_someone = False

                for p in providers:

                    provider_id = int(p.provider_id)

                    check_sql = text("""
                        SELECT 1
                        FROM workorder_assignment_t
                        WHERE "WORKORDER_ID" = :wid
                        AND provider_id = :pid
                        LIMIT 1
                    """)

                    exists = db.session.execute(
                        check_sql,
                        {"wid": workorder_code, "pid": provider_id}
                    ).fetchone()

                    if exists:
                        continue

                    # ✅ INSERT NEW ASSIGNMENT
                    assign_sql = text("""
                        INSERT INTO workorder_assignment_t
                        ("WORKORDER_ID", provider_id, assigned_at,
                         assignment_status, expiry_time)
                        VALUES (:wid, :pid, :at, 'PENDING', :exp)
                    """)

                    expiry_time = now_ist() + timedelta(minutes=expiry_minutes)

                    db.session.execute(assign_sql, {
                        "wid": workorder_code,
                        "pid": provider_id,
                        "at": now_ist(),
                        "exp": expiry_time
                    })
                    db.session.commit()

                    assigned_to_someone = True
                    logging.info(
                        f"[AUTO] Assigned {p.full_name} -> WO {workorder_code}"
                    )

                    # ✅ SEND EMAIL AFTER ASSIGNMENT
                    try:
                        base_url = os.getenv(
                            "PUBLIC_BASE_URL", "http://localhost:5000"
                        )

                        handle_send_acceptance_mail_auto(
                            wr,
                            p,
                            expiry_minutes,
                            base_url
                        )

                        logging.info(f"[AUTO] Email sent to {p.email_id}")

                    except Exception as e:
                        logging.exception(f"[AUTO] Email failed: {e}")

                    break

                # ---------------------------------------------------
                # (8) ESCALATION LOGIC → WHEN NO PROVIDERS ACCEPT
                # ---------------------------------------------------
                if not assigned_to_someone:

                    final_status_sql = text("""
                        SELECT assignment_status
                        FROM workorder_assignment_t
                        WHERE "WORKORDER_ID" = :wid
                        ORDER BY assigned_at DESC
                        LIMIT 1;
                    """)

                    last_record = db.session.execute(
                        final_status_sql, {"wid": workorder_code}
                    ).fetchone()

                    last_status = last_record.assignment_status if last_record else None

                    escalation_check_sql = text("""
                        SELECT 1
                        FROM workorder_escalation_admin_t
                        WHERE workorder_id = :wid
                        LIMIT 1;
                    """)

                    escalation_exists = db.session.execute(
                        escalation_check_sql, {"wid": workorder_code}
                    ).fetchone()

                    if escalation_exists:
                        logging.info(
                            f"[AUTO] Escalation already logged for WO {workorder_code}. Skipping."
                        )
                        continue

                    if last_status in ("REJECTED", "EXPIRED", None):

                        logging.warning(
                            f"[AUTO] WO {workorder_code} -> Escalating to admin."
                        )

                        try:
                            # ✅ Validate created_by
                            created_by = wr.get("created_by")

                            if not created_by or created_by == "undefined":
                                logging.error(
                                    f"[AUTO] Invalid created_by for WO {workorder_code}: {created_by}"
                                )
                                continue

                            try:
                                admin_id = int(created_by)
                            except:
                                logging.error(
                                    f"[AUTO] created_by must be numeric for WO {workorder_code}, got: {created_by}"
                                )
                                continue

                            # Fetch admin email
                            admin_sql = text("""
                                SELECT email
                                FROM admins_t
                                WHERE admin_id = :aid
                            """)

                            admin_row = db.session.execute(
                                admin_sql, {"aid": admin_id}
                            ).fetchone()

                            admin_email = admin_row.email if admin_row else None

                            if not admin_email:
                                logging.error(
                                    f"[AUTO] No admin email found for admin_id={admin_id}"
                                )
                                continue

                            # Send escalation email
                            handle_send_admin_no_acceptance_mail(
                                wr,
                                "Unknown",
                                "Unknown",
                                admin_email
                            )

                            logging.info(
                                f"[AUTO] Admin notified for WO {workorder_code}"
                            )

                            # Insert escalation record
                            insert_escalation_sql = text("""
                                INSERT INTO workorder_escalation_admin_t
                                (workorder_id, created_by, escalation_reason, email)
                                VALUES (:wid, :cb, :reason, :email)
                            """)

                            db.session.execute(insert_escalation_sql, {
                                "wid": workorder_code,
                                "cb": admin_id,
                                "reason": "No contractor accepted the workorder",
                                "email": admin_email
                            })
                            db.session.commit()

                        except Exception as e:
                            logging.exception(
                                f"[AUTO] Admin escalation email failed: {e}"
                            )

    except Exception as e:
        logging.error(f"[AUTO] Scheduler ERROR: {e}", exc_info=True)


# ============================================================
#                     START SCHEDULER
# ============================================================
def start_auto_scheduler(app):
    global scheduler

    if os.environ.get("WERKZEUG_RUN_MAIN") != "true":
        return

    if scheduler and scheduler.running:
        return

    try:
        scheduler = BackgroundScheduler()

        scheduler.add_job(
            reassign_expired_workorders,
            "interval",
            minutes=100,
            args=[app],
            next_run_time=now_ist() + timedelta(seconds=5),
            id="auto_assign_job",
            replace_existing=True,
        )

        scheduler.start()
        logging.info("[AUTO] Scheduler started.")

    except Exception as e:
        logging.error(f"[AUTO] Scheduler failed: {e}", exc_info=True)