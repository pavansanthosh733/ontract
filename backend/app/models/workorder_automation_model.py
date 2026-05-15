"""
Automation Model - Database operations for automation
File: app/models/workorder_automation_model.py
"""

import os
import time
import traceback
from datetime import datetime
from threading import Thread
from sqlalchemy import text

from app.models.database import db
from app.models.workorder import WorkOrder
from app.models.workorder_mail_model import (
    get_expiry_minutes_from_db,
    build_assignment_email_html,
    send_email_with_attachments,
    insert_email_notification_log,
    get_admin_email_by_id
)

# Configuration
MAX_RETRY_ATTEMPTS = 5
POLLING_INTERVAL = 30  # seconds


# ----------------------------------------------------------------------
# DATABASE OPERATIONS
# ----------------------------------------------------------------------
def get_contractors_by_area_sorted(area, client):
    """
    Get contractors for area sorted by rate (lowest first).
    Checks standard_rates_t for client-specific rates.
    """
    try:
        # Query with LEFT JOIN to get client-specific rates if available
        result = db.session.execute(text("""
            SELECT DISTINCT 
                p.provider_id, 
                p.full_name, 
                p.email_id,
                COALESCE(sr.price, p.rate) as final_rate,
                p.service_locations
            FROM providers_t p
            LEFT JOIN standard_rates_t sr 
                ON p.provider_id = sr.provider_id 
                AND sr.client = :client
                AND sr.state = :area
            WHERE p.service_locations LIKE :area_pattern
                AND p.email_id IS NOT NULL
                AND p.status = 'ACTIVE'
            ORDER BY final_rate ASC
        """), {
            "area": area,
            "client": client,
            "area_pattern": f"%{area}%"
        }).fetchall()
        
        contractors = []
        for r in result:
            contractors.append({
                "provider_id": r.provider_id,
                "full_name": r.full_name,
                "email_id": r.email_id,
                "rate": float(r.final_rate) if r.final_rate else 0,
                "service_locations": r.service_locations
            })
        
        print(f"[AUTO] Found {len(contractors)} contractors for area={area}, client={client}")
        return contractors
        
    except Exception as e:
        print(f"[ERROR] get_contractors_by_area_sorted: {e}")
        traceback.print_exc()
        return []


def create_assignment_attempt_log(workorder_id, contractor_id, contractor_name, attempt_number):
    """Log each assignment attempt."""
    try:
        db.session.execute(text("""
            INSERT INTO workorder_assignment_attempts_t 
            (workorder_id, contractor_id, contractor_name, attempt_number, status, created_at)
            VALUES (:wid, :cid, :cname, :attempt, 'PENDING', :now)
        """), {
            "wid": workorder_id,
            "cid": contractor_id,
            "cname": contractor_name,
            "attempt": attempt_number,
            "now": datetime.utcnow()
        })
        db.session.commit()
    except Exception as e:
        db.session.rollback()
        print(f"[WARN] create_assignment_attempt_log failed: {e}")


def update_assignment_attempt_status(workorder_id, contractor_id, status, remark=None):
    """Update assignment attempt status."""
    try:
        db.session.execute(text("""
            UPDATE workorder_assignment_attempts_t
            SET status = :status, 
                remark = :remark,
                updated_at = :now
            WHERE workorder_id = :wid 
                AND contractor_id = :cid
                AND status = 'PENDING'
        """), {
            "status": status,
            "remark": remark,
            "wid": workorder_id,
            "cid": contractor_id,
            "now": datetime.utcnow()
        })
        db.session.commit()
    except Exception as e:
        db.session.rollback()
        print(f"[WARN] update_assignment_attempt_status failed: {e}")


def get_current_assignment_status(workorder_id):
    """Check workorder status."""
    try:
        result = db.session.execute(text("""
            SELECT "STATUS" FROM workorder_t WHERE "ID" = :wid
        """), {"wid": workorder_id}).fetchone()
        
        return result.STATUS if result else None
    except Exception as e:
        print(f"[ERROR] get_current_assignment_status: {e}")
        return None


