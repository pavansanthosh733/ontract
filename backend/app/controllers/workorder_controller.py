from flask import Blueprint, request, jsonify, current_app
from ..models.workorder import WorkOrder
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
from app.controllers.purchase_order_controller import (
    create_purchase_order
)

workorder_bp = Blueprint("workorder", __name__)
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
@workorder_bp.route("/", methods=["POST"])
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
        if error:
            return jsonify({"error": error}), 400

        return jsonify({"success": True,"message": "Workorder created successfully",
            "workorder": workorder
        }), 201

    except Exception as e:
        logging.exception("CREATE WORKORDER ERROR")
        return jsonify({"error": str(e)}), 500
    
    
    
        

@workorder_bp.route("/", methods=["GET"])
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




@workorder_bp.route("/search", methods=["GET"])
def search_workorders():
    query = request.args.get("query", "").strip()
    if not query:
        return jsonify([]), 200

    print(f"[DEBUG] API called with query: {query}")

    workorders, error = WorkOrder.search_by_workorder_raw(query)
    if error:
        print(f"[ERROR] search API error: {error}")
        return jsonify({"error": error}), 500

    print(f"[DEBUG] API returning {len(workorders)} rows")
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
# New route: Filter WorkOrders
# ------------------------------



@workorder_bp.route("/filter", methods=["GET"])
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
        print("[ERROR] get_standard_rates:", e)
        return jsonify({"error": str(e)}), 500


@workorder_bp.route("/code/<string:workorder>", methods=["GET"])
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

@workorder_bp.route("/send-acceptance-mail/<string:workorder>", methods=["POST"])
def send_acceptance_mail_manual(workorder):
    from app.controllers.workorder_mail_controller import handle_send_acceptance_mail

    logging.info(f"[MANUAL] Send acceptance email for: {workorder}")

    request_data = request.get_json()

    base_url = request.host_url.rstrip("/")
    
    res, status = handle_send_acceptance_mail(workorder, request_data, base_url)

    return jsonify(res), status

@workorder_bp.route("/count/closed", methods=["GET"])
def count_closed_workorders():
    count, error = WorkOrder.count_closed()

    if error:
        return jsonify({"error": error}), 500

    return jsonify({"closed_count": count}), 200

@workorder_bp.route("/count/all", methods=["GET"])
def count_all_workorders():
    count, error = WorkOrder.count_total()

    if error:
        return jsonify({"error": error}), 500

    return jsonify({"total_count": count}), 200

@workorder_bp.route("/count/open", methods=["GET"])
def count_open_workorders():
    count, error = WorkOrder.count_open()

    if error:
        return jsonify({"error": error}), 500

    return jsonify({"open_count": count}), 200

@workorder_bp.route("/count/today", methods=["GET"])
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

@workorder_bp.route("/provider/workorders/assigned", methods=["POST"])
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
    
    
@workorder_bp.route("/workorder-lifecycle", methods=["GET"])
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


@workorder_bp.route("/admin/notifications/close", methods=["GET"])
def get_closed_admin_notifications():
    try:
        data = WorkOrder.get_closed_notifications()
        return jsonify(data), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@workorder_bp.route("/admin/notifications/assigned", methods=["GET"])
def get_assigned_admin_notifications():
    try:
        data = WorkOrder.get_assigned_notifications()
        return jsonify(data), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@workorder_bp.route("/admin/notifications/invoice", methods=["GET"])
def get_invoice_admin_notifications():
    try:
        data = WorkOrder.get_invoice_notifications()
        return jsonify(data), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    
    
@workorder_bp.route("/admin/notifications/contractorlist", methods=["GET"])
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
        print("Error:", e)
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

        WorkOrder.workorder_insert_admin_notification_close(workorder,message,saved_images,provider_id)

        return jsonify({
            "success": True,
            "message": "Your request has been captured and team will cross check and close the workorder",
            "files_saved": saved_images
        }), 200

    except Exception as e:
        db.session.rollback()
        logging.exception("❌ Admin Notification Close Error")
        return jsonify({"success": False, "error": str(e)}), 500  
        
        
        
@workorder_bp.route("/admin/notifications/completed_workorder", methods=["GET"])
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


@workorder_bp.route("/admin/reopen", methods=["POST"])
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

        return jsonify({"success": True,"message": "Workorder reopened successfully",
            "data": updated}), 200

    except Exception as e:
        logging.exception("❌ Admin Reopen Controller Error")
        return jsonify({"success": False,"error": str(e)}), 500

    
    
    
    
@workorder_bp.route("/admin/close", methods=["POST"])
def admin_close_workorder():
    try:
        data = request.get_json()
        workorder = data.get("workorder")
        admin_remarks = data.get("remarks", "")
        logging.info(f"data gggg for certificate: '{data}'")

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
        updated, error = WorkOrder.workorder_update_admin_notification_close(
            workorder,
            admin_remarks
        )

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
    
@workorder_bp.route("/admin/notifications/overrated", methods=["GET"])
def get_overrated_admin_notifications():
    try:
        data = WorkOrder.get_overrated_notifications()
        return jsonify(data), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    
    
    
@workorder_bp.route("/admin/notifications/overrated/details", methods=["GET"])
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

@workorder_bp.route("/admin/category/usage-check", methods=["POST"])
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
        print("CONTROLLER ERROR:", str(e))
        return jsonify({"error": str(e)}), 500

@workorder_bp.route("/admin/item/usage-check", methods=["POST"])
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
        print("CONTROLLER ERROR:", str(e))
        return jsonify({"error": str(e)}), 500
    
@workorder_bp.route("/admin/type/usage-check", methods=["POST"])
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
        print("CONTROLLER ERROR:", str(e))
        return jsonify({"error": str(e)}), 500
    

@workorder_bp.route("/admin/description/usage-check", methods=["POST"])
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
        print("CONTROLLER ERROR:", str(e))
        return jsonify({"error": str(e)}), 500

@workorder_bp.route("/admin/register", methods=["POST"])
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
        
        
        
@workorder_bp.route("/admin/get-user/<email>", methods=["GET"])
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

@workorder_bp.route("/admin/update-user", methods=["PUT"])
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
