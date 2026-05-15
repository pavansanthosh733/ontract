# app/controllers/zone_bp.py

import logging
from flask import Blueprint, request, jsonify
from app.models.zone_model import ZoneModel
from app.models.zone_model import ZoneModel, DuplicateZoneError

zone_bp = Blueprint("zone_bp", __name__, url_prefix="/api/zone")


# ==========================================================
# GET ALL ZONES
# ==========================================================
@zone_bp.get("/")
def get_zones():
    logging.info("ZONE CONTROLLER → Fetching all zones")
    try:
        data = ZoneModel.get_all_zones()
        return jsonify(data), 200

    except Exception as e:
        logging.error(f"Error fetching zones: {e}")
        return jsonify({"error": str(e)}), 500


# ==========================================================
# GET SINGLE ZONE
# ==========================================================
@zone_bp.get("/<int:id>")
def get_single_zone(id):
    logging.info(f"ZONE CONTROLLER → Fetching zone id={id}")

    try:
        data = ZoneModel.get_zone_by_id(id)

        if not data:
            return jsonify({"error": "Zone not found"}), 404

        return jsonify(data), 200

    except Exception as e:
        logging.error(f"Error fetching zone: {e}")
        return jsonify({"error": str(e)}), 500


# ==========================================================
# ADD NEW ZONE
# ==========================================================


# ==========================================================
# ADD NEW ZONE
# ==========================================================
@zone_bp.post("/")
def add_zone():
    try:
        data = request.get_json() or {}

        zone_name = data.get("zone_name")
        status = data.get("status")
        state_id = data.get("state_id")
        city_ids = data.get("city_ids", [])

        # -------- Validation --------
        if not zone_name:
            return jsonify({"success": False, "message": "zone_name is required"}), 400

        if not status:
            return jsonify({"success": False, "message": "status is required"}), 400

        if not state_id:
            return jsonify({"success": False, "message": "state_id is required"}), 400

        if not city_ids or len(city_ids) == 0:
            return jsonify({"success": False, "message": "Select at least one city"}), 400

        ZoneModel.insert_zone(
            zone_name=zone_name,
            status=status,
            state_id=state_id,
            city_ids=city_ids
        )

        return jsonify({
            "success": True,
            "message": "Zone created successfully"
        }), 201

    except DuplicateZoneError as e:
        return jsonify({
            "success": False,
            "message": str(e)
        }), 400

    except Exception as e:
        logging.error(f"Error creating zone: {e}")
        return jsonify({
            "success": False,
            "message": str(e)
        }), 500
        
        
# ==========================================================
# UPDATE ZONE
# ==========================================================
@zone_bp.put("/<int:id>")
def update_zone(id):
    try:
        zone_name = request.json.get("zone_name")
        status = request.json.get("status")

        if not zone_name:
            return jsonify({"error": "zone_name is required"}), 400

        if not status:
            return jsonify({"error": "status is required"}), 400

        ZoneModel.update_zone(
            id=id,
            zone_name=zone_name,
            status=status
        )

        return jsonify({
            "message": "Zone updated successfully"
        }), 200

    except Exception as e:
        logging.error(f"Error updating zone: {e}")
        return jsonify({"error": str(e)}), 500


# ==========================================================
# DELETE ZONE
# ==========================================================
@zone_bp.delete("/<int:id>")
def delete_zone(id):
    try:
        ZoneModel.delete_zone(id)

        return jsonify({
            "message": "Zone deleted successfully"
        }), 200

    except Exception as e:
        logging.error(f"Error deleting zone: {e}")
        return jsonify({"error": str(e)}), 500


# ==========================================================
# REMOVE CITY FROM PARTICULAR ZONE
# ==========================================================
@zone_bp.delete("/<zone_id>/city/<int:city_id>")
def remove_city_from_zone(zone_id, city_id):
    try:
        logging.info(
            f"ZONE CONTROLLER → Removing city_id={city_id} from zone_id={zone_id}"
        )

        if not zone_id or not city_id:
            return jsonify({
                "error": "zone_id and city_id are required"
            }), 400

        result = ZoneModel.remove_city_from_zone(zone_id, city_id)

        if result == 0:
            return jsonify({
                "error": "City not mapped to this zone"
            }), 404

        return jsonify({
            "message": "City removed successfully"
        }), 200

    except Exception as e:
        logging.exception(
            f"ZONE CONTROLLER ERROR → zone_id={zone_id}, city_id={city_id}, error={e}"
        )

        return jsonify({
            "error": "Failed to remove city"
        }), 500

# ==========================================================
# GET AVAILABLE CITIES BY STATE
# only cities not attached to zone
# ==========================================================
@zone_bp.get("/available-cities/<int:state_id>")
def get_available_cities(state_id):
    try:
        data = ZoneModel.get_available_cities_by_state(state_id)
        return jsonify(data), 200

    except Exception as e:
        logging.error(f"Error fetching available cities: {e}")
        return jsonify({"error": str(e)}), 500


# ==========================================================
# ADD MORE CITIES TO EXISTING ZONE
# ==========================================================
@zone_bp.post("/<zone_id>/add-cities")
def add_more_cities(zone_id):
    try:
        city_ids = request.json.get("city_ids", [])

        if not city_ids:
            return jsonify({"error": "city_ids required"}), 400

        ZoneModel.add_more_cities(zone_id, city_ids)

        return jsonify({
            "message": "Cities added successfully"
        }), 200

    except Exception as e:
        logging.error(f"Error adding cities: {e}")
        return jsonify({"error": str(e)}), 500
    
    
    
# ==========================================================
# GET ALL STATES FOR ZONE PAGE
# ==========================================================
@zone_bp.get("/states")
def get_states():
    try:
        data = ZoneModel.get_all_states()
        return jsonify(data), 200

    except Exception as e:
        logging.error(f"Error fetching states: {e}")
        return jsonify({"error": str(e)}), 500