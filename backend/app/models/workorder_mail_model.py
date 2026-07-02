import os, json, base64, traceback, smtplib, logging
from datetime import datetime, timedelta
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.mime.image import MIMEImage
from sqlalchemy import text
from flask import render_template, current_app
from app.models.database import db
from types import SimpleNamespace
#from app.models.workorder import WorkOrder

# ✅ Gmail credentials from .env
EMAIL_USER = os.getenv("SMTP_USER")
EMAIL_PASS = os.getenv("SMTP_PASSWORD")
SMTP_HOST = os.getenv("SMTP_HOST")
SMTP_PORT = int(os.getenv("SMTP_PORT", 587))
SMTP_USE_TLS = os.getenv(
    "SMTP_USE_TLS",
    "true"
).lower() == "true"

from app.utils.datetime_utils import now_local


def now_ist():
    """Return current app-local time based on .env."""
    return now_local()

# -----------------------------------------------------------------------
# 🧩 Image Helpers
# ----------------------------------------------------------------------
def detect_image_type(img_bytes):
    if not img_bytes:
        return "jpeg"
    if img_bytes[:2] == b'\xff\xd8': return 'jpeg'
    elif img_bytes[:8] == b'\x89PNG\r\n\x1a\n': return 'png'
    elif img_bytes[:6] in (b'GIF87a', b'GIF89a'): return 'gif'
    elif img_bytes[:4] == b'RIFF' and img_bytes[8:12] == b'WEBP': return 'webp'
    return 'jpeg'


def decode_image(img_entry):
    img_bytes = None
    try:
        if isinstance(img_entry, str) and img_entry.startswith("data:image"):
            header, b64_data = img_entry.split(",", 1)
            img_bytes = base64.b64decode(b64_data)
        elif isinstance(img_entry, str) and len(img_entry) > 100:
            img_bytes = base64.b64decode(img_entry)
        elif os.path.exists(img_entry):
            with open(img_entry, "rb") as f:
                img_bytes = f.read()
    except Exception as e:
        logging.error(f"Error decoding image: {e}")
    return img_bytes, "image.jpg"


def parse_image_field(image_field):
    if not image_field:
        return []
    try:
        if isinstance(image_field, str):
            return json.loads(image_field) if image_field.startswith("[") else [image_field]
        elif isinstance(image_field, list):
            return image_field
        elif isinstance(image_field, dict):
            return list(image_field.values())
    except Exception as e:
        logging.error(f"Failed to parse: {e}")
        return []
    return []


def attach_workorder_images(msg, msg_related, workorder):
    logging.info(f"checktheimage: '{workorder}'")
    images = parse_image_field(getattr(workorder, "creation_time_image", None))
    attached_count, total_size = 0, 0
    for idx, entry in enumerate(images, start=1):
        try:
            img_bytes, _ = decode_image(entry)
            if not img_bytes:
                continue
            img_type = detect_image_type(img_bytes)
            cid = f"img{idx}@workorder"
            inline = MIMEImage(img_bytes, _subtype=img_type)
            inline.add_header('Content-ID', f'<{cid}>')
            msg_related.attach(inline)
            attached_count += 1
            total_size += len(img_bytes)
        except Exception as e:
            logging.error(f"Failed to attach image #{idx}: {e}")
    logging.info(f"Attached {attached_count} image(s), total size: {total_size/1024:.2f} KB")
    return attached_count, total_size


# ----------------------------------------------------------------------
# 🧩 DB Operations
# ----------------------------------------------------------------------
def get_workorder_from_db(workorder_id):
    from app.models.workorder import WorkOrder
    logging.info(f"checkworkorder_id: '{workorder_id}'")
    try:
        workorder = WorkOrder.query.get(workorder_id)
        if workorder:
            logging.info(f"Workorder {workorder_id} fetched successfully.")
        else:
            logging.warning(f"Workorder {workorder_id} not found.")
        return workorder
    except Exception as e:
        logging.error(f"Error fetching workorder {workorder_id}: {e}")
        return None




