import os, traceback, logging
from time import time
from urllib.parse import quote
from flask import render_template
from app.models.database import db
from app.controllers.purchase_order_controller import (
    create_purchase_order
)
from app.models.workorder_mail_model import (
    get_contractor_from_db,
    get_workorder_from_db_auto,
    get_workorder_from_db,
    get_admin_email,
    get_expiry_minutes_from_db,
    build_assignment_email_html,
    build_assignment_email_html_manual,
    send_email_with_attachments,
    send_email_with_attachments_auto,
    send_email_with_attachments_manual,
    insert_email_notification_log,
    update_workorder_status_in_db,
    update_workorder_status_assignment,
    insert_workorder_lifecycle_log,
    build_admin_notification_html,
    build_admin_escalation_notification_html,
    get_workorder_details,
    insert_workorder_assignment,
    get_expiry_minutes_from_region,
    build_assignment_email_html_manual_max,
    is_workorder_already_responded
)


# ----------------------------------------------------------------------
# ✅ Function 1: Handle sending acceptance mail
# ----------------------------------------------------------------------
def handle_send_acceptance_mail(workorder_code, request_data, base_url):
    logging.info(f"Starting manual email send... '{workorder_code}'")
    logging.info(f"checkthe requested data '{request_data}'")

    try:
        contractor_email=request_data['CONTRACTOR_EMAIL']
        contractor_name =request_data['CONTRACTOR_NAME']
        

        expiry_minutes = get_expiry_minutes_from_db(request_data["region"])

        ts = int(time())
        public_url = os.getenv("PUBLIC_BASE_URL", base_url)

        response_url = (
            f"{public_url}/api/workorders/respond-workorder/{request_data['id']}?"
            f"contractor_id={request_data['CONTRACTOR_ID']}&"
            f"contractor_name={quote(request_data['CONTRACTOR_NAME'])}&"
            f"timestamp={ts}"
        )
        html = build_assignment_email_html_manual(request_data, response_url, expiry_minutes)
        status, _, _ = send_email_with_attachments_manual(
            request_data,contractor_email,contractor_name, html
        ) 
        
        insert_workorder_assignment(workorder=request_data["workorder"],provider_id=request_data["CONTRACTOR_ID"],
            expiry_times=expiry_minutes
        )

        # =====================================================
        # 🔥 🔔 PUSH NOTIFICATION START
        # =====================================================
        logging.info("🔥 ENTERING NOTIFICATION BLOCK")
        print("🔥 STEP 2: BEFORE EMAIL")
        try:
            print("🔥 TEST NOTIFICATION BLOCK")
            from app.utils.notification_service import send_notification_to_tokens
            from app.models.provider_model import ProviderModel
            logging.info(f"🔍 Fetching tokens for contractor: {request_data['CONTRACTOR_ID']}")
            tokens, error = ProviderModel.get_active_token_user_id(
                request_data["CONTRACTOR_ID"]
            )
            print("🔥 TOKENS:", tokens)
            if tokens:
                send_notification_to_tokens(
                    tokens,
                    "New Workorder Assigned",
                    f"You have a new workorder: {request_data['workorder']}"
                )
                logging.info("✅ Push notification sent")
            else:
                logging.warning("⚠️ No tokens found for contractor")

        except Exception as notify_error:
            logging.error(f"❌ Push notification failed: {notify_error}", exc_info=True)

        # =====================================================
        # 🔥 PUSH NOTIFICATION END
        # =====================================================
                                                                                                              
        insert_email_notification_log(request_data["workorder"], contractor_name, contractor_email, status)
        return {"message": "Email Sent", "status": status}, 200

    except Exception as e:
        logging.error(f"Manual mail error: {e}", exc_info=True)
        return {"error": str(e)}, 500



def handle_send_acceptance_mail_maxamount(workorder_code, request_data, base_url):
    logging.info(f"Starting manual email send... '{workorder_code}'")
    logging.info(f"checkthe requested data '{request_data}'")
    try:
        contractors = request_data.get("contractors", [])
        if not contractors:
            return {"error": "No contractors provided"}, 400
        expiry_minutes = get_expiry_minutes_from_region(contractors[0]["region"])
        ts = int(time())
        public_url = os.getenv("PUBLIC_BASE_URL", base_url)
        results = []
        for contractor in contractors:
            contractor["workorder"] = workorder_code
            contractor_email = contractor["email_id"]
            contractor_name = contractor["name"]
            response_url = (
                f"{public_url}/api/workorders/respond-workorder/{contractor['id']}?"
                f"contractor_id={contractor['user_uid']}&"
                f"contractor_name={quote(contractor_name)}&"
                f"timestamp={ts}"
            )

            html = build_assignment_email_html_manual_max(contractor,response_url,expiry_minutes,
            total_contractors=len(contractors))
            status, _, _ = send_email_with_attachments_manual(contractor,contractor_email,contractor_name,
                html
            )

            insert_workorder_assignment(workorder=workorder_code,provider_id=contractor["user_uid"],
                expiry_times=expiry_minutes
            )

            insert_email_notification_log(workorder_code,contractor_name,contractor_email,status)
            results.append({"contractor": contractor_name,"email": contractor_email,"status": status})

        return {
            "message": "Emails processed",
            "results": results
        }, 200

    except Exception as e:
        logging.error(f"Manual mail error: {e}", exc_info=True)
        return {"error": str(e)}, 500


