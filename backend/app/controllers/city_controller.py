# app/controllers/city_bp.py

import logging
from flask import Blueprint, request, jsonify
from app.models.city_model import CityModel, DuplicateCityError

city_bp = Blueprint("city_bp", __name__, url_prefix="/api/city")


# ==========================================================
# GET ALL CITIES
# ==========================================================
@city_bp.get("/")
def get_cities():
    logging.info("CITY CONTROLLER → Fetching all cities")
    try:
        data = CityModel.get_all_cities()
        return jsonify(data), 200
    except Exception as e:
        logging.error(f"Error fetching cities: {e}")
        return jsonify({"success": False, "message": "Internal server error"}), 500


# ==========================================================
# ADD NEW CITY
# ==========================================================
@city_bp.post("/")
def add_city():
    try:
        data = request.get_json() or {}
        city_name = data.get("city_name")
        region_id = data.get("region_id")
        state_id = data.get("state_id")
        status = data.get("status")

        if not city_name:
            return jsonify({"success": False, "message": "city_name is required"}), 400
        if not region_id:
            return jsonify({"success": False, "message": "region_id is required"}), 400
        if not state_id:
            return jsonify({"success": False, "message": "state_id is required"}), 400
        if not status:
            return jsonify({"success": False, "message": "status is required"}), 400

        CityModel.insert_city(city_name, region_id, state_id, status)

        return jsonify({
            "success": True,
            "message": "City created successfully"
        }), 201

    except DuplicateCityError as e:
        return jsonify({
            "success": False,
            "message": str(e)
        }), 400

    except Exception as e:
        logging.error(f"Error adding city: {e}")
        return jsonify({
            "success": False,
            "message": "Internal server error"
        }), 500


# ==========================================================
# UPDATE CITY
# ==========================================================
@city_bp.put("/<int:id>")
def update_city(id):
    try:
        data = request.get_json() or {}
        status = data.get("status")

        if not status:
            return jsonify({"success": False, "message": "status is required"}), 400

        CityModel.update_city(id, status)

        return jsonify({
            "success": True,
            "message": "City updated successfully"
        }), 200

    except Exception as e:
        logging.error(f"Error updating city: {e}")
        return jsonify({
            "success": False,
            "message": "Internal server error"
        }), 500


# ==========================================================
# DELETE CITY
# ==========================================================
@city_bp.delete("/<int:id>")
def delete_city(id):
    try:
        CityModel.delete_city(id)
        return jsonify({
            "success": True,
            "message": "City deleted successfully"
        }), 200
    except Exception as e:
        logging.error(f"Error deleting city: {e}")
        return jsonify({
            "success": False,
            "message": "Internal server error"
        }), 500


@city_bp.get("/by-region-state")
def get_city_by_region_state():
    region_id = request.args.get("region_id", type=int)
    state_id = request.args.get("state_id", type=int)

    logging.info(f"CITY FILTER → region={region_id}, state={state_id}")

    if not region_id or not state_id:
        return jsonify([]), 200

    data = CityModel.get_city_by_region_state(region_id, state_id)
    return jsonify(data), 200