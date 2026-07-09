from flask import Blueprint, request, jsonify, current_app
from ..models.workorder import WorkOrder
from sqlalchemy import text
from app.models.database import db
from ..models.contractor import Contractor
from ..views.workorder_view import WorkOrderView
from datetime import datetime, timedelta
import base64
import json
import os
import logging
from app.utils.current_admin import get_admin
from werkzeug.utils import secure_filename
from app.models.provider_model import ProviderModel
from app.utils.notification_service import send_notification_to_tokens
from app.models.workorder_mail_model import (
    get_workorder_details,
    build_withdraw_notification_html_admin,      
    build_withdraw_notification_html_contractor,
    send_email_with_attachments,
    get_admin_email,
    get_contractor_from_db,
    insert_workorder_lifecycle_log,
    get_accepted_contractor
)

from app.utils.email_utils import send_workorder_completed_admin_review_email,send_workorder_reopened_contractor_email


from app.controllers.purchase_order_controller import (
    create_purchase_order
)

workorder_bp = Blueprint("workorder", __name__)
admin_workorder_bp = Blueprint("admin_workorder", __name__)
view = WorkOrderView()


UPLOAD_FOLDER = os.path.join(os.path.dirname(os.path.abspath(__file__)), "../../uploads")
ALLOWED_EXTENSIONS = {
    "jpg", "jpeg", "png", "gif",
    "mp4", "mov", "avi", "webm"
}

os.makedirs(UPLOAD_FOLDER, exist_ok=True)

def allowed_file(filename):
    if "." not in filename:
        return False
    ext = filename.rsplit(".", 1)[1].lower()
    return ext in ALLOWED_EXTENSIONS

IMAGE_EXTENSIONS = {"jpg", "jpeg", "png", "gif"}
VIDEO_EXTENSIONS = {"mp4", "mov", "avi", "webm"}

def get_file_category(filename):
    if "." not in filename:
        return None

    ext = filename.rsplit(".", 1)[1].lower()

    if ext in IMAGE_EXTENSIONS:
        return "image"
    if ext in VIDEO_EXTENSIONS:
        return "video"

    return None
@admin_workorder_bp.route("/", methods=["POST"])
def create_workorder():
    try:
        if not request.content_type.startswith("multipart/form-data"):
            return jsonify({"error": "Content-Type must be multipart/form-data"}), 400

        form = request.form
        files = request.files

        def get_int(name):
            val = form.get(name)
            return int(val) if val and val.isdigit() else None

        ignore_duplicate = form.get("ignore_duplicate") == "true"

        data = {
            "CATEGORY_ID": get_int("CATEGORY_ID"),
            "ITEM_ID": get_int("ITEM_ID"),
            "TYPE_ID": get_int("TYPE_ID"),
            "DESCRIPTION_ID": get_int("DESCRIPTION_ID"),
            "REGION_ID": get_int("REGION_ID"),
            "STATE_ID": get_int("STATE_ID"),
            "CITY_ID": get_int("CITY_ID"),
            "CLIENT": form.get("CLIENT", "").strip(),
            "STANDARD_RATE_ID": get_int("STANDARD_RATE_ID"),
            "RATE_SNAPSHOT": form.get("RATE_SNAPSHOT"),
            "ADDRESS": form.get("ADDRESS", "").strip(),
            "REQUESTED_TIME_CLOSING": form.get("REQUESTED_TIME_CLOSING", ""),
            "REMARKS": form.get("REMARKS", "").strip(),
            "DETAILED_DESCRIPTION": form.get("DETAILED_DESCRIPTION", "").strip(),
            "STATUS": form.get("STATUS", "OPEN"),
            "created_by": form.get("ADMIN_ID", ""),
            "ticket_assignment_type": form.get("ticket_assignment_type", "auto"),
        }

        # ✅ REQUIRED FIELD CHECK
        required = [
            "CATEGORY_ID", "ITEM_ID", "TYPE_ID", "DESCRIPTION_ID",
            "REGION_ID", "STATE_ID", "CITY_ID",
            "CLIENT", "ADDRESS", "REQUESTED_TIME_CLOSING"
        ]

        missing = [x for x in required if not data[x]]
        if missing:
            return jsonify({"error": f"Missing: {', '.join(missing)}"}), 400

        # ✅ DUPLICATE CHECK
        if not ignore_duplicate:
            existing_workorders = WorkOrder.check_duplicate_open_workorder(data)
            if existing_workorders:
                return jsonify({
                    "success": False,
                    "error_type": "DUPLICATE_WORKORDER",
                    "existing_workorders": existing_workorders,
                    "message": "Duplicate open workorder already exists"
                }), 200  # IMPORTANT

        # ====================================================
        # IMAGE / VIDEO UPLOAD (CREATION TIME)
        # ====================================================
        media_list = []

        for file in files.getlist("images[]"):
            if not file or not file.filename:
                continue

            if not allowed_file(file.filename):
                logging.warning(f"⚠️ File not allowed: {file.filename}")
                continue

            filename = secure_filename(file.filename)
            file_type = get_file_category(filename)

            if not file_type:
                logging.warning(f"⚠️ Unsupported file type: {filename}")
                continue

            unique_name = f"{datetime.now().strftime('%Y%m%d%H%M%S%f')}_{filename}"

            if file_type == "image":
                save_dir = os.path.join(UPLOAD_FOLDER, "workorderimages")
                db_path = f"/uploads/workorderimages/{unique_name}"
            else:  # video
                save_dir = os.path.join(UPLOAD_FOLDER, "workordervideos")
                db_path = f"/uploads/workordervideos/{unique_name}"

            os.makedirs(save_dir, exist_ok=True)

            save_path = os.path.join(save_dir, unique_name)
            file.save(save_path)

            media_list.append(db_path)

            logging.info(f"✅ {file_type.upper()} saved: {save_path}")

        data["creation_time_image"] = media_list

        workorder, error = WorkOrder.create(data)
        if isinstance(error, dict):
            return jsonify(error), 200
        if error:
            return jsonify({"error": error}), 400

        return jsonify({"success": True,"message": "Workorder created successfully",
            "workorder": workorder
        }), 201

    except Exception as e:
        logging.exception("CREATE WORKORDER ERROR")
        return jsonify({"error": str(e)}), 500
    
    
    
        