def handle_respond_workorder_get(workorder_id, contractor_id, contractor_name, timestamp):
    logging.info(f"gopi's code 96")
    logging.info(f"GET request for workorder {workorder_id} by {contractor_name}")

    wo = get_workorder_from_db(workorder_id)
    logging.info(f"checkthe outputworkorder-ravi: '{wo.workorder}'")
    if not wo:
        logging.warning(f"Workorder not found for ID {workorder_id}")
        return render_template("respond_result.html", title="Error", message="Workorder not found"), 404

    if not timestamp.isdigit():
        logging.warning("Invalid timestamp in URL")
        return render_template("respond_result.html", title="Error", message="Invalid link"), 400

    now, ts = int(time()), int(timestamp)
    expiry = get_expiry_minutes_from_db(wo.region)
    if now - ts > expiry * 60:
        logging.info(f"Link expired for workorder {workorder_id}")
        return render_template("respond_result.html", expired=True, expiry=expiry), 403
    
    logging.info(f"checkthe outputcontractor-ravi: '{contractor_id}'")
    if is_workorder_already_responded(wo.workorder, contractor_id):
        logging.info(f"checking outputworkorder-ravikumar: '{wo.workorder}'")
        logging.info(f"checkthe outputcontractor-ravi: '{contractor_id}'")
        return render_template(
            "respond_result.html",
            title="Invalid Link",
            message="You have already responded to this work order."
        ), 403


    logging.info(f"[RESPOND]  Link valid — showing response form for {contractor_name}")
    return render_template(
        "respond_form.html",
        workorder=wo,
        contractor_id=contractor_id,
        contractor_name=contractor_name,
        timestamp=timestamp
    ), 200


def handle_respond_workorder_post(workorder_id, contractor_id, contractor_name, timestamp, action, remark):
    logging.info(f"POST response for workorder {workorder_id} — Action: {action}, By: {contractor_name}")

    wo = get_workorder_from_db(workorder_id)
    workorder = wo.workorder
    logging.info(f"checktheinput:'{wo}'")
    admin_id = wo.created_by
    logging.info(f"checkthetotaloutput: '{wo.created_by}'")
    if not wo:
        logging.warning(f"Workorder not found for ID {workorder_id}")
        return render_template("respond_result.html", title="Error", message="Workorder not found"), 404

    now, ts = int(time()), int(timestamp)
    expiry = get_expiry_minutes_from_db(wo.region)
    if now - ts > expiry * 60:
        logging.warning(f"Link expired for workorder {workorder_id}")
        return render_template("respond_result.html", expired=True, expiry=expiry), 403

    # ✅ Update DB and log lifecycle
    status = "Accepted" if action == "accept" else "Rejected"
    update_workorder_status_in_db(workorder, status)
    update_workorder_status_assignment(workorder,contractor_id, status)
    logging.info(f"Workorder {workorder} updated → {status}")

    insert_workorder_lifecycle_log(wo, contractor_id, contractor_name, remark)
    logging.info(f"Lifecycle log added for {contractor_name} — Action: {action}")

    # ✅ Notify Admin via email
    html_admin, status_text = build_admin_notification_html(wo, contractor_name, contractor_id, action, remark)
    admin_email = get_admin_email(admin_id)
    logging.info(f"Sending admin notification email to '{admin_email}'")
    send_email_with_attachments(wo, admin_email, "Admin", html_admin)

    logging.info(f"[RESPOND] ✅ Response handled for {contractor_name} ({status})")
    return render_template("respond_result.html", workorder=wo, action=action, remark=remark), 200


