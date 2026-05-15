from flask import jsonify, url_for, request
from marshmallow import Schema, fields

class WorkOrderSchema(Schema):
    id = fields.Int(dump_only=True, attribute='ID')
    WORKORDER = fields.Str()
    WORKORDER_TYPE = fields.Str()
    WORKORDER_AREA = fields.Str()
    CREATED_T = fields.Str()  # <- change to string
    REQUESTED_TIME_CLOSING = fields.Str()
    REMARKS = fields.Str()
    STATUS = fields.Str()
    RATE = fields.Dict()
    parent_workorder = fields.Str()
    IMAGES = fields.List(fields.Str())



class WorkOrderView:
    """Handles all JSON responses"""

    def __init__(self):
        self.schema = WorkOrderSchema()

    def success(self, workorder, status=200):
        """Single workorder response (includes image URLs if any)"""
        data = self.schema.dump(workorder)
        data = self._attach_image_urls(data)
        return jsonify(data), status

    def list(self, workorders, status=200):
        """Multiple workorders response (each includes image URLs)"""
        data = self.schema.dump(workorders, many=True)
        data = [self._attach_image_urls(w) for w in data]
        return jsonify(data), status

    def error(self, message, status=400):
        """Error response"""
        return jsonify({"error": message}), status

    def message(self, message, status=200):
        """Simple message response"""
        return jsonify({"message": message}), status

    # ✅ Helper to prepend full URLs for image paths
    def _attach_image_urls(self, data):
        """Adds proper URLs for images (if available)"""
        if "IMAGES" in data and data["IMAGES"]:
            base_url = request.host_url.rstrip("/")
            data["IMAGES"] = [
                f"{base_url}/static/uploads/{img}" if not img.startswith("http") else img
                for img in data["IMAGES"]
            ]
        return data
