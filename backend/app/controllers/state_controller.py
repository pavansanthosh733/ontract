# app/controllers/state_bp.py
import logging
from flask import Blueprint, request, jsonify
from app.models.state_model import StateModel, DuplicateStateError

state_bp = Blueprint("state_bp", __name__, url_prefix="/api/state")
admin_state_bp = Blueprint("admin_state_bp", __name__, url_prefix="/api/admin/state")
contractor_state_bp = Blueprint("contractor_state_bp", __name__, url_prefix="/api/contractor/state")

# -------------------------------
# GET ALL STATES
# -------------------------------
@state_bp.get("/")
def get_states():
    logging.info("STATE CONTROLLER CALLED")
    data = StateModel.get_all_states()
    return jsonify(data), 200


# -------------------------------
# CREATE NEW STATE
# -------------------------------
@state_bp.post("/")
def add_state():
    try:
        data = request.get_json() or {}
        state_name = data.get("state_name")
        region_id = data.get("region_id")
        status = data.get("status")

        if not state_name:
            return jsonify({"success": False, "message": "state_name is required"}), 400
        if not region_id:
            return jsonify({"success": False, "message": "region_id is required"}), 400
        if not status:
            return jsonify({"success": False, "message": "status is required"}), 400

        StateModel.insert_state(state_name, region_id, status)

        return jsonify({
            "success": True,
            "message": "State created successfully"
        }), 201

    except DuplicateStateError as e:
        return jsonify({
            "success": False,
            "message": str(e)
        }), 400

    except Exception as e:
        logging.exception("Add state error")
        return jsonify({
            "success": False,
            "message": "Internal server error"
        }), 500


# -------------------------------
# UPDATE STATE
# -------------------------------
@state_bp.put("/<int:id>")
def update_state(id):
    try:
        data = request.get_json() or {}
        status = data.get("status")

        if not status:
            return jsonify({"success": False, "message": "status is required"}), 400

        StateModel.update_state(id, status)

        return jsonify({
            "success": True,
            "message": "State updated successfully"
        }), 200

    except Exception as e:
        logging.exception("Update state error")
        return jsonify({
            "success": False,
            "message": "Internal server error"
        }), 500


# -------------------------------
# DELETE STATE
# -------------------------------
@state_bp.delete("/<int:id>")
def delete_state(id):
    try:
        StateModel.delete_state(id)
        return jsonify({
            "success": True,
            "message": "State deleted successfully"
        }), 200

    except Exception as e:
        logging.exception("Delete state error")
        return jsonify({
            "success": False,
            "message": "Internal server error"
        }), 500


@state_bp.get("/by-region/<int:region_id>")
def get_states_by_region(region_id):
    data = StateModel.get_states_by_region(region_id)
    return jsonify(data), 200


@state_bp.get("/id-types")
def get_identity_types():
    data = StateModel.get_id_types()
    return jsonify(data), 200

# -------------------------------
# GET ALL STATES
# -------------------------------
@admin_state_bp.get("/")
def get_states():
    logging.info("STATE CONTROLLER CALLED")
    data = StateModel.get_all_states()
    return jsonify(data), 200


# -------------------------------
# CREATE NEW STATE
# -------------------------------
@admin_state_bp.post("/")
def add_state():
    try:
        data = request.get_json() or {}
        state_name = data.get("state_name")
        region_id = data.get("region_id")
        status = data.get("status")

        if not state_name:
            return jsonify({"success": False, "message": "state_name is required"}), 400
        if not region_id:
            return jsonify({"success": False, "message": "region_id is required"}), 400
        if not status:
            return jsonify({"success": False, "message": "status is required"}), 400

        StateModel.insert_state(state_name, region_id, status)

        return jsonify({
            "success": True,
            "message": "State created successfully"
        }), 201

    except DuplicateStateError as e:
        return jsonify({
            "success": False,
            "message": str(e)
        }), 400

    except Exception as e:
        logging.exception("Add state error")
        return jsonify({
            "success": False,
            "message": "Internal server error"
        }), 500