def handle_send_acceptance_mail_auto(wr, p,expiry_minutes, base_url):
    logging.info(f"checking the mail flow '{p}'")
    try:
        
        ts = int(time())
        public_url = os.getenv("PUBLIC_BASE_URL", base_url)
        logging.info(f"public_url_base: '{public_url}'")
        response_url = (
            f"{public_url}/api/workorders/respond-workorder/{wr.id}"
            f"?contractor_id={p.provider_id}"
            f"&contractor_name={quote(p.full_name)}"
            f"&timestamp={ts}"
        )
        logging.info(f"Response link generated for contractor: '{response_url}'")

        html = build_assignment_email_html(wr, p, response_url, expiry_minutes)
        logging.info(f"Email HTML built successfully for '{p.full_name}'")
        logging.info(f"Sending email to '{p.email_id}'")
        status, _, _ = send_email_with_attachments_auto(wr, p.email_id, p.full_name, html)
        logging.info(f"Email send result for '{p.full_name}': '{status}'")
        insert_email_notification_log(wr.workorder, p.full_name, p.email_id, status)

        return {"message": "Email sent", "status": status}, 200

    except Exception as e:
        db.session.rollback()
        logging.error(f"Exception during send: {e}", exc_info=True)
        traceback.print_exc()
        return {"error": str(e)}, 500


def handle_send_admin_no_acceptance_mail(wr,region_name,category_name,admin_email):
    logging.info(f"checkingthe total output: '{wr}'")

    html_admin = build_admin_escalation_notification_html(wr,region_name,category_name)

    send_email_with_attachments(wr, admin_email, "Admin", html_admin)
    
def handle_respond_workorder_api(data):

    try:

        workorder = data.get("workorder_id")
        contractor_id = data.get("contractor_id")
        contractor_name = data.get("contractor_name")
        imestamp = data.get("timestamp")
        action = data.get("action")
        remark = data.get("contractor_remarks", "")

        if not all([workorder,contractor_id,contractor_name,action]):

            return {
                "success": False,

                "message": "Missing required fields"

            }, 400

        wo = get_workorder_details(workorder)

        logging.info(f"checkout of wo app: '{wo}'")

        if not wo:

            return {

                "success": False,

                "message": "Workorder not found"

            }, 404

        timestamp = data.get("timestamp")
        now, ts = int(time()), int(timestamp)

        expiry = get_expiry_minutes_from_db(wo.region)

        action = action.lower()

        status = (

            "ACCEPTED"

            if action == "accept"

            else "REJECTED"

        )

        # =====================================================
        # UPDATE DB
        # =====================================================

        update_workorder_status_in_db(

            workorder,

            status

        )

        update_workorder_status_assignment(

            workorder,

            contractor_id,

            status

        )

        insert_workorder_lifecycle_log(

            wo,

            contractor_id,

            contractor_name,

            remark

        )

        # =====================================================
        # CREATE PURCHASE ORDER
        # =====================================================

        po_number = None

        if action == "accept":

            po_result, po_error = create_purchase_order(

                workorder_id=workorder,

                contractor_id=contractor_id,

                contractor_name=contractor_name

            )

            if po_error:

                logging.error(

                    f"PO CREATION ERROR: {po_error}"

                )

                return {

                    "success": False,

                    "message": po_error

                }, 500

            po_number = po_result["po_number"]

            logging.info(

                f"PO GENERATED: {po_number}"

            )

        # =====================================================
        # EMAIL TO ADMIN
        # =====================================================

        admin_email = get_admin_email(

            wo.created_by

        )

        html_admin, _ = build_admin_notification_html(

            wo,

            contractor_name,

            contractor_id,

            action,

            remark

        )

        send_email_with_attachments(

            wo,

            admin_email,

            "Admin",

            html_admin

        )

        # =====================================================
        # PUSH NOTIFICATION
        # =====================================================

        try:

            logging.info(

                "🔥 ENTERING ADMIN NOTIFICATION BLOCK"

            )

            from app.utils.notification_service import (
                send_notification_to_tokens
            )

            from app.models.provider_model import (
                ProviderModel
            )

            admin_id = wo.created_by

            tokens, error = (

                ProviderModel.get_active_token_user_id(

                    admin_id

                )

            )

            if tokens:

                send_notification_to_tokens(

                    tokens,

                    "Workorder Update",

                    f"{contractor_name} has "
                    f"{status.lower()} "
                    f"workorder #{workorder}"

                )

                logging.info(

                    "✅ Admin push notification sent"

                )

            else:

                logging.warning(

                    "⚠️ No tokens found for admin"

                )

        except Exception as notify_err:

            logging.error(

                f"❌ Admin notification failed: "
                f"{str(notify_err)}"

            )

        # =====================================================
        # SUCCESS RESPONSE
        # =====================================================

        return {

            "success": True,

            "message": f"Workorder {status.lower()} successfully",

            "po_number": po_number

        }, 200

    except Exception as e:

        logging.exception(

            "Respond workorder API failed"

        )

        db.session.rollback()

        return {

            "success": False,

            "message": str(e)

        }, 500