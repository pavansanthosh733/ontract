
import logging

from flask import Blueprint, request, jsonify

from app.models.ai_report_model import AIReportModel
from app.services.ai_report_service import generate_ai_report
from app.utils.ai_prompt_validator import validate_prompt

ai_report_bp = Blueprint("ai_report", __name__)

logging.info("✅ ai_report_controller loaded successfully")


@ai_report_bp.route("/contractors", methods=["GET"])
def get_contractors():
    try:
        data = AIReportModel.get_contractors()
        return jsonify({"data": data}), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@ai_report_bp.route("/generate", methods=["POST"])
def generate_report():
    try:
        data = request.get_json(silent=True) or {}

        # Get user prompt
        raw_prompt = data.get("prompt")

        # Validate & sanitize prompt
        try:
            prompt = validate_prompt(raw_prompt)
        except ValueError as validation_error:
            return jsonify({
                "error": str(validation_error)
            }), 400

        # Generate AI Report
        result = generate_ai_report(prompt, data)

        return jsonify(result), 200

    except Exception as e:
        logging.exception("AI REPORT ERROR")

        return jsonify({
            "error": str(e),
            "type": type(e).__name__
        }), 500

