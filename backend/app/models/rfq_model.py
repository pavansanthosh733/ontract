from .database import db
from flask_bcrypt import Bcrypt
from sqlalchemy import text, func, LargeBinary
from datetime import datetime, timedelta, timezone
from decimal import Decimal
from sqlalchemy.dialects.postgresql import JSON, JSONB
import json
import base64
import logging
import os
import threading
import bcrypt
from time import time
from urllib.parse import quote
from flask import current_app


class RFQModel:

    @classmethod
    def create_rfq(cls, data):
        logging.info(f"RFQ Data : {data}")
        
        try:
            today = datetime.now().strftime("%d%m%Y")
        
            last_rfq = db.session.execute(
                text("""
                    SELECT rfq_no FROM rfq_master_t WHERE rfq_no LIKE :prefix ORDER BY rfq_no DESC LIMIT 1
                """),
                {
                    "prefix": f"{today}R%"
                }
            ).fetchone()
        
            if last_rfq:
                last_number = int(last_rfq.rfq_no.split("R")[1])
                next_number = last_number + 1
        
            else:
        
                next_number = 1
        
            rfq_no = f"{today}R{next_number:06d}"
        
            sql = text("""
                INSERT INTO rfq_master_t (rfq_no,category_id,region_id,state_id,city_id,rfq_title,closing_date,
                description,remarks,amount,site_survey_required,attachments,status,created_by,created_at)
                VALUES (:rfq_no,:category_id,:region_id,:state_id,:city_id,:rfq_title,:closing_date,:description,
                :remarks,:amount,:site_survey_required,CAST(:attachments AS JSONB),'OPEN',:created_by,CURRENT_TIMESTAMP)
                RETURNING *
            """)
        
            result = db.session.execute(sql,
                {
                    "rfq_no": rfq_no,
                    "category_id": data["CATEGORY_ID"],
                    "region_id": data["REGION_ID"],
                    "state_id": data["STATE_ID"],
                    "city_id": data["CITY_ID"],
                    "rfq_title": data["RFQ_TITLE"],
                    "closing_date": data["CLOSING_DATE"],
                    "description": data["DESCRIPTION"],
                    "remarks": data["REMARKS"],
                    "amount": data["AMOUNT"],
                    "site_survey_required": data["SITE_SURVEY_REQUIRED"],
                    "attachments": json.dumps(data.get("attachments", [])),
                    "created_by": data["created_by"]
                }
            )
        
            rfq = result.fetchone()
        
            rfq_id = rfq.rfq_id
        
            for item in data.get("ITEMS", []):
        
                unit_price = item.get("unitPrice")
                quantity = item.get("quantity")
                total = item.get("total")
                unit_price = float(unit_price) if unit_price not in (None, "") else None
                quantity = float(quantity) if quantity not in (None, "") else None
                total = float(total) if total not in (None, "") else 0
        
                db.session.execute(
                    text("""
                        INSERT INTO rfq_items_t (rfq_id,item_description,delivery_date,unit_price,quantity,
                        total,created_at) VALUES (:rfq_id,:item_description,:delivery_date,:unit_price,
                        :quantity,:total,CURRENT_TIMESTAMP)
                    """),
                    {
                        "rfq_id": rfq_id,
                        "item_description": item.get("description"),
                        "delivery_date": None,
                        "unit_price": unit_price,
                        "quantity": quantity,
                        "total": total
                    }
                )
        
            db.session.commit()
            return dict(rfq._mapping), None
        
        except Exception as e:
            db.session.rollback()
            logging.exception("CREATE RFQ MODEL ERROR")
            return None, str(e)
        
    @classmethod
    def get_all_rfq_contractors(cls):
        
        try:
            query = text("""
                SELECT user_uid,name,email_id FROM users_t
                WHERE email_id IS NOT NULL and active_status ='t'
            """)
        
            result = db.session.execute(query).mappings().fetchall()
            return [dict(row) for row in result]
        except Exception as e:
            logging.error(f"Error fetching contractors: {str(e)}")
            return []
                
    @classmethod
    def get_provider_new_rfqs(cls, contractor_id):
        
        try:
            query = text("""
                SELECT rm.rfq_id,rm.rfq_no,rm.rfq_title,rm.closing_date,rm.status,rm.publish_type
                FROM rfq_master_t rm INNER JOIN users_t u ON u.user_uid = :contractor_id
                WHERE rm.status = 'PUBLISHED' AND rm.publish_type = u.assignment_scope
                AND (rm.location = 'GLOBAL' OR (rm.location = 'STATE'
                AND EXISTS (SELECT 1 FROM services_t s
                INNER JOIN state_master_t sm ON sm.state_name = s.state
                WHERE s.user_uid = :contractor_id
                AND rm.state_ids @> to_jsonb(ARRAY[sm.state_id]))))
                AND NOT EXISTS (SELECT 1 FROM rfq_response_master_t rr WHERE rr.rfq_id = rm.rfq_id
                AND rr.contractor_id = :contractor_id)ORDER BY rm.created_at DESC
            """)
        
            result = db.session.execute(query,{"contractor_id": contractor_id}).mappings().fetchall()
            return [dict(row) for row in result]
        
        except Exception as e:
            logging.exception("NEW RFQ ERROR")
            return []
                    
        
    @classmethod
    def get_provider_rfq_details(cls, rfq_no):
            
        try:
            header_query = text("""
                SELECT rm.rfq_id,rm.rfq_no,rm.rfq_title,rm.description,rm.remarks,rm.closing_date,
                rm.site_survey_required,attachments,rm.status,c.category_name,r.region_name,
                s.state_name,ci.city_name FROM rfq_master_t rm
                INNER JOIN category_master_t c ON rm.category_id = c.category_id
                INNER JOIN region_master_t r ON rm.region_id = r.region_id
                INNER JOIN state_master_t s ON rm.state_id = s.state_id
                INNER JOIN city_master_t ci ON rm.city_id = ci.city_id WHERE rm.rfq_no = :rfq_no
            """)
            
            header = db.session.execute(header_query,{"rfq_no": rfq_no}).mappings().first()
            
            if not header:
                return None
            
            # RFQ ITEMS
            items_query = text("""
                SELECT ri.rfq_item_id,ri.item_description,ri.quantity,ri.delivery_date FROM rfq_items_t ri
                INNER JOIN rfq_master_t rm ON rm.rfq_id = ri.rfq_id
                WHERE rm.rfq_no = :rfq_no ORDER BY ri.rfq_item_id
            """)
            
            items = db.session.execute(items_query,{"rfq_no": rfq_no}).mappings().fetchall()
            
            return {
                "header": dict(header),
                "items": [
                    dict(row)
                    for row in items
                ],
                "attachments": header["attachments"] or []
            }
            
        except Exception as e:
            logging.exception("GET PROVIDER RFQ DETAILS ERROR")
            return None
                
    @classmethod
    def submit_provider_rfq_response(cls, data):
        
        try:
            existing = db.session.execute(
        
                text("""
                    SELECT response_id FROM rfq_response_master_t WHERE rfq_id = :rfq_id 
                    AND contractor_id = :contractor_id
                """),
        
                {
                    "rfq_id": data["rfq_id"],
                    "contractor_id": data["contractor_id"]
                }
        
                ).first()
        
            if existing:
                return None, "You have already submitted quotation for this RFQ."
        
        
            rfq = db.session.execute(
        
                text("""
                    SELECT rfq_id,status FROM rfq_master_t WHERE rfq_id = :rfq_id
                """),
        
                {
                    "rfq_id": data["rfq_id"]
                }
        
            ).mappings().first()
        
            if not rfq:
                return None, "RFQ not found."
        
            if rfq["status"] != "PUBLISHED":
                return None, "RFQ is already closed."
        
                    # =====================================================
        
            master_sql = text("""
        
                INSERT INTO rfq_response_master_t (rfq_id,contractor_id,remarks,grand_total,
                status,submitted_at) VALUES (:rfq_id,:contractor_id,:remarks,:grand_total,
                'RESPONDED',CURRENT_TIMESTAMP)
                RETURNING response_id
        
            """)
        
            result = db.session.execute(master_sql,
                {
                    "rfq_id": data["rfq_id"],
                    "contractor_id": data["contractor_id"],
                    "remarks": data.get("remarks"),
                    "grand_total": data["grand_total"]
                }
        
            )
            response_id = result.scalar()
                    # =====================================================
        
            item_sql = text("""
        
                INSERT INTO rfq_response_items_t (response_id,rfq_item_id,quantity,delivery_date,
                unit_price,warranty_period,total) VALUES (:response_id,:rfq_item_id,:quantity,:delivery_date,
                :unit_price,:warranty_period,:total)
        
            """)
        
            for item in data["items"]:
                db.session.execute(item_sql,
                    {
                        "response_id": response_id,
                        "rfq_item_id": item["rfq_item_id"],
                        "quantity": item["quantity"],
                        "delivery_date": item.get("delivery_date"),
                        "unit_price": item["unit_price"],
                        "warranty_period": item.get("warranty_period", ""),
                        "total": item["total"]
                    }
        
                )
        
            # =====================================================
        
            db.session.commit()
            return {
                "response_id": response_id,
                "rfq_id": data["rfq_id"],
                "grand_total": data["grand_total"],
                "message": "Quotation submitted successfully."
            }, None
        
        except Exception as e:
            db.session.rollback()
            logging.exception("SUBMIT PROVIDER RFQ RESPONSE ERROR")
            return None, str(e)
                
    @classmethod
    def get_provider_responded_rfqs(cls, contractor_id):
        
        try:
            query = text("""
                SELECT rm.rfq_id,rm.rfq_no,rm.rfq_title,rm.closing_date,rr.grand_total,
                rr.status,rr.submitted_at FROM rfq_response_master_t rr
                INNER JOIN rfq_master_t rm ON rm.rfq_id=rr.rfq_id
                WHERE rr.contractor_id=:contractor_id
                ORDER BY rr.submitted_at DESC
            """)
        
            result = db.session.execute(query,
                {
                    "contractor_id": contractor_id
                }
        
            ).mappings().fetchall()
        
            return [
                dict(row)
                for row in result
            ]
        
        except Exception:
            logging.exception("RESPONDED RFQ ERROR")
            return []
                
    @classmethod
    def get_admin_rfq_responses(cls, rfq_no):
        try:
            contractor_sql = text("""
        
                SELECT rrm.response_id,rrm.contractor_id,
                    CASE
                        WHEN u.service_type = '1'
                        THEN cd.company_name
                        ELSE u.name
                    END AS contractor_name,rrm.grand_total,rrm.remarks,rrm.status,
                    rrm.submitted_at FROM rfq_response_master_t rrm
                INNER JOIN rfq_master_t rm ON rm.rfq_id = rrm.rfq_id
                INNER JOIN users_t u ON u.user_uid = rrm.contractor_id
                LEFT JOIN company_details_t cd ON cd.user_uid = u.user_uid
                WHERE rm.rfq_no = :rfq_no ORDER BY rrm.grand_total ASC
        
            """)
        
            contractors = db.session.execute(contractor_sql,{"rfq_no": rfq_no}).mappings().fetchall()
            response_data = []
        
            # =====================================================
        
            item_sql = text("""
                SELECT ri.rfq_item_id,ri.item_description,rri.quantity,rri.unit_price,
                rri.total FROM rfq_response_items_t rri
                INNER JOIN rfq_items_t ri ON ri.rfq_item_id = rri.rfq_item_id
                WHERE rri.response_id = :response_id ORDER BY ri.rfq_item_id
        
            """)
        
            for contractor in contractors:
        
                items = db.session.execute(item_sql,
                    {
                        "response_id": contractor["response_id"]
                    }
        
                ).mappings().fetchall()
                        
                quoted_amount = float(contractor["grand_total"] or 0)
                grand_total = round(quoted_amount * 1.10, 2)
        
                response_data.append({
                    "response_id": contractor["response_id"],
                    "contractor_id": contractor["contractor_id"],
                    "contractor_name": contractor["contractor_name"],
                    "grand_total": grand_total,
                    "remarks": contractor["remarks"],
                    "status": contractor["status"],
                    "submitted_at": contractor["submitted_at"],
                    "items": [
                        dict(item)
                        for item in items
                    ]
                })
        
            return response_data
        
        except Exception as e:
            logging.exception("ADMIN RFQ RESPONSES")
            return []
                
    @classmethod
    def get_admin_rfq_list(cls):
        try:
            query = text("""
                SELECT rm.rfq_id,rm.rfq_no,rm.rfq_title,rm.closing_date,rm.status,
                COUNT(rr.response_id) AS response_count FROM rfq_master_t rm
                LEFT JOIN rfq_response_master_t rr ON rm.rfq_id = rr.rfq_id
                GROUP BY rm.rfq_id,rm.rfq_no,rm.rfq_title,rm.closing_date,rm.status
                ORDER BY rm.created_at DESC
        
            """)
        
            result = db.session.execute(query).mappings().fetchall()
        
            return [
                dict(row)
                for row in result
            ]
        
        except Exception:
            logging.exception("GET ADMIN RFQ LIST")
            return []
        
    @classmethod
    def get_admin_rfq_response_details(cls, response_id):
        
        try:
            header_sql = text("""
                SELECT rrm.response_id,rrm.rfq_id,rrm.contractor_id,
                    CASE
                        WHEN u.service_type = '1'
                        THEN cd.company_name
                        ELSE u.name
                    END AS contractor_name,rrm.grand_total,rrm.remarks,rrm.status,rrm.submitted_at
                FROM rfq_response_master_t rrm
                INNER JOIN users_t u ON u.user_uid = rrm.contractor_id
                LEFT JOIN company_details_t cd ON cd.user_uid = u.user_uid
                WHERE rrm.response_id = :response_id
        
            """)
        
            header = db.session.execute(header_sql,{"response_id": response_id}).mappings().first()
        
            if not header:
                return None
        
            header = dict(header)
        
            service_charge_percent = 10
            sub_total = float(header["grand_total"] or 0)
            service_charge_amount = round((sub_total * service_charge_percent) / 100, 2)
            grand_total = round(sub_total + service_charge_amount, 2)
            header["sub_total"] = sub_total
            header["service_charge_percent"] = service_charge_percent
            header["service_charge_amount"] = service_charge_amount
            header["grand_total"] = grand_total
        
            # ======================================================
        
            item_sql = text("""
                SELECT ri.rfq_item_id,ri.item_description,rri.quantity,rri.delivery_date,rri.unit_price,
                rri.warranty_period,rri.total FROM rfq_response_items_t rri
                INNER JOIN rfq_items_t ri ON ri.rfq_item_id = rri.rfq_item_id
                WHERE rri.response_id = :response_id ORDER BY ri.rfq_item_id
        
            """)
        
            items = db.session.execute(item_sql,{"response_id": response_id}).mappings().fetchall()
        
            return {
                "header": header,
                "items": [
                    dict(item)
                    for item in items
                ]
            }
        
        except Exception:
            logging.exception("GET ADMIN RFQ RESPONSE DETAILS")
            return None
                
    @classmethod
    def get_open_rfq_list(cls):
        try:
            query = text("""
                SELECT rm.rfq_id,rm.rfq_no,rm.rfq_title,rm.closing_date,rm.status
                FROM rfq_master_t rm WHERE rm.status = 'OPEN' ORDER BY rm.created_at DESC
            """)
        
            result = db.session.execute(query).mappings().fetchall()
        
            return [
                dict(row)
                for row in result
            ]
        
        except Exception:
            logging.exception("GET OPEN RFQ LIST")
            return []
                
    @classmethod
    def publish_rfq(cls, rfq_no, publish_type, location, state_ids):
        
        try:
            query = text("""
                UPDATE rfq_master_t SET status = 'PUBLISHED',publish_type = :publish_type,location = :location,
                state_ids = CAST(:state_ids AS JSONB),updated_at = NOW() WHERE rfq_no = :rfq_no
            """)
        
            db.session.execute(
                query,
                {
                    "rfq_no": rfq_no,
                    "publish_type": publish_type,
                    "location": location,
                    "state_ids": json.dumps(state_ids if location == "STATE" else [])
                }
            )
            db.session.commit()
            return True
        
        except Exception as e:
            db.session.rollback()
            return False
        
    @classmethod
    def create_negotiation(cls, data):
        logging.info(f"Negotiation Data : {data}")

        try:
            today = datetime.now().strftime("%d%m%Y")

            last_batch = db.session.execute(
                text("""
                    SELECT negotiation_batch_id
                    FROM rfq_negotiation_t
                    WHERE negotiation_batch_id LIKE :prefix
                    ORDER BY negotiation_batch_id DESC
                    LIMIT 1
                """),
                {
                    "prefix": f"{today}N%"
                }
            ).fetchone()

            if last_batch:
                last_number = int(last_batch.negotiation_batch_id.split("N")[1])
                next_number = last_number + 1
            else:
                next_number = 1

            negotiation_batch_id = f"{today}N{next_number:06d}"

            response_ids = data.get("response_ids", [])

            for response_id in response_ids:

                response = db.session.execute(
                    text("""
                        SELECT
                            rrm.response_id,
                            rrm.rfq_id,
                            rm.rfq_no,
                            rrm.contractor_id
                        FROM rfq_response_master_t rrm
                        INNER JOIN rfq_master_t rm
                            ON rm.rfq_id = rrm.rfq_id
                        WHERE rrm.response_id = :response_id
                    """),
                    {
                        "response_id": response_id
                    }
                ).fetchone()

                if not response:
                    continue

                db.session.execute(
                    text("""
                        INSERT INTO rfq_negotiation_t
                        (
                            negotiation_batch_id,
                            rfq_id,
                            rfq_no,
                            response_id,
                            contractor_id,
                            admin_message,
                            requested_amount,
                            reply_before,
                            remarks,
                            status,
                            created_by,
                            created_on
                        )
                        VALUES
                        (
                            :negotiation_batch_id,
                            :rfq_id,
                            :rfq_no,
                            :response_id,
                            :contractor_id,
                            :admin_message,
                            :requested_amount,
                            :reply_before,
                            :remarks,
                            'NEGOTIATION_SENT',
                            :created_by,
                            CURRENT_TIMESTAMP
                        )
                    """),
                    {
                        "negotiation_batch_id": negotiation_batch_id,
                        "rfq_id": response.rfq_id,
                        "rfq_no": response.rfq_no,
                        "response_id": response.response_id,
                        "contractor_id": response.contractor_id,
                        "admin_message": data.get("negotiation_message"),
                        "requested_amount": data.get("requested_amount"),
                        "reply_before": data.get("reply_before"),
                        "remarks": data.get("remarks"),
                        "created_by": data.get("created_by")
                    }
                )

            db.session.commit()

            return {
                "message": "Negotiation sent successfully.",
                "negotiation_batch_id": negotiation_batch_id
            }, None

        except Exception as e:
            db.session.rollback()
            logging.exception("CREATE NEGOTIATION MODEL ERROR")
            return None, str(e)
        
    @classmethod
    def get_provider_negotiations(cls, contractor_id): 
        try:
            result = db.session.execute(
                text("""
                    SELECT rn.negotiation_id,rn.negotiation_batch_id,rn.rfq_id,rn.rfq_no,rm.rfq_title,
                    rn.requested_amount,rn.reply_before,rn.status,rn.created_on FROM rfq_negotiation_t rn
                    JOIN rfq_master_t rm ON rm.rfq_id = rn.rfq_id WHERE rn.contractor_id = :contractor_id
                    AND rn.status = 'NEGOTIATION_SENT' ORDER BY rn.created_on DESC
                """),
                {
                    "contractor_id": contractor_id
                }
            ).mappings().all()
            return [dict(row) for row in result], None
        except Exception as e:
            logging.exception("GET PROVIDER NEGOTIATIONS MODEL ERROR")
            return None, str(e)
        
    @classmethod
    def get_provider_negotiation_details(cls, negotiation_id):
        
        try:
        
            header = db.session.execute(
                text("""
                    SELECT rn.negotiation_id,rn.negotiation_batch_id,rn.rfq_id,rn.rfq_no,rn.response_id,
                    rm.rfq_title,rm.category_id,cm.category_name,rm.region_id,rg.region_name,rm.state_id,
                    sm.state_name,rm.city_id,ctm.city_name,rm.description,rm.remarks,rm.site_survey_required,
                    rn.admin_message,rn.requested_amount,rn.reply_before,rn.status
                    FROM rfq_negotiation_t rn
                    JOIN rfq_master_t rm ON rm.rfq_id = rn.rfq_id
                    LEFT JOIN category_master_t cm ON cm.category_id = rm.category_id
                    LEFT JOIN region_master_t rg ON rg.region_id = rm.region_id
                    LEFT JOIN state_master_t sm ON sm.state_id = rm.state_id
                    LEFT JOIN city_master_t ctm ON ctm.city_id = rm.city_id
                    WHERE rn.negotiation_id = :negotiation_id
                """),
                {
                    "negotiation_id": negotiation_id
                }
            ).mappings().first()
        
            if not header:
                return None, "Negotiation not found."
        
            previous_quotation = db.session.execute(
                text("""
                    SELECT grand_total,remarks FROM rfq_response_master_t WHERE response_id = :response_id
                """),
                {
                    "response_id": header["response_id"]
                }
            ).mappings().first()
        
            items = db.session.execute(
                text("""
                    SELECT rri.rfq_item_id,ri.item_description,rri.quantity,rri.delivery_date,rri.unit_price,
                    rri.total FROM rfq_response_items_t rri
                    JOIN rfq_items_t ri ON ri.rfq_item_id = rri.rfq_item_id
                    WHERE rri.response_id = :response_id ORDER BY rri.rfq_item_id
                """),
                {
                    "response_id": header["response_id"]
                }
            ).mappings().all()
        
            return {
                "header": dict(header),
                "previous_quotation": (
                    dict(previous_quotation)
                    if previous_quotation
                    else {}
                ),
                "items": [dict(item) for item in items]
            }, None
        
        except Exception as e:
            logging.exception("GET PROVIDER NEGOTIATION DETAILS MODEL ERROR")
            return None, str(e)
        
    @classmethod
    def submit_provider_negotiation_reply(cls, data):
        
        try:
            negotiation_id = data.get("negotiation_id")
            contractor_id = data.get("contractor_id")
            action = data.get("action")
            revised_amount = data.get("revised_amount")
            remarks = data.get("remarks")     
            negotiation = db.session.execute(
                text("""
                    SELECT negotiation_id,negotiation_batch_id,rfq_id,rfq_no,response_id,contractor_id
                    FROM rfq_negotiation_t WHERE negotiation_id = :negotiation_id
                """),
                {
                    "negotiation_id": negotiation_id
                }
            ).mappings().first()
        
            if not negotiation:
                return None, "Negotiation not found."
        
            db.session.execute(
                text("""
                    INSERT INTO rfq_negotiation_reply_t (negotiation_id,negotiation_batch_id,rfq_id,rfq_no,
                    response_id,contractor_id,action,revised_amount,remarks,status,created_by,created_on)
                    VALUES (:negotiation_id,:negotiation_batch_id,:rfq_id,:rfq_no,:response_id,:contractor_id,
                    :action,:revised_amount,:remarks,'ACTIVE',:created_by,NOW())
                """),
                {
                    "negotiation_id": negotiation["negotiation_id"],
                    "negotiation_batch_id": negotiation["negotiation_batch_id"],
                    "rfq_id": negotiation["rfq_id"],
                    "rfq_no": negotiation["rfq_no"],
                    "response_id": negotiation["response_id"],
                    "contractor_id": contractor_id,
                    "action": action,
                    "revised_amount": revised_amount,
                    "remarks": remarks,
                    "created_by": contractor_id
                }
            )
        
            db.session.execute(
                text("""
                    UPDATE rfq_negotiation_t SET status = 'REPLIED',updated_by = :contractor_id,
                    updated_on = NOW() WHERE negotiation_id = :negotiation_id
                """),
                {
                    "contractor_id": contractor_id,
                    "negotiation_id": negotiation_id
                }
            )
        
            db.session.commit()
            return {
                "message": "Negotiation reply submitted successfully."
            }, None
        
        except Exception as e:
            db.session.rollback()
            logging.exception("SUBMIT PROVIDER NEGOTIATION REPLY ERROR")
            return None, str(e)
        
    @classmethod
    def get_admin_rfq_negotiations(cls):
        try:
            query = text("""
                SELECT rm.rfq_id,rm.rfq_no,rm.rfq_title,rm.closing_date,
                COUNT(rn.negotiation_id) AS negotiation_count FROM rfq_master_t rm
                INNER JOIN rfq_negotiation_t rn ON rm.rfq_id = rn.rfq_id
                WHERE rn.status <> 'ASSIGNED'
                GROUP BY rm.rfq_id,rm.rfq_no,rm.rfq_title,rm.closing_date
                ORDER BY rm.created_at DESC
            """)
        
            result = db.session.execute(query).mappings().fetchall()
            return [dict(row) for row in result], None
        except Exception as e:
            logging.exception("GET ADMIN NEGOTIATIONS MODEL ERROR")
            return None, str(e)
        
    @classmethod
    def get_admin_negotiation_contractors(cls, rfq_no):
        
        try:
        
            query = text("""
                SELECT rn.negotiation_id,rn.negotiation_batch_id,rn.contractor_id,
                    CASE
                        WHEN u.service_type = '1'
                        THEN cd.company_name
                        ELSE u.name
                    END AS contractor_name,rrm.response_id,
                    ROUND(rrm.grand_total * 1.10, 2) AS original_amount,
                    rn.requested_amount,rn.reply_before,rn.status,rr.action,rr.revised_amount,
                    rr.created_on AS replied_on FROM rfq_negotiation_t rn
                INNER JOIN rfq_master_t rm ON rm.rfq_id = rn.rfq_id
                INNER JOIN rfq_response_master_t rrm ON rrm.response_id = rn.response_id
                INNER JOIN users_t u ON u.user_uid = rn.contractor_id
                LEFT JOIN company_details_t cd ON cd.user_uid = u.user_uid
                LEFT JOIN rfq_negotiation_reply_t rr ON rr.negotiation_id = rn.negotiation_id
                WHERE rm.rfq_no = :rfq_no ORDER BY rrm.grand_total ASC
            """)
        
            result = db.session.execute(query,{"rfq_no": rfq_no}).mappings().fetchall()
        
            return [
                dict(row)
                for row in result
            ], None
        
        except Exception as e:
            logging.exception("GET ADMIN NEGOTIATION CONTRACTORS")
            return None, str(e)
        
    @classmethod
    def get_negotiation_details(cls, negotiation_id):
        
        try:
            query = text("""
        
                SELECT rn.negotiation_id,rn.negotiation_batch_id,rm.rfq_no,rm.rfq_title,rn.contractor_id,
                    CASE
                        WHEN u.service_type = '1'
                        THEN cd.company_name
                        ELSE u.name
                    END AS contractor_name,rrm.response_id,
                    ROUND(rrm.grand_total * 1.10, 2) AS original_amount,
                    rn.requested_amount,rn.remarks AS admin_remarks,rn.reply_before,rr.action,
                    rr.revised_amount,rr.remarks AS contractor_remarks,rr.created_on AS replied_on,
                    rn.status FROM rfq_negotiation_t rn
                INNER JOIN rfq_master_t rm ON rm.rfq_id = rn.rfq_id
                INNER JOIN rfq_response_master_t rrm ON rrm.response_id = rn.response_id
                INNER JOIN users_t u ON u.user_uid = rn.contractor_id
                LEFT JOIN company_details_t cd ON cd.user_uid = u.user_uid
                LEFT JOIN rfq_negotiation_reply_t rr ON rr.negotiation_id = rn.negotiation_id
                WHERE rn.negotiation_id = :negotiation_id
        
            """)
        
            row = db.session.execute(query,{"negotiation_id": negotiation_id}).mappings().first()
        
            if not row:
                return None, "Negotiation not found."
        
            result = {
        
                "header": {
        
                    "negotiation_id": row["negotiation_id"],
                    "negotiation_batch_id": row["negotiation_batch_id"],
                    "rfq_no": row["rfq_no"],
                    "rfq_title": row["rfq_title"],
                    "contractor_id": row["contractor_id"],
                    "contractor_name": row["contractor_name"],
                    "status": row["status"]
        
                },
        
                "quotation": {"original_amount": row["original_amount"]},
                "admin_negotiation": {
                    "requested_amount": row["requested_amount"],
                    "remarks": row["admin_remarks"],
                    "reply_before": row["reply_before"]
                },
        
                "contractor_reply": {
                    "action": row["action"],
                    "revised_amount": row["revised_amount"],
                    "remarks": row["contractor_remarks"],
                    "replied_on": row["replied_on"]
                }
            }
            return result, None
        except Exception as e:
            logging.exception("GET NEGOTIATION DETAILS ERROR")
            return None, str(e)
        
            
    @classmethod
    def approve_negotiation(cls, negotiation_id):
        
        try:
        
            negotiation = db.session.execute(text("""
                SELECT negotiation_id,rfq_id,response_id,contractor_id FROM rfq_negotiation_t
                WHERE negotiation_id = :negotiation_id
            """), {
                "negotiation_id": negotiation_id
            }).mappings().first()
        
            if not negotiation:
        
                return {
                    "status": False,
                    "message": "Negotiation not found."
                }
        
            rfq_id = negotiation["rfq_id"]
            response_id = negotiation["response_id"]
        
            # Step 2: Update selected negotiation
            db.session.execute(text("""
                UPDATE rfq_negotiation_t SET status = 'ASSIGNED' WHERE negotiation_id = :negotiation_id
            """), {
                "negotiation_id": negotiation_id
            })
        
            # Step 3: Update selected RFQ response
            db.session.execute(text("""
                UPDATE rfq_response_master_t SET status = 'ASSIGNED' WHERE response_id = :response_id
            """), {
                "response_id": response_id
            })
        
            # Step 4: Update RFQ Master
            db.session.execute(text("""
                UPDATE rfq_master_t SET status = 'ASSIGNED' WHERE rfq_id = :rfq_id
            """), {
                "rfq_id": rfq_id
            })
        
            # Step 5: Mark other contractor responses as NOT_SELECTED
            db.session.execute(text("""
                UPDATE rfq_response_master_t SET status = 'NOT_SELECTED' WHERE rfq_id = :rfq_id
                AND response_id <> :response_id
            """), {
                "rfq_id": rfq_id,
                "response_id": response_id
            })
        
            db.session.commit()
        
            return {
                "status": True,
                "message": "Contractor assigned successfully."
            }
        
        except Exception as e:
        
            db.session.rollback()
        
            return {
                "status": False,
                "message": str(e)
            }
        
    @classmethod
    def create_negotiation_again(cls, data):
        logging.info(f"Negotiate Again Data : {data}")
        try:
            negotiation_id = data.get("negotiation_id")
            previous = db.session.execute(
                text("""
                    SELECT rfq_id,rfq_no,response_id,contractor_id,admin_message,created_by
                    FROM rfq_negotiation_t WHERE negotiation_id = :negotiation_id
                """),
                {
                    "negotiation_id": negotiation_id
                }
            ).fetchone()
        
            if not previous:
                return None, "Negotiation not found."


            # ==========================================
            today = datetime.now().strftime("%d%m%Y")
        
            last_batch = db.session.execute(
                text("""
                    SELECT negotiation_batch_id FROM rfq_negotiation_t
                    WHERE negotiation_batch_id LIKE :prefix
                    ORDER BY negotiation_batch_id DESC
                    LIMIT 1
                """),
                {
                    "prefix": f"{today}N%"
                }
            ).fetchone()
        
            if last_batch:
                last_number = int(last_batch.negotiation_batch_id.split("N")[1])
                next_number = last_number + 1
        
            else:
        
                next_number = 1
        
            negotiation_batch_id = (f"{today}N{next_number:06d}")
        
            # ==========================================

            db.session.execute(
                text("""
                    INSERT INTO rfq_negotiation_t (negotiation_batch_id,rfq_id,rfq_no,response_id,contractor_id,
                    admin_message,requested_amount,reply_before,remarks,status,created_by,created_on)
                    VALUES (:negotiation_batch_id,:rfq_id,:rfq_no,:response_id,:contractor_id,:admin_message,
                    :requested_amount,:reply_before,:remarks,'NEGOTIATION_SENT',:created_by,CURRENT_TIMESTAMP
                    )
                """),
                {
                    "negotiation_batch_id": negotiation_batch_id,
                    "rfq_id": previous.rfq_id,
                    "rfq_no": previous.rfq_no,
                    "response_id": previous.response_id,
                    "contractor_id": previous.contractor_id,
                    "admin_message": previous.admin_message,
                    "requested_amount": data.get("requested_amount"),
                    "reply_before": data.get("reply_before"),
                    "remarks": data.get("remarks"),
                    "created_by": previous.created_by
                }
            )
        
            db.session.commit()
        
            return {
                "status": True,
                "message": "Negotiation sent successfully.",
                "negotiation_batch_id": negotiation_batch_id
            }, None
        
        except Exception as e:
            db.session.rollback()
            logging.exception("CREATE NEGOTIATION AGAIN MODEL ERROR")
            return None, str(e)
        
    @classmethod
    def get_provider_assigned_rfqs(cls, contractor_id):
        
        try:
            result = db.session.execute(
                text("""
                    SELECT rm.rfq_id,rm.rfq_no,rm.rfq_title,rm.closing_date,rm.description,rrm.response_id,
                    rrm.grand_total,rrm.status FROM rfq_master_t rm
                    JOIN rfq_response_master_t rrm ON rm.rfq_id = rrm.rfq_id
                    WHERE rm.status = 'ASSIGNED' AND rrm.status = 'ASSIGNED' 
                    AND rrm.contractor_id = :contractor_id ORDER BY rm.rfq_id DESC
                """),
                {
                    "contractor_id": contractor_id
                }
            ).mappings().all()
            return [dict(row) for row in result], None
        
        except Exception as e:
            logging.exception("GET PROVIDER ASSIGNED RFQS MODEL ERROR")
            return None, str(e)
        
        
    @classmethod
    def get_provider_assigned_rfq_details(cls, rfq_no, contractor_id):
        
        try:
        
            header = db.session.execute(
                text("""
                    SELECT rm.rfq_id,rm.rfq_no,rm.rfq_title,rm.description,rm.remarks,rm.closing_date,
                    rm.site_survey_required,rm.attachments,rm.status,c.category_name,r.region_name,
                    s.state_name,ci.city_name,rrm.response_id,
                    COALESCE(rr.revised_amount, rrm.grand_total) AS grand_total,
                    COALESCE(rr.remarks, rrm.remarks) AS contractor_remarks
                    FROM rfq_master_t rm
                    INNER JOIN rfq_response_master_t rrm ON rm.rfq_id = rrm.rfq_id
                    INNER JOIN category_master_t c ON rm.category_id = c.category_id
                    INNER JOIN region_master_t r ON rm.region_id = r.region_id
                    INNER JOIN state_master_t s ON rm.state_id = s.state_id
                    INNER JOIN city_master_t ci ON rm.city_id = ci.city_id
                    LEFT JOIN rfq_negotiation_t rn ON rn.response_id = rrm.response_id
                    AND rn.status = 'ASSIGNED'
                    LEFT JOIN rfq_negotiation_reply_t rr ON rr.negotiation_id = rn.negotiation_id
                    AND rr.status = 'ACTIVE' WHERE rm.rfq_no = :rfq_no
                    AND rrm.contractor_id = :contractor_id AND rrm.status = 'ASSIGNED'
                """),
                {
                    "rfq_no": rfq_no,
                    "contractor_id": contractor_id
                }
            ).mappings().first()
        
            if not header:
                return None, "Assigned RFQ not found."
        
            items = db.session.execute(
                text("""
                    SELECT ri.rfq_item_id,ri.item_description,rri.quantity,rri.delivery_date,rri.unit_price,
                    rri.warranty_period,rri.total FROM rfq_response_items_t rri
                    INNER JOIN rfq_items_t ri ON ri.rfq_item_id = rri.rfq_item_id
                    WHERE rri.response_id = :response_id ORDER BY ri.rfq_item_id
                """),
                {
                    "response_id": header["response_id"]
                }
            ).mappings().all()
        
            return {
        
                "header": {
                    "rfq_id": header["rfq_id"],
                    "rfq_no": header["rfq_no"],
                    "rfq_title": header["rfq_title"],
                    "description": header["description"],
                    "remarks": header["remarks"],
                    "closing_date": header["closing_date"],
                    "site_survey_required": header["site_survey_required"],
                    "status": header["status"],
                    "category_name": header["category_name"],
                    "region_name": header["region_name"],
                    "state_name": header["state_name"],
                    "city_name": header["city_name"]
                },
        
                "quotation": {
                    "response_id": header["response_id"],
                    "grand_total": header["grand_total"],
                    "remarks": header["contractor_remarks"]
                },
        
                "items": [
                    dict(item)
                    for item in items
                ],
        
                "attachments": header["attachments"] or []
        
            }, None
        
        except Exception as e:
            logging.exception("GET PROVIDER ASSIGNED RFQ DETAILS MODEL ERROR")
            return None, str(e)
        
        
    @classmethod
    def provider_assigned_action(cls, data):
        
        try:
        
            rfq_id = data.get("rfq_id")
            contractor_id = data.get("contractor_id")
            action = data.get("action")
        
            if action not in ["ACCEPT", "REJECT"]:
                return None, "Invalid action."
        
            if action == "ACCEPT":
                status = "ACCEPTED"
            else:
                status = "REJECTED"
        
            # ============================================
        
            response = db.session.execute(
                text("""
                    SELECT response_id FROM rfq_response_master_t WHERE rfq_id = :rfq_id
                    AND contractor_id = :contractor_id AND status = 'ASSIGNED'
                """),
                {
                    "rfq_id": rfq_id,
                    "contractor_id": contractor_id
                }
            ).mappings().first()
        
            if not response:
                return None, "Assigned work not found."
        
            response_id = response["response_id"]
        
            # ============================================
        
            db.session.execute(
                text("""
                    UPDATE rfq_master_t SET status = :status, updated_at = NOW()
                    WHERE rfq_id = :rfq_id
                """),
                {
                    "status": status,
                    "rfq_id": rfq_id
                }
            )
        
        
            db.session.execute(
                text("""
                    UPDATE rfq_response_master_t SET status = :status WHERE response_id = :response_id
                """),
                {
                    "status": status,
                    "response_id": response_id
                }
            )
        
            # ============================================
        
            db.session.execute(
                text("""
                    UPDATE rfq_negotiation_t SET status = :status,updated_by = :contractor_id,
                    updated_on = NOW() WHERE response_id = :response_id AND status = 'ASSIGNED'
                """),
                {
                    "status": status,
                    "response_id": response_id,
                    "contractor_id": contractor_id
                }
            )
        
            db.session.commit()
        
            return {
                "status": True,
                "message": f"Work {action.lower()}ed successfully."
            }, None
        
        except Exception as e:
            db.session.rollback()
            logging.exception("PROVIDER ASSIGNED ACTION MODEL ERROR")
            return None, str(e)
                
    @classmethod
    def get_provider_accepted_rfqs(cls, contractor_id):
        
        try:
            query = text("""
                SELECT rm.rfq_id,rm.rfq_no,rm.rfq_title,rm.closing_date,rrm.status
                FROM rfq_response_master_t rrm
                INNER JOIN rfq_master_t rm ON rm.rfq_id = rrm.rfq_id
                WHERE rrm.contractor_id = :contractor_id AND rrm.status = 'ACCEPTED'
                ORDER BY rm.rfq_id DESC
            """)
        
            result = db.session.execute(
                query,
                {
                    "contractor_id": contractor_id
                }
            ).mappings().all()
        
            return [dict(row) for row in result], None
        
        except Exception as e:
            logging.exception("GET PROVIDER ACCEPTED RFQS ERROR")
            return None, str(e)
        
    @classmethod
    def get_provider_accepted_rfq_details(cls, rfq_no, contractor_id):
        
        try:
        
            header = db.session.execute(
                text("""
                    SELECT rm.rfq_id,rm.rfq_no,rm.rfq_title,rm.description,rm.closing_date,rm.site_survey_required,
                    rm.status,cm.category_name,rg.region_name,sm.state_name,cim.city_name,
                    COALESCE(rr.revised_amount, rrm.grand_total) AS grand_total,
                    COALESCE(rr.remarks, rrm.remarks) AS remarks
                    FROM rfq_master_t rm
                    INNER JOIN rfq_response_master_t rrm ON rm.rfq_id = rrm.rfq_id
                    LEFT JOIN category_master_t cm ON cm.category_id = rm.category_id
                    LEFT JOIN region_master_t rg ON rg.region_id = rm.region_id
                    LEFT JOIN state_master_t sm ON sm.state_id = rm.state_id
                    LEFT JOIN city_master_t cim ON cim.city_id = rm.city_id
                    LEFT JOIN rfq_negotiation_t rn ON rn.response_id = rrm.response_id
                    AND rn.status = 'ACCEPTED'
                    LEFT JOIN rfq_negotiation_reply_t rr ON rr.negotiation_id = rn.negotiation_id
                    AND rr.status = 'ACTIVE'
                    WHERE rm.rfq_no = :rfq_no AND rrm.contractor_id = :contractor_id
                    AND rrm.status IN ('ACCEPTED','COMPLETED','REOPEN','CLOSED')
                """),
                {
                    "rfq_no": rfq_no,
                    "contractor_id": contractor_id
                }
            ).mappings().first()
        
            if not header:
                return None, "RFQ details not found."
        
            items = db.session.execute(
                text("""
                    SELECT ri.rfq_item_id,rim.item_description,ri.quantity,ri.delivery_date,ri.unit_price,
                    ri.warranty_period,ri.total FROM rfq_response_items_t ri
                    INNER JOIN rfq_response_master_t rrm ON rrm.response_id = ri.response_id
                    LEFT JOIN rfq_items_t rim ON rim.rfq_item_id = ri.rfq_item_id
                    WHERE rrm.rfq_id = :rfq_id AND rrm.contractor_id = :contractor_id
                    ORDER BY ri.rfq_item_id
                """),
                {
                    "rfq_id": header["rfq_id"],
                    "contractor_id": contractor_id
                }
            ).mappings().all()
        
            return {
                "header": dict(header),
                "quotation": {
                    "grand_total": header["grand_total"],
                    "remarks": header["remarks"]
                },
                "attachments": [],
                "items": [dict(item) for item in items]
            }, None
        
        except Exception as e:
            logging.exception("GET PROVIDER RFQ DETAILS ERROR")
            return None, str(e)
                
        
    @classmethod
    def submit_provider_rfq_completion(cls, data):
        
        try:
        
            rfq_id = data.get("rfq_id")
            contractor_id = data.get("contractor_id")
            remarks = data.get("remarks", "")
            attachments = data.get("attachments", [])
        
            # ===========================================
        
            response = db.session.execute(
                text("""
                    SELECT response_id FROM rfq_response_master_t WHERE rfq_id = :rfq_id
                    AND contractor_id = :contractor_id AND status IN ('ACCEPTED', 'REOPEN')
                """),
                {
                    "rfq_id": rfq_id,
                    "contractor_id": contractor_id
                }
            ).mappings().first()
        
            if not response:
                return None, "Accepted RFQ not found."
        
            response_id = response["response_id"]
            # ===========================================
            db.session.execute(
                text("""
                    UPDATE rfq_master_t SET status = 'COMPLETED', completion_remarks = :remarks,
                    completion_attachments = CAST(:attachments AS JSONB),
                    completed_at = CURRENT_TIMESTAMP,updated_at = CURRENT_TIMESTAMP
                    WHERE rfq_id = :rfq_id
                """),
                {
                    "rfq_id": rfq_id,
                    "remarks": remarks,
                    "attachments": json.dumps(attachments)
                }
            )
        
            # ===========================================
        
            db.session.execute(
                text("""
                    UPDATE rfq_response_master_t SET status='COMPLETED' WHERE response_id=:response_id
                """),
                {
                    "response_id": response_id
                }
            )
            db.session.commit()
            return {
                "success": True,
                "message": "Work completed successfully."
            }, None
        
        except Exception as e:
            db.session.rollback()
            logging.exception("PROVIDER RFQ COMPLETION MODEL ERROR")
            return None, str(e)
        
            
    @classmethod
    def get_completed_rfqs(cls):
        
        try:
        
            result = db.session.execute(
                text("""
                    SELECT rm.rfq_id,rm.rfq_no,rm.rfq_title,rm.completed_at,rr.grand_total,
                        CASE
                            WHEN u.service_type='1'
                            THEN cd.company_name
                            ELSE u.name
                        END AS contractor_name
                    FROM rfq_master_t rm
                    INNER JOIN rfq_response_master_t rr ON rm.rfq_id = rr.rfq_id
                    INNER JOIN users_t u ON u.user_uid = rr.contractor_id
                    LEFT JOIN company_details_t cd ON cd.user_uid = u.user_uid
                    WHERE rm.status = 'COMPLETED' AND rr.status = 'COMPLETED'
                    ORDER BY rm.completed_at DESC
                """)
            ).mappings().all()
            return [
                dict(row)
                for row in result
            ], None
        
        except Exception as e:
            logging.exception("GET COMPLETED RFQS ERROR")
            return None, str(e)
        
    @classmethod
    def get_admin_completed_rfq_details(cls, rfq_no):
        
        try:
            header = db.session.execute(
                text("""
                    SELECT rm.rfq_id,rm.rfq_no,rm.rfq_title,rm.description,rm.remarks,rm.closing_date,
                    rm.site_survey_required,rm.attachments,rm.status,rm.completion_remarks,
                    rm.completion_attachments,rm.completed_at,c.category_name,r.region_name,s.state_name,
                    ci.city_name,rrm.response_id,rrm.contractor_id,rrm.grand_total,
                    rrm.remarks AS contractor_remarks,
                    CASE
                        WHEN u.service_type = '1'
                        THEN cd.company_name
                        ELSE u.name
                    END AS contractor_name
                    FROM rfq_master_t rm
                    INNER JOIN rfq_response_master_t rrm ON rm.rfq_id = rrm.rfq_id
                    INNER JOIN category_master_t c ON rm.category_id = c.category_id
                    INNER JOIN region_master_t r ON rm.region_id = r.region_id
                    INNER JOIN state_master_t s ON rm.state_id = s.state_id
                    INNER JOIN city_master_t ci ON rm.city_id = ci.city_id
                    INNER JOIN users_t u ON u.user_uid = rrm.contractor_id
                    LEFT JOIN company_details_t cd ON cd.user_uid = u.user_uid
                    WHERE rm.rfq_no = :rfq_no AND rm.status = 'COMPLETED' AND rrm.status = 'COMPLETED'
                """),
                {
                    "rfq_no": rfq_no
                }
            ).mappings().first()
        
            if not header:
                return None, "Completed RFQ not found."
        
            # Parse completion attachments
            completion_attachments = []
        
            if header["completion_attachments"]:
        
                if isinstance(header["completion_attachments"], str):
        
                    try:
                        completion_attachments = json.loads(header["completion_attachments"])
                    except Exception:
                        completion_attachments = [header["completion_attachments"]]
                else:
                    completion_attachments = (header["completion_attachments"])
        
            items = db.session.execute(
                text("""
                    SELECT ri.rfq_item_id,ri.item_description,rri.quantity,rri.delivery_date,rri.unit_price,
                    rri.warranty_period,rri.total FROM rfq_response_items_t rri
                    INNER JOIN rfq_items_t ri ON ri.rfq_item_id = rri.rfq_item_id
                    WHERE rri.response_id = :response_id ORDER BY ri.rfq_item_id
                """),
                {
                    "response_id": header["response_id"]
                }
            ).mappings().all()
        
            return {
        
                "header": {
        
                    "rfq_id": header["rfq_id"],
                    "rfq_no": header["rfq_no"],
                    "rfq_title": header["rfq_title"],
                    "description": header["description"],
                    "remarks": header["remarks"],
                    "closing_date": header["closing_date"],
                    "site_survey_required": header["site_survey_required"],
                    "status": header["status"],
                    "category_name": header["category_name"],
                    "region_name": header["region_name"],
                    "state_name": header["state_name"],
                    "city_name": header["city_name"],
                    "contractor_name": header["contractor_name"],
                    "completion_remarks": header["completion_remarks"],
                    "completion_attachments": completion_attachments,
                    "completed_at": header["completed_at"]
                },
                "quotation": {
                    "response_id": header["response_id"],
                    "grand_total": header["grand_total"],
                    "remarks": header["contractor_remarks"]
                },
        
                "items": [
                    dict(item)
                    for item in items
                ],
                "attachments": header["attachments"] or []
            }, None
        
        except Exception as e:
            logging.exception("GET ADMIN COMPLETED RFQ DETAILS MODEL ERROR")
            return None, str(e)
           
    @classmethod
    def approve_rfq_completion(cls, data):
        
        try:
            rfq_id = data.get("rfq_id")
            remarks = data.get("remarks")
            with db.session.begin():
                db.session.execute(
                    text("""
                        UPDATE rfq_master_t SET status = 'CLOSED',remarks = :remarks,updated_at = NOW()
                        WHERE rfq_id = :rfq_id
                    """),
                    {
                        "rfq_id": rfq_id,
                        "remarks": remarks
                    }
                )
        
                db.session.execute(
                    text("""
                        UPDATE rfq_response_master_t SET status = 'CLOSED' WHERE rfq_id = :rfq_id
                    """),
                    {
                        "rfq_id": rfq_id
                    }
                )
            return True, None
        except Exception as e:
            db.session.rollback()
            return None, str(e)
        
        
    @classmethod
    def reopen_rfq_completion(cls, data):
        
        try:
            rfq_id = data.get("rfq_id")
            remarks = data.get("remarks")
            with db.session.begin():
                db.session.execute(
                    text("""
                        UPDATE rfq_master_t SET status = 'REOPEN', remarks = :remarks,updated_at = NOW()
                        WHERE rfq_id = :rfq_id
                    """),
                    {
                        "rfq_id": rfq_id,
                        "remarks": remarks
                    }
                )
        
                db.session.execute(
                    text("""
                        UPDATE rfq_response_master_t SET status = 'REOPEN' WHERE rfq_id = :rfq_id
                    """),
                    {
                        "rfq_id": rfq_id
                    }
                )
        
            return True, None
        
        except Exception as e:
            db.session.rollback()
            return None, str(e)
        
            
    @classmethod
    def get_provider_completed_rfqs(cls, contractor_id):
        
        try:
            result = db.session.execute(text("""
                SELECT rm.rfq_id,rm.rfq_no,rm.rfq_title,rm.closing_date,rrm.status
                FROM rfq_response_master_t rrm
                JOIN rfq_master_t rm ON rm.rfq_id = rrm.rfq_id
                WHERE rrm.contractor_id = :contractor_id AND rrm.status = 'COMPLETED'
                ORDER BY rm.created_at DESC
            """), {
                "contractor_id": contractor_id
            })
        
            return [dict(row._mapping) for row in result], None
        
        except Exception as e:
            return None, str(e)
        
    @classmethod
    def get_reopen_rfqs(cls, contractor_id):
        
        try:
            result = db.session.execute(text("""
                SELECT rm.rfq_id,rm.rfq_no,rm.rfq_title,rm.closing_date,rrm.status FROM rfq_response_master_t rrm
                JOIN rfq_master_t rm ON rm.rfq_id = rrm.rfq_id
                WHERE rrm.contractor_id = :contractor_id AND rrm.status = 'REOPEN'
                ORDER BY rm.created_at DESC
            """), {
                "contractor_id": contractor_id
            })
        
            return [dict(row._mapping) for row in result], None
        
        except Exception as e:
            return None, str(e)
        
        
    @classmethod
    def get_closed_rfqs(cls, contractor_id):
        
        try:
            result = db.session.execute(text("""
                SELECT rm.rfq_id,rm.rfq_no,rm.rfq_title,rm.closing_date,rrm.status
                FROM rfq_response_master_t rrm
                JOIN rfq_master_t rm ON rm.rfq_id = rrm.rfq_id
                WHERE rrm.contractor_id = :contractor_id AND rrm.status = 'CLOSED'
                ORDER BY rm.created_at DESC
            """), {
                "contractor_id": contractor_id
            })
        
            return [dict(row._mapping) for row in result], None
        
        except Exception as e:
            return None, str(e)
        
        
    @classmethod
    def approve_response(cls, response_id):
        
        try:
            response = db.session.execute(text("""
                SELECT response_id, rfq_id, contractor_id FROM rfq_response_master_t
                WHERE response_id = :response_id
            """), {
                "response_id": response_id
            }).mappings().first()
        
            if not response:
                return {
                    "status": False,
                    "message": "Response not found."
                }
        
            rfq_id = response["rfq_id"]
        
            db.session.execute(text("""
                UPDATE rfq_response_master_t SET status='ASSIGNED' WHERE response_id=:response_id
            """), {
                "response_id": response_id
            })
        
            db.session.execute(text("""
                UPDATE rfq_master_t SET status='ASSIGNED' WHERE rfq_id=:rfq_id
            """), {
                "rfq_id": rfq_id
            })
        
            db.session.execute(text("""
                UPDATE rfq_response_master_t SET status='NOT_SELECTED' WHERE rfq_id=:rfq_id
                AND response_id<>:response_id
            """), {
                "rfq_id": rfq_id,
                "response_id": response_id
            })
        
            db.session.commit()
            return {
                "status": True,
                "message": "Contractor assigned successfully."
            }
        
        except Exception as e:
        
            db.session.rollback()
        
            return {
                "status": False,
                "message": str(e)
            }