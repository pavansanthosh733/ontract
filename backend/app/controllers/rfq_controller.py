import os
import json
import logging
from datetime import datetime
from werkzeug.utils import secure_filename
from app.models.database import db
from flask import Blueprint, request, jsonify
from app.models.rfq_model import RFQModel


rfq_bp = Blueprint("rfq", __name__)
admin_rfq_bp = Blueprint("admin_rfq", __name__)

UPLOAD_FOLDER = os.path.join(os.path.dirname(os.path.abspath(__file__)), "../../uploads")
ALLOWED_EXTENSIONS = {
    "jpg", "jpeg", "png", "gif",
    "mp4", "mov", "avi", "webm"
}

@admin_rfq_bp.route("/rfq/create", methods=["POST"])
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
        
        def get_float(name):
            val = form.get(name)
            return float(val) if val not in (None, "") else None

        data = {
            "CATEGORY_ID": get_int("CATEGORY_ID"),
            "REGION_ID": get_int("REGION_ID"),
            "STATE_ID": get_int("STATE_ID"),
            "CITY_ID": get_int("CITY_ID"),
            "RFQ_TITLE": form.get("RFQ_TITLE", "").strip(),
            "CLOSING_DATE": form.get("CLOSING_DATE"),
            "DESCRIPTION": form.get("DESCRIPTION", "").strip(),
            "REMARKS": form.get("REMARKS", "").strip(),
            "AMOUNT": get_float("AMOUNT"),
            "SITE_SURVEY_REQUIRED": get_int("SITE_SURVEY_REQUIRED") or 0,
            "ITEMS": json.loads(form.get("ITEMS", "[]")),
            "created_by": form.get("ADMIN_ID")
        }

        required = ["CATEGORY_ID","REGION_ID","STATE_ID","CITY_ID","RFQ_TITLE","CLOSING_DATE"]

        missing = [field for field in required if not data.get(field)]

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
            unique_name = f"{datetime.now().strftime('%Y%m%d%H%M%S%f')}_{filename}"
            save_dir = os.path.join(UPLOAD_FOLDER, "rfqattachments")
            os.makedirs(save_dir, exist_ok=True)
            save_path = os.path.join(save_dir, unique_name)
            file.save(save_path)
            db_path = f"/uploads/rfqattachments/{unique_name}"
            attachment_list.append(db_path)

        data["attachments"] = attachment_list

        # ==========================================
        # CREATE RFQ
        # ==========================================
        rfq, error = RFQModel.create_rfq(data)

        if error:
            return jsonify({
                "error": error
            }), 400

        # ==========================================
        # RETURN RESPONSE
        # ==========================================
        return jsonify({
            "success": True,
            "message": f"RFQ Created Successfully.\nRFQ Number: {rfq['rfq_no']}",
            "rfq": rfq
        }), 201

    except Exception as e:

        logging.exception("CREATE RFQ ERROR")

        return jsonify({
            "error": str(e)
        }), 500
    
@rfq_bp.route("/provider/rfq/new/<int:contractor_id>", methods=["GET"])
def get_provider_new_rfqs(contractor_id):

    try:
        data = RFQModel.get_provider_new_rfqs(contractor_id)
        return jsonify(data), 200
    except Exception as e:
        return jsonify({
            "error": str(e)
        }), 500

@rfq_bp.route("/provider/rfq/<string:rfq_no>", methods=["GET"])
def get_provider_rfq_details(rfq_no):
    try:
        data = RFQModel.get_provider_rfq_details(rfq_no)
        if not data:
            return jsonify({"error": "RFQ Not Found"}), 404
        return jsonify(data), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@rfq_bp.route("/provider/rfq/respond", methods=["POST"])
def submit_provider_rfq_response():
    try:
        data = request.get_json()
        response, error = RFQModel.submit_provider_rfq_response(data)
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
    
@rfq_bp.route("/provider/rfq/responded/<int:contractor_id>", methods=["GET"])
def get_provider_responded_rfqs(contractor_id):
    try:
        data = RFQModel.get_provider_responded_rfqs(contractor_id)
        return jsonify(data), 200
    except Exception as e:
        return jsonify({
            "error": str(e)
        }), 500
    
