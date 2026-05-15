from flask import Blueprint, request, jsonify
from app.models.admin_reports import WorkorderReportModel

workorder_report_bp = Blueprint("workorder_report", __name__)


# ✅ GET CONTRACTORS
print("✅ workorder_report_controller loaded")
@workorder_report_bp.route("/contractors", methods=["GET"])    
def get_contractors():
    try:
        data = WorkorderReportModel.get_contractors()
        return jsonify({"data": data}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
         
    
# ✅ CONTRACTOR REPORT
@workorder_report_bp.route("/contractor-report", methods=["POST"])
def contractor_report():
    try:
        data = request.get_json()

        start_date = data.get("start_date")
        end_date = data.get("end_date")
        contractor_id = data.get("contractor_id")

        if not start_date or not end_date or not contractor_id:
            return jsonify({"error": "All fields required"}), 400

        result = WorkorderReportModel.get_contractor_report(
            start_date, end_date, contractor_id
        )

        return jsonify({"data": result}), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500
    
    
    

@workorder_report_bp.route("/workorder-report", methods=["POST"])
def get_workorder_report():
    try:
        data = request.get_json()

        start_date = data.get("start_date")
        end_date = data.get("end_date")

        if not start_date or not end_date:
            return jsonify({"error": "Start date and end date required"}), 400

        result = WorkorderReportModel.get_report(start_date, end_date)

        return jsonify({"data": result}), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500
    


# ✅ SUMMARY REPORT (MONTH + YEAR + CATEGORY)

@workorder_report_bp.route("/summary-report", methods=["POST"])
def get_summary_report():
    try:
        data = request.get_json()

        category = data.get("category")   # optional
        year = data.get("year")
        month = data.get("month")

        # ✅ REQUIRED VALIDATION
        if not year or not month:
            return jsonify({"error": "Year and month are required"}), 400

        # ✅ TYPE SAFETY (important)
        try:
            year = int(year)
            month = int(month)
            if category:
                category = int(category)
        except:
            return jsonify({"error": "Invalid input format"}), 400

        result = WorkorderReportModel.get_summary_report(
            category=category,
            year=year,
            month=month
        )

        return jsonify({"data": result}), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500
    
    
# ✅ GET CATEGORIES (DEPARTMENTS)
@workorder_report_bp.route("/categories", methods=["GET"])
def get_categories():
    try:
        data = WorkorderReportModel.get_categories()
        return jsonify({"data": data}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    
# ✅ RATE COMPARISON REPORT
@workorder_report_bp.route("/rate-comparison-report", methods=["POST"])
def get_rate_report():
    try:
        data = request.get_json()

        start_date = data.get("start_date")
        end_date = data.get("end_date")

        # ✅ Validation
        if not start_date or not end_date:
            return jsonify({"error": "Start date and end date required"}), 400

        result = WorkorderReportModel.get_rate_comparison_report(
            start_date, end_date
        )

        return jsonify({"data": result}), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500