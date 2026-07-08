import os, uuid, bcrypt, random, string, json, base64
from datetime import datetime
from werkzeug.utils import secure_filename
from sqlalchemy.exc import IntegrityError
from sqlalchemy import text
import logging
from app import db
import traceback
import jwt
from datetime import datetime, timedelta
from flask import current_app
from flask import jsonify, make_response, current_app
from flask import current_app, make_response, jsonify, request
from app.utils.jwt_utils import (create_access_token,create_refresh_token,verify_token)
from app.models.refresh_token_model import RefreshTokenModel

from app.models.provider_model import ProviderModel   
from app.utils.email_utils import (
    send_activation_email,
    send_otp_email,
    send_reset_otp_email,
    send_email
)
from app.utils.encrypt_utils import encrypt_value, decrypt_value
from app.utils.file_utils import save_uploaded_file
from app.config import Config


ADMIN_EMAIL = Config.EMAIL_CONFIG['sender_email']


class ProviderController:
    
    # Base upload folder inside backend
    BASE_UPLOAD_DIR = os.path.join(
        os.path.dirname(os.path.abspath(__file__)),
        "../../uploads"
    )
    
    COMPANY_LOGO_DIR = os.path.join(BASE_UPLOAD_DIR, "company_logos")
    COMPANY_CERT_DIR = os.path.join(BASE_UPLOAD_DIR, "company_certificates")
    
    os.makedirs(COMPANY_LOGO_DIR, exist_ok=True)
    os.makedirs(COMPANY_CERT_DIR, exist_ok=True)

    # ===================================================================
    #                       1) AUTHENTICATION
    # ===================================================================

    @staticmethod
    def signup(data):
    
        # ✅ Normalize email
        email = data["email"].strip().lower()
        password = data["password"]
        phone = data.get("phone_number")
    
        hashed = bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()
        token = str(uuid.uuid4())
    
        try:
            # ✅ Check email already exists BEFORE insert
            existing_user = db.session.execute(
                text("SELECT user_uid FROM users_t WHERE email_id = :email"),
                {"email": email}
            ).fetchone()
    
            if existing_user:
                return {
                    "status": "exists",
                    "message": "User already exists with this email."
                }, 409
    
            # ✅ Insert new user
            ProviderModel.insert_provider(email, hashed, phone, token)
    
            send_activation_email(email, token)
    
            return {
                "status": "ok",
                "message": "Signup successful, check your email."
            }, 201
    
        except IntegrityError as e:
            # ✅ Show real constraint issue
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
    


    @staticmethod
    def activate_account(token):
        user = ProviderModel.get_provider_by_token(token)

        if not user:
            return {"error": "Invalid activation token"}, 400

        ProviderModel.activate_account(token)

        return {"message": "Account activated successfully", "email": user['email_id']}, 200
   #adding coment
    @staticmethod
    def login(email, password):

        if not email or not password:
            return {"error": "Email and password required"}, 400

        # Check lock
        if ProviderModel.is_login_locked(email):
            return {
                "error": "Too many failed login attempts. Please try again after 5 minutes."
            }, 429

        provider = ProviderModel.get_provider_login(email)

        if not provider:
            ProviderModel.record_failed_login(email)
            return {"error": "Invalid credentials"}, 401

        # Password check
        if not bcrypt.checkpw(password.encode(), provider['password_hash'].encode()):
            ProviderModel.record_failed_login(email)
            return {"error": "Invalid credentials"}, 401

        if not provider['active_status']:
            return {"error": "Account not activated"}, 401

        if provider.get("service_type") != 0:
            return {"error": "Invalid credentials"}, 401

        # Success -> Reset failed attempts
        ProviderModel.reset_login_attempts(email)

        otp = ''.join(random.choices(string.digits, k=6))
        ProviderModel.insert_otp(email, otp)
        send_otp_email(email, otp)

        return {
            "message": "OTP sent to email"
        }, 200
    
    
    
    @staticmethod
    def verify_otp(email, otp):

        if not email or not otp:
            return {"error": "Email and OTP required"}, 400

        record = ProviderModel.get_otp(email)

        if not record or record["otp_code"].strip() != otp.strip():
            return {"error": "Invalid or expired OTP"}, 401

        ProviderModel.delete_otp(email)

        user = ProviderModel.get_user_for_context(email)

        if not user:
            return {"error": "User not found"}, 404

        # -----------------------------------
        # Generate Access Token
        # -----------------------------------
        access_token = create_access_token(
            user_id=user["user_uid"],
            role="provider",
            email=email
        )

        # -----------------------------------
        # Generate Refresh Token
        # -----------------------------------
        refresh_token, refresh_expiry = create_refresh_token(
            user_id=user["user_uid"],
            role="provider"
        )

        # -----------------------------------
        # Save Refresh Token
        # -----------------------------------
        RefreshTokenModel.save_refresh_token(
            user_id=user["user_uid"],
            role="provider",
            refresh_token=refresh_token,
            expires_at=refresh_expiry
        )

        response = make_response(jsonify({
            "success": True,
            "message": "OTP verified successfully",
            "role": "provider",
            "user": user
        }))

        # -----------------------------------
        # Access Token Cookie
        # -----------------------------------
        response.set_cookie(
            "user_access_token",
            value=access_token,
            httponly=True,
            secure=True,
            samesite="None",
            path="/"
        )

        # -----------------------------------
        # Refresh Token Cookie
        # -----------------------------------
        response.set_cookie(
            "user_refresh_token",
            value=refresh_token,
            httponly=True,
            secure=True,
            samesite="None",
            path="/"
        )

        return response
    
    @staticmethod
    def refresh():
        from flask import request, make_response, jsonify
        from app.utils.jwt_utils import (
            verify_token,
            create_access_token,
            create_refresh_token
        )
        from app.models.refresh_token_model import RefreshTokenModel

        refresh_token = request.cookies.get("user_refresh_token")
        if not refresh_token:
            return {
                "success": False,
                "message": "Refresh token missing"
            }, 401

        try:
            payload = verify_token(refresh_token)
            if payload.get("type") != "refresh":
                return {
                    "success": False,
                    "message": "Invalid refresh token"
                }, 401

            token = RefreshTokenModel.get_refresh_token(refresh_token)
            if not token:
                return {
                    "success": False,
                    "message": "Refresh token revoked"
                }, 401

            # Revoke old refresh token
            RefreshTokenModel.revoke_refresh_token(refresh_token)
            # New access token
            access_token = create_access_token(
                user_id=payload["user_id"],
                role=payload["role"]
            )
            # New refresh token
            refresh_token_new, refresh_expiry = create_refresh_token(
                user_id=payload["user_id"],
                role=payload["role"]
            )
            # Save new refresh token
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
                "user_access_token",
                value=access_token,
                httponly=True,
                secure=True,
                samesite="None",
                path="/"
            )

            response.set_cookie(
                "user_refresh_token",
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

            raise
        
        
        

    @staticmethod
    def logout():

        from flask import request, current_app, make_response, jsonify
        import jwt
        from datetime import datetime, timezone
        from app.models.refresh_token_model import RefreshTokenModel

        access_token = request.cookies.get("user_access_token")
        refresh_token = request.cookies.get("user_refresh_token")

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
                RefreshTokenModel.revoke_refresh_token(
                    refresh_token
                )
            except Exception as e:
                print("Provider Refresh Revoke Error:", e)

        # -----------------------------------
        # Response
        # -----------------------------------
        response = make_response(jsonify({
            "success": True,
            "message": "Logged out successfully"
        }))

        # -----------------------------------
        # Delete Access Cookie
        # -----------------------------------
        response.delete_cookie(
            "user_access_token",
            path="/",
            secure=True,
            httponly=True,
            samesite="None"
        )

        # -----------------------------------
        # Delete Refresh Cookie
        # -----------------------------------
        response.delete_cookie(
            "user_refresh_token",
            path="/",
            secure=True,
            httponly=True,
            samesite="None"
        )

        return response
        
        
    @staticmethod
    def save_token(user_id, fcm_token, device_type, role):
        logging.info(f"check savetoken input: {user_id}")
       
        try:
            success, error = ProviderModel.save_token(user_id,fcm_token,device_type, role)

            if not success:
                return {"success": False,"error": error}, 500

            return {
                "success": True,
                "message": "Token saved successfully"
            }, 200

        except Exception as e:
            return {"success": False,"error": str(e)}, 500
    
    

    @staticmethod
    def resend_otp(email):
        ProviderModel.delete_otp(email)

        otp = ''.join(random.choices(string.digits, k=6))
        ProviderModel.insert_otp(email, otp)

        send_otp_email(email, otp)

        return {"message": "OTP resent successfully"}, 200

    @staticmethod
    def forgot_send_otp(email):
        user = ProviderModel.get_provider_login(email)

        if not user or not user["active_status"]:
            return {"error": "Account not found or not activated"}, 404

        otp = ''.join(random.choices(string.digits, k=6))
        ProviderModel.insert_otp(email, otp)
        send_reset_otp_email(email, otp)

        return {"message": "Reset OTP sent to email"}, 200

    @staticmethod
    def verify_reset_otp(email, otp):
        record = ProviderModel.get_otp(email)

        if record and record['otp_code'] == otp:
            ProviderModel.delete_otp(email)
            token = str(uuid.uuid4())
            ProviderModel.set_reset_token(email, token)

            return {"message": "OTP verified", "reset_token": token}, 200

        return {"error": "Invalid or expired OTP"}, 401

    @staticmethod
    def reset_password(email, reset_token, password):
        info = ProviderModel.get_reset_info(email)

        if not info:
            return {"error": "Account not found"}, 404

        if info['reset_token'] != reset_token or info['reset_expiry'] < datetime.now():
            return {"error": "Invalid or expired reset token"}, 400

        hashed = bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()

        ProviderModel.update_password(email, hashed)
        return {"message": "Password reset successfully"}, 200

    # ===================================================================
    #                         2) BANK DETAILS
    # ===================================================================

    @staticmethod
    def update_bank(email, bank_name, holder_name, account_number, swift, bank_statement):
        provider_details = ProviderModel.get_provider(email)

        if not provider_details:
            return {"error": "Provider not found"}, 404

        provider_id = provider_details['provider_id']

        swift_enc = encrypt_value(swift)
        acc_enc = encrypt_value(account_number)

        existing = ProviderModel.get_bank(provider_id)

        if existing:
            ProviderModel.update_bank(provider_id, bank_name, swift_enc, acc_enc, holder_name, bank_statement)
            ProviderModel.update_status(email, "pending")
        else:
            ProviderModel.insert_bank(provider_id, bank_name, swift_enc, acc_enc, holder_name, bank_statement)
            ProviderModel.update_status(email, "pending")

        send_email(email, "Bank Details Updated", "Your bank details were successfully updated.")
        return {"message": "Bank details updated successfully. Admin will review and approve your details shortly."}, 200

    # ===================================================================
    #                     3) PROFILE + SERVICES (UPDATED)
    # ===================================================================

    @staticmethod
    def profileget_(email):
        provider = ProviderModel.get_provider(email)

        if not provider:
            return {"error": "Provider not found"}, 404

        user_uid = provider['user_uid']

        # services now come from unified table
        services_rows = ProviderModel.get_services(user_uid)

        services = [
            {
                "service_name": s['service_name'],
                "service_rate": float(s['service_rate']) if s['service_rate'] else 0.0,
                "region": s.get('region', ''),
                "state": s.get('state', ''),
                "city": s.get('city', '')
            }
            for s in services_rows
        ]

        bank_details = None
        provider_id = provider["provider_id"]
        bank_row = ProviderModel.get_bank(provider_id)

        if bank_row:
            bank_details = {
                "bank_name": bank_row["bank_name"],
        
                # ✅ decrypt only encrypted fields
                "swift": decrypt_value(bank_row["swift_code"]),
                "bank_account_number": decrypt_value(bank_row["bank_account_number"]),
        
                # ✅ holder was never encrypted
                "holder_name": bank_row["account_holder_name"],
        
                "bank_statement":bank_row["bank_statement"]
                if bank_row.get("bank_statement") else None,
        
                # ✅ optional
                "status": bank_row.get("status")
            }
        
        
        response = {
            **provider,
            "profile_pic": provider.get("profile_pic"),
            "authorized_certificate": provider.get("authorized_certificate"),
            "services": services,
            "bank_details": bank_details
        }

        return response, 200
    
    
    @staticmethod
    def update_profile(form, files):
        import json
    
        # ================= BASIC VALIDATION =================
        email = form.get("email")
        if not email:
            return {"error": "Email required"}, 400
    
        provider = ProviderModel.get_provider(email)
        if not provider:
            return {"error": "Provider not found"}, 404
    
        user_uid = provider["user_uid"]
    
        # ================= FILE HANDLING =================
# ================= FILE HANDLING =================

        profile_files = files.getlist("profile_image") if hasattr(files, "getlist") else []
        cert_files = files.getlist("certificate") if hasattr(files, "getlist") else []
        
        # fallback single file support
        if not profile_files and files.get("profile_image"):
            profile_files = [files.get("profile_image")]
        
        if not cert_files and files.get("certificate"):
            cert_files = [files.get("certificate")]
        
        saved_profile_files = []
        saved_cert_files = []
        
        # save profile image
        for profile_file in profile_files:
            saved = save_uploaded_file(
                profile_file,
                ProviderController.COMPANY_LOGO_DIR,
                "/uploads/company_logos"
            )
        
            if saved:
                saved_profile_files.append(saved)
        
        # save certificates
        for cert_file in cert_files:
            saved = save_uploaded_file(
                cert_file,
                ProviderController.COMPANY_CERT_DIR,
                "/uploads/company_certificates"
            )
        
            if saved:
                saved_cert_files.append(saved)
        
        profile_pic_paths = [x["db_path"] for x in saved_profile_files]
        certificate_paths = [x["db_path"] for x in saved_cert_files]
    
        # ================= PROVIDER UPDATE =================
        updated_data = {
            "full_name": form.get("full_name"),
            "id_type": form.get("id_type"),
            "id_number": form.get("id_number"),
            "mailing_address": form.get("mailing_address"),
            "billing_address": form.get("billing_address"),
            "contact_number": form.get("contact_number"),
            "alternate_contact_number": form.get("alternate_contact_number"),
            "tin_number": form.get("tin_number"),
            "bumiputra_status": form.get("bumiputra_status"),
            "profile_pic": profile_pic_paths[0] if profile_pic_paths else None,
            "authorized_certificate": certificate_paths
        }
        
        logging.info("========== PROVIDER UPDATE DEBUG ==========")
        logging.info(f"Updating provider email: {email}")
        logging.info(f"user_uid resolved: {user_uid}")
        
        for key, val in updated_data.items():
            if isinstance(val, bytes):
                logging.info(f"{key}: <BYTES length={len(val)}>")
            else:
                logging.info(f"{key}: {val}")
        logging.info("==========================================")

    
        ProviderModel.update_provider(
            email,
            updated_data,
            profile_pic_paths,
            certificate_paths
        )
        ProviderModel.update_status(email, "pending")
    
        # ================= REPLACE SERVICES =================
        # 1️⃣ BACKUP FIRST
        try:
            logging.info("===== CONTROLLER: START BACKUP PROCESS =====")
            logging.info(f"Controller user_uid: {user_uid}")
        
            # 1️⃣ Delete old backup
            logging.info("Controller calling delete_backup_services")
            ProviderModel.delete_backup_services(user_uid)
            logging.info("Controller finished delete_backup_services")
        
            # 2️⃣ Insert new backup
            logging.info("Controller calling backup_services")
            ProviderModel.backup_services(user_uid)
            logging.info("Controller finished backup_services")
        
            logging.info("===== CONTROLLER: BACKUP PROCESS COMPLETE =====")
        
        except Exception as e:
            logging.error("===== CONTROLLER: BACKUP FAILED =====")
            logging.error(str(e))
            db.session.rollback()
            return {"error": str(e)}, 500


       
        ProviderModel.delete_services(user_uid)
    
        services_raw = form.get("services", "[]")
        try:
            services_list = json.loads(services_raw)
        except Exception:
            return {"error": "Invalid services format"}, 400
    
        cleaned_services = []
    
        for item in services_list:
    
            # ✅ service_name MUST NOT be NULL
            service_name = (
                item.get("type_name")
                or item.get("item_name")
                or item.get("category_name")
            )
    
            if not service_name:
                return {
                    "error": "Each service must have category / item / type"
                }, 400
    
            cleaned_services.append((
                "",
                float(item.get("price") or 0),
                item.get("region_name", ""),
                item.get("state_name", ""),
                item.get("city_name", ""),
                item.get("category_name"),
                item.get("item_name"),
                item.get("type_name"),
                item.get("description_name")
            ))
    
        if cleaned_services:
            # ✅ USING YOUR EXISTING METHOD
            ProviderModel.insert_services(user_uid, cleaned_services)
    
        # ================= NOTIFICATIONS ================= done for deployment
        send_email(
            ADMIN_EMAIL,
            "New Provider Ready for Review",
            f"{email} submitted updated profile"
        )
    
        send_email(
            email,
            "Profile Submitted",
            "Your profile is now under review"
        )
    
        return {
            "message": "Profile has been submitted successfully. Admin will cross check and approve your profile.",
            "status": "pending"
        }, 200
        
        
         
    @staticmethod
    def get_profile(email):
        provider = ProviderModel.get_provider(email)

        if not provider:
            return {"error": "Provider not found"}, 404

        user_uid = provider['user_uid']

        # services now come from unified table
        services_rows = ProviderModel.get_services(user_uid)

        services = [
            {
                "service_rate": float(s['service_rate']) if s['service_rate'] else 0.0,
        
                "region": s.get('region', ''),
                "state": s.get('state', ''),
                "city": s.get('city', ''),
        
                "category_name": s.get('category_name', ''),
                "item_name": s.get('item_name', ''),
                "type_name": s.get('type_name', ''),
                "description_name": s.get('description_name', '')
            }
            for s in services_rows
        ]
        

        bank_details = None
        provider_id = provider["provider_id"]
        bank_row = ProviderModel.get_bank(provider_id)
        if bank_row:
            bank_details = {
                "bank_name": bank_row['bank_name'],
                "swift": decrypt_value(bank_row["swift_code"]),
                "bank_account_number": decrypt_value(bank_row["bank_account_number"]),
                "holder_name": bank_row["account_holder_name"],
                "bank_statement":bank_row["bank_statement"]
                if bank_row.get("bank_statement") else None
            }

        response = {
            **provider,
            "profile_pic": provider.get("profile_pic"),
            "authorized_certificate": provider.get("authorized_certificate"),
            "services": services,
            "bank_details": bank_details
        }

        return response, 200
    
    

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
            profile = ProviderModel.get_contractor_gate_profile(user_uid)

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
                "account_holder_name",
                "bank_name",
                "bank_account_number",
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