@admin_rfq_bp.route("/admin/rfq/<string:rfq_no>/responses", methods=["GET"])
def get_admin_rfq_responses(rfq_no):
    try:
        data = RFQModel.get_admin_rfq_responses(rfq_no)
        return jsonify(data),200
    except Exception as e:
        return jsonify({
            "error":str(e)
        }),500
    
@admin_rfq_bp.route("/admin/rfq/list", methods=["GET"])
def get_admin_rfq_list():
    try:
        data = RFQModel.get_admin_rfq_list()
        return jsonify(data), 200
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500


@admin_rfq_bp.route("/admin/rfq/response/<int:response_id>", methods=["GET"])
def get_admin_rfq_response_details(response_id):

    try:
        data = RFQModel.get_admin_rfq_response_details(response_id)
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

@admin_rfq_bp.route("/admin/rfq/open/list", methods=["GET"])
def get_open_rfq_list():
    try:
        data = RFQModel.get_open_rfq_list()
        return jsonify(data), 200

    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500
    
@admin_rfq_bp.route("/admin/rfq/publish", methods=["POST"])
def publish_rfq():

    try:
        data = request.get_json()
        rfq_no = data.get("rfq_no")
        publish_type = data.get("publish_type")
        location = data.get("location")
        state_ids = data.get("state_ids", [])

        if not rfq_no:
            return jsonify({"message": "RFQ No is required"}), 400

        if not publish_type:
            return jsonify({"message": "Publish Type is required"}), 400
        if not location:
            return jsonify({"message": "Location is required"}), 400

        if location == "STATE" and not state_ids:
            return jsonify({"message": "Please select at least one state"}), 400
        
        result = RFQModel.publish_rfq(rfq_no, publish_type, location, state_ids)

        if result:
            return jsonify({"message": "RFQ Published Successfully"}), 200

        return jsonify({"message": "Failed to Publish RFQ"}), 400

    except Exception as e:
        print(e)
        return jsonify({"message": str(e)}), 500
    
@admin_rfq_bp.route("/admin/rfq/negotiation", methods=["POST"])
def create_negotiation():
    try:
        data = request.get_json()
        result, error = RFQModel.create_negotiation(data)
        if error:
            return jsonify({"error": error}), 400

        return jsonify(result), 200

    except Exception as e:
        logging.exception("CREATE NEGOTIATION API ERROR")
        return jsonify({"error": str(e)}), 500

@rfq_bp.route("/provider/rfq/negotiations/<int:contractor_id>", methods=["GET"])
def get_provider_negotiations(contractor_id):

    try:
        result, error = RFQModel.get_provider_negotiations(contractor_id)
        if error:
            return jsonify({"error": error}), 400

        return jsonify(result), 200

    except Exception as e:
        logging.exception("GET PROVIDER NEGOTIATIONS ERROR")
        return jsonify({"error": str(e)}), 500

@rfq_bp.route("/provider/rfq/negotiation/<int:negotiation_id>", methods=["GET"])
def get_provider_negotiation_details(negotiation_id):

    try:

        result, error = RFQModel.get_provider_negotiation_details(negotiation_id)
        if error:
            return jsonify({"error": error}), 400

        return jsonify(result), 200

    except Exception as e:
        logging.exception("GET PROVIDER NEGOTIATION DETAILS ERROR")
        return jsonify({"error": str(e)}), 500

@rfq_bp.route("/provider/rfq/negotiation/reply", methods=["POST"])
def provider_negotiation_reply():

    try:
        data = request.get_json()
        result, error = RFQModel.submit_provider_negotiation_reply(data)
        if error:
            return jsonify({"error": error}), 400

        return jsonify(result), 200

    except Exception as e:
        logging.exception("PROVIDER NEGOTIATION REPLY CONTROLLER ERROR")
        return jsonify({"error": str(e)}), 500

@admin_rfq_bp.route("/rfq/negotiations", methods=["GET"])
def get_rfq_negotiations():

    try:
        result, error = RFQModel.get_admin_rfq_negotiations()
        if error:
            return jsonify({"error": error}), 400

        return jsonify(result), 200

    except Exception as e:
        logging.exception("GET ADMIN NEGOTIATIONS ERROR")
        return jsonify({"error": str(e)}), 500