@admin_workorder_bp.route("/", methods=["GET"])
def get_all():
    workorders, error = WorkOrder.get_all()
    if error:
        return jsonify({"error": error}), 500
    return jsonify(workorders), 200


# @workorder_bp.route("/<int:id>", methods=["GET"])
# def get_one(id):
#     workorder = WorkOrder.get_by_id(id)
#     if not workorder:
#         return view.error("Work order not found", 404)
#     return view.success(workorder, 200)




@admin_workorder_bp.route("/search", methods=["GET"])
def search_workorders():
    query = request.args.get("query", "").strip()
    if not query:
        return jsonify([]), 200

    workorders, error = WorkOrder.search_by_workorder_raw(query)
    if error:
        return jsonify({"error": error}), 500

    return jsonify(workorders), 200

@workorder_bp.route("/<int:id>", methods=["PUT"])
def update(id):
    workorder = WorkOrder.get_by_id(id)
    if not workorder:
        return view.error("Work order not found", 404)

    data = {}

    # multipart/form-data
    if request.content_type and request.content_type.startswith("multipart/form-data"):
        data = {k.lower(): v for k, v in request.form.items()}

        closing_files = request.files.getlist("closing_images[]")
        saved_images = []

        for file in closing_files:
            if file and allowed_file(file.filename):
                filename = secure_filename(file.filename)
                unique = f"{datetime.now().strftime('%Y%m%d%H%M%S%f')}_{filename}"
                save_path = os.path.join(UPLOAD_FOLDER, unique)
                file.save(save_path)
                saved_images.append(f"/uploads/{unique}")

        if saved_images:
            existing = workorder.closing_images or []
            workorder.closing_images = existing + saved_images

    else:
        json_data = request.get_json()
        if not json_data:
            return view.error("No data provided", 400)
        data = {k.lower(): v for k, v in json_data.items()}

    success, error = workorder.update(data)
    if error:
        return view.error(error, 400)

    updated = workorder.to_dict()
    updated["closing_images"] = workorder.closing_images

    return view.success(updated, 200)



@workorder_bp.route("/<int:id>", methods=["DELETE"])
def delete(id):
    workorder = WorkOrder.get_by_id(id)
    if not workorder:
        return view.error("Work order not found", 404)

    success, error = workorder.delete()
    if error:
        return view.error(error, 400)
    return view.message("Work order deleted successfully", 200)


@workorder_bp.route("/workorder-types", methods=["GET"])
def get_workorder_types():
    types, error = WorkOrder.get_workorder_types()
    if error:
        return jsonify({"error": error}), 500
    return jsonify(types)





@workorder_bp.route("/generate", methods=["GET"])
def generate_workorder():
    try:
        workorder_type = request.args.get("workorder_type")
        if not workorder_type:
            return jsonify({"error": "workorder_type is required"}), 400

        workorder_id = WorkOrder.generate_workorder_id(workorder_type)
        return jsonify({"workorder": workorder_id}), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500
    
    
@workorder_bp.route("/generates", methods=["GET"])
def generates_workorder():
    try:
        workorder_type = request.args.get("workorder_type")
        if not workorder_type:
            return jsonify({"error": "workorder_type is required"}), 400

        workorder_id = WorkOrder.generates_workorder_id(workorder_type)
        return jsonify({"workorder": workorder_id}), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500


# Contractor Routes


    
    

# Contractor Routes

@workorder_bp.route("/contractors/by-area-type/<string:area>/<string:workorder_type>", methods=["GET"])
def get_contractors_by_area_and_type(area, workorder_type):
    try:
        # ✅ Fetch contractors filtered by both area & service type
        contractors, error = Contractor.get_by_area_and_service(area, workorder_type)
        if error:
            return jsonify({"error": error}), 500

        if not contractors:
            return jsonify([]), 200

        return jsonify(contractors), 200

    except Exception as e:
        return jsonify({"error": f"Unexpected error: {str(e)}"}), 500




@workorder_bp.route("/contractors", methods=["GET"])
def get_all_contractors():
    try:
        contractors, error = Contractor.get_all()
        if error:
            return jsonify({"error": error}), 500
        contractors_list = [c.to_dict() for c in contractors]
        return jsonify(contractors_list), 200
    except Exception as e:
        return jsonify({"error": f"Unexpected error: {str(e)}"}), 500


# ------------------------------
# New route: Filter WorkOrders added please check  the code boss
# ------------------------------



@admin_workorder_bp.route("/filter", methods=["GET"])
def filter_workorders():
    logging.info("Checking dashboard filter...")

    try:
        status = request.args.get("status", "All")
        from_date = request.args.get("from")
        to_date = request.args.get("to")

        if not from_date or not to_date:
            return jsonify({"error": "from and to dates are required"}), 400

        # Convert to datetime
        from_dt = datetime.strptime(from_date, "%Y-%m-%d")
        to_dt = datetime.strptime(to_date, "%Y-%m-%d") + timedelta(days=1)

        # CALL MODEL FUNCTION  
        workorders, error = WorkOrder.get_filtered_workorders(status, from_dt, to_dt)
        if error:
            return jsonify({"error": error}), 500

        return jsonify(workorders), 200

    except Exception as e:
        logging.exception("FILTER ERROR")
        return jsonify({"error": str(e)}), 500




@workorder_bp.route("/standard-rates", methods=["GET"])
def get_standard_rates():
    try:
        category = request.args.get("category_id")
        item = request.args.get("item_id")
        type = request.args.get("type_id")
        description = request.args.get("description_id")

        data = WorkOrder.get_standard_rates(category,item,type,description)

        return jsonify(data), 200

    except Exception as e:
        logging.exception("get_standard_rates controller error")
        return jsonify({"error": str(e)}), 500


@admin_workorder_bp.route("/code/<string:workorder>", methods=["GET"])
def get_workorder_by_code(workorder):
    record, error = WorkOrder.get_by_workorder_code(workorder)

    if error:
        return jsonify({"error": error}), 404

    return jsonify(record), 200

@workorder_bp.route("/contractors/by-region-category/<string:region_name>/<string:category_name>", methods=["GET"])
def get_contractors_by_region_category_name(region_name, category_name):
    contractors, error = WorkOrder.get_contractors_by_region_category_name(region_name, category_name)

    if error:
        return jsonify({"error": error}), 500

    return jsonify(contractors), 200

