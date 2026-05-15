from flask import Blueprint, request, jsonify, send_file, abort
from app.models.invoice_model import InvoiceModel
import os

invoice_bp = Blueprint("invoice", __name__, url_prefix="/api/admin/invoice")

# Paths
BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
PDF_DIR = os.path.join(BASE_DIR, "static", "invoices")


# =====================================================
# 1️⃣ GENERATE INVOICE (NUMBER + PDF)
# =====================================================
@invoice_bp.route("/generate", methods=["POST"])
def generate_invoice():
    try:
        data = request.get_json(force=True)

        if not data:
            return jsonify({
                "status": "error",
                "message": "Invalid request body"
            }), 400

        # 🔥 THIS IS WHERE IT GOES
        invoice_number, pdf_url = InvoiceModel.create_invoice(data)

        return jsonify({
            "status": "success",
            "invoice_number": invoice_number,
            "pdf_url": pdf_url
        }), 200

    except Exception as e:
        print("🔥 INVOICE GENERATION ERROR:", e)
        return jsonify({
            "status": "error",
            "message": "Invoice generation failed"
        }), 500


# =====================================================
# 2️⃣ DOWNLOAD PDF
# =====================================================
@invoice_bp.route("/download/<filename>", methods=["GET"])
def download_invoice(filename):
    file_path = os.path.join(PDF_DIR, filename)

    print("📄 PDF PATH:", file_path)

    if not os.path.exists(file_path):
        abort(404)

    return send_file(
        file_path,
        as_attachment=True,
        download_name=filename,
        mimetype="application/pdf"
    )