def get_contractor_from_db(provider_id):

    try:

        result = db.session.execute(
            text("""
                SELECT
                    provider_id,
                    full_name,
                    email_id
                FROM providers_t
                WHERE provider_id = :pid
            """),
            {
                "pid": provider_id
            }
        ).mappings().fetchone()

        return (
            SimpleNamespace(**result)
            if result else None
        )

    except Exception as e:

        logging.error(
            f"Failed to fetch contractor: {e}"
        )

        return None


def get_expiry_minutes_from_db(region_id):
    try:
        sql = text("""
            SELECT a.expiry_minutes 
            FROM link_expiry_t a
            JOIN region_master_t b 
                ON a.region = b.region_name
            WHERE b.region_id = :region_id
        """)

        row = db.session.execute(sql, {"region_id": region_id}).fetchone()

        minutes = row[0] if row else 15
        logging.info(f"Expiry minutes for region '{region_id}': {minutes}")
        return minutes

    except Exception as e:
        logging.error(f"Error fetching expiry time for region '{region_id}': {e}")
        return 15


def get_expiry_minutes_from_region(region):
    try:
        sql = text("""
            SELECT expiry_minutes FROM link_expiry_t WHERE region = :region
        """)

        row = db.session.execute(sql, {"region": region}).fetchone()

        minutes = row[0] if row else 15
        logging.info(f"Expiry minutes for region '{region}': {minutes}")
        return minutes

    except Exception as e:
        logging.error(f"Error fetching expiry time for region '{region}': {e}")
        return 15

def insert_email_notification_log(workorder_number, sender_name, email_id, status):
    try:
        db.session.execute(
            text("""
                INSERT INTO email_notification_t ("WORKORDER","SENDER_NAME","EMAIL_ID","STATUS","DATE")
                VALUES (:wo,:sn,:em,:st,:dt)
            """),
            {"wo": workorder_number, "sn": sender_name, "em": email_id,
             "st": status, "dt": datetime.utcnow()}
        )
        db.session.commit()
        logging.info(f"Email log inserted for {email_id} ({status})")
    except Exception as e:
        db.session.rollback()
        logging.error(f"Failed to insert email log: {e}")


def insert_workorder_lifecycle_log(workorder, status, contractor_id, contractor_name, remark):
    try:
        db.session.execute(text("""
            INSERT INTO workorder_life_cycle_t (workorder, created_t,requested_time_close,
                remarks, status, contractor_name, contractor_id, contractor_remarks)
            VALUES (:wo,:dt,:requested_time_close,:r,:st,:cn,:cid,:crm)
        """), {
            "wo": workorder.workorder,
            "requested_time_close": workorder.requested_time_close,
            "dt": now_ist(),
            "r": workorder.remarks,
            "st": status,
            "cn": contractor_name,
            "cid": contractor_id,
            "crm": remark
        })
        db.session.commit()
    except Exception as e:
        db.session.rollback()
        logging.error(f"Failed to insert lifecycle log: {e}")


def update_workorder_status_in_db(workorder, status):
    logging.info(f"Updating -> workorder: {workorder}, status: {status}")
    try:
        sql = text("""
            UPDATE workorder_t SET status = :status WHERE workorder = :wid
        """)
        db.session.execute(sql, {"status": status, "wid": workorder})
        db.session.commit()
    except Exception as e:
        db.session.rollback()
        logging.error(f"Failed DB update: {e}", exc_info=True)


# ----------------------------------------------------------------------
# 🧩 Email Builders (Using Templates)
# ----------------------------------------------------------------------
def build_assignment_email_html(wr, p, response_url, expiry_minutes):
    return render_template(
        "assignment_email.html",
        wr=wr,           # <-- you pass "wr" as "workorder"
        p=p,
        response_url=response_url,
        expiry_minutes=expiry_minutes
    )

def build_assignment_email_html_manual(request_data, response_url, expiry_minutes):
    return render_template(
        "manual_assignment_time.html",
        request_data=request_data,           
        response_url=response_url,
        expiry_minutes=expiry_minutes
    )