@admin_workorder_bp.route("/contractors/search", methods=["POST"])
def get_contractors():
    data = request.get_json()

    contractors, error = WorkOrder.get_contractors(data)

    if error:
        return jsonify({"error": error}), 500

    return jsonify(contractors), 200



@admin_workorder_bp.route("/assignment-audit", methods=["POST"])
def save_assignment_audit():
    try:
        data = request.get_json()

        workorder = data.get("workorder")
        assignment_reason = data.get("assignment_reason")
        suggested_contractors = data.get("suggested_contractors", [])
        selected_contractor = data.get("selected_contractor", {})

        result, error = WorkOrder.save_assignment_audit(
            workorder=workorder,
            assignment_reason=assignment_reason,
            suggested_contractors=suggested_contractors,
            selected_contractor=selected_contractor
        )

        if error:
            return jsonify({
                "status": "error",
                "message": error
            }), 400

        return jsonify({
            "status": "success",
            "message": "Assignment audit saved successfully"
        }), 201

    except Exception as e:
        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500




@admin_workorder_bp.route("/send-acceptance-mail/<string:workorder>", methods=["POST"])
def send_acceptance_mail_manual(workorder):
    from app.controllers.workorder_mail_controller import handle_send_acceptance_mail

    logging.info(f"[MANUAL] Send acceptance email for: {workorder}")

    request_data = request.get_json()

    base_url = request.host_url.rstrip("/")
    
    res, status = handle_send_acceptance_mail(workorder, request_data, base_url)

    return jsonify(res), status

@admin_workorder_bp.route("/count/closed", methods=["GET"])
def count_closed_workorders():
    count, error = WorkOrder.count_closed()

    if error:
        return jsonify({"error": error}), 500

    return jsonify({"closed_count": count}), 200

@admin_workorder_bp.route("/count/all", methods=["GET"])
def count_all_workorders():
    count, error = WorkOrder.count_total()

    if error:
        return jsonify({"error": error}), 500

    return jsonify({"total_count": count}), 200

@admin_workorder_bp.route("/count/open", methods=["GET"])
def count_open_workorders():
    count, error = WorkOrder.count_open()

    if error:
        return jsonify({"error": error}), 500

    return jsonify({"open_count": count}), 200

@admin_workorder_bp.route("/count/today", methods=["GET"])
def count_today_workorders():
    count, error = WorkOrder.count_today()

    if error:
        return jsonify({"error": error}), 500

    return jsonify({"today_count": count}), 200


@workorder_bp.route("/close/<string:workorder_code>", methods=["PUT"])
def close_workorder_api(workorder_code):
    try:
        # --- Get Only Files ---
        if not request.content_type.startswith("multipart/form-data"):
            return jsonify({"error": "Content-Type must be multipart/form-data"}), 400

        files = request.files.getlist("closing_images[]")
        saved_images = []

        # Save images
        for file in files:
            if file and allowed_file(file.filename):
                filename = secure_filename(file.filename)
                unique = f"{datetime.now().strftime('%Y%m%d%H%M%S%f')}_{filename}"
                save_dir = os.path.join(UPLOAD_FOLDER, "workorderimages")
                os.makedirs(save_dir, exist_ok=True)

                save_path = os.path.join(save_dir, unique)
                file.save(save_path)

                saved_images.append(f"/uploads/workorderimages/{unique}")

        # Call model function
        updated, error = WorkOrder.close_workorder(workorder_code, saved_images)

        if error:
            return jsonify({"error": error}), 400

        return jsonify({
            "message": "Workorder closed successfully",
            "workorder": workorder_code,
            "updated": updated
        }), 200

    except Exception as e:
        logging.exception("Close Workorder API Error")
        return jsonify({"error": str(e)}), 500
    
    
@workorder_bp.route("/provider/workorders/pending", methods=["POST"])
def get_pending_workorders():
    try:
        json_data = request.get_json(silent=True) or {}
        provider_id = (
            request.form.get("provider_id")
            or json_data.get("provider_id")
        )
        if not provider_id:
            return jsonify({"error": "provider_id is required"}), 400
        data = WorkOrder.get_pending_workorders_by_provider(provider_id)
        return jsonify(data), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@admin_workorder_bp.route("/provider/workorders/assigned", methods=["POST"])
def get_assigned_workorder_details():
    logging.info(f"checkthe input: ")
    try:
        data = request.get_json(silent=True) or request.form
        workorder_id = data.get("workorder_id")
        logging.info(f"checkthe input: '{workorder_id}'")
        if not workorder_id:
            return jsonify({"error": "workorder_id is required"}), 400

        result = WorkOrder.get_assigned_workorder_details(workorder_id)
        return jsonify(result), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500
    
    
@workorder_bp.route("/provider/workorders/open", methods=["POST"])
def get_open_workorders():
    try:
        json_data = request.get_json(silent=True) or {}
        provider_id = (
            request.form.get("provider_id")
            or json_data.get("provider_id")
        )
        if not provider_id:
            return jsonify({"error": "provider_id is required"}), 400
        data = WorkOrder.get_open_workorders_by_provider(provider_id)
        return jsonify(data), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@workorder_bp.route("/provider/workorders/closed", methods=["POST"])
def get_closed_workorders():
    try:
        json_data = request.get_json(silent=True) or {}
        provider_id = (
            request.form.get("provider_id")
            or json_data.get("provider_id")
        )
        if not provider_id:
            return jsonify({"error": "provider_id is required"}), 400
        data = WorkOrder.get_closed_workorders_by_provider(provider_id)
        return jsonify(data), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    
    
@admin_workorder_bp.route("/workorder-lifecycle", methods=["GET"])
def get_workorder_lifecycle():
    from_date = request.args.get("from")
    to_date = request.args.get("to")
    status = request.args.get("status")

    data, error = WorkOrder.get_all_workorder_lifecycle(
        from_date=from_date,
        to_date=to_date,
        status=status
    )

    if error:
        return jsonify({"error": error}), 500

    return jsonify(data), 200


@admin_workorder_bp.route("/admin/notifications/close", methods=["GET"])
def get_closed_admin_notifications():
    try:
        data = WorkOrder.get_closed_notifications()
        return jsonify(data), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@admin_workorder_bp.route("/admin/notifications/assigned", methods=["GET"])
def get_assigned_admin_notifications():
    try:
        data = WorkOrder.get_assigned_notifications()
        return jsonify(data), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@admin_workorder_bp.route("/admin/notifications/invoice", methods=["GET"])
