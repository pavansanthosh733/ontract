from sqlalchemy.sql import text
from app.models.database import db
import pandas as pd
from difflib import SequenceMatcher
import re
import io
from flask import current_app
from app.utils.encrypt_utils import decrypt_value


SIMILARITY_THRESHOLD = 0.70

CANONICAL_FIELDS = [
    "category","item","type","sub_type","brand","description","unit","copper_pipe_price","price_rm",
    "client","extra_col","source_row_number"
]


VARIATIONS = {
    "category": [
        "category", "trade", "work category"
    ],
    "item": [
        "item", "category item", "category/item", "item name"
    ],
    "type": [
        "type", "equipment type", "equipment", "work type"
    ],
    "sub_type": [
        "sub type", "sub-type", "subtype"
    ],
    "brand": [
        "brand", "make", "manufacturer"
    ],
    "description": [
        "description",
        "desc",
        "scope of work",
        "work description",
        "details"
    ],
    "unit": [
        "unit", "uom", "units"
    ],
    "price_rm": [
        "price", "price rm", "rate", "rate (rm)"
    ],
    "copper_pipe_price": [
        "copper pipe price", "copper price"
    ],
    "client": [
        "client", "customer"
    ],
    "extra_col": [
        "unnamed", "extra", "notes", ""
    ]
}



def normalize_header(h):
    if h is None:
        return ""
    s = str(h).strip().lower()
    s = re.sub(r"unnamed:\s*\d+", "unnamed", s)
    s = re.sub(r"[^\w\s/]", " ", s)
    s = s.replace("/", " ")
    s = re.sub(r"\s+", " ", s).strip()
    return s


def find_best_field(normalized_header):
    """
    Matches a normalized header to the closest canonical field using similarity rules & keyword variations.
    """
    best_match = None
    best_score = 0.0

    # direct match in canonical fields
    if normalized_header in CANONICAL_FIELDS:
        return normalized_header

    # search variations
    for canonical, variations in VARIATIONS.items():
        for variant in variations:
            score = similarity(normalized_header.lower(), variant.lower())
            if score > best_score:
                best_score = score
                best_match = canonical

    return best_match if best_score >= SIMILARITY_THRESHOLD else None

def parse_numeric(value):
    """
    Converts numeric-like strings to float. Handles commas and non-numeric garbage safely.
    Returns None if not numeric.
    """
    if value is None:
        return None

    val = str(value).strip()

    # Return None if explicitly empty or non-numeric placeholder
    if val == "" or val.lower() in ["na", "n/a", "-", "--"]:
        return None

    # Remove currency symbols or commas
    val = re.sub(r"[^\d.-]", "", val)

    try:
        return float(val)
    except ValueError:
        return None


def similarity(a, b): return SequenceMatcher(None, a, b).ratio()   


