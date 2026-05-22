from flask import Blueprint, request, jsonify
import traceback
from app.services.ai_report_service import generate_ai_report
from app.models.ai_report_model import AIReportModel

ai_report_bp = Blueprint("ai_report", __name__)

print("✅ ai_report_controller loaded successfully")


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
        prompt = (data.get("prompt") or "").strip()

        if not prompt:
            return jsonify({"error": "Prompt is required"}), 400

        result = generate_ai_report(prompt, data)

        return jsonify(result), 200

    except Exception as e:
        print("\n========== AI REPORT ERROR ==========")
        traceback.print_exc()
        print("=====================================\n")

        return jsonify({
            "error": str(e),
            "type": type(e).__name__
        }), 500