def get_invoice_admin_notifications():
    try:
        data = WorkOrder.get_invoice_notifications()
        return jsonify(data), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    
    
@admin_workorder_bp.route("/admin/notifications/contractorlist", methods=["GET"])
def fetch_contractors_for_workorder():
    try:
        workorder_id = request.args.get("workorder_id")

        if not workorder_id:
            return jsonify({
                "success": False,
                "message": "workorder_id is required"
            }), 400

        data = WorkOrder.get_contractors_by_workorder(workorder_id)

        return jsonify({
            "success": True,
            "data": data
        }), 200

    except Exception as e:
        logging.exception("Error fetching contractors for workorder")
        return jsonify({
            "success": False,
            "message": "Internal server error"
        }), 500
        
        
@workorder_bp.route("/admin/invoice/workorder-details", methods=["GET"])
def get_invoice_workorder_details():
    try:
        workorder = request.args.get("workorder")

        if not workorder:
            return jsonify({
                "error": "workorder query parameter is required"
            }), 400

        data = WorkOrder.get_invoice_workorder_details(workorder)

        if not data:
            return jsonify({
                "message": "No data found for this workorder"
            }), 404

        return jsonify(data), 200

    except Exception as e:
        return jsonify({
            "error": str(e)
        }), 500

@workorder_bp.route("/api/invoice/generate", methods=["POST"])
def generate_invoice():
    data = request.json

    invoice_no = generate_invoice_number()

    payload = {
        "invoice_no": invoice_no,
        "workorder": data["workorder"],
        "contractor_id": data["contractor_id"],
        "contractor_name": data["contractor_name"],
        "billing_address": data["billing_address"]
    }

    invoice = WorkOrder.create_invoice(payload)

    if not invoice:
        return jsonify({"error": "Invoice generation failed"}), 500

    return jsonify(invoice), 200




@workorder_bp.route("/admin-notification-close", methods=["POST"])
def workorder_insert_admin_notification_close():
    try:
        logging.info("admin-notification-close API called")

        if not request.content_type or not request.content_type.startswith("multipart/form-data"):
            return jsonify({"error": "Content-Type must be multipart/form-data"}), 400

        workorder = request.form.get("workorder")
        logging.info(f"cheklsdfklldsf: '{workorder}'")
        message = request.form.get("message")
        logging.info(f"chlksdfkllsdlkfL: '{message}'")
        provider_id = request.form.get("provider_id")
        logging.info(f"klsdfjldskfldfl: '{provider_id}'")

        if not workorder:
            return jsonify({"success": False, "message": "workorder is required"}), 400
        if not message:
            return jsonify({"success": False, "message": "message is required"}), 400
        if not provider_id:
            return jsonify({"success": False, "message": "provider_id is required"}), 400

        files = request.files.getlist("images[]")
        saved_images = []

        for file in files:
            if not file or not file.filename:
                continue

            logging.info(
                f"Incoming file → name={file.filename}, "
                f"type={file.mimetype}, size={file.content_length}"
            )

            if not allowed_file(file.filename):
                logging.warning(f"⚠️ File not allowed: {file.filename}")
                continue

            filename = secure_filename(file.filename)
            file_type = get_file_category(filename)

            if not file_type:
                logging.warning(f"⚠️ Unsupported file type: {filename}")
                continue

            unique_name = f"{datetime.now().strftime('%Y%m%d%H%M%S%f')}_{filename}"

            if file_type == "image":
                save_dir = os.path.join(UPLOAD_FOLDER, "workorderimages")
                db_path = f"/uploads/workorderimages/{unique_name}"
            else:
                save_dir = os.path.join(UPLOAD_FOLDER, "workordervideos")
                db_path = f"/uploads/workordervideos/{unique_name}"

            os.makedirs(save_dir, exist_ok=True)

            save_path = os.path.join(save_dir, unique_name)
            file.save(save_path)

            saved_images.append(db_path)
            logging.info(f"✅ {file_type.upper()} saved: {save_path}")

        workorder_data, admin_email, admin_id, err = (WorkOrder.workorder_insert_admin_notification_close(workorder,message,saved_images,provider_id))
        
        
        if err:
            return jsonify({"success": False, "message": err}), 400

        # Send email after DB commit
        if admin_email:
            try:
                send_workorder_completed_admin_review_email(
                    admin_email=admin_email,
                    workorder_data=workorder_data,
                    contractor_message=message,
                    saved_images=saved_images
                )
            except Exception:
                logging.exception("Failed to send workorder completion email to admin")
                
                
        # =====================================================
        # PUSH NOTIFICATION TO ADMIN
        # =====================================================
        
        try:
        
            if admin_id:
        
                tokens, token_error = (
                    ProviderModel.get_active_token_user_id(
                        admin_id
                    )
                )
                
                if token_error:
                    logging.error(
                        f"Token fetch error: {token_error}"
                    )
        
                if tokens:
        
                    send_notification_to_tokens(
        
                        tokens,
        
                        "Workorder Completed",
        
                        f"Workorder #{workorder} has been completed and is awaiting your review"
        
                    )
        
                    logging.info(
                        "✅ Admin push notification sent"
                    )
        
                else:
        
                    logging.warning(
                        f"⚠️ No active tokens found for admin "
                        f"{admin_id}"
                    )
        
            else:
        
                logging.warning(
                    "⚠️ Admin ID not found"
                )
        
        except Exception as notify_err:
        
            logging.error(
        
                f"❌ Admin push notification failed: "
                f"{str(notify_err)}"
        
            )
                
        

        return jsonify({
            "success": True,
            "message": "Your request has been captured and team will cross check and close the workorder",
            "files_saved": saved_images
        }), 200

    except Exception as e:
        db.session.rollback()
        logging.exception("❌ Admin Notification Close Error")
        return jsonify({"success": False, "error": str(e)}), 500  
        
        
        
@admin_workorder_bp.route("/admin/notifications/completed_workorder", methods=["GET"])
def get_completed_workorder_details_admin():
    try:
        workorder = request.args.get("workorder_id")
        if not workorder:
            return jsonify({"error": "workorder_id is required"}), 400

        data = WorkOrder.get_completed_workorder_details_admin(workorder)
        return jsonify(data), 200

    except Exception as e:
        logging.exception("Completed workorder admin error")
        return jsonify({"error": str(e)}), 500


