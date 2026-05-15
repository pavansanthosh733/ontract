from flask import Blueprint, request, jsonify
from app.controllers.workorder_type_controller import (
    create_workorder_type,
    get_all_workorder_types,
    get_workorder_type,
    update_workorder_type,
    delete_workorder_type
)

workorder_type_view = Blueprint("workorder_type_view", __name__)

# CREATE
@workorder_type_view.route("", methods=["POST"])
def create_route():
    try:
        data = request.get_json()
        new_type = create_workorder_type(data)
        return jsonify({"message": "Work Order Type created successfully!", "data": new_type}), 201
    except ValueError as ve:
        return jsonify({"error": str(ve)}), 400
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# READ ALL
@workorder_type_view.route("", methods=["GET"])
def get_all_route():
    try:
        types = get_all_workorder_types()
        return jsonify(types), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# READ ONE
@workorder_type_view.route("/<int:id>", methods=["GET"])
def get_one_route(id):
    try:
        wtype = get_workorder_type(id)
        return jsonify(wtype), 200
    except ValueError as ve:
        return jsonify({"error": str(ve)}), 404
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# UPDATE
@workorder_type_view.route("/<int:id>", methods=["PUT"])
def update_route(id):
    try:
        data = request.get_json()
        wtype = update_workorder_type(id, data)
        return jsonify({"message": "Work Order Type updated successfully!", "data": wtype}), 200
    except ValueError as ve:
        return jsonify({"error": str(ve)}), 404
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# DELETE
@workorder_type_view.route("/<int:id>", methods=["DELETE"])
def delete_route(id):
    try:
        delete_workorder_type(id)
        return jsonify({"message": "Work Order Type deleted successfully!"}), 200
    except ValueError as ve:
        return jsonify({"error": str(ve)}), 404
    except Exception as e:
        return jsonify({"error": str(e)}), 500