@admin_rfq_bp.route("/rfq/negotiations/<rfq_no>", methods=["GET"])
def get_admin_negotiation_contractors(rfq_no):

    try:
        result, error = RFQModel.get_admin_negotiation_contractors(rfq_no)
        if error:
            return jsonify({"error": error}), 400

        return jsonify(result), 200

    except Exception as e:
        logging.exception("GET NEGOTIATION CONTRACTORS")
        return jsonify({"error": str(e)}), 500

@admin_rfq_bp.route("/rfq/negotiation/<int:negotiation_id>",methods=["GET"])
def get_negotiation_details(negotiation_id):

    try:
        result, error = RFQModel.get_negotiation_details(negotiation_id)
        if error:
            return jsonify({"error": error}), 400

        return jsonify(result), 200

    except Exception as e:
        logging.exception("GET NEGOTIATION DETAILS ERROR")
        return jsonify({"error": str(e)}), 500

@admin_rfq_bp.route("/rfq/negotiation/approve",methods=["POST"])
def approve_negotiation():

    try:
        data = request.get_json()
        negotiation_id = data.get("negotiation_id")

        if not negotiation_id:
            return jsonify({
                "status": False,
                "message": "Negotiation ID is required."
            }), 400

        result = RFQModel.approve_negotiation(negotiation_id)
        return jsonify(result)

    except Exception as e:

        return jsonify({
            "status": False,
            "message": str(e)
        }), 500

@admin_rfq_bp.route("/rfq/negotiation/create",methods=["POST"])
def create_negotiation_again():

    try:

        data = request.get_json()
        result, error = RFQModel.create_negotiation_again(data)
        if error:
            return jsonify({
                "status": False,
                "message": error
            }), 400
        return jsonify(result), 200

    except Exception as e:
        return jsonify({
            "status": False,
            "message": str(e)
        }), 500

    
@rfq_bp.route("/provider/rfq/assigned/<int:contractor_id>",methods=["GET"])
def get_provider_assigned_rfqs(contractor_id):

    result, error = RFQModel.get_provider_assigned_rfqs(contractor_id)
    if error:
        return jsonify({
            "status": False,
            "message": error
        }), 400

    return jsonify(result)

@rfq_bp.route("/provider/rfq/assigned/details/<rfq_no>/<int:contractor_id>",methods=["GET"])
def get_provider_assigned_rfq_details(rfq_no, contractor_id):

    try:
        data, err = RFQModel.get_provider_assigned_rfq_details(rfq_no,contractor_id)
        if err:
            return jsonify({"error": err}), 400

        return jsonify(data), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500

@rfq_bp.route("/provider/rfq/assigned/action",methods=["POST"])
def provider_assigned_action():

    try:

        data = request.get_json()
        result, err = RFQModel.provider_assigned_action(data)
        if err:
            return jsonify({"error": err}), 400
        return jsonify(result), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500

@rfq_bp.route("/provider/rfq/accepted/<contractor_id>",methods=["GET"])
def get_provider_accepted_rfqs(contractor_id):

    try:
        data, err = RFQModel.get_provider_accepted_rfqs(contractor_id)
        if err:
            return jsonify({"error": err}), 400
        return jsonify(data), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500

@rfq_bp.route("/provider/rfq/details/<rfq_no>/<contractor_id>", methods=["GET"])
def get_provider_accepted_rfq_details(rfq_no, contractor_id):
    try:
        data, err = RFQModel.get_provider_accepted_rfq_details(rfq_no,contractor_id)
        if err:
            return jsonify({"error": err}), 400
        return jsonify(data), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@rfq_bp.route("/provider/rfq/completion", methods=["POST"])