@admin_workorder_bp.route("/admin/reopen", methods=["POST"])
def admin_reopen_workorder():
    try:
        data = request.get_json()
        workorder = data.get("workorder")
        admin_remarks = data.get("remarks", "")

        if not workorder:
            return jsonify({"success": False,"message": "workorder is required"}), 400

        updated, error = WorkOrder.workorder_insert_admin_notification_reopen(workorder,admin_remarks)

        if error:
            return jsonify({"success": False,"message": error}), 400
        
        contractor_id, contractor_email, email_err = (WorkOrder.get_contractor_details_for_reopen(workorder))
        
        if contractor_email:
            try:
                send_workorder_reopened_contractor_email(contractor_email,updated,admin_remarks)
            except Exception:
                logging.exception("❌ Failed to send reopen email to contractor")
        else:
            logging.warning(f"Contractor email not found: {email_err}")
            
        # =====================================================
        # PUSH NOTIFICATION TO CONTRACTOR
        # =====================================================
        
        try:
        
            if contractor_id:
        
                tokens, token_error = (
                    ProviderModel.get_active_token_user_id(
                        contractor_id
                    )
                )
        
                if tokens:
        
                    send_notification_to_tokens(
        
                        tokens,
        
                        "Workorder Reopened",
        
                        f"Workorder #{workorder} has been reopened by Admin"
        
                    )
        
                    logging.info(
                        "✅ Contractor push notification sent"
                    )
        
                else:
        
                    logging.warning(
                        f"⚠️ No active tokens found for contractor "
                        f"{contractor_id}"
                    )
        
            else:
        
                logging.warning(
                    "⚠️ Contractor ID not found"
                )
        
        except Exception as notify_err:
        
            logging.error(
        
                f"❌ Contractor push notification failed: "
                f"{str(notify_err)}"
        
            )
        
        
        

        return jsonify({"success": True,"message": "Workorder reopened successfully",
            "data": updated}), 200

    except Exception as e:
        logging.exception("❌ Admin Reopen Controller Error")
        return jsonify({"success": False,"error": str(e)}), 500

    
    
    
    
@admin_workorder_bp.route("/admin/close", methods=["POST"])
def admin_close_workorder():
    try:
        logging.info("Admin close workorder API called for rating")
        data = request.get_json()
        workorder = data.get("workorder")
        admin_remarks = data.get("remarks", "")
        logging.info(f"data gggg for certificate rating: '{data}'")

        if not workorder:
            return jsonify({
                "success": False,
                "message": "workorder is required"
            }), 400

        # ✅ NEW STEP 1: Get contractor + admin emails from model
        emails, mail_error = WorkOrder.get_close_workorder_emails(workorder)
        logging.info(f"emails for certificate: '{emails}'")

        if mail_error:
            return jsonify({
                "success": False,
                "message": mail_error
            }), 400

        # ✅ NEW STEP 2: Send closure certificate mail to both
        mail_sent, send_error = WorkOrder.send_workorder_closure_certificate(
            workorder,
            emails,
            admin_remarks
        )
        
        if not mail_sent:
            return jsonify({
                "success": False,
                "message": send_error
            }), 400


        # ✅ ORIGINAL STEP: Close workorder
        
        logging.info(f"Closing workorder for rating: '{workorder}' with remarks: '{admin_remarks}'")
        updated, error = WorkOrder.workorder_update_admin_notification_close(
            workorder,
            admin_remarks
        )
        logging.info(f"Updated workorder after closure rating: '{updated}'")
        if error:
            return jsonify({
                "success": False,
                "message": error
            }), 400

        return jsonify({
            "success": True,
            "message": "Workorder closed successfully and certificate emailed",
            "data": updated
        }), 200

    except Exception as e:
        logging.exception("❌ Admin Close Controller Error")
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

    
    
@workorder_bp.route("/provider/workorders/completed", methods=["POST"])
def get_completed_workorders_by_provider():
    try:
        json_data = request.get_json(silent=True) or {}
        provider_id = (
            request.form.get("provider_id")
            or json_data.get("provider_id")
        )
        if not provider_id:
            return jsonify({"error": "provider_id is required"}), 400
        data = WorkOrder.get_completed_workorders_by_provider(provider_id)
        return jsonify(data), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    
@workorder_bp.route("/provider/workorders/reopen", methods=["POST"])
def get_reopen_workorders_for_provider():
    try:
        json_data = request.get_json(silent=True) or {}
        provider_id = (
            request.form.get("provider_id")
            or json_data.get("provider_id")
        )
        if not provider_id:
            return jsonify({"error": "provider_id is required"}), 400
        data = WorkOrder.get_reopen_workorders_for_provider(provider_id)
        return jsonify(data), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    
@admin_workorder_bp.route("/admin/notifications/overrated", methods=["GET"])
def get_overrated_admin_notifications():
    try:
        data = WorkOrder.get_overrated_notifications()
        return jsonify(data), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    
    
    
@admin_workorder_bp.route("/admin/notifications/overrated/details", methods=["GET"])
def get_admin_overrated_workorder_details():
    try:
        workorder_id = request.args.get("workorder_id")

        if not workorder_id:
            return jsonify({"error": "workorder_id is required"}), 400

        data = WorkOrder.get_admin_overrated_workorder_details(workorder_id)

        if not data:
            return jsonify({"error": "Workorder not found"}), 404

        return jsonify({"success": True,"data": data}), 200

    except Exception as e:
        logging.error(
            f"Error fetching admin overrated workorder details: {e}",
            exc_info=True
        )
        return jsonify({"error": str(e)}), 500

@admin_workorder_bp.route("/admin/category/usage-check", methods=["POST"])
def check_category_usage():
    try:
        req_data = request.get_json()
        category_id = req_data.get("category_id")

        if not category_id:
            return jsonify({"error": "category_id is required"}), 400

        is_used = WorkOrder.get_category_usage(category_id)

        return jsonify({
            "success": True,
            "data": {
                "category_id": category_id,
                "is_used": is_used
            }
        }), 200

    except Exception as e:
        logging.exception("check_category_usage controller error")
        return jsonify({"error": str(e)}), 500