class AdminModel:

    # ======================= ADMIN AUTH =======================
    @staticmethod
    def get_admin_by_email(email):
        sql = text("SELECT * FROM admins_t WHERE email = :email")
        row = db.session.execute(sql, {"email": email}).fetchone()
        return dict(row._mapping) if row else None

    @staticmethod
    def save_otp(email, otp):
        db.session.execute(
            text("INSERT INTO otp_codes_t (email_id, otp_code, created_at) VALUES (:email, :otp, NOW())"),
            {"email": email, "otp": otp}
        )
        db.session.commit()

    @staticmethod
    def verify_otp(email, otp):
        sql = text("""
            SELECT otp_code FROM otp_codes_t
            WHERE email_id = :email AND created_at > NOW() - INTERVAL '5 minutes'
            ORDER BY created_at DESC LIMIT 1
        """)
        row = db.session.execute(sql, {"email": email}).fetchone()
        return bool(row and row._mapping["otp_code"] == otp)

    @staticmethod
    def delete_otp(email):
        db.session.execute(text("DELETE FROM otp_codes_t WHERE email_id = :email"), {"email": email})
        db.session.commit()

    # ======================= PROVIDERS =======================
    @staticmethod
    def list_providers():
        sql = text("""
            SELECT
                u.user_uid,
                u.name,
                u.email_id,
                u.contact_number,
                u.status,
                u.mailing_address,
                u.billing_address,
                u.alternate_contact_number,
                u.tin_number,
                u.created_at,
                u.active_status,
                u.bumiputra_status,
    
                -- service fields
                s.service_name,
                s.category_name AS category,
                s.item_name AS item,
                s.type_name AS type,
                s.description_name AS description,
                s.service_rate,
                s.city,
                s.state,
                s.region,
    
                -- bank fields (NEW)
                b.provider_bank_id,
                b.bank_name,
                b.bank_account_number,
                b.swift_code,
                b.account_holder_name,
                b.status AS bank_status,
                b.created_at AS bank_created_at
    
            FROM users_t u
            LEFT JOIN services_t s
                ON u.user_uid = s.user_uid
            LEFT JOIN providers_bank_details_t b
                ON b.provider_id = u.user_uid
            WHERE u.service_type = 0
            ORDER BY u.created_at DESC
        """)
    
        rows = db.session.execute(sql).fetchall()
        providers_map = {}
    
        for r in rows:
            row = dict(r._mapping)
            uid = row["user_uid"]
    
            # 🔹 Create provider object once
            if uid not in providers_map:
                providers_map[uid] = {
                    "user_uid": uid,
                    "name": row.get("name"),
                    "email_id": row.get("email_id"),
                    "contact_number": row.get("contact_number"),
                    "status": row.get("status"),
                    "mailing_address": row.get("mailing_address"),
                    "billing_address": row.get("billing_address"),
                    "active_status": bool(row.get("active_status")),
                    "alternate_contact_number": row.get("alternate_contact_number"),
                    "tin_number": row.get("tin_number"),
                    "bumiputra_status": row.get("bumiputra_status"),
                    "created_at": row.get("created_at"),
    
                    # ✅ BANK DETAILS (ADDED – SAFE)
                    "bank_details": {
                        "provider_bank_id": row.get("provider_bank_id"),
                        "bank_name": row.get("bank_name"),
                    
                        # ✅ Decrypt sensitive values
                        "bank_account_number": decrypt_value(row.get("bank_account_number")),
                        "swift_code": decrypt_value(row.get("swift_code")),
                    
                        # ✅ Account holder name is plain text (do not decrypt)
                        "account_holder_name": row.get("account_holder_name"),
                    
                        "status": row.get("bank_status"),
                        "created_at": row.get("bank_created_at"),
                    } if row.get("provider_bank_id") else None,

    
                    "services": []
                }
    
            # 🔹 Add service if ANY service field exists (UNCHANGED)
            if (
                row.get("category")
                or row.get("item")
                or row.get("type")
                or row.get("description")
                or row.get("service_name")
            ):
                providers_map[uid]["services"].append({
                    "service_name": row.get("service_name"),
                    "category": row.get("category"),
                    "item": row.get("item"),
                    "type": row.get("type"),
                    "description": row.get("description"),
                    "location": ", ".join(
                        filter(None, [
                            row.get("region"),
                            row.get("state"),
                            row.get("city")
                        ])
                    ) or "N/A",
                    "rate": float(row.get("service_rate")) if row.get("service_rate") else None
                })
    
        return list(providers_map.values())




    @staticmethod
    def get_provider_services(provider_ids):
        if not provider_ids:
            return []

        sql = text("""
            SELECT 
                user_uid AS provider_id,
                service_name, 
                service_rate, 
                region, 
                state, 
                city
            FROM services_t
            WHERE user_uid = ANY(:uids) AND service_type = 0
        """)

        rows = db.session.execute(sql, {"uids": provider_ids}).fetchall()
        return [dict(row._mapping) for row in rows]




    @staticmethod
    def approve_provider_status(email):
        sql = text("""
            UPDATE users_t
            SET status = 'approved'
            WHERE email_id = :email AND status = 'pending' AND service_type = 0
            RETURNING user_uid, name, contact_number
        """)
        row = db.session.execute(sql, {"email": email}).fetchone()
        db.session.commit()
        return dict(row._mapping) if row else None

    @staticmethod
    def reject_provider(email):
        sql = text("""
            UPDATE users_t 
            SET status = 'rejected'
            WHERE email_id = :email AND status = 'pending' AND service_type = 0
        """)
        result = db.session.execute(sql, {"email": email})
        db.session.commit()
        return result.rowcount > 0
    
    @staticmethod
    def provider_bank_details_exists_by_user_uid(user_uid):
        """
        Step 1: Get provider_id from user_uid
        Step 2: Check if bank details exist for that provider_id
        """
    
        # 🔹 get provider_id
        provider_sql = """
            SELECT provider_id
            FROM providers_t
            WHERE user_uid = :user_uid
            LIMIT 1
        """
        provider_row = db.session.execute(
            text(provider_sql),
            {"user_uid": user_uid}
        ).fetchone()
    
        if not provider_row:
            return False  # provider not found
    
        provider_id = provider_row.provider_id
    
        # 🔹 check bank details
        bank_sql = """
            SELECT 1
            FROM providers_bank_details_t
            WHERE provider_id = :provider_id
            LIMIT 1
        """
        bank_row = db.session.execute(
            text(bank_sql),
            {"provider_id": provider_id}
        ).fetchone()
    
        return bank_row is not None


    # ======================= CONTRACTORS (COMPANIES) =======================
