from flask import Blueprint
from controllers import workorder_controller as wc

workorder_bp = Blueprint("workorder_bp", __name__)

workorder_bp.route("/", methods=["GET"])(wc.get_all_workorders)
workorder_bp.route("/<int:id>", methods=["GET"])(wc.get_workorder)
workorder_bp.route("/<int:id>", methods=["PUT"])(wc.update_workorder)
workorder_bp.route("/<int:id>/send-acceptance-mail", methods=["POST"])(wc.send_acceptance_mail)
