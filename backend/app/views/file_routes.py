from flask import Blueprint
from app.controllers.file_controller import FileController

file_bp = Blueprint('file_bp', __name__)

@file_bp.route('/get_image/<email>/<file_type>', methods=['GET'])
def get_image(email, file_type):
    return FileController.get_image(email, file_type)
