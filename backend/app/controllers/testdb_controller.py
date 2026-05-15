from flask import Blueprint, jsonify
from sqlalchemy import text
from app.models.database import db

testdb_bp = Blueprint("testdb_bp", __name__)

@testdb_bp.route("/", methods=["GET"])
def test_db_connection():
    """Actually test PostgreSQL database connection"""
    try:
        # ✅ SQLAlchemy 2.x requires text() for raw SQL
        db.session.execute(text("SELECT 1"))
        db.session.commit()
        return jsonify({
            "message": "✅ Database connection successful"
        }), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({
            "message": "❌ Database connection failed",
            "error": str(e)
        }), 500
