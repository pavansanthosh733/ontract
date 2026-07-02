from sqlalchemy.sql import text
from datetime import datetime
from app.models.database import db
from app.utils.encrypt_utils import decrypt_value
import base64
import logging
import json
import traceback
from app.models.provider_model import ProviderModel 

class ContractorModel:

    # ---------------- CREATE COMPANY (users_t + company_details_t) ----------------
    @staticmethod
    def create_company(hashed_password, phone, email, activation_token):

        # Step 1 — create user entry
        sql_user = text("""
            INSERT INTO users_t (email_id,password_hash,contact_number,activation_token,
            active_status,status,service_type, created_at)
            VALUES (:email,:pw,:phone,:token,FALSE,'registered', 1, NOW())
            RETURNING user_uid
        """)

        user_uid = db.session.execute(sql_user, {
            "email": email,
            "pw": hashed_password,
            "phone": phone,
            "token": activation_token
        }).fetchone()[0]

        # Step 2 — create company entry
        sql_company = text("""
            INSERT INTO company_details_t (company_id,user_uid)
            VALUES (:uid,:uid)
        """)

        db.session.execute(sql_company, {
            "uid": user_uid
        })

        db.session.commit()
        return user_uid

    # ---------------- GET COMPANY VIA TOKEN ----------------
    @staticmethod
    def get_company_by_token(token):
        sql = text("""
            SELECT email_id FROM users_t WHERE activation_token = :token AND service_type = 1
        """)
        row = db.session.execute(sql, {"token": token}).fetchone()
        return dict(row._mapping) if row else None

    # ---------------- ACTIVATE COMPANY ----------------
    @staticmethod
    def activate_company(token):
        sql = text("""
            UPDATE users_t
            SET active_status = TRUE, status = 'pending'
            WHERE activation_token = :token AND service_type = 1
        """)
        result = db.session.execute(sql, {"token": token})
        db.session.commit()
        return result.rowcount > 0

    # ---------------- LOGIN ----------------
    @staticmethod
    def get_contractor_by_email(email):
        print(f"🗃️ Fetching contractor for email: {email}")
    
        sql = text("""
            SELECT password_hash, active_status, service_type
            FROM users_t WHERE email_id = :email
        """)
    
        row = db.session.execute(sql, {"email": email}).fetchone()
    
        print(f"🧾 Raw DB Row: {row}")
    
        return dict(row._mapping) if row else None

    # ---------------- OTP ----------------
    @staticmethod
    def save_otp(email, otp):
        db.session.execute(
            text("INSERT INTO otp_codes_t (email_id, otp_code) VALUES (:email, :otp)"),
            {"email": email, "otp": otp}
        )
        db.session.commit()
        
        
        

    @staticmethod
    def record_failed_login(email):

        row = db.session.execute(text("""
            SELECT failed_attempts FROM contractor_login_attempts_t WHERE email = :email
        """), {
            "email": email
        }).fetchone()

        if row:

            attempts = row._mapping["failed_attempts"] + 1

            if attempts >= 5:

                db.session.execute(text("""
                    UPDATE contractor_login_attempts_t SET failed_attempts = :attempts,
                    locked_until = timezone('Asia/Kolkata', NOW()) + INTERVAL '5 minutes',
                    updated_at = timezone('Asia/Kolkata', NOW()) WHERE email = :email
                """), {
                    "attempts": attempts,
                    "email": email
                })

            else:

                db.session.execute(text("""
                    UPDATE contractor_login_attempts_t SET failed_attempts = :attempts,
                    updated_at = timezone('Asia/Kolkata', NOW()) WHERE email = :email
                """), {
                    "attempts": attempts,
                    "email": email
                })

        else:

            db.session.execute(text("""
                INSERT INTO contractor_login_attempts_t(email,failed_attempts,updated_at)
                VALUES(:email,1,timezone('Asia/Kolkata', NOW()))
            """), {
                "email": email
            })

        db.session.commit()

    
    @staticmethod
    def reset_login_attempts(email):

        db.session.execute(text("""
            UPDATE contractor_login_attempts_t SET failed_attempts = 0,locked_until = NULL,
            updated_at = timezone('Asia/Kolkata', NOW()) WHERE email = :email
        """), {
            "email": email
        })

        db.session.commit()

    @staticmethod
    def is_login_locked(email):

        row = db.session.execute(text("""
            SELECT failed_attempts,locked_until FROM contractor_login_attempts_t
            WHERE email = :email
        """), {
            "email": email
        }).fetchone()

        if not row:
            return False

        data = row._mapping

        if data["locked_until"]:

            now = db.session.execute(
                text("SELECT timezone('Asia/Kolkata', NOW())")
            ).scalar()

            if data["locked_until"] > now:
                return True

            db.session.execute(text("""
                UPDATE contractor_login_attempts_t SET failed_attempts = 0,locked_until = NULL,
                updated_at = timezone('Asia/Kolkata', NOW()) WHERE email = :email
            """), {
                "email": email
            })

            db.session.commit()

        return False






    @staticmethod
    def validate_otp(email):
        sql = text("""
            SELECT otp_code FROM otp_codes_t
            WHERE email_id = :email
              AND created_at > NOW() - INTERVAL '5 minutes'
        """)
        row = db.session.execute(sql, {"email": email}).fetchone()
        return dict(row._mapping) if row else None
    
     
    
    
    @staticmethod
    def delete_otp(email):
        db.session.execute(text("DELETE FROM otp_codes_t WHERE email_id = :email"), {"email": email})
        db.session.commit()
        
    @staticmethod    
    def json_safe(value):
        if isinstance(value, memoryview):
            return value.tobytes().hex()  # or .decode() if text
        return value

    @staticmethod
    def row_to_dict_safe(row):
        return {
            k: ContractorModel.json_safe(v)
            for k, v in row._mapping.items()
        }
    

    @staticmethod
    def get_basic_info(email):
        sql = text("""
            SELECT c.company_id,u.user_uid,u.email_id,u.contact_number,u.status,c.company_name,c.brn_number,
                u.name,u.tin_number,u.billing_address,u.mailing_address,p.id_number,s.service_id,
                s.service_name,s.service_rate,s.region,s.state,s.city
            FROM users_t u JOIN company_details_t c ON u.user_uid = c.user_uid
            LEFT JOIN providers_t p ON p.user_uid = u.user_uid
            LEFT JOIN services_t s ON u.user_uid = s.user_uid WHERE u.email_id = :email
        """)

        rows = db.session.execute(sql, {"email": email}).fetchall()
        if not rows:
            return None

        base = ContractorModel.row_to_dict_safe(rows[0])
        base["services"] = []

        for r in rows:
            service_id = r._mapping.get("service_id")
            if service_id:
                base["services"].append({
                    "service_id": service_id,
                    "service_name": r._mapping["service_name"],
                    "service_rate": r._mapping["service_rate"],
                    "region": r._mapping["region"],
                    "state": r._mapping["state"],
                    "city": r._mapping["city"],
                })

        return base

 

    # ---------------- FULL PROFILE ----------------
    @staticmethod
    def get_company_profile(email):
    
        # ---- Fetch base company + user info ----
        sql = text("""
            SELECT u.user_uid,u.email_id,u.contact_number,u.mailing_address,u.billing_address,
                u.alternate_contact_number,u.tin_number,u.status,u.bumiputra_status,
                c.company_id,c.company_name,c.brn_number,c.logo_path, c.certificate_path,u.name
            FROM users_t u JOIN company_details_t c ON u.user_uid = c.user_uid
            WHERE u.email_id = :email
        """)
    
        row = db.session.execute(sql, {"email": email}).fetchone()
        if not row:
            return None
    
        company = dict(row._mapping)
    
        # ---- Fetch services ----
        sql_services = text("""
            SELECT service_name,service_rate,region,state,city,category_name, 
            item_name,type_name,description_name FROM services_t
            WHERE user_uid = :uid AND service_type = 1 ORDER BY created_at
        """)
    
        services = db.session.execute(
            sql_services, {"uid": company["user_uid"]}
        ).fetchall()
    
        company["services"] = [dict(s._mapping) for s in services]
    
        # ---- Fetch FULL Bank Details ----
        sql_bank = text("""
            SELECT company_bank_id,company_id,bank_name,swift_code,holder_name,account_number,
            bank_statement_path,created_at,updated_at FROM company_bank_details_t
            WHERE company_id = :cid
        """)
    
        bank_row = db.session.execute(
            sql_bank, {"cid": company["company_id"]}
        ).fetchone()
    
        if bank_row:
            bank = dict(bank_row._mapping)
    
            company["bank_details"] = {
                # ✅ IDs
                "company_bank_id": bank["company_bank_id"],
                "company_id": bank["company_id"],
    
                # ✅ Normal fields
                "bank_name": bank["bank_name"],
                "holder_name": bank["holder_name"],
    
                # ✅ Decrypt encrypted fields only
                "swift_code": decrypt_value(bank["swift_code"]) if bank["swift_code"] else None,
                "account_number": decrypt_value(bank["account_number"]) if bank["account_number"] else None,
    
                # ✅ File handling
                "bank_statement_path": bank["bank_statement_path"],
    
                # ✅ Dates
                "created_at": str(bank["created_at"]) if bank.get("created_at") else None,
                "updated_at": str(bank["updated_at"]) if bank.get("updated_at") else None,
            }
    
        else:
            company["bank_details"] = None
    
        return company



    @staticmethod
    def update_company_profile(email, data, services, logo_paths=None, cert_paths=None):
        """
        Production-safe version:
        - updates user/company fields
        - stores file PATHS, not bytes
        - keeps backward compatibility if old code still sends bytes
        - supports list input, but stores the first valid path in the current single DB columns
        """
    
        def normalize_path_value(value):
            """
            Accepts:
            - None
            - string path
            - list/tuple of paths
            - bytes/memoryview from old flow
    
            Returns a single DB-safe string path or None.
            """
            if value is None:
                return None
    
            # Old binary flow compatibility
            if isinstance(value, (bytes, bytearray, memoryview)):
                # Old code used binary; in the new flow we do NOT want raw bytes in DB.
                # Returning None keeps existing DB value unchanged if no new path is provided.
                return None
    
            # Multiple uploaded files -> store first valid path in this column
            if isinstance(value, (list, tuple)):
                for item in value:
                    if item:
                        return str(item)
                return None
    
            value = str(value).strip()
            return value if value else None
    
        bumiputera_value = (
            "Yes"
            if str(data.get("bumiputera")).strip().lower() == "yes"
            else "No"
        )
    
        # Normalize incoming upload values
        # Normalize logo as single path
        logo_path_value = normalize_path_value(logo_paths)
        
        # Normalize certificates as JSON array
        cert_path_value = (
            json.dumps([str(p) for p in cert_paths if p])
            if cert_paths else None
        )
    
        # Update common fields in users_t
        sql_user = text("""
            UPDATE users_t SET name = :head_name,mailing_address = :mailing,billing_address = :billing,
                contact_number = :contact,alternate_contact_number = :alternate,tin_number = :tin,
                bumiputra_status = :bumiputra_status,status = 'pending',updated_at = CURRENT_TIMESTAMP
            WHERE email_id = :email
        """)
    
        db.session.execute(sql_user, {
            "head_name": data["contact_person"],
            "mailing": data["mailing_address"],
            "billing": data["billing_address"],
            "contact": data["contact_number"],
            "alternate": data["alternate_contact"],
            "tin": data["tin_number"],
            "bumiputra_status": bumiputera_value,
            "email": email
        })
    
        # Update company specific info
        # NOTE:
        # This now stores PATHS, not BYTEA.
        # If logo_path_value / cert_path_value is None, existing DB values remain unchanged.
        sql_company = text("""
            UPDATE company_details_t SET 
                company_id = (SELECT user_uid FROM users_t WHERE email_id = :email),
                company_name = :name,brn_number = :brn,logo_path = COALESCE(:logo, logo_path),
                certificate_path = COALESCE(CAST(:cert AS JSONB), certificate_path),
                updated_at = CURRENT_TIMESTAMP
            WHERE user_uid = (SELECT user_uid FROM users_t WHERE email_id = :email)
        """)
    
        db.session.execute(sql_company, {
            "name": data["company_name"],
            "brn": data["brn_number"],
            "logo": logo_path_value,
            "cert": cert_path_value,
            "email": email
        })
        # Get user uid
        user_uid_sql = text("SELECT user_uid FROM users_t WHERE email_id = :email")
        uid_row = db.session.execute(user_uid_sql, {"email": email}).fetchone()
        if not uid_row:
            db.session.rollback()
            return False
    
        uid = uid_row[0]
    
        # Backup before delete
        ProviderModel.delete_backup_services(uid)
        ProviderModel.backup_services(uid)
    
        # Replace services
        db.session.execute(
            text("DELETE FROM services_t WHERE user_uid = :uid AND service_type = 1"),
            {"uid": uid}
        )
    
        for svc in services:
            db.session.execute(text("""
                INSERT INTO services_t (user_uid,service_type,service_name,service_rate,region,
                    state,city,category_name,item_name,type_name,description_name)
                VALUES (:uid,1,:name,:rate,:region,:state,:city,:category_name,:item_name,
                    :type_name,:description_name)
            """), {
                "uid": uid,
                "name": svc.get("service_name", "") or "",
                "rate": float(svc.get("price", 0) or 0),
                "region": svc.get("region_name", ""),
                "state": svc.get("state_name", ""),
                "city": svc.get("city_name", ""),
                "category_name": svc.get("category_name", ""),
                "item_name": svc.get("item_name", ""),
                "type_name": svc.get("type_name", ""),
                "description_name": svc.get("description_name", "")
            })
    
        db.session.commit()
        return True
    

    @staticmethod
    def get_existing_bank_statement(email):
        sql = text("""
            SELECT bank_statement_path FROM company_bank_details_t cbd
            JOIN company_details_t c ON c.company_id = cbd.company_id
            JOIN users_t u ON u.user_uid = c.user_uid WHERE u.email_id = :email
            LIMIT 1
        """)
    
        row = db.session.execute(sql, {"email": email}).mappings().fetchone()
        return row["bank_statement_path"] if row and row["bank_statement_path"] else None
    

 
  # ---------------- UPDATE BANK ----------------
    @staticmethod
    def update_company_bank(email, bank_details, statement_path):
        try:
            logging.info(
                "update_company_bank started | email=%s | statement_path=%s",
                email,
                statement_path
            )
    
            # -----------------------------------------------------
            # Step 1: Get company_id from email
            # -----------------------------------------------------
            sql_id = text("""
                SELECT c.company_id FROM company_details_t c
                JOIN users_t u ON u.user_uid = c.user_uid WHERE u.email_id = :email
                LIMIT 1
            """)
    
            row = db.session.execute(
                sql_id,
                {"email": email}
            ).mappings().fetchone()
    
            if not row:
                logging.error("Company lookup failed for email=%s", email)
                return False
    
            company_id = row["company_id"]
            logging.info(
                "Company lookup success | email=%s | company_id=%s",
                email,
                company_id
            )
    
            # -----------------------------------------------------
            # Step 2: Upsert bank details + statement path
            # -----------------------------------------------------
            # Update users_t status to pending
            sql_user = text("""
                UPDATE users_t SET status = 'pending',updated_at = CURRENT_TIMESTAMP
                WHERE email_id = :email
            """)
            
            db.session.execute(sql_user, {"email": email})
            
            
            sql_upsert = text("""
                INSERT INTO company_bank_details_t(company_id,swift_code,holder_name,account_number,
                    bank_name,bank_statement_path,created_at)
                VALUES
                (:id,:swift,:holder,:acc,:bank,:statement_path,NOW())
                ON CONFLICT (company_id)
                DO UPDATE SET
                    swift_code = EXCLUDED.swift_code,
                    holder_name = EXCLUDED.holder_name,
                    account_number = EXCLUDED.account_number,
                    bank_name = EXCLUDED.bank_name,
                    bank_statement_path = COALESCE(EXCLUDED.bank_statement_path, company_bank_details_t.bank_statement_path),
                    updated_at = NOW()
            """)
    
            db.session.execute(sql_upsert, {
                "id": company_id,
                "swift": bank_details["swift_enc"],
                "holder": bank_details["holder_name"],
                "acc": bank_details["account_number_enc"],
                "bank": bank_details["bank_name"],
                "statement_path": statement_path
            })
    
            # -----------------------------------------------------
            # Step 3: Commit
            # -----------------------------------------------------
            db.session.commit()
    
            logging.info(
                "Bank details updated successfully | email=%s | company_id=%s | statement_path=%s",
                email,
                company_id,
                statement_path
            )
    
            return True
    
        except Exception as e:
            db.session.rollback()
    
            logging.error(
                "❌ Bank update DB error for email=%s | error=%s",
                email,
                str(e)
            )
            logging.error("❌ Full traceback:\n%s", traceback.format_exc())
    
            return False

    # ---------------- NOTIFICATIONS ----------------
    @staticmethod
    def fetch_notifications(email):
        sql = text("""
            SELECT message_id, message, sent_at, is_read, notification_type
            FROM admin_messages_t WHERE email_id = :email ORDER BY sent_at DESC
        """)
        rows = db.session.execute(sql, {"email": email}).fetchall()
        return [dict(r._mapping) for r in rows]

    @staticmethod
    def fetch_unread_count(email):
        sql = text("""
            SELECT COUNT(*) AS count FROM admin_messages_t
            WHERE email_id = :email AND is_read = FALSE
        """)
        row = db.session.execute(sql, {"email": email}).fetchone()
        return row._mapping["count"] if row else 0

    @staticmethod
    def mark_notification_read(message_id):
        sql = text("""
            UPDATE admin_messages_t SET is_read = TRUE WHERE message_id = :id
        """)
        result = db.session.execute(sql, {"id": message_id})
        db.session.commit()
        return result.rowcount > 0
    
    @staticmethod
    def get_active_session(refresh_token):
        sql = text("""
            SELECT id,contractor_id,refresh_token,expires_at,is_active,token_family,ip_address
            FROM contractor_sessions WHERE refresh_token = :token AND is_active = TRUE
              AND expires_at > NOW() LIMIT 1
        """)
    
        row = db.session.execute(sql, {"token": refresh_token}).fetchone()
        return dict(row._mapping) if row else None
    
    @staticmethod
    def get_contractor_by_id(contractor_id):
        sql = text("""
            SELECT c.company_id,u.user_uid,u.email_id,u.contact_number,u.status,c.company_name,c.brn_number
            FROM users_t u JOIN company_details_t c ON u.user_uid = c.user_uid
            WHERE u.user_uid = :uid
            LIMIT 1
        """)
    
        row = db.session.execute(sql, {"uid": contractor_id}).fetchone()
        return dict(row._mapping) if row else None
    
    
    @staticmethod
    def rotate_session_token(old_token, new_token, expires_at):
        sql = text("""
            UPDATE contractor_sessions SET refresh_token = :new_token,
            expires_at = :expires_at,last_used_at = NOW() WHERE refresh_token = :old_token
        """)
    
        db.session.execute(sql, {
            "new_token": new_token,
            "expires_at": expires_at,
            "old_token": old_token
        })
        db.session.commit()
        
        
    
    @staticmethod
    def deactivate_session(refresh_token, auto_commit=True):
        print("\n🧠 MODEL → deactivate_session START")
    
        sql = text("""
            UPDATE contractor_sessions SET is_active = FALSE,last_used_at = NOW(),
            revoked_reason = 'rotated'WHERE refresh_token = :token
        """)
    
        result = db.session.execute(sql, {"token": refresh_token})
    
        print(f"📊 Rows Updated      : {result.rowcount}")
    
        if auto_commit:
            db.session.commit()
            print("💾 Commit success")
    
        print("🧠 MODEL → deactivate_session END")
        return result.rowcount > 0
    
    
    @staticmethod
    def rotate_refresh_session(contractor_id,old_token,new_token,expires_at,ip_address,token_family):
        print("\n🚀 MODEL → rotate_refresh_session START")
    
        try:
            # STEP 1 → insert new token row
            ContractorModel.create_session(contractor_id,new_token,"WEB",expires_at,ip_address,
                token_family=token_family,rotated_from=old_token,auto_commit=False)
            print("✅ STEP 1 → new session inserted")
    
            # STEP 2 → deactivate old token row
            ContractorModel.deactivate_session(old_token, auto_commit=False)
    
            db.session.commit()
            return True
    
        except Exception as e:
            db.session.rollback()
            print(f"🔥 ROTATION FAILED: {str(e)}")
            print("↩️ ROLLBACK COMPLETE")
            return False
        
        
    @staticmethod
    def create_session(contractor_id,refresh_token,device_name,expires_at,ip_address=None,
        token_family=None,rotated_from=None,auto_commit=True):

    
        try:
            sql = text("""
                INSERT INTO contractor_sessions(contractor_id,refresh_token,device_name,expires_at,
                ip_address,token_family,rotated_from)
                VALUES (:contractor_id,:refresh_token,:device_name,:expires_at,:ip_address,
                :token_family,:rotated_from)
            """)
    
            result = db.session.execute(sql, {
                "contractor_id": contractor_id,
                "refresh_token": refresh_token,
                "device_name": device_name,
                "expires_at": expires_at,
                "ip_address": ip_address,
                "token_family": token_family,
                "rotated_from": rotated_from
            })
    
            if auto_commit:
                db.session.commit()
            
    
            return result.rowcount > 0
    
        except Exception as e:
            db.session.rollback()
            print(f"❌ SESSION INSERT ERROR: {str(e)}")
            raise
        
        

    @staticmethod
    def get_contractor_gate_profile(user_uid):
        sql = text("""
            SELECT
                u.user_uid,
                u.email_id,
                u.name,
                u.contact_number,
                u.alternate_contact_number,
                u.mailing_address,
                u.billing_address,
                u.tin_number,
                u.status,
                u.active_status,
                u.service_type,
                u.created_at,
                u.updated_at,
                u.bumiputra_status,

                b.company_bank_id,
                b.company_id,
                b.swift_code,
                b.holder_name,
                b.bank_name,
                b.account_number,
                b.bank_statement,
                b.bank_statement_path,
                b.created_at AS bank_created_at,
                b.updated_at AS bank_updated_at

            FROM users_t u
            LEFT JOIN company_bank_details_t b
                ON b.company_id = u.user_uid
            WHERE u.user_uid = :user_uid
              AND u.service_type = 1
            LIMIT 1
        """)

        row = db.session.execute(sql, {"user_uid": user_uid}).fetchone()
        return dict(row._mapping) if row else None