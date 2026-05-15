# routes/workorder_routes.py
from flask import Blueprint, request
from controllers.workorder_controller import WorkOrderController

workorder_bp = Blueprint("workorder_bp", __name__, url_prefix="/api/workorders")

@workorder_bp.route("/", methods=["POST"])
def create_workorder():
    return WorkOrderController.create(request)