def get_assignment_attempts_from_db(workorder_id):
    """Get all assignment attempts for a workorder."""
    try:
        result = db.session.execute(text("""
            SELECT * FROM workorder_assignment_attempts_t
            WHERE workorder_id = :wid
            ORDER BY attempt_number ASC
        """), {"wid": workorder_id}).fetchall()
        
        return result
    except Exception as e:
        print(f"[ERROR] get_assignment_attempts_from_db: {e}")
        traceback.print_exc()
        return []


def mark_automation_stopped(workorder_id):
    """Mark all pending attempts as stopped."""
    try:
        db.session.execute(text("""
            UPDATE workorder_assignment_attempts_t
            SET status = 'STOPPED',
                remark = 'Admin stopped automation',
                updated_at = :now
            WHERE workorder_id = :wid
                AND status = 'PENDING'
        """), {
            "wid": workorder_id,
            "now": datetime.utcnow()
        })
        db.session.commit()
        return True
    except Exception as e:
        db.session.rollback()
        print(f"[ERROR] mark_automation_stopped: {e}")
        return False


# ----------------------------------------------------------------------
# EMAIL OPERATIONS
# ----------------------------------------------------------------------
def send_admin_no_acceptance_email(workorder, all_attempts):
    """Send email to admin when no contractor accepts."""
    try:
        creator_id = workorder.created_by
        if not creator_id:
            print("[WARN] No creator_id found")
            return
        
        creator_admin = get_admin_email_by_id(creator_id)
        if not creator_admin:
            print(f"[WARN] No admin found for creator_id: {creator_id}")
            return
        
        admin_email, admin_name = creator_admin
        
        # Build attempts table
        attempts_html = ""
        for idx, attempt in enumerate(all_attempts, 1):
            attempts_html += f"""
            <tr>
                <td style="padding:8px;border:1px solid #ddd;">{idx}</td>
                <td style="padding:8px;border:1px solid #ddd;">{attempt['contractor_name']}</td>
                <td style="padding:8px;border:1px solid #ddd;">{attempt['status']}</td>
                <td style="padding:8px;border:1px solid #ddd;">{attempt.get('remark', 'N/A')}</td>
            </tr>
            """
        
        html = f"""
        <html>
        <head><meta charset="UTF-8"></head>
        <body style="font-family:Arial,sans-serif;line-height:1.6;color:#333;max-width:800px;margin:0 auto;padding:20px;">
            <div style="background:#dc3545;padding:20px;border-radius:8px;margin-bottom:20px;">
                <h2 style="margin:0;color:white;">⚠️ Work Order Assignment Failed</h2>
            </div>

            <div style="background:#fff3cd;padding:15px;border-left:4px solid #dc3545;margin-bottom:20px;">
                <p style="margin:5px 0;font-size:16px;">
                    <strong>Work Order {workorder.WORKORDER}</strong> could not be assigned.
                    All available contractors either rejected or did not respond.
                </p>
            </div>

            <table border="1" cellspacing="0" cellpadding="12"
                   style="border-collapse:collapse;width:100%;margin-bottom:25px;">
                <tr style="background:#f8f9fa;">
                    <th align="left" style="width:40%;">Work Order</th>
                    <td><strong>{workorder.WORKORDER}</strong></td>
                </tr>
                <tr>
                    <th align="left" style="background:#f8f9fa;">Area</th>
                    <td>{workorder.WORKORDER_AREA}</td>
                </tr>
                <tr>
                    <th align="left" style="background:#f8f9fa;">Client</th>
                    <td>{workorder.client or 'N/A'}</td>
                </tr>
            </table>

            <h3 style="color:#dc3545;">Assignment Attempts:</h3>
            <table border="1" cellspacing="0" cellpadding="8" style="border-collapse:collapse;width:100%;">
                <thead>
                    <tr style="background:#f8f9fa;">
                        <th style="padding:8px;border:1px solid #ddd;">#</th>
                        <th style="padding:8px;border:1px solid #ddd;">Contractor</th>
                        <th style="padding:8px;border:1px solid #ddd;">Status</th>
                        <th style="padding:8px;border:1px solid #ddd;">Remark</th>
                    </tr>
                </thead>
                <tbody>{attempts_html}</tbody>
            </table>

            <div style="background:#f8f9fa;padding:15px;border-radius:5px;margin-top:20px;">
                <p style="margin:0;"><strong>Action Required:</strong> Please manually assign this work order.</p>
            </div>
        </body>
        </html>
        """
        
        import smtplib
        from email.mime.text import MIMEText
        from email.mime.multipart import MIMEMultipart
        
        EMAIL_USER = os.getenv("MAIL_USER")
        EMAIL_PASS = os.getenv("MAIL_PASS")
        
        msg = MIMEMultipart("alternative")
        msg["Subject"] = f"⚠️ Assignment Failed – {workorder.WORKORDER}"
        msg["From"] = EMAIL_USER
        msg["To"] = admin_email
        msg.attach(MIMEText(html, "html"))
        
        with smtplib.SMTP_SSL("smtp.gmail.com", 465) as server:
            server.login(EMAIL_USER, EMAIL_PASS)
            server.send_message(msg)
        
        print(f"[ADMIN] No-acceptance email sent to: {admin_email}")
        
    except Exception as e:
        print(f"[ERROR] send_admin_no_acceptance_email: {e}")
        traceback.print_exc()


