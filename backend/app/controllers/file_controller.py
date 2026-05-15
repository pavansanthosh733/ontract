from io import BytesIO
from PIL import Image
import magic
import os
import json
import mimetypes
import logging
from flask import send_file, jsonify, current_app
from sqlalchemy.sql import text
from app.models.database import db


class FileController:

    @staticmethod
    def _normalize_db_value(value):
        """
        Normalizes DB values that may come as:
        - memoryview / bytes
        - string path
        - JSON string
        - dict
        - list
        """
        if value is None:
            return None

        if isinstance(value, memoryview):
            return value.tobytes()

        if isinstance(value, bytes):
            return value

        if isinstance(value, dict):
            return (
                value.get("db_path")
                or value.get("path")
                or value.get("file_path")
                or value.get("url")
            )

        if isinstance(value, str):
            s = value.strip()

            if (s.startswith("{") and s.endswith("}")) or (s.startswith("[") and s.endswith("]")):
                try:
                    parsed = json.loads(s)
                    return FileController._normalize_db_value(parsed)
                except Exception:
                    pass

            return s

        return str(value)

    @staticmethod
    def _resolve_file_path(stored_path):
        """
        Converts stored relative path like:
        /uploads/company_logos/a.png
        into a real filesystem path.
        """
        if not stored_path:
            return None

        if os.path.isabs(stored_path) and os.path.exists(stored_path):
            return stored_path

        project_root = os.path.abspath(os.path.join(current_app.root_path, ".."))
        full_path = os.path.join(project_root, stored_path.lstrip("/\\"))
        if os.path.exists(full_path):
            return full_path

        return None

    @staticmethod
    def get_image(email, file_type, index=0):
        try:
            if file_type == "profile":
                sql = text("""
                    SELECT p.profile_pic AS file
                    FROM providers_t p
                    JOIN users_t u ON u.user_uid = p.user_uid
                    WHERE u.email_id = :email
                """)

            elif file_type == "certificate":
                sql = text("""
                    SELECT p.authorized_certificate AS file
                    FROM providers_t p
                    JOIN users_t u ON u.user_uid = p.user_uid
                    WHERE u.email_id = :email
                """)

            elif file_type == "bank_statement":
                sql = text("""
                    SELECT b.bank_statement AS file
                    FROM providers_bank_details_t b
                    JOIN providers_t p ON b.provider_id = p.provider_id
                    JOIN users_t u ON u.user_uid = p.user_uid
                    WHERE u.email_id = :email
                """)

            elif file_type == "contractor_certificate":
                sql = text("""
                    SELECT c.certificate_path AS file
                    FROM company_details_t c
                    JOIN users_t u ON u.user_uid = c.user_uid
                    WHERE u.email_id = :email
                """)

            elif file_type == "contractor_logo":
                sql = text("""
                    SELECT c.logo_path AS file
                    FROM company_details_t c
                    JOIN users_t u ON u.user_uid = c.user_uid
                    WHERE u.email_id = :email
                """)

            else:
                return jsonify({"error": "Invalid file type"}), 400

            row = db.session.execute(sql, {"email": email}).fetchone()

            if not row or not row._mapping["file"]:
                return jsonify({"error": "File not found"}), 404

            file_value = row._mapping["file"]
            normalized_value = FileController._normalize_db_value(file_value)

            # ---------------------------------------------------
            # Contractor files are stored as path / JSONB
            # ---------------------------------------------------
            if file_type in ("contractor_logo", "contractor_certificate"):
                # If it somehow came back as bytes, serve directly
                if isinstance(normalized_value, (bytes, bytearray)):
                    file_data = bytes(normalized_value)
                    mime = magic.Magic(mime=True)
                    mimetype = mime.from_buffer(file_data[:2048])

                    if mimetype == "application/pdf":
                        return send_file(BytesIO(file_data), mimetype="application/pdf", as_attachment=False)

                    try:
                        img = Image.open(BytesIO(file_data))
                        mimetype = f"image/{img.format.lower()}"
                    except Exception:
                        return jsonify({"error": "Invalid or corrupted file format"}), 400

                    return send_file(BytesIO(file_data), mimetype=mimetype, as_attachment=False)

                # If contractor_certificate is a JSON array, select by index
                if file_type == "contractor_certificate":
                    if isinstance(file_value, list):
                        if not file_value:
                            return jsonify({"error": "File not found"}), 404
                        if index < 0 or index >= len(file_value):
                            return jsonify({"error": "Certificate index out of range"}), 404
                        normalized_value = FileController._normalize_db_value(file_value[index])

                    elif isinstance(file_value, str):
                        try:
                            parsed = json.loads(file_value)
                            if isinstance(parsed, list):
                                if not parsed:
                                    return jsonify({"error": "File not found"}), 404
                                if index < 0 or index >= len(parsed):
                                    return jsonify({"error": "Certificate index out of range"}), 404
                                normalized_value = FileController._normalize_db_value(parsed[index])
                        except Exception:
                            pass

                file_path = FileController._resolve_file_path(normalized_value)
                if not file_path:
                    logging.warning(
                        "Contractor file not found on disk | email=%s | file_type=%s | stored_value=%s | index=%s",
                        email, file_type, normalized_value, index
                    )
                    return jsonify({"error": "File not found"}), 404

                mimetype, _ = mimetypes.guess_type(file_path)
                if not mimetype:
                    mimetype = "application/octet-stream"

                return send_file(file_path, mimetype=mimetype, as_attachment=False)

            # ---------------------------------------------------
            # Existing provider flows: still support raw binary data
            # ---------------------------------------------------
            if isinstance(normalized_value, str):
                file_path = FileController._resolve_file_path(normalized_value)
                if file_path:
                    mimetype, _ = mimetypes.guess_type(file_path)
                    if not mimetype:
                        mimetype = "application/octet-stream"
                    return send_file(file_path, mimetype=mimetype, as_attachment=False)

                return jsonify({"error": "Invalid file data"}), 400

            file_data = normalized_value

            if isinstance(file_data, memoryview):
                file_data = file_data.tobytes()

            if not isinstance(file_data, (bytes, bytearray)):
                return jsonify({"error": "Invalid file data"}), 400

            mime = magic.Magic(mime=True)
            mimetype = mime.from_buffer(file_data[:2048])

            if mimetype == "application/pdf":
                return send_file(BytesIO(file_data), mimetype="application/pdf", as_attachment=False)

            try:
                img = Image.open(BytesIO(file_data))
                mimetype = f"image/{img.format.lower()}"
            except Exception:
                return jsonify({"error": "Invalid or corrupted file format"}), 400

            return send_file(BytesIO(file_data), mimetype=mimetype, as_attachment=False)

        except Exception as err:
            logging.exception("File fetch error: %s", str(err))
            return jsonify({"error": str(err)}), 500