# ======================= CONTRACTORS (COMPANIES) ===========================
    @staticmethod
    def list_contractors():
        sql = text("""
            SELECT
                u.user_uid,
                u.name,
                u.mailing_address,
                u.billing_address,
                c.company_id,
                c.company_name,
                u.email_id,
                u.tin_number,
                u.contact_number,
                u.status,
                u.active_status,
                c.brn_number,
                u.bumiputra_status,
                u.tin_number,
    
                -- bank details
                b.company_bank_id,
                b.company_id AS bank_company_id,
                b.swift_code,
                b.holder_name,
                b.bank_name,
                b.account_number,
                b.created_at,
                b.updated_at
                
    
            FROM users_t u
            JOIN company_details_t c
                ON u.user_uid = c.user_uid
            LEFT JOIN company_bank_details_t b
                ON b.company_id = c.company_id
            WHERE u.service_type = 1
            ORDER BY u.created_at DESC
        """)
    
        rows = db.session.execute(sql).fetchall()
        contractors = []
    
        for r in rows:
            row = dict(r._mapping)
    
            contractor = {
                "user_uid": row.get("user_uid"),
                "name": row.get("name"),
                "mailing_address": row.get("mailing_address"),
                "billing_address": row.get("billing_address"),
                "company_id": row.get("company_id"),
                "company_name": row.get("company_name"),
                "email_id": row.get("email_id"),
                "tin_number":row.get("tin_number"),
                "contact_number": row.get("contact_number"),
                "status": row.get("status"),
                "active_status": bool(row.get("active_status")),
                "brn_number": row.get("brn_number"),
                "bumiputra_status": row.get("bumiputra_status"),
                "tin_number":row.get("tin_number"),
    
                "bank_details": {
                    "company_bank_id": row.get("company_bank_id"),
                    "company_id": row.get("bank_company_id"),
                    "swift_code": decrypt_value(row.get("swift_code")) if row.get("swift_code") else None,
                    "holder_name": row.get("holder_name"),
                    "bank_name": row.get("bank_name"),
                    "account_number": decrypt_value(row.get("account_number")) if row.get("account_number") else None,
                    "created_at":row.get("created_at"),
                    "updated_at":row.get("updated_at")
                    
                } if row.get("company_bank_id") else None
            }
    
            contractors.append(contractor)
    
        return contractors

    @staticmethod
    def get_contractor_services_by_company_ids(company_ids):
        if not company_ids:
            return []
    
        sql = text("""
            SELECT
                c.company_id,
                s.service_name,
                s.service_rate,
                s.region,
                s.state,
                s.city,
                s.category_name,
                s.item_name,
                s.type_name,
                s.description_name
            FROM services_t s
            JOIN company_details_t c
                ON s.user_uid = c.user_uid
            WHERE c.company_id = ANY(:ids)
              AND s.service_type = 1
        """)
    
        rows = db.session.execute(sql, {"ids": company_ids}).fetchall()
    
        result = [dict(r._mapping) for r in rows]
    
        print("\n========== FINAL RESULT ==========")
    
        for r in result:
            print(r)
    
        return result
    
    
    
    @staticmethod
    def get_contractor_services(user_uid):
        sql = text("""
            SELECT service_name, service_rate, region, state, city
            FROM services_t
            WHERE user_uid = :uid AND service_type = 1
        """)
        rows = db.session.execute(sql, {"uid": user_uid}).fetchall()
        print("rows",rows,user_uid)
        return [dict(r._mapping) for r in rows]
