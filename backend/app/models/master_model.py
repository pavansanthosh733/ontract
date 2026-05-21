# backend/app/models/master_model.py
import logging
from sqlalchemy import text
from app.models.database import db
from sqlalchemy.exc import IntegrityError

class DuplicateDescriptionError(Exception):
    pass


class DuplicateItemError(Exception):
    pass

class DuplicateTypeError(Exception):
    pass

class DuplicateCategoryError(Exception):
    pass

class MasterModel:

    # ================= CATEGORY QUERIES =================

    @staticmethod
    def get_all_categories():
        sql = text("""
            SELECT id, category_id, category_name, status
            FROM category_master_t
            ORDER BY id ASC
        """)
        result = db.session.execute(sql).mappings().all()
        return result

    @staticmethod
    def add_category(data):
        logging.info("Checking duplicate category name (insert only)")

        category_name = data.get("category_name")
        status = data.get("status")

        # normalize
        category_name = category_name.strip() if category_name else category_name

        sql_check = text("""
            SELECT id
            FROM category_master_t
            WHERE LOWER(TRIM(category_name)) = LOWER(TRIM(:category_name))
        """)

        duplicate = db.session.execute(sql_check, {
            "category_name": category_name
        }).mappings().first()

        if duplicate:
            raise DuplicateCategoryError("Category value already exists")

        sql = text("""
            INSERT INTO category_master_t (category_name, status)
            VALUES (:category_name, :status)
            RETURNING id, category_id, category_name, status
        """)

        result = db.session.execute(sql, {
            "category_name": category_name,
            "status": status
        }).mappings().first()

        db.session.commit()
        return result



    @staticmethod
    def update_category(cat_id, data):
        logging.info("Updating category")

        category_name = data.get("category_name")
        status = data.get("status")  

        sql = text("""
            UPDATE category_master_t SET category_name = :category_name, status = :status
            WHERE id = :id
            RETURNING id, category_name, status
        """)

        result = db.session.execute(sql, {
            "category_name": category_name,
            "status": status,
            "id": cat_id
        }).mappings().first()

        db.session.commit()
        return result

    @staticmethod
    def delete_category(cat_id):
        sql = text("""
            DELETE FROM category_master_t WHERE id = :id
            RETURNING id
        """)

        result = db.session.execute(sql, {"id": cat_id}).mappings().first()
        db.session.commit()
        return result


    @staticmethod
    def get_active_categories():

        sql = text("""
            SELECT * FROM category_master_t WHERE status = 'Active' ORDER BY id DESC
        """)

        result = db.session.execute(sql).mappings().all()
        return result

    # ================= ITEM MASTER QUERIES =================

    @staticmethod
    def get_all_items():

        sql = text("""
            SELECT i.id,i.item_name,i.item_id,i.category_id,i.status FROM item_master_t i
            JOIN category_master_t c ON i.category_id = c.category_id
            WHERE  c.status = 'Active' ORDER BY i.id ASC
        """)

        return db.session.execute(sql).mappings().all()



    @staticmethod
    def add_item(data):
        item_name = (data.get("item_name") or "").strip()
        category_id = data.get("category_id")
        status = data.get("status")

        try:
            # Duplicate Check
            check_sql = text("""
                SELECT 1 FROM item_master_t WHERE LOWER(TRIM(item_name)) = LOWER(TRIM(:item_name))
                AND category_id = :category_id LIMIT 1
            """)

            exists = db.session.execute(check_sql, {
                "item_name": item_name,
                "category_id": category_id
            }).first()

            if exists:
                raise DuplicateItemError("Item already exists in this category")

            # Insert Item
            sql = text("""
                INSERT INTO item_master_t (item_name, category_id, status)
                VALUES (:item_name, :category_id, :status)
                RETURNING id, item_id
            """)

            result = db.session.execute(sql, {
                "item_name": item_name,
                "category_id": category_id,
                "status": status
            }).mappings().first()

            db.session.commit()
            return result

        except IntegrityError as e:
            db.session.rollback()
            raise DuplicateItemError("Item already exists in this category") from e

        except Exception:
            db.session.rollback()
            raise




    @staticmethod
    def update_item(item_id, data):
        sql = text("""
            UPDATE item_master_t SET item_name = :item_name,status = :status WHERE id = :id
            RETURNING id
        """)

        result = db.session.execute(sql, {
            "item_name": data.get("item_name"),
            "status": data.get("status"),
            "id": item_id
        }).mappings().first()

        db.session.commit()
        return result

    @staticmethod
    def delete_item(item_id):
        sql = text("""
            DELETE FROM item_master_t WHERE id = :id
            RETURNING id
        """)
        result = db.session.execute(sql, {"id": item_id}).mappings().first()
        db.session.commit()
        return result
    

    @staticmethod
    def fetch_item_by_category_id(category_id):
        logging.info(f"checktheinput: '{category_id}'")

        sql = text("""
            SELECT * FROM item_master_t WHERE category_id = :category_id AND status = 'Active'
        """)

        rows = db.session.execute(sql, {"category_id": category_id}).mappings().all()
        result = [dict(row) for row in rows]

        logging.info(f"checktheoutput: {result}")

        return result
    
    # ========== TYPE MASTER ==========

    @staticmethod
    def get_all_types():

        sql = text("""
            SELECT t.id,t.type_name,t.type_id,t.category_id,t.item_id,t.status
            FROM type_master_t t JOIN category_master_t c ON t.category_id = c.category_id
            JOIN item_master_t i ON t.item_id = i.item_id
            WHERE c.status = 'Active' AND i.status = 'Active'
            ORDER BY t.id ASC
        """)

        return db.session.execute(sql).mappings().all()


    @staticmethod
    def add_type(data):

        type_name = (data.get("type_name") or "").strip()
        category_id = data.get("category_id")
        item_id = data.get("item_id")
        status = data.get("status")

        # -------- Duplicate Validation --------
        dup_check_sql = text("""
            SELECT 1 FROM type_master_t WHERE LOWER(TRIM(type_name)) = LOWER(TRIM(:type_name))
            AND category_id = :category_id AND item_id = :item_id
            LIMIT 1
        """)

        dup = db.session.execute(dup_check_sql, {
            "type_name": type_name,
            "category_id": category_id,
            "item_id": item_id
        }).first()

        if dup:
            raise DuplicateTypeError(
                "Type name already exists under this category and item"
            )

        # -------- Insert Query --------
        sql = text("""
            INSERT INTO type_master_t (type_name,category_id,item_id,status)
            VALUES (:type_name,:category_id,:item_id,:status)
            RETURNING id, type_id
        """)

        result = db.session.execute(sql, {
            "type_name": type_name,
            "category_id": category_id,
            "item_id": item_id,
            "status": status
        }).mappings().first()

        db.session.commit()

        return result

    @staticmethod
    def update_type(type_id, data):
        sql = text("""
            UPDATE type_master_t SET type_name = :type_name,status = :status WHERE id = :id
            RETURNING id
        """)

        result = db.session.execute(sql, {
            "type_name": data.get("type_name"),
            "status": data.get("status"),
            "id": type_id
        }).mappings().first()

        db.session.commit()
        return result


    @staticmethod
    def delete_type(type_id):
        sql = text("""
            DELETE FROM type_master_t WHERE id = :id
            RETURNING id
        """)

        result = db.session.execute(sql, {"id": type_id}).mappings().first()

        db.session.commit()
        return result
   
    
        # ================= DESCRIPTION MASTER QUERIES =================

    @staticmethod
    def get_all_descriptions():

        sql = text("""
            SELECT d.* FROM description_master_t d JOIN type_master_t t ON d.type_id = t.type_id
            JOIN item_master_t i ON d.item_id = i.item_id
            JOIN category_master_t c ON d.category_id = c.category_id
            WHERE  t.status = 'Active' AND i.status = 'Active' AND c.status = 'Active'
            ORDER BY d.id ASC
        """)

        return db.session.execute(sql).mappings().all()


    @staticmethod
    def add_description(data):
        logging.info(f"checktheinput: '{data}'")

        category_id = int(data.get("category_id"))
        item_id = int(data.get("item_id"))
        type_id = int(data.get("type_id"))

        description = (data.get("description") or "").strip()
        status = data.get("status")

        # -------------------------------
        # Duplicate Validation
        # -------------------------------
        dup_check_sql = text("""
            SELECT 1 FROM description_master_t 
            WHERE LOWER(TRIM(description_name)) = LOWER(TRIM(:description))
            AND category_id = :category_id AND item_id = :item_id AND type_id = :type_id
            LIMIT 1
        """)

        dup = db.session.execute(dup_check_sql, {
            "description": description,
            "category_id": category_id,
            "item_id": item_id,
            "type_id": type_id
        }).first()

        if dup:
            raise DuplicateDescriptionError(
                "Description already exists under this Category → Item → Type"
            )

        # -------------------------------
        # INSERT Query
        # -------------------------------
        sql = text("""
            INSERT INTO description_master_t (description_name, category_id, item_id, type_id, status)
            VALUES (:description, :category_id, :item_id, :type_id, :status)
            RETURNING id, description_id
        """)

        row = db.session.execute(sql, {
            "description": description,
            "category_id": category_id,
            "item_id": item_id,
            "type_id": type_id,
            "status": status
        }).mappings().first()

        db.session.commit()
        return row


    @staticmethod
    def update_description(desc_id, data):
        sql = text("""
            UPDATE description_master_t SET "description_name" = :description,status = :status
            WHERE id = :id
            RETURNING id
        """)

        result = db.session.execute(sql, {
            "description": data.get("description"),
            "status": data.get("status"),
            "id": desc_id
        }).mappings().first()

        db.session.commit()
        return result



    @staticmethod
    def delete_description(desc_id):
        sql = text("""
            DELETE FROM description_master_t WHERE id = :id
            RETURNING id
        """)
        result = db.session.execute(sql, {"id": desc_id}).mappings().first()
        db.session.commit()
        return result
    
    @staticmethod
    def fetch_types_by_category_item(category_id, item_id):
        sql = text("""
            SELECT * FROM type_master_t 
            WHERE category_id = :category_id AND item_id = :item_id AND status = 'Active'
        """)

        rows = db.session.execute(
            sql,
            {"category_id": category_id, "item_id": item_id}
        ).mappings().all()

        result = [dict(row) for row in rows]
        return result

    
    @staticmethod
    def fetch_descriptions(category_id, item_id, type_id):
        logging.info("checking fetch_description is calling or not")

        sql = text("""
            SELECT * FROM description_master_t WHERE category_id = :category_id AND item_id = :item_id
            AND type_id = :type_id AND status = 'Active'
        """)

        rows = db.session.execute(sql, {
            "category_id": category_id,
            "item_id": item_id,
            "type_id": type_id
        }).mappings().all()

        return [dict(row) for row in rows]

