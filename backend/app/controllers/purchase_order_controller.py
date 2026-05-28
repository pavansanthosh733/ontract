from datetime import datetime
from sqlalchemy import text
import logging
import os
import smtplib

from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

from app.models.database import db
from app.models.purchase_order_model import PurchaseOrder


# =====================================================
# GENERATE PO NUMBER
# =====================================================

def generate_po_number():

    timestamp = datetime.now().strftime("%Y%m%d%H%M%S")

    return f"PO{timestamp}"


# =====================================================
# SEND SIMPLE EMAIL
# =====================================================

def send_po_mail(

    contractor_email,

    contractor_name,

    po_number,

    workorder_id

):

    try:

        smtp_host = os.getenv("SMTP_HOST")

        smtp_port = int(

            os.getenv("SMTP_PORT", 587)

        )

        smtp_user = os.getenv("SMTP_USER")

        smtp_password = os.getenv("SMTP_PASSWORD")

        from_email = os.getenv("FROM_EMAIL")

        logging.info(
            f"SMTP HOST: {smtp_host}"
        )

        logging.info(
            f"SENDING MAIL TO: {contractor_email}"
        )

        subject = f"Purchase Order Generated - {po_number}"

        body = f"""

Dear {contractor_name},

Your workorder has been accepted successfully.

Purchase Order Number:
{po_number}

Workorder ID:
{workorder_id}

Regards,
Ontract Services

        """

        msg = MIMEMultipart()

        msg["From"] = from_email

        msg["To"] = contractor_email

        msg["Subject"] = subject

        msg.attach(

            MIMEText(body, "plain")

        )

        server = smtplib.SMTP(

            smtp_host,

            smtp_port

        )

        server.starttls()

        server.login(

            smtp_user,

            smtp_password

        )

        server.sendmail(

            from_email,

            contractor_email,

            msg.as_string()

        )

        server.quit()

        logging.info(
            "PO EMAIL SENT SUCCESSFULLY"
        )

        return True

    except Exception as e:

        logging.exception(
            "PO EMAIL ERROR"
        )

        return False


# =====================================================
# CREATE PURCHASE ORDER
# =====================================================

def create_purchase_order(

    workorder_id,

    contractor_id,

    contractor_name

):

    try:

        # -------------------------------------------------
        # GET CONTRACTOR EMAIL
        # -------------------------------------------------

        contractor_sql = text("""

            SELECT email_id

            FROM users_t

            WHERE user_uid = :contractor_id

        """)

        contractor = db.session.execute(

            contractor_sql,

            {"contractor_id": contractor_id}

        ).mappings().fetchone()

        if not contractor:

            return None, "Contractor not found"

        contractor_email = contractor["email_id"]

        logging.info(
            f"CONTRACTOR EMAIL: {contractor_email}"
        )

        # -------------------------------------------------
        # GENERATE PO NUMBER
        # -------------------------------------------------

        po_number = generate_po_number()

        logging.info(
            f"PO NUMBER: {po_number}"
        )

        # -------------------------------------------------
        # SAVE PURCHASE ORDER
        # -------------------------------------------------

        po = PurchaseOrder(

            po_number=po_number,

            workorder_id=workorder_id,

            contractor_id=contractor_id,

            contractor_name=contractor_name,

            contractor_email=contractor_email,

            status="GENERATED"

        )

        db.session.add(po)

        db.session.commit()

        logging.info(
            "PO SAVED SUCCESSFULLY"
        )

        # -------------------------------------------------
        # SEND MAIL
        # -------------------------------------------------

        send_po_mail(

            contractor_email,

            contractor_name,

            po_number,

            workorder_id

        )

        # -------------------------------------------------
        # SUCCESS
        # -------------------------------------------------

        return {

            "success": True,

            "po_number": po_number

        }, None

    except Exception as e:

        db.session.rollback()

        logging.exception(
            "CREATE PURCHASE ORDER ERROR"
        )

        return None, str(e)