# -------------------------------
# UPDATE STATE
# -------------------------------
@admin_state_bp.put("/<int:id>")
def update_state(id):
    try:
        data = request.get_json() or {}
        status = data.get("status")

        if not status:
            return jsonify({"success": False, "message": "status is required"}), 400

        StateModel.update_state(id, status)

        return jsonify({
            "success": True,
            "message": "State updated successfully"
        }), 200

    except Exception as e:
        logging.exception("Update state error")
        return jsonify({
            "success": False,
            "message": "Internal server error"
        }), 500


# -------------------------------
# DELETE STATE
# -------------------------------
@admin_state_bp.delete("/<int:id>")
def delete_state(id):
    try:
        StateModel.delete_state(id)
        return jsonify({
            "success": True,
            "message": "State deleted successfully"
        }), 200

    except Exception as e:
        logging.exception("Delete state error")
        return jsonify({
            "success": False,
            "message": "Internal server error"
        }), 500


@admin_state_bp.get("/by-region/<int:region_id>")
def get_states_by_region(region_id):
    data = StateModel.get_states_by_region(region_id)
    return jsonify(data), 200


@admin_state_bp.get("/id-types")
def get_identity_types():
    data = StateModel.get_id_types()
    return jsonify(data), 200


# -------------------------------
# GET ALL STATES
# -------------------------------
@contractor_state_bp.get("/")
def get_states():
    logging.info("STATE CONTROLLER CALLED")
    data = StateModel.get_all_states()
    return jsonify(data), 200


# -------------------------------
# CREATE NEW STATE
# -------------------------------
@contractor_state_bp.post("/")
def add_state():
    try:
        data = request.get_json() or {}
        state_name = data.get("state_name")
        region_id = data.get("region_id")
        status = data.get("status")

        if not state_name:
            return jsonify({"success": False, "message": "state_name is required"}), 400
        if not region_id:
            return jsonify({"success": False, "message": "region_id is required"}), 400
        if not status:
            return jsonify({"success": False, "message": "status is required"}), 400

        StateModel.insert_state(state_name, region_id, status)

        return jsonify({
            "success": True,
            "message": "State created successfully"
        }), 201

    except DuplicateStateError as e:
        return jsonify({
            "success": False,
            "message": str(e)
        }), 400

    except Exception as e:
        logging.exception("Add state error")
        return jsonify({
            "success": False,
            "message": "Internal server error"
        }), 500


# -------------------------------
# UPDATE STATE
# -------------------------------
@contractor_state_bp.put("/<int:id>")
def update_state(id):
    try:
        data = request.get_json() or {}
        status = data.get("status")

        if not status:
            return jsonify({"success": False, "message": "status is required"}), 400

        StateModel.update_state(id, status)

        return jsonify({
            "success": True,
            "message": "State updated successfully"
        }), 200

    except Exception as e:
        logging.exception("Update state error")
        return jsonify({
            "success": False,
            "message": "Internal server error"
        }), 500


# -------------------------------
# DELETE STATE
# -------------------------------
@contractor_state_bp.delete("/<int:id>")
def delete_state(id):
    try:
        StateModel.delete_state(id)
        return jsonify({
            "success": True,
            "message": "State deleted successfully"
        }), 200

    except Exception as e:
        logging.exception("Delete state error")
        return jsonify({
            "success": False,
            "message": "Internal server error"
        }), 500


@contractor_state_bp.get("/by-region/<int:region_id>")
def get_states_by_region(region_id):
    data = StateModel.get_states_by_region(region_id)
    return jsonify(data), 200


@contractor_state_bp.get("/id-types")
def get_identity_types():
    data = StateModel.get_id_types()
    return jsonify(data), 200

@admin_state_bp.get("/active")
def get_active_states():
    data = StateModel.get_active_states()
    return jsonify(data), 200