def build_assignment_email_html_manual_max(request_data, response_url, expiry_minutes,total_contractors):
    return render_template(
        "manual_assignment_time_max.html",
        request_data=request_data,           
        response_url=response_url,
        expiry_minutes=expiry_minutes,
        total_contractors=total_contractors
    )
def build_admin_escalation_notification_html(wr,region_name,category_name):
    return render_template("admin_escalation.html",
                wr=wr,
                region_name=region_name,
                category_name=category_name)

def build_admin_notification_html(workorder, contractor_name, contractor_id, action, remark):
    status_text = "ACCEPTED" if action == "accept" else "REJECTED"
    status_color = "#28a745" if action == "accept" else "#dc3545"
    html = render_template("admin_notification.html",
                           workorder=workorder,
                           contractor_name=contractor_name,
                           contractor_id=contractor_id,
                           action=action,
                           remark=remark,
                           status_text=status_text,
                           status_color=status_color,
                           response_date=datetime.now().strftime("%Y-%m-%d %H:%M:%S"))
    return html, status_text


# ----------------------------------------------------------------------
# 🧩 Email Sending
# ----------------------------------------------------------------------
def send_email_with_attachments(workorder, recipient, name, html_body):


    msg = MIMEMultipart("mixed")
    msg["Subject"] = f"Work Order Assigned – {workorder.workorder}"
    msg["From"] = EMAIL_USER
    msg["To"] = recipient

    related = MIMEMultipart("related")
    alt = MIMEMultipart("alternative")
    alt.attach(MIMEText(html_body, "html"))
    related.attach(alt)

    attach_workorder_images(msg, related, workorder)
    msg.attach(related)

    try:
        logging.info(f"Connecting to Gmail SMTP as {EMAIL_USER} ...")
        server = smtplib.SMTP(SMTP_HOST, SMTP_PORT)

        if SMTP_USE_TLS:
         server.starttls()

        server.login(EMAIL_USER, EMAIL_PASS)

        server.send_message(msg)

        server.quit()
        logging.info(f"Email successfully sent to {recipient}")
        return "SENT", 0, 0
    except Exception as e:
        logging.error(f"Failed to send email to {recipient}: {e}")
        traceback.print_exc()
        return f"FAILED: {e}", 0, 0


def send_email_with_attachments_auto(wr, recipient, name, html_body):

    msg = MIMEMultipart("mixed")
    msg["Subject"] = f"Work Order Assigned – {wr.workorder}"
    msg["From"] = EMAIL_USER
    msg["To"] = recipient

    related = MIMEMultipart("related")
    alt = MIMEMultipart("alternative")
    alt.attach(MIMEText(html_body, "html"))
    related.attach(alt)

    attach_workorder_images(msg, related, wr)
    msg.attach(related)

    try:
        logging.info(f"Connecting to Gmail SMTP as {EMAIL_USER} ...")
        server = smtplib.SMTP(SMTP_HOST, SMTP_PORT)

        if SMTP_USE_TLS:
            server.starttls()

        server.login(EMAIL_USER, EMAIL_PASS)

        server.send_message(msg)

        server.quit()
        logging.info(f"Email successfully sent to {recipient}")
        return "SENT", 0, 0
    except Exception as e:
        logging.error(f"Failed to send email to {recipient}: {e}")
        traceback.print_exc()
        return f"FAILED: {e}", 0, 0

def send_email_with_attachments_manual(request_data, recipient, name, html_body):


    msg = MIMEMultipart("mixed")
    msg["Subject"] = f"Work Order Assigned – {request_data['workorder']}"
    msg["From"] = EMAIL_USER
    msg["To"] = recipient

    related = MIMEMultipart("related")
    alt = MIMEMultipart("alternative")
    alt.attach(MIMEText(html_body, "html"))
    related.attach(alt)

    wo = get_workorder_details(request_data['workorder'])

    if wo:
        attach_workorder_images(msg, related, wo)
    msg.attach(related)
    

    try:
        logging.info(f"Connecting to Gmail SMTP as {EMAIL_USER} ...")
        server = smtplib.SMTP(SMTP_HOST, SMTP_PORT)

        if SMTP_USE_TLS:
            server.starttls()

        server.login(EMAIL_USER, EMAIL_PASS)

        server.send_message(msg)

        server.quit()
        logging.info(f"Email successfully sent to {recipient}")
        return "SENT", 0, 0
    except Exception as e:
        logging.error(f"Failed to send email to {recipient}: {e}")
        traceback.print_exc()
        return f"FAILED: {e}", 0, 0