@admin_workorder_bp.route("/admin/item/usage-check", methods=["POST"])
def check_item_usage():
    try:
        req_data = request.get_json()

        category_id = req_data.get("category_id")
        item_id = req_data.get("item_id")

        # ✅ Validate both
        if not category_id or not item_id:
            return jsonify({
                "error": "category_id and item_id are required"
            }), 400

        is_used = WorkOrder.get_item_usage(category_id, item_id)

        return jsonify({
            "success": True,
            "data": {
                "category_id": category_id,
                "item_id": item_id,
                "is_used": is_used
            }
        }), 200

    except Exception as e:
        logging.exception("check_item_usage controller error")
        return jsonify({"error": str(e)}), 500

@admin_workorder_bp.route("/admin/type/usage-check", methods=["POST"])
def check_type_usage():
    try:
        req_data = request.get_json()

        category_id = req_data.get("category_id")
        item_id = req_data.get("item_id")
        type_id = req_data.get("type_id")

        # ✅ Validate ALL fields
        if not category_id or not item_id or not type_id:
            return jsonify({
                "error": "category_id, item_id and type_id are required"
            }), 400

        is_used = WorkOrder.get_type_usage(category_id, item_id, type_id)

        return jsonify({
            "success": True,
            "data": {
                "category_id": category_id,
                "item_id": item_id,
                "type_id": type_id,
                "is_used": is_used
            }
        }), 200

    except Exception as e:
        logging.exception("check_type_usage controller error")
        return jsonify({"error": str(e)}), 500
    

@admin_workorder_bp.route("/admin/description/usage-check", methods=["POST"])
def check_description_usage():
    try:
        req_data = request.get_json()

        category_id = req_data.get("category_id")
        item_id = req_data.get("item_id")
        type_id = req_data.get("type_id")
        description_id = req_data.get("description_id")

        # ✅ Validate ALL fields
        if not category_id or not item_id or not type_id or not description_id:
            return jsonify({
                "error": "category_id, item_id, type_id and description_id are required"
            }), 400

        is_used = WorkOrder.get_description_usage(
            category_id, item_id, type_id, description_id
        )

        return jsonify({
            "success": True,
            "data": {
                "category_id": category_id,
                "item_id": item_id,
                "type_id": type_id,
                "description_id": description_id,
                "is_used": is_used
            }
        }), 200

    except Exception as e:
        logging.exception("check_description_usage controller error")
        return jsonify({"error": str(e)}), 500

@admin_workorder_bp.route("/admin/register", methods=["POST"])
def register_admin():
    try:
        req_data = request.get_json()

        if not req_data:
            return jsonify({
                "success": False,
                "message": "Invalid JSON input"
            }), 400

        result = WorkOrder.create_admin(req_data)

        if not result["success"]:
            return jsonify(result), 400

        return jsonify(result), 201

    except Exception as e:
        logging.error("register_admin controller error", exc_info=True)

        return jsonify({
            "success": False,
            "message": str(e)
        }), 500
        
        
        
@admin_workorder_bp.route("/admin/get-user/<email>", methods=["GET"])
def get_admin_by_email(email):
    try:
        result = WorkOrder.get_admin_by_email(email)

        if not result["success"]:
            return jsonify(result), 404

        return jsonify(result), 200

    except Exception as e:
        logging.error("get_admin_by_email controller error", exc_info=True)

        return jsonify({
            "success": False,
            "message": str(e)
        }), 500


# =========================================================
# CONTROLLER
# UPDATE USER
# =========================================================

@admin_workorder_bp.route("/admin/update-user", methods=["PUT"])
def update_admin():
    try:
        req_data = request.get_json()

        if not req_data:
            return jsonify({
                "success": False,
                "message": "Invalid JSON input"
            }), 400

        result = WorkOrder.update_admin(req_data)

        if not result["success"]:
            return jsonify(result), 400

        return jsonify(result), 200

    except Exception as e:
        logging.error("update_admin controller error", exc_info=True)

        return jsonify({
            "success": False,
            "message": str(e)
        }), 500
