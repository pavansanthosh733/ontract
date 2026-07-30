import bcrypt
import uuid
import re
import json
import random
import string
import base64
import logging
import jwt
import uuid
import os
import pandas as pd
import traceback
from werkzeug.utils import secure_filename
from flask import current_app
from flask import request, jsonify, make_response
from datetime import datetime, timedelta
from app.utils.file_utils import save_uploaded_file
from app.models.contractor_model import ContractorModel
from app.models.provider_model import ProviderModel 
from flask import current_app, make_response, jsonify, request
from app.models.refresh_token_model import RefreshTokenModel
from app.utils.jwt_utils import (create_access_token,create_refresh_token,verify_token)
from app.utils.auth import revoke_token
from app.utils.encrypt_utils import cipher
from sqlalchemy.exc import IntegrityError
from sqlalchemy import text
from app import db
from io import BytesIO
from flask import send_file
from app.utils.email_utils import (
    send_email,
    send_contractor_activation_email,
    send_contractor_otp_email,
    send_contractor_profile_submitted_email,
    send_admin_new_contractor_notification
)
from app.config import Config

ADMIN_EMAIL = Config.FROM_EMAIL


class ContractorController:
    
    # Base upload folder inside backend
    BASE_UPLOAD_DIR = os.path.join(
        os.path.dirname(os.path.abspath(__file__)),
        "../../uploads"
    )
    
    COMPANY_LOGO_DIR = os.path.join(BASE_UPLOAD_DIR, "company_logos")
    COMPANY_CERT_DIR = os.path.join(BASE_UPLOAD_DIR, "company_certificates")
    COMPANY_BANK_STATEMENT_DIR = os.path.join(    BASE_UPLOAD_DIR,    "company_bank_statements")
    
    os.makedirs(COMPANY_LOGO_DIR, exist_ok=True)
    os.makedirs(COMPANY_CERT_DIR, exist_ok=True)
    os.makedirs(COMPANY_BANK_STATEMENT_DIR, exist_ok=True)
    


    # ---------------- Signup ----------------
    @staticmethod
    def signup(data):

        email = data.get('email_id', '').strip().lower()
        phone = data.get('phone_number')
        password = data.get('password')

        if not all([email, phone, password]):
            return {"error": "All fields are required"}, 400

        try:

            # CHECK EXISTING EMAIL
            existing_user = db.session.execute(
                text("""
                    SELECT user_uid FROM users_t WHERE email_id = :email
                """),
                {"email": email}
            ).fetchone()

            if existing_user:
                return {
                    "status": "exists",
                    "message": "User already exists with this email."
                }, 409

            hashed = bcrypt.hashpw(password.encode(),bcrypt.gensalt()).decode()

            token = str(uuid.uuid4())

            ContractorModel.create_company(hashed,phone,email,token)

            send_contractor_activation_email(email,token)

            return {
                "status": "ok",
                "message": "Signup successful. Activation link sent to your email."
            }, 201

        except IntegrityError as e:

            return {
                "status": "error",
                "message": "Database constraint error",
                "details": str(e.orig)
            }, 400

        except Exception as e:

            return {
                "status": "error",
                "message": "Something went wrong",
                "details": str(e)
            }, 500

    # ---------------- Activate ----------------
    @staticmethod
    def activate(token):
        company = ContractorModel.get_company_by_token(token)
        if not company:
            return {"error": "Invalid activation token"}, 400

        ContractorModel.activate_company(token)

        # get_company_by_token now returns email_id from users_t
        return {
            "message": "Company account activated successfully.",
            "email_id": company["email_id"],
        }, 200

    # ---------------- Login ----------------
    @staticmethod
    def login(email, password):

        # Validate input
        if not email or not password:
            return {"error": "Email and Password are required"}, 400

        # Check if account is locked
        if ContractorModel.is_login_locked(email):
            return {
                "error": "Too many failed login attempts. Please try again after 5 minutes."
            }, 429

        # Fetch contractor
        contractor = ContractorModel.get_contractor_by_email(email)
        if not contractor:
            ContractorModel.record_failed_login(email)
            return {"error": "Invalid credentials"}, 401

        # Service type validation
        if contractor.get("service_type") is not None and contractor["service_type"] != 1:
            ContractorModel.record_failed_login(email)
            return {"error": "Invalid credentials"}, 401

        # Password validation
        password_match = bcrypt.checkpw(password.encode(),contractor["password_hash"].encode())

        if not password_match:
            ContractorModel.record_failed_login(email)
            return {"error": "Invalid credentials"}, 401

        # Account activation check
        if not contractor["active_status"]:
            return {
                "error": "Account not activated. Please check your registered email and activate your account before login."
            }, 401

        ContractorModel.reset_login_attempts(email)
        otp = ''.join(random.choices(string.digits, k=6))
        ContractorModel.save_otp(email, otp)
        send_contractor_otp_email(email, otp)
        return {
            "message": "OTP sent to contractor email"
        }, 200


    @staticmethod
    def verify_otp(data):
        from app.utils.jwt_utils import (
            create_access_token,
            create_refresh_token
        )
        from app.models.refresh_token_model import RefreshTokenModel

        email = data.get("email")
        otp = data.get("otp")

        if not email or not otp:
            return {"error": "Email and OTP required"}, 400

        # Validate OTP
        record = ContractorModel.validate_otp(email)

        if not record or record["otp_code"] != otp:
            return {"error": "Invalid or expired OTP"}, 400

        # Delete OTP
        ContractorModel.delete_otp(email)

        # Contractor details
        contractor = ContractorModel.get_basic_info(email)

        if not contractor:
            return {"error": "Contractor not found"}, 404

        # Create Access Token
        access_token = create_access_token(
            user_id=contractor["user_uid"],
            role="contractor"
        )

        # Create Refresh Token
        refresh_token, refresh_expiry = create_refresh_token(
            user_id=contractor["user_uid"],
            role="contractor"
        )

        # Save Refresh Token
        RefreshTokenModel.save_refresh_token(
            user_id=contractor["user_uid"],
            role="contractor",
            refresh_token=refresh_token,
            expires_at=refresh_expiry
        )

        response = make_response(jsonify({
            "success": True,
            "message": "OTP verified successfully",
            "role": "contractor",
            "contractor": contractor
        }))

        response.set_cookie(
            "contractor_access_token",
            value=access_token,
            httponly=True,
            secure=True,
            samesite="None",
            path="/"
        )

        response.set_cookie(
            "contractor_refresh_token",
            value=refresh_token,
            httponly=True,
            secure=True,
            samesite="None",
            path="/"
        )

        return response, 200
    
    @staticmethod
    def refresh():

        from flask import request, make_response, jsonify
        from app.utils.jwt_utils import (
            verify_token,
            create_access_token,
            create_refresh_token
        )
        from app.models.refresh_token_model import RefreshTokenModel

        refresh_token = request.cookies.get("contractor_refresh_token")

        if not refresh_token:
            return {
                "success": False,
                "message": "Refresh token missing"
            }, 401

        try:

            # Verify Refresh JWT
            payload = verify_token(refresh_token)

            if payload.get("type") != "refresh":
                return {
                    "success": False,
                    "message": "Invalid refresh token"
                }, 401

            # Verify token exists in DB
            token = RefreshTokenModel.get_refresh_token(refresh_token)

            if not token:
                return {
                    "success": False,
                    "message": "Refresh token revoked"
                }, 401

            # Revoke OLD refresh token
            RefreshTokenModel.revoke_refresh_token(refresh_token)

            # Create NEW access token
            access_token = create_access_token(
                user_id=payload["user_id"],
                role=payload["role"]
            )

            # Create NEW refresh token
            refresh_token_new, refresh_expiry = create_refresh_token(
                user_id=payload["user_id"],
                role=payload["role"]
            )

            # Save NEW refresh token
            RefreshTokenModel.save_refresh_token(
                user_id=payload["user_id"],
                role=payload["role"],
                refresh_token=refresh_token_new,
                expires_at=refresh_expiry
            )

            response = make_response(jsonify({
                "success": True,
                "message": "Access token refreshed"
            }))

            response.set_cookie(
                "contractor_access_token",
                value=access_token,
                httponly=True,
                secure=True,
                samesite="None",
                path="/"
            )

            response.set_cookie(
                "contractor_refresh_token",
                value=refresh_token_new,
                httponly=True,
                secure=True,
                samesite="None",
                path="/"
            )

            return response

        except Exception as e:
            import traceback
            traceback.print_exc()

            return {
                "success": False,
                "message": str(e)
            }, 401

    @staticmethod
    def logout():

        from flask import request, current_app, make_response, jsonify
        import jwt
        from datetime import datetime, timezone

        from app.utils.auth import revoke_token
        from app.models.refresh_token_model import RefreshTokenModel

        access_token = request.cookies.get("contractor_access_token")
        refresh_token = request.cookies.get("contractor_refresh_token")

        # -----------------------------------
        # Revoke Access Token
        # -----------------------------------
        if access_token:
            try:
                payload = jwt.decode(
                    access_token,
                    current_app.config["SECRET_KEY"],
                    algorithms=["HS256"]
                )

                revoke_token(
                    jti=payload["jti"],
                    user_id=payload["user_id"],
                    role=payload["role"],
                    expires_at=datetime.fromtimestamp(
                        payload["exp"],
                        timezone.utc
                    )
                )

            except jwt.ExpiredSignatureError:
                pass

            except jwt.InvalidTokenError:
                pass

        # -----------------------------------
        # Revoke Refresh Token
        # -----------------------------------
        if refresh_token:
            try:
                RefreshTokenModel.revoke_refresh_token(refresh_token)
            except Exception as e:
                print("Contractor Refresh Revoke Error:", e)

        response = make_response(jsonify({
            "success": True,
            "message": "Logged out successfully"
        }))

        response.delete_cookie(
            "contractor_access_token",
            path="/",
            secure=True,
            httponly=True,
            samesite="None"
        )

        response.delete_cookie(
            "contractor_refresh_token",
            path="/",
            secure=True,
            httponly=True,
            samesite="None"
        )

        return response

    @staticmethod
    def refresh_token(refresh_token):
    
    
        if not refresh_token:
         
            return {"error": "Refresh token missing"}, 401
    
        try:
            
    
            payload = jwt.decode(
                refresh_token,
                current_app.config["SECRET_KEY"],
                algorithms=["HS256"],
            )
    
            contractor_id = payload.get("contractor_id")
            
    
            if not contractor_id:
               
                return {"error": "Invalid token payload"}, 401
    
            # ✅ fetch exact active session
            session = ContractorModel.get_active_session(refresh_token)
            
    
            if not session:
                
                return {"error": "Session expired or logged out"}, 401
    
            contractor = ContractorModel.get_contractor_by_id(contractor_id)
            
    
            if not contractor:
               
                return {"error": "Contractor not found"}, 404
    
            # ✅ generate new rotated token
            new_refresh_token = jwt.encode(
                {
                    "contractor_id": contractor["user_uid"],
                    "exp": datetime.utcnow() + timedelta(days=90),
                },
                current_app.config["SECRET_KEY"],
                algorithm="HS256",
            )
    
           
            
            rotation_success = ContractorModel.rotate_refresh_session(
                contractor["user_uid"],
                refresh_token,
                new_refresh_token,
                datetime.utcnow() + timedelta(days=90),
                session.get("ip_address"),
                session.get("token_family")
            )
            
            if not rotation_success:
          
                return {"error": "Session rotation failed"}, 500
            
            
          
    
            return {
                "message": "Session restored successfully",
                "contractor": contractor,
                "refresh_token": new_refresh_token,
            }, 200
    
        except jwt.ExpiredSignatureError:
           
            return {"error": "Refresh token expired"}, 401
    
        except jwt.InvalidTokenError as e:
          
            return {"error": "Invalid refresh token"}, 401
    
        except Exception as e:
          
            return {"error": "Failed to restore session"}, 500
      
    
    @staticmethod
    def logout(refresh_token):
        if not refresh_token:
            return {"error": "Refresh token missing"}, 400
    
        # ✅ deactivate DB session
        ContractorModel.deactivate_session(refresh_token)
    
        return {"message": "Logged out successfully"}, 200
    
    
    # ---------------- Resend OTP ----------------
    @staticmethod
    def resend_otp(data):
        email = data.get('email')
        if not email:
            return {"error": "Email required"}, 400

        ContractorModel.delete_otp(email)
        otp = ''.join(random.choices(string.digits, k=6))
        ContractorModel.save_otp(email, otp)
        send_contractor_otp_email(email, otp)
        return {"message": "OTP resent successfully"}, 200

    # ---------------- Profile ----------------

    @staticmethod
    def get_profile(data):
        email = data.get('email')
        if not email:
            return {"error": "Email required"}, 400

        profile = ContractorModel.get_company_profile(email)
        if not profile:
            return {"error": "Company not found"}, 404

        # Convert memoryview (bytes) to Base64 string exactly like provider logic
        if not profile.get("logo_path"):
            profile["logo_path"] = []
        
        if not profile.get("certificate_path"):
            profile["certificate_path"] = []

        return profile, 200


 # ---------------- Update Company Profile ----------------
    @staticmethod
    def update_company_profile(form_data, files):
        def extract_db_path(saved_item):
            """
            Normalize save_uploaded_file() return value.
            Supports:
            - dict with db_path/path/file_path/url
            - plain string path
            - bytes
            """
            if not saved_item:
                return None
    
            if isinstance(saved_item, dict):
                return (
                    saved_item.get("db_path")
                    or saved_item.get("path")
                    or saved_item.get("file_path")
                    or saved_item.get("url")
                )
    
            if isinstance(saved_item, bytes):
                return saved_item.decode("utf-8", errors="ignore")
    
            if isinstance(saved_item, str):
                return saved_item
    
            return str(saved_item)
    
        try:
            email = form_data.get("email")
            logging.info("Contractor update_company_profile started for email=%s", email)
    
            if not email:
                logging.warning("update_company_profile rejected: email missing")
                return {"error": "Email required"}, 400
    
            company_data = {
                "company_name": form_data.get("company_name"),
                "brn_number": form_data.get("brn_number"),
                "tin_number": form_data.get("tin_number"),
                "bumiputera": form_data.get("bumiputera"),
                "mailing_region_id": form_data.get("mailing_region_id"),
                "mailing_state_id": form_data.get("mailing_state_id"),
                "mailing_city_id": form_data.get("mailing_city_id"),
                "mailing_address": form_data.get("mailing_address"),
                "billing_address": form_data.get("billing_address"),
                "contact_number": form_data.get("contact_number"),
                "alternate_contact": form_data.get("alternate_contact"),
                "contact_person": form_data.get("contact_person"),
            }
    
            logging.info(
                "Company profile form received for email=%s | company_name=%s | brn_number=%s",
                email,
                company_data.get("company_name"),
                company_data.get("brn_number"),
            )
    
            # Parse services JSON safely
            services_raw = form_data.get("services", "[]")
            try:
                services = json.loads(services_raw)
                if not isinstance(services, list):
                    logging.warning(
                        "Services payload is not a list for email=%s. Resetting to empty list.",
                        email
                    )
                    services = []
            except Exception as parse_err:
                logging.exception(
                    "Failed to parse services JSON for email=%s. Using empty list. Raw value=%s | error=%s",
                    email,
                    services_raw,
                    str(parse_err)
                )
                services = []
    
            # ---------------------------------------------------
            # File handling:
            #   - company_logo => single file
            #   - certificate  => multiple files
            # ---------------------------------------------------
            logo_file = files.get("company_logo")
            cert_files = files.getlist("certificate") if hasattr(files, "getlist") else []
    
            # Backward-compatible fallback for single certificate upload
            if not cert_files and files.get("certificate"):
                cert_files = [files.get("certificate")]
    
            # Backward-compatible fallback if older client sends company_logo as list
            if isinstance(logo_file, list):
                logo_file = logo_file[0] if logo_file else None
    
            logging.info(
                "Uploaded files received for email=%s | logo_present=%s | certificate_count=%s",
                email,
                bool(logo_file and getattr(logo_file, "filename", None)),
                len(cert_files)
            )
    
            saved_logo_file = None
            saved_cert_files = []
    
            # Save logo (single file)
            if logo_file and getattr(logo_file, "filename", None):
                saved_logo_file = save_uploaded_file(
                    logo_file,
                    ContractorController.COMPANY_LOGO_DIR,
                    "/uploads/company_logos"
                )
                logging.info(
                    "Logo save result for email=%s | saved_logo_file=%s",
                    email,
                    saved_logo_file
                )
            else:
                logging.info("No logo file provided for email=%s", email)
    
            # Save certificates (multiple files)
            for idx, cert_file in enumerate(cert_files, start=1):
                if not cert_file or not getattr(cert_file, "filename", None):
                    logging.warning(
                        "Skipping invalid certificate file #%s for email=%s",
                        idx,
                        email
                    )
                    continue
    
                saved = save_uploaded_file(
                    cert_file,
                    ContractorController.COMPANY_CERT_DIR,
                    "/uploads/company_certificates"
                )
    
                logging.info(
                    "Certificate save result #%s for email=%s | saved=%s",
                    idx,
                    email,
                    saved
                )
    
                if saved:
                    saved_cert_files.append(saved)
    
            # Normalize saved results to db paths
            logo_db_path = extract_db_path(saved_logo_file)
            certificate_db_paths = [
                path for path in (extract_db_path(item) for item in saved_cert_files)
                if path
            ]
    
            # Keep both single and list representations for compatibility
            company_data["logo_path"] = logo_db_path
            company_data["logo_paths"] = [logo_db_path] if logo_db_path else []
            company_data["certificate_paths"] = certificate_db_paths
            company_data["certificate_path"] = certificate_db_paths[0] if certificate_db_paths else None
    
            logging.info(
                "Normalized file paths for email=%s | logo_path=%s | certificate_paths=%s",
                email,
                company_data["logo_path"],
                company_data["certificate_paths"]
            )
    
            # Update model
            success = ContractorModel.update_company_profile(
                email,
                company_data,
                services,
                company_data["logo_paths"],
                company_data["certificate_paths"]
            )
    
            if not success:
                logging.error("ContractorModel.update_company_profile failed for email=%s", email)
                return {"error": "Failed to update company profile"}, 500
    
            logging.info(
                "Contractor profile updated successfully for email=%s | company_name=%s",
                email,
                company_data.get("company_name")
            )
    
            send_contractor_profile_submitted_email(email, company_data["company_name"])
            send_admin_new_contractor_notification(
                ADMIN_EMAIL,
                company_data["company_name"],
                email
            )
    
            logging.info(
                "Notification emails sent for email=%s | company_name=%s",
                email,
                company_data.get("company_name")
            )
    
            return {
                "message": "Company profile updated and submitted for approval",
                "status": "pending",
                "uploaded_files": {
                    "company_logo": company_data["logo_paths"],
                    "certificate": company_data["certificate_paths"]
                }
            }, 200
    
        except Exception as e:
            logging.exception(
                "Unhandled error in update_company_profile for email=%s | error=%s",
                form_data.get("email"),
                str(e)
            )
            return {"error": "Internal server error"}, 500
    
     
 