def get_workorder_from_db_auto(workorder_id):
    try:
        query = text("""
            SELECT * FROM workorder_t 
            WHERE "WORKORDER" = :wid;
        """)
        result = db.session.execute(query, {"wid": workorder_id}).fetchone()

        if result:
            data = dict(result._mapping)
            logging.info(f"Workorder {workorder_id} fetched successfully via raw SQL with {len(data)} columns.")

            # ✅ Dynamic Row Object class for dot-access
            class RowObj:
                def __init__(self, **entries):
                    for k, v in entries.items():
                        # Convert any psycopg2 RowProxy types (like Decimal, etc.) if needed
                        setattr(self, k, v)
                def __getitem__(self, key):
                    """Allow dictionary-style access"""
                    return getattr(self, key)
                def __repr__(self):
                    """Readable object representation"""
                    return f"<WorkOrder ID={getattr(self, 'ID', None)}, NO={getattr(self, 'WORKORDER', None)}>"

            return RowObj(**data)

        else:
            logging.warning(f"Workorder {workorder_id} not found in DB.")
            return None

    except Exception as e:
        logging.error(f"Error fetching workorder {workorder_id}: {e}", exc_info=True)
        return None

def get_admin_email(admin_id):
    logging.info(f"Fetching admin email for ADMIN_ID = {admin_id}")
    try:
        query = text("""SELECT email FROM admins_t WHERE admin_id = :aid;""")
        result = db.session.execute(query, {"aid": admin_id}).fetchone()

        if not result:
            logging.warning(f"Admin {admin_id} not found.")
            return None

        email = result.email
        logging.info(f"Admin email found: {email}")

        return email   # ← only return the email string

    except Exception as e:
        logging.error(f"Error fetching admin email for ADMIN_ID {admin_id}: {e}", exc_info=True)
        return None


def build_creation_email_html(workorder, provider, response_url, expiry_minutes):
    logging.info(f"Building assignment email for {provider} ({workorder})")
    return render_template("creation_notification.html",
                           workorder=workorder,
                           provider=provider,
                           response_url=response_url,
                           expiry_minutes=expiry_minutes)


def send_email_with_attachments_creation(workorder, recipient, name, html_body):
    logging.info(f"Preparing email to {recipient} ({workorder['workorder']})")


    msg = MIMEMultipart("mixed")
    msg["Subject"] = f"Work Order Assigned – {workorder['workorder']}"
    msg["From"] = EMAIL_USER
    msg["To"] = recipient

    related = MIMEMultipart("related")
    alt = MIMEMultipart("alternative")
    alt.attach(MIMEText(html_body, "html"))
    related.attach(alt)

    attach_workorder_images(msg, related, workorder)
    msg.attach(related)

    try:
        logging.info(f"Connecting to Gmail SMTP as {EMAIL_USER} ...")
        server = smtplib.SMTP(SMTP_HOST, SMTP_PORT)

        if SMTP_USE_TLS:
            server.starttls()

        server.login(EMAIL_USER, EMAIL_PASS)

        server.send_message(msg)

        server.quit()   
        logging.info(f"Email successfully sent to {recipient}")
        return "SENT", 0, 0
    except Exception as e:
        logging.error(f"Failed to send email to {recipient}: {e}")
        traceback.print_exc()
        return f"FAILED: {e}", 0, 0
    
    