# ----------------------------------------------------------------------
# CORE AUTOMATION LOGIC
# ----------------------------------------------------------------------
def assign_to_contractor(workorder_id, contractor, attempt_number, base_url):
    """
    Send assignment email to specific contractor.
    Returns: (success, message)
    """
    try:
        workorder = WorkOrder.query.get(workorder_id)
        if not workorder:
            return False, "Workorder not found"
        
        contractor_id = contractor['provider_id']
        contractor_name = contractor['full_name']
        contractor_email = contractor['email_id']
        
        print(f"\n{'='*60}")
        print(f"[AUTO] Attempt #{attempt_number}: {contractor_name}")
        print(f"{'='*60}")
        
        # Log attempt
        create_assignment_attempt_log(
            workorder_id, 
            contractor_id, 
            contractor_name, 
            attempt_number
        )
        
        # Generate response URL
        expiry_minutes = get_expiry_minutes_from_db(workorder.WORKORDER_AREA)
        ts = int(time.time())
        
        public_base_url = os.getenv("PUBLIC_BASE_URL", base_url)
        from urllib.parse import quote
        response_url = (
            f"{public_base_url}/api/workorders/respond-workorder/{workorder_id}"
            f"?contractor_id={contractor_id}&contractor_name={quote(contractor_name)}&timestamp={ts}"
        )
        
        # Build and send email
        html_body = build_assignment_email_html(
            workorder=workorder,
            contractor_name=contractor_name,
            response_url=response_url,
            expiry_minutes=expiry_minutes
        )
        
        status, attached_cnt, attached_sz = send_email_with_attachments(
            workorder=workorder,
            contractor_email=contractor_email,
            contractor_name=contractor_name,
            html_body=html_body
        )
        
        # Log notification
        insert_email_notification_log(
            workorder.WORKORDER,
            contractor_name,
            contractor_email,
            status
        )
        
        if "SENT" in status:
            return True, f"Email sent to {contractor_name}"
        else:
            return False, f"Failed: {status}"
        
    except Exception as e:
        print(f"[ERROR] assign_to_contractor: {e}")
        traceback.print_exc()
        return False, str(e)


