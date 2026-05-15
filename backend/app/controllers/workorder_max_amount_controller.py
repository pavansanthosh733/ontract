import logging
from flask import Blueprint, request, jsonify
from app.models.workorder_max_amount_model import WorkorderMaxAmountModel

workorder_max_amount_bp = Blueprint(
    "workorder_max_amount_bp",
    __name__
)

# ---------------------------------------------------
# GET ACTIVE MAX AMOUNT (USED BY WORK ORDER VALIDATION)
# ---------------------------------------------------
@workorder_max_amount_bp.route("/workorder-max-amount", methods=["GET"])
def get_active_max_amount():
    try:
        data = WorkorderMaxAmountModel.get_active_max_amount()
        return jsonify({
            "success": True,
            "data": data
        }), 200
    except Exception as e:
        logging.error("Error fetching max amount", exc_info=True)
        return jsonify({
            "success": False,
            "message": str(e)
        }), 500


# ---------------------------------------------------
# CREATE MAX AMOUNT
# ---------------------------------------------------
@workorder_max_amount_bp.route("/workorder-max-amount", methods=["POST"])
def create_max_amount():
    try:
        payload = request.json

        WorkorderMaxAmountModel.create_max_amount(
            max_amount=payload.get("max_amount"),
            currency_code=payload.get("currency_code", "INR"),
            status=payload.get("status", "Active"),
            created_by=payload.get("created_by")
        )

        return jsonify({
            "success": True,
            "message": "Max amount created successfully"
        }), 201

    except Exception as e:
        logging.error("Error creating max amount", exc_info=True)
        return jsonify({
            "success": False,
            "message": str(e)
        }), 500


# ---------------------------------------------------
# UPDATE MAX AMOUNT
# ---------------------------------------------------
@workorder_max_amount_bp.route("/workorder-max-amount/<int:id>", methods=["PUT"])
def update_max_amount(id):
    try:
        payload = request.json

        WorkorderMaxAmountModel.update_max_amount(
            id=id,
            max_amount=payload.get("max_amount"),
            currency_code=payload.get("currency_code", "INR"),
            status=payload.get("status", "Active"),
            updated_by=payload.get("updated_by")
        )

        return jsonify({
            "success": True,
            "message": "Max amount updated successfully"
        }), 200

    except Exception as e:
        logging.error("Error updating max amount", exc_info=True)
        return jsonify({
            "success": False,
            "message": str(e)
        }), 500


# ---------------------------------------------------
# DELETE MAX AMOUNT (SOFT DELETE)
# ---------------------------------------------------
@workorder_max_amount_bp.route("/workorder-max-amount/<int:id>", methods=["DELETE"])
def delete_max_amount(id):
    try:
        WorkorderMaxAmountModel.delete_max_amount(id)

        return jsonify({
            "success": True,
            "message": "Max amount deleted successfully"
        }), 200

    except Exception as e:
        logging.error("Error deleting max amount", exc_info=True)
        return jsonify({
            "success": False,
            "message": str(e)
        }), 500


# ---------------------------------------------------
# GET ALL CONFIGS (ADMIN)
# ---------------------------------------------------
@workorder_max_amount_bp.route("/workorder-max-amount/all", methods=["GET"])
def get_all_max_amounts():
    try:
        data = WorkorderMaxAmountModel.get_all_configs()
        return jsonify({
            "success": True,
            "data": data
        }), 200
    except Exception as e:
        logging.error("Error fetching all max amounts", exc_info=True)
        return jsonify({
            "success": False,
            "message": str(e)
        }), 500