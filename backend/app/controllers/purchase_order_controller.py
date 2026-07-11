from datetime import datetime
from sqlalchemy import text
import logging

from app.models.database import db
from app.models.purchase_order_model import PurchaseOrder
from app.services.mail_service import MailService


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

        MailService.send_email(

            to_email=contractor_email,

            subject=subject,

            body=body,

            body_type="plain"

        )

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