def get_workorder_details(workorder):
    try:
        query = text("""
            SELECT w.*,c.category_name,i.item_name,t.type_name,d.description_name,r.region_name,
            s.state_name,ct.city_name FROM workorder_t w
            LEFT JOIN category_master_t c ON w.category = c.category_id
            LEFT JOIN item_master_t i ON w.item = i.item_id
            LEFT JOIN type_master_t t ON w.type = t.type_id
            LEFT JOIN description_master_t d ON w.description = d.description_id
            LEFT JOIN region_master_t r ON w.region = r.region_id
            LEFT JOIN state_master_t s ON w.state = s.state_id
            LEFT JOIN city_master_t ct ON w.city = ct.city_id
            WHERE w.workorder = :workorder
        """)

        result = db.session.execute(
            query,
            {"workorder": workorder}
        ).mappings().fetchone()

        return SimpleNamespace(**result) if result else None

    except Exception as e:
        logging.error(f"Error fetching workorder details: {str(e)}")
        return None
    

def get_workorder_from_db_id(workorder):
    try:
        query = text("""
            SELECT w.*,c.category_name,i.item_name,t.type_name,d.description_name,r.region_name,
            s.state_name,ct.city_name FROM workorder_t w
            LEFT JOIN category_master_t c ON w.category = c.category_id
            LEFT JOIN item_master_t i ON w.item = i.item_id
            LEFT JOIN type_master_t t ON w.type = t.type_id
            LEFT JOIN description_master_t d ON w.description = d.description_id
            LEFT JOIN region_master_t r ON w.region = r.region_id
            LEFT JOIN state_master_t s ON w.state = s.state_id
            LEFT JOIN city_master_t ct ON w.city = ct.city_id
            WHERE w.id = :workorder
        """)

        result = db.session.execute(
            query,
            {"workorder": workorder}
        ).mappings().fetchone()

        return SimpleNamespace(**result) if result else None

    except Exception as e:
        logging.error(f"Error fetching workorder details: {str(e)}")
        return None
    
    
def insert_workorder_assignment(workorder, provider_id, expiry_times):
    try:
        assigned_at = now_ist()
        logging.info(f"check_inputof_current_time: '{assigned_at}'")

        expiry_time = assigned_at + timedelta(minutes=expiry_times)

        # ---------------------------------------------------
        # ✅ STEP 1: EXPIRE OLD PENDING ASSIGNMENTS
        # ---------------------------------------------------
        expire_sql = text("""
            UPDATE workorder_assignment_t
            SET assignment_status = 'EXPIRED'
            WHERE "WORKORDER_ID" = :wid
            AND assignment_status = 'PENDING'
        """)

        expired_result = db.session.execute(expire_sql, {
            "wid": workorder
        })

        logging.info(
            f"Previous pending assignments expired: {expired_result.rowcount}"
        )

        # ---------------------------------------------------
        # ✅ STEP 2: INSERT NEW ASSIGNMENT
        # ---------------------------------------------------
        assign_sql = text("""
            INSERT INTO workorder_assignment_t
            ("WORKORDER_ID", provider_id, assigned_at, assignment_status, expiry_time)
            VALUES (:wid, :pid, :assigned_at, 'PENDING', :expiry)
        """)

        db.session.execute(assign_sql, {
            "wid": workorder,
            "pid": provider_id,
            "assigned_at": assigned_at,
            "expiry": expiry_time
        })

        # ---------------------------------------------------
        # ✅ STEP 3: COMMIT
        # ---------------------------------------------------
        db.session.commit()

        logging.info(
            f"Workorder assigned successfully | "
            f"WO={workorder}, "
            f"Provider={provider_id}, "
            f"Expiry={expiry_time}"
        )

    except Exception:
        db.session.rollback()
        logging.error(
            "Error inserting workorder assignment",
            exc_info=True
        )
        raise
    
    
          
    