@admin_workorder_bp.route("/withdraw/<string:workorder>", methods=["POST"])
def withdraw_workorder(workorder):
    try:
        data = request.get_json() or {}
        reason = data.get("reason")
 
        if not reason:
            return jsonify({
                "success": False,
                "message": "reason is required"
            }), 400
 
        logging.info(
            f"Withdraw request received. "
            f"Workorder={workorder}, Reason={reason}"
        )
 
        # -----------------------------------------
        # Withdraw Workorder in DB
        # -----------------------------------------
        success, error = WorkOrder.withdraw_workorder(workorder, reason)
 
        if not success:
            return jsonify({
                "success": False,
                "message": error
            }), 400
 
        # -----------------------------------------
        # Get Workorder Details
        # -----------------------------------------
        workorder_details = get_workorder_details(workorder)
 
        if not workorder_details:
            return jsonify({
                "success": False,
                "message": "Workorder not found"
            }), 404
 
        # -----------------------------------------
        # Get Admin Email
        # -----------------------------------------
        admin_email = None
        if getattr(workorder_details, "created_by", None):
            admin_email = get_admin_email(workorder_details.created_by)
 
        logging.info(f"Admin Email: {admin_email}")
 
        # -----------------------------------------
        # Get Contractor Details
        # -----------------------------------------
        contractor_email = None
        contractor_name = None
 
        contractor = get_accepted_contractor(workorder)
        logging.info(f"Contractor Data: {contractor}")
 
        if contractor:
            contractor_email = contractor.get("email_id")
            contractor_name = contractor.get("name")
            logging.info(f"Contractor Name: {contractor_name}")
            logging.info(f"Contractor Email: {contractor_email}")
        # =====================================================
        # PUSH NOTIFICATION TO ADMIN
        # =====================================================

        try:
            from app.models.provider_model import ProviderModel
            from app.utils.notification_service import (
            send_notification_to_tokens
           )

            admin_id = workorder_details.created_by

            if admin_id:

                tokens, token_error = (
                    ProviderModel.get_active_token_user_id(
                        admin_id
                    )
                )

                if tokens:

                    send_notification_to_tokens(

                        tokens,

                        "Workorder Withdrawn",

                        f"Your workorder #{workorder} has been withdrawn."
                        f"Reason: {reason}"

                    )

                    logging.info(
                        "✅ Admin push notification sent"
                    )

                else:

                    logging.warning(
                        f"⚠️ No active tokens found for admin "
                        f"{admin_id}"
                    )

            else:

                logging.warning(
                    "⚠️ Admin ID not found"
                )

        except Exception as notify_err:

            logging.error(

                f"❌ Admin push notification failed: "
                f"{str(notify_err)}"

            )
        # =====================================================
        # PUSH NOTIFICATION TO CONTRACTOR
        # =====================================================

        try:

            contractor_id = contractor.get("user_uid") if contractor else None

            if contractor_id:

                tokens, token_error = (
                    ProviderModel.get_active_token_user_id(
                        contractor_id
                    )
                )

                if tokens:

                    send_notification_to_tokens(

                        tokens,

                        "Workorder Withdrawn",

                        f"Workorder #{workorder} assigned to you has been withdrawn by Admin."

                    )

                    logging.info(
                        "✅ Contractor push notification sent"
                    )

                else:

                    logging.warning(
                        f"⚠️ No active tokens found for contractor "
                        f"{contractor_id}"
                    )

        except Exception as notify_err:

            logging.error(

                f"❌ Contractor push notification failed: "
                f"{str(notify_err)}"

            )
        # -----------------------------------------
        # Send ADMIN Email (separate template)
        # -----------------------------------------
        if admin_email:
            try:
                admin_html = build_withdraw_notification_html_admin(
                    workorder_details,
                    reason,
                    "Admin"
                )
                send_email_with_attachments(
                    workorder_details,
                    admin_email,
                    "Admin",
                    admin_html
                )
                logging.info(f"Withdrawal email sent to Admin: {admin_email}")
            except Exception as e:
                logging.error(f"Failed to send admin withdrawal email: {e}")
 
        # -----------------------------------------
        # Send CONTRACTOR Email (separate template)
        # -----------------------------------------
        if contractor_email:
            try:
                contractor_html = build_withdraw_notification_html_contractor(
                    workorder_details,
                    reason
                )
                send_email_with_attachments(
                    workorder_details,
                    contractor_email,
                    contractor_name,
                    contractor_html
                )
                logging.info(f"Withdrawal email sent to Contractor: {contractor_email}")
            except Exception as e:
                logging.error(f"Failed to send contractor withdrawal email: {e}")
 
        # -----------------------------------------
        # Lifecycle Log
        # -----------------------------------------
        try:
            insert_workorder_lifecycle_log(
                workorder_details,
                None,
                None,
                reason
            )
        except Exception as log_error:
            logging.error(f"Failed to insert lifecycle log: {log_error}")
 
        return jsonify({
            "success": True,
            "message": "Workorder withdrawn successfully"
        }), 200
 
    except Exception as e:
        logging.exception("Withdraw Controller Error")
        return jsonify({
            "success": False,
            "message": str(e)
        }), 500
        
        
        
@workorder_bp.route(
    "/contractor-ratings/create",
    methods=["POST"]
)
def create_contractor_rating():
    try:
        data = request.get_json(silent=True)

        logging.info(
            "Contractor rating request received: content_type=%s, data=%r",
            request.content_type,
            data,
        )

        if not isinstance(data, dict):
            logging.warning(
                "Contractor rating request payload is invalid: %r",
                data,
            )
            return jsonify({
                "success": False,
                "message": "Invalid JSON payload"
            }), 400

        workorder = (
            data.get("workorder", "")
            .strip()
        )

        rating = data.get("rating")

        feedback = (
            data.get("feedback", "")
            .strip()
        )
        
        rating_given_by = data.get("rating_given_by")

        logging.info(
            "Contractor rating input parsed: workorder=%r, rating=%r, feedback=%r",
            workorder,
            rating,
            feedback,
        )
        
        if not rating_given_by:
            return jsonify({
                "success": False,
                "message": "rating_given_by is required"
            }), 400

        if not workorder:
            return jsonify({
                "success": False,
                "message": "workorder is required"
            }), 400

        if rating is None:
            return jsonify({
                "success": False,
                "message": "rating is required"
            }), 400

        try:
            rating = float(rating)
        except Exception:
            return jsonify({
                "success": False,
                "message": "invalid rating"
            }), 400

        if rating < 1 or rating > 5:
            return jsonify({
                "success": False,
                "message": "rating must be between 1 and 5"
            }), 400

        logging.info(
            "Calling WorkOrder.create_contractor_rating with: workorder=%s, rating=%s, feedback=%r",
            workorder,
            rating,
            feedback,
        )

        result, error = WorkOrder.create_contractor_rating(
            workorder=workorder,
            rating=rating,
            feedback=feedback,
            rated_by_admin_id=rating_given_by
        )

        logging.info(
            "WorkOrder.create_contractor_rating response: result=%r, error=%r",
            result,
            error,
        )

        if error:
            return jsonify({
                "success": False,
                "message": error
            }), 400

        return jsonify({
            "success": True,
            "message": "Contractor rating saved successfully",
            "data": result
        }), 200

    except Exception as e:
        logging.exception(
            "Contractor Rating Controller Error"
        )

        return jsonify({
            "success": False,
            "error": str(e)
        }), 500
        
        
@workorder_bp.route("/contractor/ratings/dashboard", methods=["GET"])
def contractor_ratings_dashboard():
    try:
        user_uid = request.args.get("user_uid", type=int)

        if not user_uid:
            return jsonify({
                "success": False,
                "message": "user_uid is required"
            }), 400

        summary = WorkOrder.get_contractor_rating_summary(user_uid)
        ratings = WorkOrder.get_contractor_ratings(user_uid)
        low_ratings = WorkOrder.get_low_ratings(user_uid)

        return jsonify({
            "success": True,
            "summary": summary,
            "ratings": ratings,
            "low_ratings": low_ratings

        })

    except Exception as e:
        logging.exception("Contractor ratings dashboard error")

        return jsonify({
            "success": False,
            "message": str(e)
        }), 500
        
        
@admin_workorder_bp.route(
    "/assignment-audit",
    methods=["GET"]
)
def get_assignment_audit():

    try:
        result, error = (
            WorkOrder
            .get_assignment_audit()
        )

        if error:
            return jsonify({
                "status": "error",
                "message": error
            }), 400

        return jsonify(
            result
        ), 200

    except Exception as e:
        logging.exception("get_assignment_audit controller error")
        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500
        
        #workorder_bp.route("/admin/notifications/overrated", methods=["GET"])   donee
        
        
# @workorder_bp.route("/<workorder>/full-history", methods=["GET"])
# def get_workorder_full_history(workorder):
#     try:
#         history, error = WorkOrder.get_full_history(workorder)

