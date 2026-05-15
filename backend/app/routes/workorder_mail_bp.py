import logging
from io import BytesIO
from urllib.parse import unquote

from flask import Blueprint, jsonify, request, send_file

from app.controllers.workorder_mail_controller import (
    handle_send_acceptance_mail,
    handle_respond_workorder_get,
    handle_respond_workorder_post,
    handle_respond_workorder_api,
    handle_send_acceptance_mail_maxamount
)

# Blueprint Registration
workorder_mail_bp = Blueprint("workorder_mail_bp", __name__)


# ----------------------------------------------------------------------
# ROUTE 1: SEND ASSIGNMENT EMAIL TO CONTRACTOR
# ----------------------------------------------------------------------
@workorder_mail_bp.route("/send-acceptance-mail/<int:workorder_id>", methods=["POST"])
def send_acceptance_mail(workorder_id):  
    logging.info(f"checkthe workorder_id: '{workorder_id}'") 
    request_data = request.get_json(silent=True)
    base_url = request.host_url.rstrip("/")
    logging.info(f"chesdlkfjslkingby gopi: '{request_data}'")
    response_data, status_code = handle_send_acceptance_mail(
        workorder_id=workorder_id,
        request_data=request_data,
        base_url=base_url
    )
    
    return jsonify(response_data), status_code



@workorder_mail_bp.route("/send-email-acceptence", methods=["POST", "OPTIONS"])
def send_acceptance_mail_maxamount():
    if request.method == "OPTIONS":
        return "", 200
    request_data = request.get_json(silent=True) or {}
    workorder_code = request_data.get("workorder")
    if not workorder_code:
        return jsonify({
            "error": "workorder is required in request body"
        }), 400

    logging.info(f"checkthe workorder_id: '{workorder_code}'")
    logging.info(f"request_data received: '{request_data}'")
    base_url = request.host_url.rstrip("/")
    response_data, status_code = handle_send_acceptance_mail_maxamount(
        workorder_code=workorder_code,
        request_data=request_data,
        base_url=base_url
    )

    return jsonify(response_data), status_code


# ----------------------------------------------------------------------
# ROUTE 2: SERVE WORKORDER IMAGE
# ----------------------------------------------------------------------
@workorder_mail_bp.route("/workorder-image/<int:workorder_id>")
def workorder_image(workorder_id):
    """
    Serve the first image from a workorder as a downloadable file.
    """
    result = handle_get_workorder_image(workorder_id)
    
    # Check if it's an error response (HTML string)
    if isinstance(result, tuple) and isinstance(result[0], str):
        return result
    
    # It's image data
    img_bytes, img_type = result
    return send_file(
        BytesIO(img_bytes),
        mimetype=f"image/{img_type}",
        as_attachment=True,
        download_name=f"workorder_{workorder_id}.{img_type}"
    )


# ----------------------------------------------------------------------
# ROUTE 3: RESPOND TO WORK ORDER (ACCEPT/REJECT)
# ----------------------------------------------------------------------
@workorder_mail_bp.route("/respond-workorder/<int:workorder_id>", methods=["GET", "POST"])
def respond_workorder(workorder_id):
    """
    Contractor response page for accepting or rejecting work order.
    GET: Display response form with Accept/Reject buttons
    POST: Process the contractor's response and notify admins
    """
    # Extract common parameters
    contractor_id = request.args.get("contractor_id")
    contractor_name = unquote(request.args.get("contractor_name", ""))
    timestamp = request.args.get("timestamp")
    
    if request.method == "GET":
        # Display response form
        html_content, status_code = handle_respond_workorder_get(
            workorder_id=workorder_id,
            contractor_id=contractor_id,
            contractor_name=contractor_name,
            timestamp=timestamp
        )
        return html_content, status_code
    
    else:  # POST
        # Process accept/reject action
        action = request.form.get("action")
        remark = request.form.get("remark", "").strip()
        
        html_content, status_code = handle_respond_workorder_post(
            workorder_id=workorder_id,
            contractor_id=contractor_id,
            contractor_name=contractor_name,
            timestamp=timestamp,
            action=action,
            remark=remark
        )
        return html_content, status_code
    
    
@workorder_mail_bp.route("/respond-workorder", methods=["POST"])
def respond_workorder_api():
    if request.method == "OPTIONS":
        return "", 200
    request_data = request.get_json(silent=True)
    if not request_data:
        return jsonify({
            "success": False,
            "message": "Invalid JSON payload"
        }), 400

    response_data, status_code = handle_respond_workorder_api(request_data)
    return jsonify(response_data), status_code