def update_workorder_status_assignment(workorder, contractor_id, status):
    logging.info(
        f"Updating -> workorder: {workorder}, "
        f"status: {status}, "
        f"contractor_id: {contractor_id}"
    )

    try:
        # ---------------------------------------------------
        # ✅ ONLY UPDATE CURRENT PENDING ASSIGNMENT
        # EXPIRED records should never be accepted
        # ---------------------------------------------------
        sql = text("""
            UPDATE workorder_assignment_t
            SET assignment_status = :status
            WHERE "WORKORDER_ID" = :wid
            AND provider_id = :contractor_id
            AND assignment_status = 'PENDING'
        """)

        result = db.session.execute(sql, {
            "status": status,
            "wid": workorder,
            "contractor_id": contractor_id
        })

        db.session.commit()

        # ---------------------------------------------------
        # ✅ LOG RESULT
        # ---------------------------------------------------
        if result.rowcount == 0:
            logging.warning(
                f"No active pending assignment found for "
                f"WO={workorder}, Contractor={contractor_id}"
            )
        else:
            logging.info(
                f"Workorder accepted successfully | "
                f"WO={workorder}, Contractor={contractor_id}"
            )

    except Exception as e:
        db.session.rollback()
        logging.error(
            f"Failed DB update: {e}",
            exc_info=True
        )
        

def is_workorder_already_responded(workorder_id, contractor_id):
    try:
        sql = text("""
            SELECT assignment_status FROM workorder_assignment_t
            WHERE "WORKORDER_ID" = :wid AND provider_id = :pid
            AND assignment_status IN ('Accepted', 'Rejected')
            LIMIT 1
        """)

        result = db.session.execute(
            sql,
            {
                "wid": str(workorder_id),     # ✅ CAST TO STRING
                "pid": str(contractor_id)     # ✅ KEEP CONSISTENT
            }
        ).fetchone()

        return result is not None

    except Exception as e:
        logging.error(
            f"Error checking assignment status for "
            f"workorder={workorder_id}, contractor={contractor_id}: {e}",
            exc_info=True
        )
        return False
    

def get_accepted_contractor(workorder):

    try:

        query = text("""
            SELECT u.user_uid,u.name,u.email_id FROM workorder_assignment_t w
            JOIN users_t u ON u.user_uid = w.provider_id
            WHERE w."WORKORDER_ID" = :workorder
            LIMIT 1
        """)

        result = db.session.execute(
            query,
            {"workorder": workorder}
        ).mappings().fetchone()

        logging.info(
            f"Contractor Query Result: {result}"
        )

        return dict(result) if result else None

    except Exception as e:

        logging.exception(
            f"Failed to fetch contractor: {e}"
        )

        return None
    
def build_withdraw_notification_html_admin(workorder, reason, withdrawn_by):
    return render_template(
        "withdraw_notification_admin.html",
        workorder=workorder,
        reason=reason,
        withdrawn_by=withdrawn_by
    )
 
def build_withdraw_notification_html_contractor(workorder, reason):
    return render_template(
        "withdraw_notification_contractor.html",
        workorder=workorder,
        reason=reason
    )
    
    
    
def build_rfq_email_html(rfq):

    return render_template(
        "rfq_notification.html",
        rfq=rfq
    )

def send_rfq_email(recipient,html_body,rfq_no):

    msg = MIMEMultipart("mixed")

    msg["Subject"] = (f"New RFQ Published - {rfq_no}")
    msg["From"] = EMAIL_USER
    msg["To"] = recipient
    related = MIMEMultipart("related")
    alt = MIMEMultipart("alternative")

    alt.attach(MIMEText(html_body, "html"))
    related.attach(alt)
    msg.attach(related)

    try:

        server = smtplib.SMTP(SMTP_HOST,SMTP_PORT)

        if SMTP_USE_TLS:
            server.starttls()

        server.login(EMAIL_USER,EMAIL_PASS)
        server.send_message(msg)
        server.quit()
        logging.info(f"RFQ Mail Sent: {recipient}")
        return "SENT"

    except Exception as e:

        logging.error(f"RFQ Mail Failed: {str(e)}")
        return "FAILED"

def get_all_rfq_contractors():

    try:

        query = text("""
            SELECT user_uid,name,email_id FROM users_t
            WHERE email_id IS NOT NULL
        """)

        result = db.session.execute(query).mappings().fetchall()

        return [dict(row) for row in result]

    except Exception as e:

        logging.error(
            f"Error fetching contractors: {str(e)}"
        )

        return []


