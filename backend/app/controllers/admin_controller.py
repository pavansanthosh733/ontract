# app/controllers/admin_controller.py
import os, bcrypt, random, string
import tempfile
import logging
import magic
import jwt
import traceback
import uuid 
from datetime import datetime, timedelta, timezone
from app.utils.current_admin import set_admin
from app.utils.current_admin import set_admin, get_admin
from flask import current_app, make_response, jsonify 
from flask import current_app
from flask import session
from app.models.admin_model import AdminModel
from app.utils.email_utils import send_email, send_admin_otp_email
from app.utils.pdf_utils import generate_certificate_pdf
from app.utils.auth import revoke_token
from app.utils.jwt_utils import (create_access_token, create_refresh_token)
from app.models.refresh_token_model import RefreshTokenModel


class AdminController:

    # ===== Auth =====
    @staticmethod
    def login(email, password):
        if not email or not password:
            return {"error": "Email and password required"}, 400

        # Step 1: Check if account is locked
        if AdminModel.is_login_locked(email):
            return {
                "error": "Too many failed login attempts. Please try again after 5 minutes."
            }, 429

        # Step 2: Check if admin exists
        admin = AdminModel.get_admin_by_email(email)

        if not admin:
            AdminModel.record_failed_login(email)
            return {"error": "Invalid credentials"}, 401

        # Step 3: Verify password
        if not bcrypt.checkpw(password.encode(), admin["password_hash"].encode()):
            AdminModel.record_failed_login(email)
            return {"error": "Invalid credentials"}, 401

        # Step 4: Successful login → reset failed attempts
        AdminModel.reset_login_attempts(email)

        # Step 5: Generate OTP
        otp = ''.join(random.choices(string.digits, k=6))
        AdminModel.save_otp(email, otp)
        send_admin_otp_email(email, otp)

        return {
            "message": "OTP sent to email"
        }, 200
    
    @staticmethod
    def verify_otp(email, otp):

        if not email or not otp:
            return {"error": "Email and OTP required"}, 400

        ok = AdminModel.verify_otp(email, otp)

        if not ok:
            return {"error": "Invalid OTP"}, 401

        admin = AdminModel.get_admin_by_email(email)

        set_admin(admin)

        AdminModel.delete_otp(email)

        # -----------------------------------
        # Generate Access Token
        # -----------------------------------
        access_token = create_access_token(
            user_id=admin["admin_id"],
            role="admin",
            email=admin["email"]
        )

        # -----------------------------------
        # Generate Refresh Token
        # -----------------------------------
        refresh_token, refresh_expiry = create_refresh_token(
            user_id=admin["admin_id"],
            role="admin"
        )

        # -----------------------------------
        # Save Refresh Token
        # -----------------------------------
        RefreshTokenModel.save_refresh_token(
            user_id=admin["admin_id"],
            role="admin",
            refresh_token=refresh_token,
            expires_at=refresh_expiry
        )

        admin_data = {
            k: v
            for k, v in admin.items()
            if k not in ("password_hash", "access_token")
        }

        response = make_response(jsonify({
            "success": True,
            "message": "OTP verified successfully",
            "admin": admin_data
        }))

        # -----------------------------------
        # Access Token Cookie
        # -----------------------------------
        response.set_cookie(
            "admin_access_token",
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
            "admin_refresh_token",
            value=refresh_token,
            httponly=True,
            secure=True,
            samesite="None",
            path="/"
        )

        return response

        
    
    
   
    
    @staticmethod
    def logout():

        from flask import request, current_app, make_response, jsonify
        import jwt
        from datetime import datetime, timezone
        from app.models.refresh_token_model import RefreshTokenModel

        access_token = request.cookies.get("admin_access_token")
        refresh_token = request.cookies.get("admin_refresh_token")

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
                print("Refresh revoke error:", e)

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
            "admin_access_token",
            path="/",
            secure=True,
            httponly=True,
            samesite="None"
        )

        # -----------------------------------
        # Delete Refresh Cookie
        # -----------------------------------
        response.delete_cookie(
            "admin_refresh_token",
            path="/",
            secure=True,
            httponly=True,
            samesite="None"
        )

        return response, 200
    
    @staticmethod
    def refresh():
        
        from flask import request, make_response, jsonify
        print("========== REFRESH ==========")
        print("request.cookies =", request.cookies)
        print("Cookie header =", request.headers.get("Cookie"))
        print("=============================")
        from app.utils.jwt_utils import (
            verify_token,
            create_access_token,
            create_refresh_token
        )
        from app.models.refresh_token_model import RefreshTokenModel

        refresh_token = request.cookies.get("admin_refresh_token")
        if not refresh_token:
            return {
                "success": False,
                "message": "Refresh token missing"
            }, 401

        try:

            # -----------------------------------
            # Verify Refresh JWT
            # -----------------------------------
            payload = verify_token(refresh_token)

            if payload.get("type") != "refresh":
                return {
                    "success": False,
                    "message": "Invalid refresh token"
                }, 401

            # -----------------------------------
            # Verify token exists in DB
            # -----------------------------------
            token = RefreshTokenModel.get_refresh_token(refresh_token)

            if not token:
                return {
                    "success": False,
                    "message": "Refresh token revoked"
                }, 401

            # -----------------------------------
            # De - active old token
            # -----------------------------------
            RefreshTokenModel.revoke_refresh_token(refresh_token)

            # -----------------------------------
            # Generate NEW Access Token
            # -----------------------------------
            access_token = create_access_token(
                user_id=payload["user_id"],
                role=payload["role"]
            )

            # -----------------------------------
            # Generate NEW Refresh Token
            # -----------------------------------
            refresh_token_new, refresh_expiry = create_refresh_token(
                user_id=payload["user_id"],
                role=payload["role"]
            )

            # -----------------------------------
            # Save NEW Refresh Token
            # -----------------------------------
            RefreshTokenModel.save_refresh_token(
                user_id=payload["user_id"],
                role=payload["role"],
                refresh_token=refresh_token_new,
                expires_at=refresh_expiry
            )

            # -----------------------------------
            # Response
            # -----------------------------------
            response = make_response(jsonify({
                "success": True,
                "message": "Access token refreshed"
            }))

            # -----------------------------------
            # New Access Token Cookie
            # -----------------------------------
            response.set_cookie(
                "admin_access_token",
                value=access_token,
                httponly=True,
                secure=True,
                samesite="None",
                path="/"
            )

            # -----------------------------------
            # New Refresh Token Cookie
            # -----------------------------------
            response.set_cookie(
                "admin_refresh_token",
                value=refresh_token_new,
                httponly=True,
                secure=True,
                samesite="None",
                path="/"
            )

            return response

        except Exception as e:
            traceback.print_exc()

            return {
                "success": False,
                "message": str(e)
            }, 401
            
        
        
    @staticmethod
    def resend_otp(email):
        if not email:
            return {"error": "Email required"}, 400

        otp = "".join(random.choices(string.digits, k=6))
        AdminModel.save_otp(email, otp)
        send_admin_otp_email(email, otp)

        return {"message": "OTP resent successfully"}, 200

    @staticmethod
    def list_providers():
        providers = AdminModel.list_providers()

        for p in providers:

            # Normalize current services
            if not p.get("services"):
                p["services"] = []

            # Get previous services
            previous_rows = AdminModel.get_previous_services(p["user_uid"])

            previous_services = [
                {
                    "service_rate": float(s["service_rate"]) if s["service_rate"] else 0.0,
                    "region": s.get("region"),
                    "state": s.get("state"),
                    "city": s.get("city"),
                    "category_name": s.get("category_name"),
                    "item_name": s.get("item_name"),
                    "type_name": s.get("type_name"),
                    "description_name": s.get("description_name"),
                    "service_name": s.get("service_name"),
                    "previous_price": float(s["previous_price"]) if s["previous_price"] else None,
                    "backup_at": s.get("backup_at")
                }
                for s in previous_rows
            ]

            p["previous_services"] = previous_services

        return providers, 200


    @staticmethod
    def approve_provider(email):
        core = AdminModel.approve_provider_status(email)
        logging.info("core resolved: %s", core)
        if not core:
            return {"error": "Provider not found or not pending"}, 404

        # FIX: use user_uid instead of provider_id
        user_uid = core["user_uid"]
        logging.info("user_uid resolved: %s", user_uid)
        
        bank_exists = AdminModel.provider_bank_details_exists_by_user_uid(user_uid)
        logging.info("provider bank exists: %s", bank_exists)

        # fetch services
        services = AdminModel.get_provider_services([user_uid])

        # compose details for PDF
        details = {
            "Provider ID": user_uid,
            "Full Name": core['name'],
            "Email": email,
            "Phone Number": core['contact_number'],
            "Services": [
                {
                    "Service Name": s['service_name'],
                    "Service Rate": s['service_rate'],
                    "Service Location": s.get('state') or s.get('city') or 'N/A'
                }
                for s in services
            ]
        }

        pdf_path = generate_certificate_pdf(details, email)

        # 🔹 message logic (exactly as requested)
        if bank_exists:
            msg = "Your provider profile has been approved."
        else:
            msg = (
                "Your provider profile has been approved. "
                "Please proceed to submit your bank details."
            )


        AdminModel.insert_admin_message(
            email=email,
            recipient_type="provider",
            title="Provider Profile Approved",
            message=msg,
            notification_type="approval",
            reference_type="provider",
            reference_id=user_uid,
            action_url="/provider_home/providerupdateprofile"
        )

        try:
            send_email(email, "Profile Approved", msg, pdf_path)
            return {"message": "Provider approved"}, 200
        finally:
            if os.path.exists(pdf_path):
                os.remove(pdf_path)


    @staticmethod
    def reject_provider(email):
        if not AdminModel.reject_provider(email):
            return {"error": "Provider not found or not pending"}, 404
        msg = "Your provider profile has been rejected. Please contact admin for more details."
        AdminModel.insert_admin_message(
            email=email,
            recipient_type="provider",
            title="Provider Profile Rejected",
            message=msg,
            notification_type="rejection",
            reference_type="provider",
            action_url="/provider_home/providerupdateprofile"
        )
        send_email(email, "Profile Rejected", msg)
        return {"message": "Provider rejected"}, 200

    @staticmethod
    def send_message_provider(email, message):
        if not email or not message:
            return {"error": "Email and message required"}, 400
        AdminModel.insert_admin_message(
            email=email,
            recipient_type="provider",
            title="Message From Admin",
            message=message,
            notification_type="message",
            reference_type="provider",
            action_url="/provider_home/notifications"
        )
        send_email(email, "Message from Ontract Admin", message)
        return {"message": "Message sent and saved"}, 200

    # ===== Contractors =====
    @staticmethod
    def list_contractors():
        contractors = AdminModel.list_contractors()
    
        ids = [c['company_id'] for c in contractors]
        svcs = AdminModel.get_contractor_services_by_company_ids(ids)
    
        svc_map = {}
    
        for s in svcs:
            
           
            
            svc_map.setdefault(s['company_id'], []).append({
                "category": s.get("category_name"),
                "item": s.get("item_name"),
                "type": s.get("type_name"),
                "description": s.get("description_name"),
                "service_name": s.get("service_name"),
                "rate": float(s["service_rate"]) if s["service_rate"] else 0.0,
                "location": ", ".join(
                    filter(None, [s.get("region"), s.get("state"), s.get("city")])
                )
            })
    
        for c in contractors:
    
            # attach services
            c['services'] = svc_map.get(c['company_id'], [])
    
            # safe access
            user_uid = c.get("user_uid")
    
            if not user_uid:
                c["previous_services"] = []
                continue
    
            previous_rows = AdminModel.get_previous_services(user_uid)
    
            c["previous_services"] = [
                {
                    "service_rate": float(s["service_rate"]) if s["service_rate"] else 0.0,
                    "region": s.get("region"),
                    "state": s.get("state"),
                    "city": s.get("city"),
                    "category_name": s.get("category_name"),
                    "item_name": s.get("item_name"),
                    "type_name": s.get("type_name"),
                    "description_name": s.get("description_name"),
                    "service_name": s.get("service_name"),
                    "previous_price": float(s["previous_price"]) if s["previous_price"] else None,
                    "backup_at": s.get("backup_at")
                }
                for s in previous_rows
            ]
    
        return contractors, 200





    @staticmethod
    def approve_contractor(email):
        if not AdminModel.approve_contractor(email):
            return {"error": "Company not found or not pending"}, 404
        
        logging.info("email_id resolved: %s", email)
        company = AdminModel.get_contractor_by_email(email)
       
        company_id = company["company_id"]
    
        logging.info("company_id resolved: %s", company_id)
        services = AdminModel.get_contractor_services(company['user_uid'])
        
        details = {
            "Company ID": company['brn_number'],
            "Company Name": company['company_name'],
            "Name": company.get('name'),  # comes from users_t now
            "Email": company.get('email_id'),
            "Contact Number": company.get('contact_number'),
            "Services": [{
                "Service Name": s['service_name'],
                "Service Rate": s['service_rate'],
                "Service Location":  ", ".join(filter(None, [s.get("city"), s.get("state"), s.get("region")]))
            } for s in services]
        }

        pdf_path = generate_certificate_pdf(details, email)
        # ✅ company_id-based bank check
        bank_exists = AdminModel.company_bank_details_exists(company_id)
    
        logging.info("company bank exists: %s", bank_exists)
    
        if bank_exists:
            msg = "Your provider profile has been approved."
        else:
            msg = (
                "Your provider profile has been approved. "
                "Please proceed to submit company bank details."
            )
    
        AdminModel.insert_admin_message(
            email=email,
            recipient_type="contractor",
            title="Company Approved",
            message=msg,
            notification_type="approval",
            reference_type="company",
            reference_id=company_id,
            action_url="/contractor/dashboard/profile"
        )

        try:
            send_email(email, "Company Approved", msg, pdf_path)
            return {"message": "Contractor approved"}, 200
        finally:
            if os.path.exists(pdf_path):
                os.remove(pdf_path)  
                
                  
    @staticmethod
    def reject_contractor(email):
        if not AdminModel.reject_contractor(email):
            return {"error": "Not found or already processed"}, 404
        msg = "Your company registration has been rejected. Contact admin for details."
        AdminModel.insert_admin_message(
            email=email,
            recipient_type="contractor",
            title="Company Rejected",
            message=msg,
            notification_type="rejection",
            reference_type="company",
            action_url="/contractor/dashboard/profile"
        )
        send_email(email, "Company Rejected", msg)
        return {"message": "Contractor rejected"}, 200  #commnet added for deployment

    @staticmethod
    def send_message_contractor(email, message):
        if not email or not message:
            return {"error": "Email and message required"}, 400
        AdminModel.insert_admin_message(
            email=email,
            recipient_type="contractor",
            title="Message From Admin",
            message=message,
            notification_type="message",
            reference_type="company",
            action_url="/contractor/dashboard/notifications"
        )
        send_email(email, "Message from Admin", message)
        return {"message": "Message sent"}, 200

    # ===== Standard Rates =====
    # @staticmethod
    # def upload_excel(file_storage):
    #     if not file_storage or not file_storage.filename.lower().endswith(('.xlsx', '.xls')):
    #         return {"error": "Only Excel files are allowed"}, 400
    #     os.makedirs("uploads", exist_ok=True)
    #     path = os.path.join("uploads", file_storage.filename)
    #     file_storage.save(path)
    #     try:
    #         AdminModel.upload_standard_rate_excel(path)
    #         return {"message": "File uploaded and data saved"}, 200
    #     finally:
    #         if os.path.exists(path):
    #             os.remove(path)

    # @staticmethod
    # def list_standard_rates():
    #     return AdminModel.list_standard_rates(), 200

    # @staticmethod
    # def add_standard_rate(payload):
    #     AdminModel.add_or_upsert_standard_rate(
    #         payload['service_name'],
    #         payload['service_location'],
    #         payload['service_rate'],
    #         payload['client']
    #     )
    #     return {"message": "Rate added"}, 201

    # @staticmethod
    # def update_standard_rate(rate_id, payload):
    #     AdminModel.update_standard_rate_by_id(
    #         rate_id,
    #         payload['service_name'],
    #         payload['service_location'],
    #         payload['service_rate'],
    #         payload['client']
    #     )
    #     return {"message": "Rate updated"}, 200

    # @staticmethod
    # def delete_standard_rate(rate_id):
    #     AdminModel.delete_standard_rate_by_id(rate_id)
    #     return {"message": "Rate deleted"}, 200

    # @staticmethod
    # def list_rates_compact():
    #     return AdminModel.list_rates_compact(), 200

    @staticmethod
    def upload_excel(file_storage):
        if not file_storage or not getattr(file_storage, "filename", None):
            return {"error": "No file provided"}, 400

        fname = file_storage.filename.lower()
        if not fname.endswith(".csv"):
            return {"error": "Only CSV files are allowed (.csv)"}, 400

        tmp_dir = tempfile.mkdtemp(prefix="upload_csv_")
        tmp_path = os.path.join(tmp_dir, file_storage.filename)

        try:
            file_storage.save(tmp_path)
            result = AdminModel.upload_standard_rate_excel(tmp_path)

            if result.get("status") == "validation_failed":
                return {
                    "error": "CSV validation failed",
                    "details": result.get("errors", [])
                }, 400

            return {
                "message": "Import completed",
                "result": result
            }, 200

        except Exception as e:
            current_app.logger.exception("CSV upload failed")
            return {"error": str(e)}, 500

        finally:
            try:
                if os.path.exists(tmp_path):
                    os.remove(tmp_path)
                if os.path.exists(tmp_dir):
                    os.rmdir(tmp_dir)
            except Exception:
                pass
            
            
    @staticmethod
    def list_standard_rates(params):
        try:
           
          res = AdminModel.list_standard_rates(params)
          return res, 200
        except Exception as e:
            current_app.logger.exception("List rates failed")
            return {"error": str(e)}, 500

    @staticmethod
    def add_standard_rate(payload):
        try:
            response = AdminModel.add_standard_rate(payload)
            return response, 200

        except Exception as e:
            current_app.logger.exception("Add rate failed")
            return {"success": False, "error": str(e)}, 500

    @staticmethod
    def update_standard_rate(rate_id, payload):
        try:
            response = AdminModel.update_standard_rate(rate_id,payload)
            return response, 200

        except Exception as e:
            current_app.logger.exception("Update rate failed")
            return {"success": False, "error": str(e)}, 500

    @staticmethod
    def delete_standard_rate(rate_id):
        try:
            AdminModel.delete_standard_rate(rate_id)
            return {"message": "Rate deleted"}, 200
        except Exception as e:
            current_app.logger.exception("Delete rate failed")
            return {"error": str(e)}, 500
        
    @staticmethod
    def get_individual_count():
        count, error = AdminModel.count_individual()
        if error:
            return {"error": error}, 500
        return {"individual_count": count}, 200
    @staticmethod
    def get_company_count():
        count, error = AdminModel.count_company()
        if error:
            return {"error": error}, 500
        return {"company_count": count}, 200
    @staticmethod
    def get_today_users_count():
        count, error = AdminModel.count_today_users()
        if error:
            return {"error": error}, 500
        return {"today_count": count}, 200
    @staticmethod
    def get_active_users_count():
        count, error = AdminModel.count_active_users()
        if error:
            return {"error": error}, 500
        return {"active_count": count}, 200
    
    @staticmethod
    def update_active_status(email, is_active):
        if not email:
            return {"success": False, "message": "Email required"}, 400

        updated = AdminModel.update_active_status(email, is_active)

        if not updated:
            return {"success": False, "message": "User not found"}, 404

        return {
            "success": True,
            "message": f"User {'activated' if is_active else 'deactivated'} successfully"
        }, 200