# admin_model.py


    @staticmethod
    def company_bank_details_exists(company_id):
        query = text("""
            SELECT 1
            FROM company_bank_details_t
            WHERE company_id = :company_id
            LIMIT 1
        """)
        result = db.session.execute(query, {"company_id": company_id}).fetchone()
        return result is not None

    @staticmethod
    def get_contractor_by_email(email):
        sql = text("""
            SELECT 
                u.user_uid, u.email_id, u.name, u.contact_number, u.status,
                c.company_id, c.company_name, c.brn_number
            FROM users_t u
            JOIN company_details_t c ON u.user_uid = c.user_uid
            WHERE u.email_id = :email
        """)
        row = db.session.execute(sql, {"email": email}).fetchone()
        print("email",row)
        return dict(row._mapping) if row else None


    @staticmethod
    def approve_contractor(email):
        sql = text("""
            UPDATE users_t 
            SET status='approved'
            WHERE email_id=:email AND status='pending' AND service_type = 1
        """)
        result = db.session.execute(sql, {"email": email})
        db.session.commit()
        return result.rowcount > 0

    @staticmethod
    def reject_contractor(email):
        sql = text("""
            UPDATE users_t 
            SET status='rejected'
            WHERE email_id=:email AND status='pending' AND service_type = 1
        """)
        result = db.session.execute(sql, {"email": email})
        db.session.commit()
        return result.rowcount > 0

    # ======================= NOTIFICATIONS =======================
    @staticmethod
    def insert_admin_message(email, message, notification_type):
        sql = text("""
            INSERT INTO admin_messages_t (email_id, message, sent_at, is_read, notification_type)
            VALUES (:email, :msg, NOW(), FALSE, :ntype)
        """)
        db.session.execute(sql, {
            "email": email,
            "msg": message,
            "ntype": notification_type
        })
        db.session.commit()

 
    @staticmethod
    def upload_standard_rate_excel(saved_path: str):
        """
        CSV bulk upload for standard_rates_t

        REQUIRED FIELDS:
        category, item, type, description
        """

        current_app.logger.info("CSV Import start: %s", saved_path)

        overall_summary = {
            "status": "success",
            "sheets": {},
            "inserted": 0,
            "updated": 0,
            "skipped": 0,
            "errors": []
        }

        combined_rows = []

        # -----------------------------------------------------------
        # 1) READ CSV
        # -----------------------------------------------------------
        df = pd.read_csv(saved_path).fillna("")
        sheet_name = "CSV"

        original_headers = list(df.columns)
        normalized = [normalize_header(h) for h in original_headers]

        header_to_field = {}
        used_fields = set()

        for orig, norm in zip(original_headers, normalized):
            field = find_best_field(norm)
            if field is None or field in used_fields:
                field = "extra_col"
            header_to_field[orig] = field
            used_fields.add(field)

        rows_count = 0

        # -----------------------------------------------------------
        # 2) ROW PARSE + REQUIRED FIELD VALIDATION
        # -----------------------------------------------------------
        for idx, row in df.iterrows():
            rows_count += 1

            params = {
                "source_row_number": idx + 2,
                "category": None,
                "item": None,
                "type": None,
                "sub_type": None,
                "brand": None,
                "description": None,
                "unit": None,
                "copper_pipe_price": None,
                "price_rm": None,
                "client": None,
                "extra_col": None,
                "sheet_name": sheet_name
            }

            extra_vals = []

            for orig_col in original_headers:
                mapped = header_to_field.get(orig_col, "extra_col")
                val = str(row[orig_col]).strip()

                if mapped in (
                    "category", "item", "type",
                    "sub_type", "brand",
                    "description", "unit", "client"
                ):
                    params[mapped] = val or None

                elif mapped == "price_rm":
                    params["price_rm"] = parse_numeric(val)

                elif mapped == "copper_pipe_price":
                    params["copper_pipe_price"] = val or None

                else:
                    if val:
                        extra_vals.append(val)

            params["extra_col"] = " | ".join(extra_vals) if extra_vals else None

            # -------------------------------
            # REQUIRED FIELD CHECK
            # -------------------------------
            missing = [
                f for f in ["category", "item", "type", "description"]
                if not params.get(f)
            ]

            if missing:
                overall_summary["errors"].append(
                    f"Row {idx + 2}: Missing required fields → {', '.join(missing)}"
                )
                overall_summary["skipped"] += 1
                continue

            combined_rows.append(params)

        overall_summary["sheets"][sheet_name] = {
            "rows": rows_count,
            "skipped": overall_summary["skipped"]
        }

        # ❌ STOP HERE IF VALIDATION FAILED (NO INSERT, NO CRASH)
        if overall_summary["errors"]:
            overall_summary["status"] = "validation_failed"
            return overall_summary

        if not combined_rows:
            return overall_summary

        # -----------------------------------------------------------
        # 3) DATAFRAME CLEANUP
        # -----------------------------------------------------------
        df_final = pd.DataFrame(combined_rows)

        for col in ["category", "item", "type", "description", "unit"]:
            df_final[col] = df_final[col].astype(str).str.strip().str.lower()

        df_final.drop_duplicates(
            subset=["category", "item", "type", "description", "unit"],
            inplace=True
        )

        csv_buffer = io.StringIO()
        df_final.to_csv(csv_buffer, index=False)
        csv_buffer.seek(0)

        # -----------------------------------------------------------
        # 4) POSTGRES BULK INSERT
        # -----------------------------------------------------------
        engine = db.engine
        raw_conn = engine.raw_connection()
        cur = raw_conn.cursor()

        try:
            cur.execute("""
                CREATE TEMP TABLE staging_standard_rates_t (
                    source_row_number INTEGER,
                    category VARCHAR(4000),
                    item VARCHAR(4000),
                    type VARCHAR(4000),
                    sub_type VARCHAR(255),
                    brand VARCHAR(1000),
                    description VARCHAR(4000),
                    unit VARCHAR(50),
                    copper_pipe_price TEXT,
                    price_rm NUMERIC(14,2),
                    client VARCHAR(255),
                    extra_col TEXT,
                    sheet_name VARCHAR(100)
                ) ON COMMIT DROP;
            """)

            cur.copy_expert("""
                COPY staging_standard_rates_t
                FROM STDIN WITH CSV HEADER
            """, csv_buffer)

            cur.execute("""
                INSERT INTO standard_rates_t
                (source_row_number, category, item, "type", sub_type, brand,
                description, unit, copper_pipe_price, price_rm,
                client, extra_col, created_at, updated_at)
                SELECT
                    source_row_number, category, item, type, sub_type, brand,
                    description, unit, copper_pipe_price, price_rm,
                    client, extra_col, NOW(), NOW()
                FROM staging_standard_rates_t
                ON CONFLICT (category, item, "type", description, unit)
                DO UPDATE SET
                    sub_type = EXCLUDED.sub_type,
                    brand = EXCLUDED.brand,
                    copper_pipe_price = EXCLUDED.copper_pipe_price,
                    price_rm = EXCLUDED.price_rm,
                    client = EXCLUDED.client,
                    extra_col = EXCLUDED.extra_col,
                    updated_at = NOW()
                RETURNING xmax = 0;
            """)

            rows = cur.fetchall()
            inserted = sum(1 for r in rows if r[0])
            updated = len(rows) - inserted

            overall_summary["inserted"] = inserted
            overall_summary["updated"] = updated

            raw_conn.commit()

        except Exception as e:
            raw_conn.rollback()
            current_app.logger.error("Bulk import failed", exc_info=True)

            overall_summary["status"] = "failed"
            overall_summary["errors"].append(str(e))
            return overall_summary

        finally:
            cur.close()
            raw_conn.close()

        return overall_summary


    # -------------------------------
    # CRUD helpers
    @staticmethod
    def list_standard_rates(params):

        page = int(params.get("page", 1))
        limit = int(params.get("limit", 50))
        offset = (page - 1) * limit

        filters = []
        sql_params = {}
        filters.append("is_active = TRUE")
        if params.get("category"):
            filters.append("category ILIKE :category")
            sql_params["category"] = f"%{params['category'].strip()}%"

        if params.get("item"):
            filters.append("item ILIKE :item")
            sql_params["item"] = f"%{params['item'].strip()}%"

        if params.get("type"):
            filters.append("\"type\" ILIKE :type")  # type is reserved keyword
            sql_params["type"] = f"%{params['type'].strip()}%"

        if params.get("sub_type"):
            filters.append("sub_type ILIKE :sub_type")
            sql_params["sub_type"] = f"%{params['sub_type'].strip()}%"

        if params.get("brand"):
            filters.append("brand ILIKE :brand")
            sql_params["brand"] = f"%{params['brand'].strip()}%"

        if params.get("unit"):
            filters.append("unit ILIKE :unit")
            sql_params["unit"] = f"%{params['unit'].strip()}%"

        if params.get("client"):
            filters.append("client ILIKE :client")
            sql_params["client"] = f"%{params['client'].strip()}%"

        where_clause = "WHERE " + " AND ".join(filters) if filters else ""

        search = params.get("search")
        if search:
            where_clause += (" AND " if where_clause else "WHERE ")
            where_clause += """
            (
                to_tsvector('english', coalesce(description, ''))
                @@ plainto_tsquery(:search)
                OR description ILIKE :like_search
            )
            """
            sql_params["search"] = search
            sql_params["like_search"] = f"%{search}%"

        # 🔢 COUNT
        count_sql = f"""
        SELECT COUNT(*) FROM standard_rates_t {where_clause}
        """
        total = db.session.execute(text(count_sql), sql_params).scalar()

        # 📄 DATA
        select_sql = f"""
        SELECT id,source_row_number,category,item,type,sub_type,brand,description,unit,copper_pipe_price,
        price_rm,client,extra_col,created_at,updated_at FROM standard_rates_t
        {where_clause} ORDER BY category, item, "type"
        LIMIT :limit OFFSET :offset
        """

        sql_params.update({"limit": limit,"offset": offset})

        rows = db.session.execute(text(select_sql), sql_params).fetchall()
        results = [dict(r._mapping) for r in rows]

        return {"page": page,"limit": limit,"total": int(total),"results": results}

    @staticmethod
    def add_standard_rate(payload):

        cols = ["source_row_number","category","item","type","sub_type","brand","description","unit",
            "copper_pipe_price","price_rm","client","extra_col"
        ]

        params = {k: payload.get(k) for k in cols}

        params["copper_pipe_price"] = parse_numeric(
            params.get("copper_pipe_price")
        )

        params["price_rm"] = parse_numeric(
            params.get("price_rm")
        )

        # Check only ACTIVE duplicate
        duplicate_sql = text("""
            SELECT id FROM standard_rates_t WHERE category = :category AND item = :item
            AND "type" = :type AND description = :description AND client = :client AND is_active = TRUE
            LIMIT 1
        """)

        duplicate = db.session.execute(
            duplicate_sql,
            params
        ).fetchone()

        if duplicate:
            return {
                "success": False,
                "message": "Active record already exists"
            }

        insert_sql = text("""
            INSERT INTO standard_rates_t (source_row_number,category,item,"type",sub_type,brand,
                description,unit,copper_pipe_price,price_rm,client,extra_col,effective_from,
                is_active,created_at,updated_at)
            VALUES (:source_row_number,:category,:item,:type,:sub_type,:brand,:description,:unit,
                :copper_pipe_price,:price_rm,:client,:extra_col,NOW(),TRUE,NOW(),NOW())
        """)

        db.session.execute(insert_sql, params)

        db.session.commit()

        return {
            "success": True,
            "message": "Rate added successfully"
        }
        
        
        
    @staticmethod
    def update_standard_rate(rate_id, payload):

        # Get existing record
        existing_sql = text("""
            SELECT * FROM standard_rates_t WHERE id = :id
        """)

        existing = db.session.execute(existing_sql,{"id": rate_id}).mappings().fetchone()

        if not existing:
            return {
                "success": False,
                "message": "Rate not found"
            }

        # Close old version
        close_sql = text("""
            UPDATE standard_rates_t SET is_active = FALSE,effective_to = NOW(),
            updated_at = NOW() WHERE id = :id
        """)

        db.session.execute(
            close_sql,
            {"id": rate_id}
        )

        params = {
            "source_row_number": existing["source_row_number"],
            "category": payload.get("category"),
            "item": payload.get("item"),
            "type": payload.get("type"),
            "sub_type": payload.get("sub_type"),
            "brand": payload.get("brand"),
            "description": payload.get("description"),
            "unit": payload.get("unit"),
            "copper_pipe_price": parse_numeric(payload.get("copper_pipe_price")),
            "price_rm": parse_numeric(payload.get("price_rm")),
            "client": payload.get("client"),
            "extra_col": payload.get("extra_col")
        }

        insert_sql = text("""
            INSERT INTO standard_rates_t (source_row_number,category,item,"type",sub_type,brand,
                description,unit,copper_pipe_price,price_rm,client,extra_col,effective_from,
                is_active,created_at,updated_at)
            VALUES (:source_row_number,:category,:item,:type,:sub_type,:brand,:description,:unit,
                :copper_pipe_price,:price_rm,:client,:extra_col,NOW(),TRUE,NOW(),NOW())
        """)

        db.session.execute(insert_sql, params)

        db.session.commit()

        return {
            "success": True,
            "message": "Rate updated successfully"
        }
        
        

    @staticmethod
    def delete_standard_rate(rate_id):

        sql = text("""
            UPDATE standard_rates_t SET is_deleted = TRUE, is_active = FALSE,
            updated_at = NOW() WHERE id = :id
        """)

        db.session.execute(sql, {"id": rate_id})

        db.session.commit()

        return {
            "success": True,
            "message": "Rate deleted successfully"
        }



    @staticmethod
    def count_individual():
        try:
            sql = text("SELECT COUNT(*) FROM users_t WHERE service_type = '0'")
            result = db.session.execute(sql).scalar()
            return result, None
        except Exception as e:
            return None, str(e)
    @staticmethod
    def count_company():
        try:
            sql = text("SELECT COUNT(*) FROM users_t WHERE service_type = '1'")
            result = db.session.execute(sql).scalar()
            return result, None
        except Exception as e:
            return None, str(e)

    @staticmethod
    def count_today_users():
        try:
            sql = text("SELECT COUNT(*) FROM users_t WHERE DATE(created_at) = CURRENT_DATE")
            count = db.session.execute(sql).scalar()
            return count, None
        except Exception as e:
            return None, str(e)
    @staticmethod
    def count_active_users():
        try:
            sql = text("SELECT COUNT(*) FROM users_t WHERE active_status = TRUE")
            count = db.session.execute(sql).scalar()
            return count, None
        except Exception as e:
            return None, str(e)
    
    
    # app/models/admin_model.py

    @staticmethod
    def update_active_status(email, is_active):
        sql = text("""
            UPDATE users_t
            SET active_status = :active_status
            WHERE email_id = :email
        """)
    
        result = db.session.execute(sql, {
            "active_status": is_active,
            "email": email
        })
    
        db.session.commit()
    
        return result.rowcount > 0
    


    @staticmethod
    def get_previous_services(user_uid):
        sql = text("""
            SELECT
                service_id,
                service_type,
                service_rate,
                region,
                state,
                city,
                category_name,
                item_name,
                type_name,
                description_name,
                service_name,
                previous_price,
                backup_at
            FROM services_previous_details_t
            WHERE user_uid = :uid
            ORDER BY backup_at DESC
        """)
    
        result = db.session.execute(sql, {"uid": user_uid}).mappings().all()
    
        return result

    @staticmethod
    def update_access_token(admin_id, token):
        sql = text("""
            UPDATE admins_t
            SET access_token = :token,
                token_created_at = NOW()
            WHERE admin_id = :admin_id
        """)

        db.session.execute(sql, {
            "token": token,
            "admin_id": admin_id
        })

        db.session.commit()


    @staticmethod
    def clear_access_token(admin_id):
        sql = text("""
            UPDATE admins_t
            SET access_token = NULL,
                token_created_at = NULL
            WHERE admin_id = :admin_id
        """)

        db.session.execute(sql, {
            "admin_id": admin_id
        })

        db.session.commit()


    @staticmethod
    def get_access_token(admin_id):
        sql = text("""
            SELECT access_token
            FROM admins_t
            WHERE admin_id = :admin_id
        """)

        row = db.session.execute(sql, {
            "admin_id": admin_id
        }).fetchone()

        return row[0] if row else None