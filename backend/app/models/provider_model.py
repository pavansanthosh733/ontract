import logging
from datetime import datetime, timedelta
from sqlalchemy.sql import text
from app.models.database import db
from sqlalchemy import text
from sqlalchemy.exc import IntegrityError
import json


class ProviderModel:

    # ============================================================
    #  SECTION 1 — ACCOUNT CREATION USING users_t + providers_t
    # ============================================================
    @staticmethod
    def insert_provider(email, hashed_pw, phone, token):
    
        email = email.strip().lower()
    
        sql_user = text("""
            INSERT INTO users_t 
            (email_id, password_hash, contact_number, activation_token,
             active_status, status, service_type, created_at)
            VALUES (:email, :pw, :phone, :token, :active, :status, 0, NOW())
            RETURNING user_uid
        """)
    
        try:
            result = db.session.execute(sql_user, {
                "email": email,
                "pw": hashed_pw,
                "phone": phone,
                "token": token,
                "active": False,
                "status": "registered"
            })
    
            user_uid = result.fetchone()[0]
    
            # ✅ FIX: Insert provider_id also
            sql_provider = text("""
                INSERT INTO providers_t (provider_id, user_uid)
                VALUES (:pid, :uid)
            """)
        
            db.session.execute(sql_provider, {
                "pid": user_uid,
                "uid": user_uid
            })
    
            db.session.commit()
            return user_uid
    
        except IntegrityError as e:
            db.session.rollback()
            print("🔥 IntegrityError inside insert_provider:")
            print(str(e.orig))
            raise e
    
        except Exception as e:
            db.session.rollback()
            print("🔥 Other Error:", str(e))
            raise e
    




    @staticmethod
    def get_provider_by_token(token):
        sql = text("SELECT email_id FROM users_t WHERE activation_token = :token AND service_type = 0")
        row = db.session.execute(sql, {"token": token}).fetchone()
        return dict(row._mapping) if row else None

    @staticmethod
    def activate_account(token):
        sql = text("""
            UPDATE users_t 
            SET active_status = TRUE 
            WHERE activation_token = :token AND service_type = 0
        """)
        db.session.execute(sql, {"token": token})
        db.session.commit()

    @staticmethod
    def get_provider_login(email):
        sql = text("""
            SELECT password_hash, active_status, service_type 
            FROM users_t 
            WHERE email_id = :email
        """)
        row = db.session.execute(sql, {"email": email}).fetchone()
        return dict(row._mapping) if row else None

    # ============================================================
    #  SECTION 2 — OTP (NO CHANGES REQUIRED)
    # ============================================================
    
    
    
    
    @staticmethod
    def record_failed_login(email):

        row = db.session.execute(text("""
            SELECT failed_attempts FROM provider_login_attempts_t WHERE email = :email
        """), {
            "email": email
        }).fetchone()

        if row:

            attempts = row._mapping["failed_attempts"] + 1

            if attempts >= 5:

                db.session.execute(text("""
                    UPDATE provider_login_attempts_t SET failed_attempts = :attempts,
                    locked_until = timezone('Asia/Kolkata', NOW()) + INTERVAL '5 minutes',
                    updated_at = timezone('Asia/Kolkata', NOW()) WHERE email = :email
                """), {
                    "attempts": attempts,
                    "email": email
                })

            else:

                db.session.execute(text("""
                    UPDATE provider_login_attempts_t SET failed_attempts = :attempts,
                    updated_at = timezone('Asia/Kolkata', NOW()) WHERE email = :email
                """), {
                    "attempts": attempts,
                    "email": email
                })

        else:

            db.session.execute(text("""
                INSERT INTO provider_login_attempts_t(email,failed_attempts,updated_at)
                VALUES(:email,1,timezone('Asia/Kolkata', NOW()))
            """), {"email": email})

        db.session.commit()

    
    @staticmethod
    def reset_login_attempts(email):

        db.session.execute(text("""
            UPDATE provider_login_attempts_t SET failed_attempts = 0,locked_until = NULL,
            updated_at = timezone('Asia/Kolkata', NOW()) WHERE email = :email
        """), {
            "email": email
        })

        db.session.commit()

    
    @staticmethod
    def is_login_locked(email):

        row = db.session.execute(text("""
            SELECT failed_attempts,locked_until FROM provider_login_attempts_t
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
                UPDATE provider_login_attempts_t SET failed_attempts = 0,locked_until = NULL,
                updated_at = timezone('Asia/Kolkata', NOW()) WHERE email = :email
            """), {
                "email": email
            })

            db.session.commit()

        return False
    
    
    

    @staticmethod
    def insert_otp(email, otp):
        sql = text("INSERT INTO otp_codes_t (email_id, otp_code) VALUES (:email, :otp)")
        db.session.execute(sql, {"email": email, "otp": otp})
        db.session.commit()

    @staticmethod
    def get_otp(email):
        sql = text("""
            SELECT otp_code 
            FROM otp_codes_t
            WHERE email_id = :email
              AND created_at > (NOW() - INTERVAL '5 minutes')
        """)
        row = db.session.execute(sql, {"email": email}).fetchone()
        return dict(row._mapping) if row else None

    @staticmethod
    def delete_otp(email):
        sql = text("DELETE FROM otp_codes_t WHERE email_id = :email")
        db.session.execute(sql, {"email": email})
        db.session.commit()

    # ============================================================
    #  SECTION 3 — PASSWORD RESET (NEW TABLE REFERENCE)
    # ============================================================

    @staticmethod
    def set_reset_token(email, token):
        expiry = datetime.now() + timedelta(minutes=10)
        sql = text("""
            UPDATE users_t 
            SET reset_token = :token, reset_expiry = :expiry
            WHERE email_id = :email
        """)
        db.session.execute(sql, {"token": token, "expiry": expiry, "email": email})
        db.session.commit()

    @staticmethod
    def get_reset_info(email):
        sql = text("""
            SELECT reset_token, reset_expiry 
            FROM users_t 
            WHERE email_id = :email
        """)
        row = db.session.execute(sql, {"email": email}).fetchone()
        return dict(row._mapping) if row else None

    @staticmethod
    def update_password(email, hashed):
        sql = text("""
            UPDATE users_t 
            SET password_hash = :pw, reset_token = NULL, reset_expiry = NULL
            WHERE email_id = :email
        """)
        db.session.execute(sql, {"pw": hashed, "email": email})
        db.session.commit()

    # ============================================================
    #  SECTION 4 — PROVIDER PROFILE (NOW SPLIT USERS + PROVIDER TABLE)
    # ============================================================

    @staticmethod
    def get_provider(email):
        sql = text("""
            SELECT 
                u.user_uid, u.email_id, u.name, u.contact_number, u.alternate_contact_number, 
                u.billing_address,u.bumiputra_status, u.mailing_address, u.tin_number, u.status,
                p.provider_id, p.id_type, p.id_number, 
                p.profile_pic, p.authorized_certificate
            FROM users_t u
            JOIN providers_t p ON p.user_uid = u.user_uid
            WHERE u.email_id = :email
        """)
        row = db.session.execute(sql, {"email": email}).fetchone()

        if not row:
            return None

        return dict(row._mapping)

    @staticmethod
    def update_status(email, status):
        sql = text("UPDATE users_t SET status=:status WHERE email_id=:email")
        db.session.execute(sql, {"status": status, "email": email})
        db.session.commit()



    @staticmethod
    def update_provider(email, data, profile_pic_paths=None, certificate_paths=None):
        
        
        def normalize_path_value(value):
            if value is None:
                return None
            if isinstance(value, (bytes, bytearray, memoryview)):
                return None
            if isinstance(value, (list, tuple)):
                for item in value:
                    if item:
                        return str(item)
                return None
            value = str(value).strip()
            return value if value else None
        
        profile_pic_value = normalize_path_value(profile_pic_paths)
        certificate_value = json.dumps([str(p) for p in certificate_paths if p]) if certificate_paths else None
    
        logging.info("========== UPDATE PROVIDER START ==========")
        logging.info(f"Email: {email}")
    
        # ✅ Convert bumiputra properly
        bumiputra_value = (
            "yes"
            if str(data.get("bumiputra_status")).strip().lower() == "yes"
            else "no"
        )
    
        logging.info(f"bumiputra_status resolved: {bumiputra_value}")
    
        # =====================================================
        # ✅ UPDATE users_t
        # =====================================================
        sql_user = text("""
            UPDATE users_t
            SET name = :full_name,
                mailing_address = :mailing_address,
                billing_address = :billing_address,
                contact_number = :contact_number,
                alternate_contact_number = :alternate_contact,
                tin_number = :tin_number,
                bumiputra_status = :bumiputra_status,
                status = 'pending', 
                updated_at = CURRENT_TIMESTAMP   -- ✅ ADDED
            WHERE email_id = :email
        """)
    
        user_params = {
            "full_name": data.get("full_name"),
            "mailing_address": data.get("mailing_address"),
            "billing_address": data.get("billing_address"),
            "contact_number": data.get("contact_number"),
            "alternate_contact": data.get("alternate_contact_number"),
            "tin_number": data.get("tin_number"),
            "bumiputra_status": bumiputra_value,
            "email": email
        }
    
        logging.info("---- USERS_T UPDATE PARAMS ----")
        for k, v in user_params.items():
            logging.info(f"{k}: {v}")
    
        user_result = db.session.execute(sql_user, user_params)
    
        logging.info(f"✅ users_t updated rows: {user_result.rowcount}")
    
        # =====================================================
        # ✅ UPDATE providers_t
        # =====================================================
        sql_provider = text("""
            UPDATE providers_t SET id_type = :id_type,id_number = :id_number,
                profile_pic = COALESCE(:profile_pic, profile_pic),
                authorized_certificate = COALESCE(CAST(:certificate AS JSONB), authorized_certificate),
                updated_at = CURRENT_TIMESTAMP
            WHERE user_uid = (SELECT user_uid FROM users_t WHERE email_id = :email)
        """)
    
        provider_params = {
            "email": email,
            "id_type": data.get("id_type"),
            "id_number": data.get("id_number"),
            "profile_pic": profile_pic_value,
            "certificate": certificate_value
        }
    
        logging.info("---- PROVIDERS_T UPDATE PARAMS ----")
        for k, v in provider_params.items():
            if isinstance(v, bytes):
                logging.info(f"{k}: <BYTES length={len(v)}>")
            else:
                logging.info(f"{k}: {v}")
    
        # ✅ EXECUTE PROVIDER UPDATE (MISSING IN YOUR CODE)
        provider_result = db.session.execute(sql_provider, provider_params)
    
        logging.info(f"✅ providers_t updated rows: {provider_result.rowcount}")
    
        # =====================================================
        # ✅ COMMIT BOTH
        # =====================================================
        db.session.commit()
    
        logging.info("========== UPDATE PROVIDER END ==========")
    
        # ============================================================
        #  SECTION 5 — SERVICES (NOW IN services_t)
        # ============================================================

    @staticmethod
    def delete_services(user_uid):
        sql = text("DELETE FROM services_t WHERE user_uid = :uid AND service_type = 0")
        db.session.execute(sql, {"uid": user_uid})
        db.session.commit()
            
            
    @staticmethod
    def insert_services(user_uid, bulk_data):

        logging.info(f"checkingthe log: '{bulk_data}'")
    
        if not bulk_data:
            return
    
        sql = text("""
            INSERT INTO services_t (user_uid,service_type,service_name,service_rate,region,state,city,
            category_name,item_name,type_name,description_name) VALUES(:uid,0,:service_name,:service_rate,
                :region,:state,:city,:category_name,:item_name,:type_name,:description_name)
        """)
    
        data = []
        for r in bulk_data:
            data.append({
                "uid": user_uid,
    
                # 🔐 NEVER allow NULL for NOT NULL column
                "service_name": r[0] or "",
    
                "service_rate": float(r[1] or 0),
                "region": r[2] or "",
                "state": r[3] or "",
                "city": r[4] or "",
    
                "category_name": r[5],
                "item_name": r[6],
                "type_name": r[7],
                "description_name": r[8],
            })
    
        try:
            db.session.execute(sql, data)
            db.session.commit()
        except Exception as e:
            db.session.rollback()
            raise e
    
    @staticmethod
    def get_services(user_uid):
        sql = text("""
            SELECT  service_rate, region, state, city,category_name,item_name,type_name,description_name
            FROM services_t
            WHERE user_uid = :uid AND service_type = 0
            ORDER BY created_at
        """)
        rows = db.session.execute(sql, {"uid": user_uid}).fetchall()
        return [dict(r._mapping) for r in rows]

    # ============================================================
    #  SECTION 6 — BANK DETAILS (NO CHANGE EXCEPT ID RESOLUTION)
    # ============================================================

    @staticmethod
    def get_provider_id(email):
        sql = text("""
            SELECT provider_id 
            FROM providers_t
            WHERE user_uid = (SELECT user_uid FROM users_t WHERE email_id = :email)
        """)
        row = db.session.execute(sql, {"email": email}).fetchone()
        return dict(row._mapping) if row else None

    @staticmethod
    def get_bank(provider_id):
        sql = text("""
            SELECT bank_name, swift_code,account_holder_name, bank_account_number, 
            bank_statement FROM providers_bank_details_t
            WHERE provider_id = :id
            LIMIT 1
        """)
        row = db.session.execute(sql, {"id": provider_id}).fetchone()

        if not row:
            return None

        bank = dict(row._mapping)

        # Convert memoryview → bytes
        for k, v in bank.items():
            if isinstance(v, memoryview):
                bank[k] = v.tobytes()

        return bank

    @staticmethod
    def update_bank(provider_id, bank_name, swift, acc, holder, statement):
        sql = text("""
            UPDATE providers_bank_details_t
            SET 
                bank_name = :bank_name,
                swift_code = :swift,
                bank_account_number = :acc,
                account_holder_name = :holder,
                bank_statement = :statement
            WHERE provider_id = :provider_id
        """)
        db.session.execute(sql, {
            "provider_id": provider_id,
            "bank_name": bank_name,
            "swift": swift,
            "acc": acc,
            "holder": holder,
            "statement": statement
        })
        db.session.commit()

    @staticmethod
    def insert_bank(provider_id, bank_name, swift, acc, holder, statement):
        sql = text("""
            INSERT INTO providers_bank_details_t 
                (provider_id, bank_name, swift_code, bank_account_number, account_holder_name, bank_statement)
            VALUES 
                (:provider_id, :bank_name, :swift, :acc, :holder, :statement)
        """)
        db.session.execute(sql, {
            "provider_id": provider_id,
            "bank_name": bank_name,
            "swift": swift,
            "acc": acc,
            "holder": holder,
            "statement": statement
        })
        db.session.commit()


    @staticmethod
    def get_user_for_context(email):
        sql = text("""
            SELECT 
                a.user_uid,
                a.email_id,
                a.name,
                a.billing_address,
                a.mailing_address,
                a.tin_number,
                p.id_number
            FROM users_t a
            LEFT JOIN providers_t p ON p.user_uid = a.user_uid
            WHERE a.email_id = :email
        """)
        
        row = db.session.execute(sql, {"email": email}).fetchone()
        return dict(row._mapping) if row else None
    
    
    @staticmethod
    def delete_backup_services(user_uid):
        logging.info("===== DELETE BACKUP START =====")
        logging.info(f"user_uid received: {user_uid}")
    
        try:
            sql = text("""
                DELETE FROM services_backup_t
                WHERE user_uid = :uid
            """)
    
            result = db.session.execute(sql, {"uid": user_uid})
    
            logging.info(f"Rows deleted from backup: {result.rowcount}")
            logging.info("===== DELETE BACKUP SUCCESS =====")
    
        except Exception as e:
            logging.error("===== DELETE BACKUP FAILED =====")
            logging.error(f"Error: {str(e)}")
            raise


    @staticmethod
    def backup_services(user_uid):
        logging.info("===== BACKUP INSERT START =====")
        logging.info(f"user_uid received: {user_uid}")
    
        try:
            # Optional: check how many services exist before backup
            count_sql = text("""
                SELECT COUNT(*) 
                FROM services_t 
                WHERE user_uid = :uid
            """)
            count = db.session.execute(count_sql, {"uid": user_uid}).scalar()
            logging.info(f"Services count before backup: {count}")
    
            if count == 0:
                logging.warning("No services found to backup.")
                return
    
            insert_sql = text("""
                INSERT INTO services_previous_details_t (
                    service_id,
                    user_uid,
                    service_type,
                    service_rate,
                    region,
                    state,
                    city,
                    created_at,
                    category_name,
                    item_name,
                    type_name,
                    description_name,
                    service_name,
                    previous_price
                )
                SELECT
                    service_id,
                    user_uid,
                    service_type,
                    service_rate,
                    region,
                    state,
                    city,
                    created_at,
                    category_name,
                    item_name,
                    type_name,
                    description_name,
                    service_name,
                    previous_price
                FROM services_t
                WHERE user_uid = :uid
            """)
    
            result = db.session.execute(insert_sql, {"uid": user_uid})
    
            logging.info(f"Rows inserted into backup: {result.rowcount}")
            logging.info("===== BACKUP INSERT SUCCESS =====")
    
        except Exception as e:
            logging.error("===== BACKUP INSERT FAILED =====")
            logging.error(f"Error: {str(e)}")
            raise

    @staticmethod
    def save_token(user_id, fcm_token, device_type):
        logging.info(f"checkinput in modelfuction: {user_id}")

        try:
            # 🔥 Step 1: deactivate old tokens
            sql_update = text("""
                UPDATE user_tokens SET status = 1 WHERE user_id = :user_id
            """)

            db.session.execute(sql_update, {"user_id": user_id})

            # 🔥 Step 2: insert or update token
            sql_insert = text("""
                INSERT INTO user_tokens (user_id,fcm_token,device_type,
                    status,created_at) VALUES (:user_id,:fcm_token,
                    :device_type,0,CURRENT_TIMESTAMP
                )
                ON CONFLICT (fcm_token)
                DO UPDATE SET 
                    user_id = EXCLUDED.user_id,
                    device_type = EXCLUDED.device_type,
                    status = 0,
                    updated_at = CURRENT_TIMESTAMP
            """)

            db.session.execute(sql_insert, {
                "user_id": user_id,
                "fcm_token": fcm_token,
                "device_type": device_type
            })

            db.session.commit()

            return True, None

        except Exception as e:
            db.session.rollback()
            return False, str(e)
        
    
    @staticmethod
    def get_active_token_user_id(user_id):
        logging.info(f"check inputactive token: {user_id}")
        try:
            sql = text("""
                SELECT fcm_token FROM user_tokens WHERE user_id = :user_id 
                AND status = 0 ORDER BY created_at DESC
            """)

            rows = db.session.execute(sql, {
                "user_id": str(user_id)  
            }).fetchall()

            tokens = [row[0] for row in rows]
            logging.info(f"checkoutput token: {tokens}")
            return tokens, None

        except Exception as e:
            return [], str(e)

    @staticmethod
    def save_token(user_id, fcm_token, device_type):
        logging.info(f"Saving token for user: {user_id}")

        try:
            # 🔥 STEP 1: DELETE OLD TOKENS
            sql_delete = text("""
                DELETE FROM user_tokens WHERE user_id = :user_id
            """)
            db.session.execute(sql_delete, {"user_id": user_id})

            # 🔥 STEP 2: INSERT NEW TOKEN
            sql_insert = text("""
                INSERT INTO user_tokens (user_id,fcm_token,device_type,status,created_at) VALUES (
                :user_id,:fcm_token,:device_type,0,CURRENT_TIMESTAMP)
            """)

            db.session.execute(sql_insert, {
                "user_id": user_id,
                "fcm_token": fcm_token,
                "device_type": device_type
            })

            db.session.commit()

            return True, None

        except Exception as e:
            db.session.rollback()
            logging.error(f"Token save error: {e}")
            return False, str(e)
        
        
        
    @staticmethod
    def save_token(user_id, fcm_token, device_type, role):
        logging.info(f"Saving token for user: {user_id}, role: {role}")

        try:
            sql = text("""
                INSERT INTO user_tokens (user_id, fcm_token, device_type, role, status, created_at)
                VALUES (:user_id, :fcm_token, :device_type, :role, 0, CURRENT_TIMESTAMP)
                ON CONFLICT (fcm_token, role)
                DO UPDATE SET
                    user_id = EXCLUDED.user_id,
                    device_type = EXCLUDED.device_type,
                    updated_at = CURRENT_TIMESTAMP
            """)

            db.session.execute(sql, {
                "user_id": user_id,
                "fcm_token": fcm_token,
                "device_type": device_type,
                "role": role
            })

            db.session.commit()

            return True, None

        except Exception as e:
            db.session.rollback()
            logging.error(f"Token save error: {e}")
            return False, str(e)
        
        

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

                b.provider_bank_id,
                b.provider_id,
                b.swift_code,
                b.account_holder_name,
                b.bank_name,
                b.bank_account_number,
                b.bank_statement,
                b.created_at AS bank_created_at
               

            FROM users_t u
            LEFT JOIN providers_bank_details_t b
                ON b.provider_id = u.user_uid
            WHERE u.user_uid = :user_uid
              AND u.service_type = 0
            LIMIT 1
        """)

        row = db.session.execute(sql, {"user_uid": user_uid}).fetchone()
        return dict(row._mapping) if row else None
    