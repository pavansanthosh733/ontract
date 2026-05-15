from flask import Blueprint
from app.controllers.workorder_area_controller import (
    create_workorder_area,
    get_all_workorder_areas,
    get_workorder_area,
    update_workorder_area,
    delete_workorder_area
)

workorder_area_view = Blueprint('workorder_area_view', __name__)

# === Create Area ===
@workorder_area_view.route('/workorder-area', methods=['POST'])
def create_area():
    return create_workorder_area()

# === Get All Areas ===
@workorder_area_view.route('/workorder-areas', methods=['GET'])
def get_all_areas():
    print("DEBUG: /workorder-areas route called")
    return get_all_workorder_areas()

# === Get Single Area ===
@workorder_area_view.route('/workorder-area/<int:id>', methods=['GET'])
def get_area(id):
    return get_workorder_area(id)

# === Update Area ===
@workorder_area_view.route('/workorder-area/<int:id>', methods=['PUT'])
def update_area(id):
    return update_workorder_area(id)

# === Delete Area ===
@workorder_area_view.route('/workorder-area/<int:id>', methods=['DELETE'])
def delete_area(id):
    return delete_workorder_area(id)

# ✅ === NEW ROUTE ===
@workorder_area_view.route('/workorder-area/list', methods=['GET'])
def get_area_list_new():
    """
    Alternate GET route for fetching areas
    """
    print("DEBUG: /workorder-area/list route called ✅")
    return get_all_workorder_areas()
