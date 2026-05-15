from flask import jsonify

class WorkOrderMappingView:
    def list_response(self, records):
        return jsonify([r.to_dict() for r in records])
