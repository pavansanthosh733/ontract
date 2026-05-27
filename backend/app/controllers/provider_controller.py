import os, uuid, bcrypt, random, string, json, base64
from datetime import datetime
from werkzeug.utils import secure_filename
from sqlalchemy.exc import IntegrityError
from sqlalchemy import text
import logging
from app import db

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

    @staticmethod
    def login(email, password):
        provider = ProviderModel.get_provider_login(email)

        if not provider:
            return {"error": "User not found"}, 404

        # Check password
        if not bcrypt.checkpw(password.encode(), provider['password_hash'].encode()):
            return {"error": "Invalid credentials"}, 401

        if not provider['active_status']:
            return {"error": "Account not activated"}, 401

        # OTP flow remains the same
        otp = ''.join(random.choices(string.digits, k=6))
        ProviderModel.insert_otp(email, otp)
        send_otp_email(email, otp)

        return {"message": "OTP sent to email"}, 200
    @staticmethod
    def verify_otp(email, otp):
        record = ProviderModel.get_otp(email)
    
        if not record or record['otp_code'] != otp:
            return {"error": "Invalid or expired OTP"}, 401
    
        ProviderModel.delete_otp(email)
    
        # 🔥 THIS LINE FIXES EVERYTHING
        user = ProviderModel.get_user_for_context(email)
    
        if not user:
            return {"error": "User not found"}, 404
    
        return {
            "success": True,
            "user": user
        }, 200
        
        
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
        
                "bank_statement": base64.b64encode(bank_row["bank_statement"]).decode()
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
    
        # ================= NOTIFICATIONS =================
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
                "bank_statement": base64.b64encode(bank_row["bank_statement"]).decode()
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