def submit_provider_rfq_completion():

    try:

        if not request.content_type.startswith("multipart/form-data"):
            return jsonify({
                "error": "Content-Type must be multipart/form-data"
            }), 400

        form = request.form
        files = request.files
        rfq_id = form.get("rfq_id")
        contractor_id = form.get("contractor_id")
        remarks = form.get("remarks", "").strip()
        if not rfq_id:
            return jsonify({"error": "RFQ ID is required"}), 400
        if not contractor_id:
            return jsonify({"error": "Contractor ID is required"}), 400

        attachment_list = []

        for file in files.getlist("images[]"):
            if not file or not file.filename:
                continue

            filename = secure_filename(file.filename)
            unique_name = (f"{datetime.now().strftime('%Y%m%d%H%M%S%f')}_{filename}")
            save_dir = os.path.join(UPLOAD_FOLDER,"rfqcompletion")
            os.makedirs(save_dir, exist_ok=True)
            save_path = os.path.join(save_dir,unique_name)
            file.save(save_path)
            attachment_list.append(f"/uploads/rfqcompletion/{unique_name}")

        data = {
            "rfq_id": rfq_id,
            "contractor_id": contractor_id,
            "remarks": remarks,
            "attachments": attachment_list
        }

        result, err = RFQModel.submit_provider_rfq_completion(data)

        if err:
            return jsonify({
                "success": False,
                "error": err
            }), 400

        return jsonify({
            "success": True,
            "message": "Completion submitted successfully."
        }), 200

    except Exception as e:
        logging.exception("RFQ COMPLETION ERROR")
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500


@admin_rfq_bp.route("/admin/rfq/completed/details/<rfq_no>",methods=["GET"])
def get_admin_completed_rfq_details(rfq_no):
    result, error = RFQModel.get_admin_completed_rfq_details(rfq_no)

    if error:
        return jsonify({
            "success": False,
            "message": error
        }), 400

    return jsonify(result), 200

@admin_rfq_bp.route("/admin/rfq/completed",methods=["GET"])
def get_completed_rfqs():

    result, error = RFQModel.get_completed_rfqs()

    if error:
        return jsonify({
            "success": False,
            "message": error
        }), 400

    return jsonify(result), 200


@admin_rfq_bp.route("/admin/rfq/completion/reopen",methods=["POST"])
def reopen_rfq_completion():
    data = request.get_json()
    result, error = RFQModel.reopen_rfq_completion(data)

    if error:
        return jsonify({
            "success": False,
            "message": error
        }), 400

    return jsonify({
        "success": True,
        "message": "RFQ reopened successfully."
    }), 200


@admin_rfq_bp.route("/admin/rfq/completion/approve",methods=["POST"])
def approve_rfq_completion():

    try:
        data = request.get_json()
        result, error = RFQModel.approve_rfq_completion(data)
        if error:
            return jsonify({
                "success": False,
                "message": error
            }), 400

        return jsonify({
            "success": True,
            "message": "RFQ closed successfully."
        }), 200

    except Exception as e:
        return jsonify({
            "success": False,
            "message": str(e)
        }), 500


@rfq_bp.route("/provider/rfq/completed/<contractor_id>", methods=["GET"])
def get_completed_rfqs(contractor_id):

    result, error = RFQModel.get_provider_completed_rfqs(contractor_id)

    if error:
        return jsonify({"success": False, "message": error}), 500

    return jsonify(result), 200


@rfq_bp.route("/provider/rfq/reopen/<contractor_id>", methods=["GET"])
def get_reopen_rfqs(contractor_id):

    result, error = RFQModel.get_reopen_rfqs(contractor_id)

    if error:
        return jsonify({"success": False, "message": error}), 500

    return jsonify(result), 200


@rfq_bp.route("/provider/rfq/closed/<contractor_id>", methods=["GET"])
def get_closed_rfqs(contractor_id):

    result, error = RFQModel.get_closed_rfqs(contractor_id)

    if error:
        return jsonify({"success": False, "message": error}), 500

    return jsonify(result), 200


@admin_rfq_bp.route("/rfq/response/approve", methods=["POST"])
def approve_response():
    try:
        data = request.get_json()
        response_id = data.get("response_id")

        if not response_id:
            return jsonify({
                "status": False,
                "message": "Response ID is required."
            }), 400

        result = RFQModel.approve_response(response_id)
        return jsonify(result)

    except Exception as e:
        return jsonify({
            "status": False,
            "message": str(e)
        }), 500