#         if error:
#             return jsonify({
#                 "status": "error",
#                 "message": error
#             }), 400

#         return jsonify({
#             "status": "success",
#             "data": history
#         }), 200

#     except Exception as e:
#         return jsonify({
#             "status": "error",
#             "message": str(e)
#         }), 500
        
        
@admin_workorder_bp.route("/<workorder>/full-history", methods=["GET"])
def get_workorder_full_history(workorder):
    data, error = WorkOrder.get_workorder_full_history(workorder)
    print(f"Data testing for why error coming: {data}, Error: {error}")  # Debugging line

    if error:
        status_code = 404 if error == "Workorder not found" else 500
        return jsonify({"error": error}), status_code

    return jsonify(data), 200



@admin_workorder_bp.route("/rfq/create", methods=["POST"])
def create_rfq():
    try:

        if not request.content_type.startswith("multipart/form-data"):
            return jsonify({
                "error": "Content-Type must be multipart/form-data"
            }), 400

        form = request.form
        files = request.files

        def get_int(name):
            val = form.get(name)
            return int(val) if val and str(val).isdigit() else None

        data = {
            "CATEGORY_ID": get_int("CATEGORY_ID"),
            "REGION_ID": get_int("REGION_ID"),
            "STATE_ID": get_int("STATE_ID"),
            "CITY_ID": get_int("CITY_ID"),
            "RFQ_TITLE": form.get("RFQ_TITLE", "").strip(),
            "CLOSING_DATE": form.get("CLOSING_DATE"),
            "DESCRIPTION": form.get("DESCRIPTION", "").strip(),
            "REMARKS": form.get("REMARKS", "").strip(),
            "ITEMS": json.loads(form.get("ITEMS", "[]")),
            "created_by": form.get("ADMIN_ID")
        }

        required = ["CATEGORY_ID","REGION_ID","STATE_ID","CITY_ID","RFQ_TITLE","CLOSING_DATE"]
        missing = [x for x in required if not data.get(x)]

        if missing:
            return jsonify({
                "error": f"Missing: {', '.join(missing)}"
            }), 400

        # ==========================================
        # ATTACHMENTS
        # ==========================================
        attachment_list = []

        for file in files.getlist("attachments[]"):

            if not file or not file.filename:
                continue

            filename = secure_filename(file.filename)
            unique_name = (f"{datetime.now().strftime('%Y%m%d%H%M%S%f')}_{filename}")
            save_dir = os.path.join(UPLOAD_FOLDER,"rfqattachments")
            os.makedirs(save_dir, exist_ok=True)
            save_path = os.path.join(save_dir,unique_name)
            file.save(save_path)
            db_path = (f"/uploads/rfqattachments/{unique_name}")
            attachment_list.append(db_path)

        data["attachments"] = attachment_list

        # ==========================================
        # SAVE RFQ
        # ==========================================
        rfq, error = WorkOrder.create_rfq(data)

        if error:
            return jsonify({
                "error": error
            }), 400

        # ==========================================
        # SEND EMAILS IN BACKGROUND
        # ==========================================
        try:

            send_rfq_notifications_async(rfq)
            logging.info(f"Background RFQ mail started for {rfq['rfq_no']}")

        except Exception:

            logging.exception("Unable to start RFQ background mail thread.")

        # ==========================================
        # RETURN RESPONSE IMMEDIATELY
        # ==========================================
        return jsonify({
            "success": True,
            "message": "RFQ Created Successfully",
            "rfq": rfq
        }), 201

    except Exception as e:

        logging.exception("CREATE RFQ ERROR")
        return jsonify({
            "error": str(e)
        }), 500
    
@workorder_bp.route("/provider/rfq/new/<int:contractor_id>", methods=["GET"])
def get_provider_new_rfqs(contractor_id):

    try:
        data = WorkOrder.get_provider_new_rfqs(contractor_id)
        return jsonify(data), 200
    except Exception as e:
        return jsonify({
            "error": str(e)
        }), 500

@workorder_bp.route("/provider/rfq/<string:rfq_no>", methods=["GET"])
def get_provider_rfq_details(rfq_no):
    print("######## CONTROLLER HIT ########")
    print("RFQ NO =", rfq_no)
    try:
        data = WorkOrder.get_provider_rfq_details(rfq_no)
        if not data:
            return jsonify({"error": "RFQ Not Found"}), 404
        return jsonify(data), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@workorder_bp.route("/provider/rfq/respond", methods=["POST"])
def submit_provider_rfq_response():
    try:
        data = request.get_json()
        response, error = WorkOrder.submit_provider_rfq_response(data)
        if error:
            return jsonify({
                "success": False,
                "error": error
            }), 400

        return jsonify({
            "success": True,
            "message": "Quotation submitted successfully.",
            "response": response
        }), 200

    except Exception as e:
        logging.exception("SUBMIT RFQ RESPONSE ERROR")
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500
    
@workorder_bp.route("/provider/rfq/responded/<int:contractor_id>", methods=["GET"])
def get_provider_responded_rfqs(contractor_id):
    try:
        data = WorkOrder.get_provider_responded_rfqs(contractor_id)
        return jsonify(data), 200
    except Exception as e:
        return jsonify({
            "error": str(e)
        }), 500
    
@admin_workorder_bp.route("/admin/rfq/<string:rfq_no>/responses", methods=["GET"])
def get_admin_rfq_responses(rfq_no):
    try:
        data = WorkOrder.get_admin_rfq_responses(rfq_no)
        return jsonify(data),200
    except Exception as e:
        return jsonify({
            "error":str(e)
        }),500
    
@admin_workorder_bp.route("/admin/rfq/list", methods=["GET"])
def get_admin_rfq_list():
    try:
        data = WorkOrder.get_admin_rfq_list()
        return jsonify(data), 200
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500


@admin_workorder_bp.route("/admin/rfq/response/<int:response_id>", methods=["GET"])
def get_admin_rfq_response_details(response_id):

    try:
        data = WorkOrder.get_admin_rfq_response_details(response_id)
        if not data:
            return jsonify({
                "success": False,
                "message": "Quotation not found."
            }), 404

        return jsonify(data), 200

    except Exception as e:

        logging.exception("ADMIN RFQ RESPONSE DETAILS")

        return jsonify({
            "success": False,
            "error": str(e)
        }), 500