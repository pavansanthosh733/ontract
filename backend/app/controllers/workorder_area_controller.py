from flask import request, jsonify
from app.models.workorder_area import WorkOrderArea

# CREATE
def create_workorder_area():
    try:
        data = request.get_json()
        new_area = WorkOrderArea.create(data)
        return jsonify({"message": "Work Order Area created successfully!", "data": new_area}), 201
    except ValueError as ve:
        return jsonify({"error": str(ve)}), 400
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# GET ALL
def get_all_workorder_areas():
    try:
        areas = WorkOrderArea.get_all()
        return jsonify(areas), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# GET ONE
def get_workorder_area(id):
    try:
        area = WorkOrderArea.get_by_id(id)
        return jsonify(area), 200
    except ValueError as ve:
        return jsonify({"error": str(ve)}), 404
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# UPDATE
def update_workorder_area(id):
    try:
        data = request.get_json()
        updated = WorkOrderArea.update(id, data)
        return jsonify({"message": "Work Order Area updated successfully!", "data": updated}), 200
    except ValueError as ve:
        return jsonify({"error": str(ve)}), 404
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# DELETE
def delete_workorder_area(id):
    try:
        WorkOrderArea.delete(id)
        return jsonify({"message": "Work Order Area deleted successfully!"}), 200
    except ValueError as ve:
        return jsonify({"error": str(ve)}), 404
    except Exception as e:
        return jsonify({"error": str(e)}), 500