# ---------------- Update Company Bank ----------------



    @staticmethod
    def update_company_bank(form_data, files):
        def extract_db_path(saved_item):
            """
            Normalize save_uploaded_file() return value.
            Supports:
            - dict with db_path/path/file_path/url
            - plain string path
            - bytes
            """
            if not saved_item:
                return None
    
            if isinstance(saved_item, dict):
                return (
                    saved_item.get("db_path")
                    or saved_item.get("path")
                    or saved_item.get("file_path")
                    or saved_item.get("url")
                )
    
            if isinstance(saved_item, bytes):
                return saved_item.decode("utf-8", errors="ignore")
    
            if isinstance(saved_item, str):
                return saved_item
    
            return str(saved_item)
    
        try:
            # Form fields
            email = (form_data.get("email") or "").strip()
            swift = (form_data.get("swift") or "").upper().strip()
            bank_name = (form_data.get("bank_name") or "").strip()
            holder_name = (form_data.get("holder_name") or "").strip()
            account_number = (form_data.get("account_number") or "").strip()
    
            # Uploaded file
            statement_file = files.get("bank_statement")
    
            logging.info(
                "Bank update started for email=%s | statement_present=%s",
                email,
                bool(statement_file and getattr(statement_file, "filename", None))
            )
    
            # Required fields
            if not all([email, swift, bank_name, holder_name, account_number]):
                return {"error": "All fields are required"}, 400
    
            # Validate SWIFT
            if not re.match(r"^[A-Z]{4}MY[A-Z0-9]{2}([A-Z0-9]{3})?$", swift): 
                return {"error": "Invalid SWIFT format"}, 400
    
            # Validate account number
            if not re.match(r"^[0-9]{6,20}$", account_number):
                return {"error": "Invalid account number"}, 400
    

    
            # Save new file if uploaded
            statement_db_path = None
            if statement_file and getattr(statement_file, "filename", None):
                saved_statement = save_uploaded_file(
                    statement_file,
                    ContractorController.COMPANY_BANK_STATEMENT_DIR,
                    "/uploads/company_bank_statements"
                )
    
                statement_db_path = extract_db_path(saved_statement)
    
                logging.info(
                    "Bank statement saved for email=%s | saved=%s | db_path=%s",
                    email,
                    saved_statement,
                    statement_db_path
                )
    

    
            # Encrypt bank details
            bank_details = {
                "swift_enc": cipher.encrypt(swift.encode()).decode(),
                "account_number_enc": cipher.encrypt(account_number.encode()).decode(),
                "holder_name": holder_name,
                "bank_name": bank_name,
                "statement_path": statement_db_path
            }
    
            # Update DB
            success = ContractorModel.update_company_bank(
                email,
                bank_details,
                statement_db_path
                
            )
    
            if not success:
                return {"error": "Failed to update bank details"}, 500
    
            send_email(
                email,
                "Bank Details Submitted",
                "Your bank details have been successfully submitted and stored securely."
            )
    
            return {
                "message": "Bank details updated successfully",
                "bank_statement_path": statement_db_path
            }, 200
    
        except Exception as e:
            logging.error("❌ Bank Update Controller Error: %s", str(e))
            logging.error("❌ Full traceback:\n%s", traceback.format_exc())
            return {"error": str(e)}, 500
    
    # ---------------- Notifications ----------------
    @staticmethod
    def get_notifications(email):
        if not email:
            return {"error": "Email required"}, 400

        notifications = ContractorModel.fetch_notifications(email)
        return notifications, 200

    @staticmethod
    def unread_count(email):
        if not email:
            return {"error": "Email required"}, 400

        count = ContractorModel.fetch_unread_count(email)
        return {"count": count}, 200

    @staticmethod
    def mark_as_read(data):
        message_id = data.get('message_id')
        if not message_id:
            return {"error": "Message ID required"}, 400

        updated = ContractorModel.mark_notification_read(message_id)
        if updated:
            return {"success": True}, 200
        return {"error": "Notification not found"}, 404
    
    

    @staticmethod
    def get_contractor_gate_status(user_uid):
        if not user_uid:
            return {
                "success": False,
                "allowed": False,
                "reason_code": "MISSING_UID",
                "reason_message": "user_uid is required."
            }, 400

        try:
            profile = ContractorModel.get_contractor_gate_profile(user_uid)

            if not profile:
                return {
                    "success": False,
                    "allowed": False,
                    "reason_code": "NOT_FOUND",
                    "reason_message": "Contractor account not found."
                }, 404

            def is_true(value):
                if isinstance(value, bool):
                    return value
                return str(value).strip().lower() in ("t", "true", "1", "yes", "y", "on")

            status = str(profile.get("status", "")).strip().lower()
            active_status = profile.get("active_status")

            # 1) inactive/deactivated first
            if not is_true(active_status):
                return {
                    "success": True,
                    "allowed": False,
                    "reason_code": "DEACTIVATED",
                    "reason_message": "Your profile is deactivated. Please contact admin."
                }, 200

            # 2) pending / not approved
            if status in ("pending", "registered", "incomplete"):
                return {
                    "success": True,
                    "allowed": False,
                    "reason_code": "PENDING_APPROVAL",
                    "reason_message": "Your profile is pending admin approval. Please wait for approval."
                }, 200

            if status != "approved":
                return {
                    "success": True,
                    "allowed": False,
                    "reason_code": "NOT_APPROVED",
                    "reason_message": "Your profile is not approved yet."
                }, 200

            # 3) profile completeness check
            missing_profile_fields = []
            profile_fields = [
                "name",
                "email_id",
                "contact_number",
                "mailing_address",
                "billing_address",
                "tin_number",
            ]

            for field in profile_fields:
                if not profile.get(field) or str(profile.get(field)).strip() == "":
                    missing_profile_fields.append(field)

            if missing_profile_fields:
                return {
                    "success": True,
                    "allowed": False,
                    "reason_code": "PROFILE_INCOMPLETE",
                    "reason_message": "Please complete your profile details before accessing the dashboard.",
                    "missing_fields": missing_profile_fields
                }, 200

            # 4) bank details check
            missing_bank_fields = []
            bank_fields = [
                "swift_code",
                "holder_name",
                "bank_name",
                "account_number",
            ]

            for field in bank_fields:
                if not profile.get(field) or str(profile.get(field)).strip() == "":
                    missing_bank_fields.append(field)

            if missing_bank_fields:
                return {
                    "success": True,
                    "allowed": False,
                    "reason_code": "BANK_DETAILS_MISSING",
                    "reason_message": "Please fill bank details before accessing the dashboard.",
                    "missing_fields": missing_bank_fields
                }, 200

            # 5) allowed
            return {
                "success": True,
                "allowed": True,
                "reason_code": "ALLOWED",
                "reason_message": "Access granted."
            }, 200

        except Exception as e:
            return {
                "success": False,
                "allowed": False,
                "reason_code": "SERVER_ERROR",
                "reason_message": f"Failed to check contractor status: {str(e)}"
            }, 500
        
    @staticmethod
    def download_workscope_excel(data):

        try:

            category_ids = data.get("category_ids", [])
            city_ids = data.get("city_ids", [])

            print("CATEGORY IDS :", category_ids)
            print("CITY IDS :", city_ids)

            workscope_rows = ContractorModel.get_workscope_excel_data(category_ids)

            if not workscope_rows:
                return {
                    "success": False,
                    "message": "No workscope found"
                }, 404

            excel_rows = []

            for workscope in workscope_rows:

                for city_id in city_ids:

                    city_info = ContractorModel.get_city_details(city_id)

                    if not city_info:
                        continue

                    print("CITY INFO :", city_info)

                    excel_rows.append({
                        "Region": city_info["region_name"],
                        "State": city_info["state_name"],
                        "City": city_info["city_name"],
                        "Category": workscope["category_name"],
                        "Item": workscope["item_name"],
                        "Type": workscope["type_name"],
                        "Description": workscope["description_name"],
                        "Price": ""
                    })

            if not excel_rows:
                return {
                    "success": False,
                    "message": "No data found to export"
                }, 404

            df = pd.DataFrame(excel_rows)

            output = BytesIO()

            with pd.ExcelWriter(output,engine="openpyxl") as writer:

                df = pd.DataFrame(excel_rows)
                for category_name, category_df in df.groupby("Category"):
                    sheet_name = category_name[:31]  # Excel sheet limit
                    category_df.to_excel(writer,sheet_name=sheet_name,index=False)

            output.seek(0)

            return send_file(
                output,
                as_attachment=True,
                download_name="Workscope.xlsx",
                mimetype="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            )

        except Exception as e:

            print("DOWNLOAD EXCEL ERROR :", str(e))

            return {
                "success": False,
                "message": str(e)
            }, 500