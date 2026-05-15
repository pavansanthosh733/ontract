import logging
from flask import Blueprint, request, jsonify
from app.models.region_model import RegionModel, DuplicateRegionError

region_bp = Blueprint("region_bp", __name__, url_prefix="/api/region")


@region_bp.get("/")
def get_regions():
    logging.info("Fetching regions")
    data = RegionModel.get_all_regions()
    return jsonify(data), 200


@region_bp.post("/")
def add_region():
    try:
        data = request.get_json() or {}
        region_name = data.get("region_name")
        status = data.get("status")

        if not region_name:
            return jsonify({"success": False, "message": "region_name is required"}), 400
        if not status:
            return jsonify({"success": False, "message": "status is required"}), 400

        RegionModel.insert_region(region_name, status)

        return jsonify({
            "success": True,
            "message": "Region created successfully"
        }), 201

    except DuplicateRegionError as e:
        return jsonify({
            "success": False,
            "message": str(e)
        }), 400

    except Exception as e:
        logging.exception("Add region error")
        return jsonify({
            "success": False,
            "message": "Internal server error"
        }), 500


@region_bp.put("/<int:id>")
def update_region(id):
    try:
        data = request.get_json() or {}
        region_name = data.get("region_name")
        status = data.get("status")

        if not region_name:
            return jsonify({"success": False, "message": "region_name is required"}), 400
        if not status:
            return jsonify({"success": False, "message": "status is required"}), 400

        RegionModel.update_region(id, region_name, status)

        return jsonify({
            "success": True,
            "message": "Region updated successfully"
        }), 200

    except DuplicateRegionError as e:
        return jsonify({
            "success": False,
            "message": str(e)
        }), 400

    except Exception:
        logging.exception("Update region error")
        return jsonify({
            "success": False,
            "message": "Internal server error"
        }), 500


@region_bp.delete("/<int:id>")
def delete_region(id):
    try:
        RegionModel.delete_region(id)
        return jsonify({
            "success": True,
            "message": "Region deleted successfully"
        }), 200

    except Exception:
        logging.exception("Delete region error")
        return jsonify({
            "success": False,
            "message": "Internal server error"
        }), 500