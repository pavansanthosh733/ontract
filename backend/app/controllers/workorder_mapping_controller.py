from flask import Blueprint, jsonify, request
from app.models.database import db
from app.models.workorder import WorkOrder
from app.models.workorder_mapping import WorkOrderMapping
from app.views.workorder_mapping_view import WorkOrderMappingView

workorder_mapping_bp = Blueprint("workorder_mapping", __name__)
view = WorkOrderMappingView()

# Fetch all Parent Workorders
@workorder_mapping_bp.route("/parents", methods=["GET"])
def get_parents():
    try:
        parents = WorkOrder.query.filter(WorkOrder.WORKORDER.like("%P%")).all()
        return view.list_response(parents)
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# Fetch eligible Child Workorders for a given Parent
@workorder_mapping_bp.route("/childs/<string:parent_wo>", methods=["GET"])
def get_childs_for_parent(parent_wo):
    try:
        parent = WorkOrder.query.filter_by(WORKORDER=parent_wo).first()
        if not parent:
            return jsonify({"error": "Parent workorder not found"}), 404

        # Already mapped children
        mapped_childs = WorkOrderMapping.get_existing_children(
            [wo.WORKORDER for wo in WorkOrder.query.all()]
        )

        # Eligible children
        parent_types = [t.strip() for t in parent.WORKORDER_TYPE.split(",")]
        childs = (
            WorkOrder.query
            .filter(
                WorkOrder.WORKORDER.like("%W%"),
                WorkOrder.WORKORDER_AREA == parent.WORKORDER_AREA,
                WorkOrder.WORKORDER_TYPE.in_(parent_types),
                ~WorkOrder.WORKORDER.in_(mapped_childs)  # exclude already mapped
            )
            .all()
        )
        return view.list_response(childs)

    except Exception as e:
        return jsonify({"error": str(e)}), 500

@workorder_mapping_bp.route("/map", methods=["POST"])
def map_workorders():
    try:
        data = request.get_json()
        parent_wo = data.get("parent_workorder")
        child_wos = data.get("child_workorders")  # list

        if not parent_wo or not child_wos or not isinstance(child_wos, list):
            return jsonify({"error": "Parent or child workorders missing or invalid"}), 400

        parent = WorkOrder.query.filter_by(WORKORDER=parent_wo).first()
        if not parent:
            return jsonify({"error": "Parent workorder not found"}), 404

        # Get already mapped children
        existing_children = WorkOrderMapping.get_existing_children(child_wos)
        new_children = [c for c in child_wos if c not in existing_children]

        if not new_children:
            return jsonify({"message": "All selected children are already mapped"}), 200

        # 1️⃣ Update parent_workorder column in workorder_t
        WorkOrder.query.filter(WorkOrder.WORKORDER.in_(new_children))\
            .update({"parent_workorder": parent_wo}, synchronize_session="fetch")

        # 2️⃣ Insert mapping records
        for child in new_children:
            WorkOrderMapping.create_mapping(parent_wo, child)

        # 3️⃣ Commit everything in the same session
        db.session.commit()

        return jsonify({"message": "Mapping successful"}), 200

    except Exception as e:
        db.session.rollback()
        import traceback
        print("❌ Error in /api/mapping/map:", str(e))
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500
    
 