def monitor_contractor_response(workorder_id, contractor_id, expiry_minutes):
    """
    Monitor contractor response for expiry_minutes.
    Returns: 'ACCEPTED', 'REJECTED', or 'EXPIRED'
    """
    start_time = time.time()
    timeout = expiry_minutes * 60
    
    print(f"[AUTO] Monitoring for {expiry_minutes} minutes...")
    
    while time.time() - start_time < timeout:
        try:
            status = get_current_assignment_status(workorder_id)
            
            if status == "Accepted":
                print(f"[AUTO] ✅ Contractor accepted!")
                update_assignment_attempt_status(workorder_id, contractor_id, "ACCEPTED")
                return "ACCEPTED"
            
            elif status == "Rejected":
                print(f"[AUTO] ❌ Contractor rejected!")
                update_assignment_attempt_status(workorder_id, contractor_id, "REJECTED")
                return "REJECTED"
            
            time.sleep(POLLING_INTERVAL)
            
        except Exception as e:
            print(f"[ERROR] monitor_contractor_response: {e}")
            time.sleep(POLLING_INTERVAL)
    
    # Timeout
    print(f"[AUTO] ⏰ Link expired")
    update_assignment_attempt_status(
        workorder_id, 
        contractor_id, 
        "EXPIRED",
        remark="No response within timeout"
    )
    return "EXPIRED"


def automated_assignment_process(workorder_id, base_url):
    """Main automation process - runs in background."""
    try:
        print(f"\n{'#'*60}")
        print(f"[AUTO] Starting for WO ID: {workorder_id}")
        print(f"{'#'*60}\n")
        
        workorder = WorkOrder.query.get(workorder_id)
        if not workorder:
            print("[ERROR] Workorder not found")
            return
        
        area = workorder.WORKORDER_AREA
        client = workorder.client or ""
        
        # Get contractors sorted by rate
        contractors = get_contractors_by_area_sorted(area, client)
        
        if not contractors:
            print(f"[ERROR] No contractors for area: {area}")
            send_admin_no_acceptance_email(workorder, [])
            return
        
        print(f"[AUTO] Found {len(contractors)} contractors")
        
        all_attempts = []
        
        # Try each contractor
        for idx, contractor in enumerate(contractors, 1):
            if idx > MAX_RETRY_ATTEMPTS:
                print(f"[AUTO] Max attempts reached ({MAX_RETRY_ATTEMPTS})")
                break
            
            # Send assignment
            success, message = assign_to_contractor(workorder_id, contractor, idx, base_url)
            
            if not success:
                print(f"[AUTO] Failed: {message}")
                all_attempts.append({
                    "contractor_name": contractor['full_name'],
                    "status": "EMAIL_FAILED",
                    "remark": message
                })
                continue
            
            # Monitor response
            expiry_minutes = get_expiry_minutes_from_db(area)
            response = monitor_contractor_response(workorder_id, contractor['provider_id'], expiry_minutes)
            
            all_attempts.append({
                "contractor_name": contractor['full_name'],
                "status": response,
                "remark": None
            })
            
            if response == "ACCEPTED":
                print(f"\n[AUTO] ✅ SUCCESS! {contractor['full_name']} accepted\n")
                return
            
            elif response == "REJECTED":
                print(f"[AUTO] Rejected, trying next...")
                continue
            
            elif response == "EXPIRED":
                print(f"[AUTO] Expired, trying next...")
                continue
        
        # No one accepted
        print(f"\n[AUTO] ❌ FAILED - No acceptance\n")
        send_admin_no_acceptance_email(workorder, all_attempts)
        
    except Exception as e:
        print(f"[FATAL] automated_assignment_process: {e}")
        traceback.print_exc()


def trigger_automation_background(workorder_id, base_url):
    """Trigger automation in background thread."""
    try:
        thread = Thread(
            target=automated_assignment_process,
            args=(workorder_id, base_url),
            daemon=True
        )
        thread.start()
        print(f"[AUTO] Background thread started for WO ID: {workorder_id}")
        return True
    except Exception as e:
        print(f"[ERROR] trigger_automation_background: {e}")
        return False