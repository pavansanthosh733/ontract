from sqlalchemy.sql import text
from app.models.database import db
from datetime import datetime, timedelta, date
from typing import Dict, List, Optional, Sequence, Union, Any


class AIReportModel:
    """
    AI-driven reporting model for workorder analytics.

    Design goals:
    - Keep SQL execution in one place
    - Support fixed reports for stability
    - Support dynamic field projection for prompt-driven output
    - Keep joins reusable and centralized
    - Keep backward compatibility with existing service code
    """

    # ---------------------------------------------------------------------
    # Field / join / metric registries
    # ---------------------------------------------------------------------

    # Safe output fields that the service may request.
    SAFE_FIELDS = {
        "workorder",
        "status",
        "created_time",
        "created_t",
        "category_name",
        "item_name",
        "type_name",
        "description_name",
        "region_name",
        "state_name",
        "city_name",
        "client",
        "address",
        "contractor_name",
        "contractor_id",
        "ticket_assignment_type",
        "price_rm",
        "service_rate",
        "difference_rate",
        "requested_time_close",
        "remarks",
        "workorder_created_person_name",
        "workorder_completed_time",
        "open_workorders",
        "closed_workorders",
        "total_workorders",
        "is_overdue",
        "difference",
        "ratio",
    }

    DEFAULT_TOP_CONTRACTOR_COLUMNS = [
        "contractor_name",
        "open_workorders",
        "closed_workorders",
        "total_workorders",
    ]

    DEFAULT_TOP_CLIENT_COLUMNS = [
        "client",
        "open_workorders",
        "closed_workorders",
        "total_workorders",
    ]

    DEFAULT_RATE_COMPARISON_COLUMNS = [
        "workorder",
        "created_time",
        "price_rm",
        "service_rate",
        "difference_rate",
        "contractor_name",
    ]

    DEFAULT_WORKORDER_COLUMNS = [
        "workorder",
        "status",
        "created_time",
        "category_name",
        "item_name",
        "type_name",
        "description_name",
        "region_name",
        "state_name",
        "city_name",
        "client",
        "address",
        "contractor_name",
        "contractor_id",
        "ticket_assignment_type",
        "price_rm",
        "requested_time_close",
        "remarks",
        "workorder_created_person_name",
    ]

    DEFAULT_CONTRACTOR_REPORT_COLUMNS = [
        "workorder",
        "status",
        "created_time",
        "category_name",
        "item_name",
        "type_name",
        "description_name",
        "region_name",
        "state_name",
        "city_name",
        "client",
        "address",
        "contractor_name",
        "contractor_id",
        "ticket_assignment_type",
        "service_rate",
        "requested_time_close",
        "remarks",
        "workorder_created_person_name",
    ]

    DEFAULT_SUMMARY_COLUMNS = [
        "workorder",
        "status",
        "created_t",
        "requested_time_close",
        "remarks",
        "category_name",
        "item_name",
        "type_name",
        "description_name",
        "region_name",
        "state_name",
        "city_name",
        "client",
        "address",
        "contractor_name",
        "contractor_id",
        "workorder_completed_time",
        "price_rm",
    ]

    DEFAULT_OVERDUE_COLUMNS = [
        "workorder",
        "status",
        "created_t",
        "requested_time_close",
        "workorder_completed_time",
        "is_overdue",
        "category_name",
        "item_name",
        "type_name",
        "description_name",
        "client",
        "contractor_name",
        "contractor_id",
    ]

    # Canonical field -> SQL expression map for dynamic queries given.
    FIELD_MAP = {
        "workorder": "a.workorder",
        "status": "a.status",
        "created_time": "a.created_t",
        "created_t": "a.created_t",
        "category_name": "b.category_name",
        "item_name": "c.item_name",
        "type_name": "d.type_name",
        "description_name": "e.description_name",
        "region_name": "f.region_name",
        "state_name": "g.state_name",
        "city_name": "h.city_name",
        "client": "a.client",
        "address": "a.address",
        "contractor_name": "j.contractor_name",
        "contractor_id": "j.contractor_id",
        "ticket_assignment_type": "a.ticket_assignment_type",
        "price_rm": "k.price_rm",
        "service_rate": "l.service_rate",
        "difference_rate": "COALESCE(k.price_rm, 0) - COALESCE(l.service_rate, 0)",
        "requested_time_close": "a.requested_time_close",
        "remarks": "a.remarks",
        "workorder_created_person_name": "i.name",
        "workorder_completed_time": "j.workorder_completed_time",
    }
    
    
    SORT_FIELD_MAP = {
        "created_at": "a.created_t",
        "created_time": "a.created_t",
        "created_t": "a.created_t",
        "workorder": "a.workorder",
        "status": "a.status",
        "contractor_name": "j.contractor_name",
        "contractor_id": "j.contractor_id",
        "client": "a.client",
        "price_rm": "k.price_rm",
        "service_rate": "l.service_rate",
        "difference_rate": "COALESCE(k.price_rm, 0) - COALESCE(l.service_rate, 0)",
        "workorder_completed_time": "j.workorder_completed_time",
        "total_workorders": "total_workorders",
        "open_workorders": "open_workorders",
        "closed_workorders": "closed_workorders",
    }

    # Optional join registry so dynamic planning can reuse only needed joins.
    JOIN_MAP = {
        "masters": """
        LEFT JOIN category_master_t b ON a.category = b.category_id
        LEFT JOIN item_master_t c ON a.item = c.item_id
        LEFT JOIN type_master_t d ON a.type = d.type_id
        LEFT JOIN description_master_t e ON a.description = e.description_id
        LEFT JOIN region_master_t f ON a.region = f.region_id
        LEFT JOIN state_master_t g ON a.state = g.state_id
        LEFT JOIN city_master_t h ON a.city = h.city_id
        """,
        "admins": """
        LEFT JOIN admins_t i
            ON CASE
                WHEN a.created_by ~ '^[0-9]+$'
                THEN a.created_by::bigint
            END = i.admin_id
        """,
        "workorder_life_cycle": """
        LEFT JOIN workorder_life_cycle_t j
            ON a.workorder = j.workorder
        """,
        "standard_rates": """
        LEFT JOIN standard_rates_t k
            ON lower(trim(b.category_name)) = lower(trim(k.category))
            AND lower(trim(c.item_name)) = lower(trim(k.item))
            AND lower(trim(d.type_name)) = lower(trim(k.type))
            AND lower(trim(e.description_name)) = lower(trim(k.description))
            AND lower(trim(a.client)) = lower(trim(k.client))
        """,
        "services": """
        LEFT JOIN services_t l
            ON lower(trim(b.category_name)) = lower(trim(l.category_name))
            AND lower(trim(c.item_name)) = lower(trim(l.item_name))
            AND lower(trim(d.type_name)) = lower(trim(l.type_name))
            AND lower(trim(e.description_name)) = lower(trim(l.description_name))
            AND lower(trim(f.region_name)) = lower(trim(l.region))
            AND lower(trim(g.state_name)) = lower(trim(l.state))
            AND lower(trim(h.city_name)) = lower(trim(l.city))
        """,
    }

    COMPUTED_FIELD_MAP = {
        "difference_rate": "COALESCE(k.price_rm, 0) - COALESCE(l.service_rate, 0)",
        "difference": "COALESCE(k.price_rm, 0) - COALESCE(l.service_rate, 0)",
        "ratio": "CASE WHEN COALESCE(l.service_rate, 0) = 0 THEN NULL ELSE COALESCE(k.price_rm, 0) / NULLIF(l.service_rate, 0) END",
        "open_workorders": "SUM(CASE WHEN a.status <> 'CLOSED' THEN 1 ELSE 0 END)",
        "closed_workorders": "SUM(CASE WHEN a.status = 'CLOSED' THEN 1 ELSE 0 END)",
        "total_workorders": "COUNT(*)",
        "is_overdue": "CASE WHEN j.workorder_completed_time > a.requested_time_close THEN true ELSE false END",
    }

    # ---------------------------------------------------------------------
    # Generic helpers
    # ---------------------------------------------------------------------

    @staticmethod
    def _safe_int(value, default=None):
        try:
            if value is None or value == "":
                return default
            return int(value)
        except Exception:
            return default

    @staticmethod
    def _safe_float(value, default=None):
        try:
            if value is None or value == "":
                return default
            return float(value)
        except Exception:
            return default

    @staticmethod
    def _parse_dt_start(value):
        if value is None or value == "":
            return None
    
        if isinstance(value, datetime):
            return value.replace(hour=0, minute=0, second=0, microsecond=0)
    
        if isinstance(value, date):
            return datetime(value.year, value.month, value.day, 0, 0, 0, 0)
    
        if not isinstance(value, str):
            return None
    
        dt = datetime.fromisoformat(value)
        if len(value) == 10:
            return dt.replace(hour=0, minute=0, second=0, microsecond=0)
        return dt


    @staticmethod
    def _parse_dt_end(value):
        if value is None or value == "":
            return None
    
        if isinstance(value, datetime):
            return value.replace(hour=23, minute=59, second=59, microsecond=999999)
    
        if isinstance(value, date):
            return datetime(value.year, value.month, value.day, 23, 59, 59, 999999)
    
        if not isinstance(value, str):
            return None
    
        dt = datetime.fromisoformat(value)
        if len(value) == 10:
            return dt.replace(hour=23, minute=59, second=59, microsecond=999999)
        return dt

    @staticmethod
    def _fetch_all(query, params=None):
        result = db.session.execute(text(query), params or {})
        rows = result.fetchall()
        columns = result.keys()
        return [dict(zip(columns, row)) for row in rows]
    
    @staticmethod
    def _normalize_order_by(order_by):
        if not order_by or not isinstance(order_by, str):
            return None
    
        parts = order_by.strip().split()
        if not parts:
            return None
    
        field = parts[0].strip()
        direction = parts[1].strip().lower() if len(parts) > 1 else "asc"
    
        if direction not in {"asc", "desc"}:
            direction = "asc"
    
        column = AIReportModel.SORT_FIELD_MAP.get(field)
        if not column:
            return None
    
        return f"{column} {direction.upper()}"



    @staticmethod
    def _normalize_list(value):
        if not value:
            return []
        if isinstance(value, str):
            value = [value]
        if not isinstance(value, list):
            return []
        cleaned = []
        seen = set()
        for item in value:
            if item is None:
                continue
            text_value = str(item).strip()
            if not text_value or text_value in seen:
                continue
            seen.add(text_value)
            cleaned.append(text_value)
        return cleaned

    @staticmethod
    def _normalize_select_fields(select_fields):
        select_fields = AIReportModel._normalize_list(select_fields)
        return [f for f in select_fields if f in AIReportModel.SAFE_FIELDS]

    @staticmethod
    def _normalize_computed_fields(computed_fields):
        if not computed_fields:
            return []

        if isinstance(computed_fields, dict):
            computed_fields = [computed_fields]

        if not isinstance(computed_fields, list):
            return []

        cleaned = []
        for item in computed_fields:
            if not isinstance(item, dict):
                continue

            name = (item.get("name") or "").strip()
            expression = (item.get("expression") or "").strip()
            operator = (item.get("operator") or "").strip()
            left = (item.get("left") or "").strip()
            right = (item.get("right") or "").strip()

            if not name or not expression:
                continue

            cleaned.append(
                {
                    "name": name,
                    "expression": expression,
                    "operator": operator or None,
                    "left": left or None,
                    "right": right or None,
                }
            )
        return cleaned

    @staticmethod
    def _merge_unique(*lists):
        merged = []
        seen = set()
        for lst in lists:
            if not lst:
                continue
            if isinstance(lst, str):
                lst = [lst]
            if not isinstance(lst, list):
                continue
            for item in lst:
                if item is None:
                    continue
                value = str(item).strip()
                if not value or value in seen:
                    continue
                seen.add(value)
                merged.append(value)
        return merged

    @staticmethod
    def _apply_sort_rows(rows, sort_by=None):
        if not rows or not sort_by:
            return rows

        if not isinstance(sort_by, str):
            return rows

        sort_by = sort_by.strip()
        if not sort_by:
            return rows

        parts = sort_by.split()
        if not parts:
            return rows

        field = parts[0].strip()
        direction = parts[1].strip().lower() if len(parts) > 1 else "asc"
        reverse = direction == "desc"

        def sort_key(row):
            value = row.get(field)
            if value is None:
                return (1, "")
            if isinstance(value, (int, float)):
                return (0, value)
            try:
                return (0, float(value))
            except Exception:
                return (0, str(value).lower())

        try:
            return sorted(rows, key=sort_key, reverse=reverse)
        except Exception:
            return rows

    @staticmethod
    def _infer_columns(rows):
        if not rows:
            return []

        columns = []
        seen = set()
        for row in rows:
            if isinstance(row, dict):
                for key in row.keys():
                    if key not in seen:
                        seen.add(key)
                        columns.append(key)
        return columns

    @staticmethod
    def _project_rows(rows, select_fields=None):
        """
        Keep only the requested columns in the given order.
        If select_fields is empty, return original rows unchanged.
        """
        select_fields = AIReportModel._normalize_select_fields(select_fields)
        if not select_fields:
            return rows

        projected = []
        for row in rows or []:
            if not isinstance(row, dict):
                continue
            projected.append({field: row.get(field) for field in select_fields})
        return projected

    @staticmethod
    def _base_workorder_from():
        """
        Common FROM + JOIN block used across most workorder reports.
        Keeps SQL consistent and reduces duplication.
        """
        return """
        FROM workorder_t a
        LEFT JOIN category_master_t b ON a.category = b.category_id
        LEFT JOIN item_master_t c ON a.item = c.item_id
        LEFT JOIN type_master_t d ON a.type = d.type_id
        LEFT JOIN description_master_t e ON a.description = e.description_id
        LEFT JOIN region_master_t f ON a.region = f.region_id
        LEFT JOIN state_master_t g ON a.state = g.state_id
        LEFT JOIN city_master_t h ON a.city = h.city_id
        LEFT JOIN admins_t i
            ON CASE
                WHEN a.created_by ~ '^[0-9]+$'
                THEN a.created_by::bigint
            END = i.admin_id
        LEFT JOIN workorder_life_cycle_t j
            ON a.workorder = j.workorder
        """

    @staticmethod
    def _build_filters(params=None):
        """
        Build safe WHERE conditions from structured params.
        Use this from the service layer only after Gemini converts prompt -> JSON intent.
        """
        params = params or {}
        conditions = []
        values = {}

        if params.get("start_date"):
            conditions.append("a.created_t >= :start_date")
            values["start_date"] = AIReportModel._parse_dt_start(params["start_date"])

        if params.get("end_date"):
            conditions.append("a.created_t <= :end_date")
            values["end_date"] = AIReportModel._parse_dt_end(params["end_date"])

        if params.get("status"):
            conditions.append("a.status = :status")
            values["status"] = params["status"]

        if params.get("contractor_id"):
            conditions.append("j.contractor_id = :contractor_id")
            values["contractor_id"] = params["contractor_id"]

        if params.get("client"):
            conditions.append("LOWER(a.client) = LOWER(:client)")
            values["client"] = params["client"]

        if params.get("category"):
            conditions.append("a.category = :category")
            values["category"] = params["category"]

        if params.get("state"):
            conditions.append("LOWER(g.state_name) = LOWER(:state)")
            values["state"] = params["state"]

        if params.get("city"):
            conditions.append("LOWER(h.city_name) = LOWER(:city)")
            values["city"] = params["city"]

        if params.get("region"):
            conditions.append("LOWER(f.region_name) = LOWER(:region)")
            values["region"] = params["region"]

        if not conditions:
            return "1=1", values

        return " AND ".join(conditions), values

    @staticmethod
    def _detect_joins_from_fields(select_fields=None, computed_fields=None, report_type=None):
        """
        Decide which joins are required for a query.
        """
        select_fields = set(AIReportModel._normalize_select_fields(select_fields))
        computed_fields = AIReportModel._normalize_computed_fields(computed_fields)

        for item in computed_fields:
            expr = (item.get("expression") or "").lower()
            for token in [
                "price_rm",
                "service_rate",
                "contractor_name",
                "contractor_id",
                "category_name",
                "item_name",
                "type_name",
                "description_name",
                "region_name",
                "state_name",
                "city_name",
                "workorder_completed_time",
            ]:
                if token in expr:
                    select_fields.add(token)

        joins = ["masters"]

        if report_type in {
            "workorder_report",
            "contractor_report",
            "summary_report",
            "rate_comparison_report",
            "comparison_report",
            "top_contractors",
            "top_clients",
            "overdue_workorders",
            "recent_completed_workorders",
            "dynamic_report",
        }:
            joins.append("workorder_life_cycle")

        if (
            "workorder_created_person_name" in select_fields
            or report_type == "workorder_report"
            or report_type == "contractor_report"
            or report_type == "summary_report"
            or report_type == "recent_completed_workorders"
        ):
            joins.append("admins")

        if (
            "price_rm" in select_fields
            or "difference_rate" in select_fields
            or "difference" in select_fields
            or report_type in {"workorder_report", "summary_report", "rate_comparison_report", "comparison_report"}
        ):
            joins.append("standard_rates")

        if (
            "service_rate" in select_fields
            or report_type in {"contractor_report", "rate_comparison_report", "comparison_report"}
        ):
            joins.append("services")

        # Deduplicate preserving order
        unique_joins = []
        seen = set()
        for j in joins:
            if j not in seen:
                seen.add(j)
                unique_joins.append(j)
        return unique_joins

    @staticmethod
    def _build_from_with_required_joins(select_fields=None, computed_fields=None, report_type=None):
        """
        Build the FROM + only the joins required for the query.
        """
        joins = AIReportModel._detect_joins_from_fields(
            select_fields=select_fields,
            computed_fields=computed_fields,
            report_type=report_type,
        )

        query = """
        FROM workorder_t a
        """

        if "masters" in joins:
            query += """
            LEFT JOIN category_master_t b ON a.category = b.category_id
            LEFT JOIN item_master_t c ON a.item = c.item_id
            LEFT JOIN type_master_t d ON a.type = d.type_id
            LEFT JOIN description_master_t e ON a.description = e.description_id
            LEFT JOIN region_master_t f ON a.region = f.region_id
            LEFT JOIN state_master_t g ON a.state = g.state_id
            LEFT JOIN city_master_t h ON a.city = h.city_id
            """

        if "admins" in joins:
            query += """
            LEFT JOIN admins_t i
                ON CASE
                    WHEN a.created_by ~ '^[0-9]+$'
                    THEN a.created_by::bigint
                END = i.admin_id
            """

        if "workorder_life_cycle" in joins:
            query += """
            LEFT JOIN workorder_life_cycle_t j
                ON a.workorder = j.workorder
            """

        if "standard_rates" in joins:
            query += """
            LEFT JOIN standard_rates_t k
                ON lower(trim(b.category_name)) = lower(trim(k.category))
                AND lower(trim(c.item_name)) = lower(trim(k.item))
                AND lower(trim(d.type_name)) = lower(trim(k.type))
                AND lower(trim(e.description_name)) = lower(trim(k.description))
                AND lower(trim(a.client)) = lower(trim(k.client))
            """

        if "services" in joins:
            query += """
            LEFT JOIN services_t l
                ON lower(trim(b.category_name)) = lower(trim(l.category_name))
                AND lower(trim(c.item_name)) = lower(trim(l.item_name))
                AND lower(trim(d.type_name)) = lower(trim(l.type_name))
                AND lower(trim(e.description_name)) = lower(trim(l.description_name))
                AND lower(trim(f.region_name)) = lower(trim(l.region))
                AND lower(trim(g.state_name)) = lower(trim(l.state))
                AND lower(trim(h.city_name)) = lower(trim(l.city))
            """

        return query

    @staticmethod
    def _apply_computed_fields(rows, computed_fields=None):
        """
        Runtime computed fields in Python.
        Useful when prompt asks for ad-hoc expressions.
        """
        computed_fields = AIReportModel._normalize_computed_fields(computed_fields)
        if not computed_fields:
            return rows

        out = []
        for row in rows or []:
            new_row = dict(row)
            for item in computed_fields:
                name = item.get("name")
                operator = item.get("operator")
                left = item.get("left")
                right = item.get("right")
                expression = item.get("expression") or ""

                if name in AIReportModel.COMPUTED_FIELD_MAP and not operator and not left and not right:
                    # If it is a well-known computed field, try to use row values if available.
                    if name == "difference_rate":
                        try:
                            price = float(new_row.get("price_rm") or 0)
                            service = float(new_row.get("service_rate") or 0)
                            new_row[name] = price - service
                        except Exception:
                            new_row[name] = None
                        continue

                try:
                    if left:
                        left_value = float(new_row.get(left) or 0)
                    else:
                        left_value = 0.0
                except Exception:
                    left_value = 0.0

                try:
                    if right:
                        right_value = float(new_row.get(right) or 0)
                    else:
                        right_value = 0.0
                except Exception:
                    right_value = 0.0

                result = None

                try:
                    if operator == "-":
                        result = left_value - right_value
                    elif operator == "+":
                        result = left_value + right_value
                    elif operator == "*":
                        result = left_value * right_value
                    elif operator == "/":
                        result = left_value / right_value if right_value != 0 else None
                    else:
                        # Very light fallback for common difference wording.
                        if " - " in expression:
                            expr_parts = expression.split(" - ", 1)
                            if len(expr_parts) == 2:
                                l_name = expr_parts[0].strip()
                                r_name = expr_parts[1].strip()
                                try:
                                    l_val = float(new_row.get(l_name) or 0)
                                except Exception:
                                    l_val = 0.0
                                try:
                                    r_val = float(new_row.get(r_name) or 0)
                                except Exception:
                                    r_val = 0.0
                                result = l_val - r_val
                except Exception:
                    result = None

                new_row[name] = result

            out.append(new_row)
        return out

    @staticmethod
    def _query_dynamic(
        select_fields=None,
        params=None,
        group_by=None,
        order_by=None,
        limit=None,
        report_type=None,
        computed_fields=None,
        where_extra=None,
        additional_selects=None,
    ):
        """
        Generic query builder for dynamic prompt-driven reports.
        """
        params = params or {}
        select_fields = AIReportModel._normalize_select_fields(select_fields)
        computed_fields = AIReportModel._normalize_computed_fields(computed_fields)
        additional_selects = additional_selects or []

        required_fields = list(select_fields)
        for item in computed_fields:
            for key in ["left", "right"]:
                value = item.get(key)
                if value and value in AIReportModel.SAFE_FIELDS and value not in required_fields:
                    required_fields.append(value)

        for add in additional_selects:
            if add and add not in required_fields:
                required_fields.append(add)

        from_clause = AIReportModel._build_from_with_required_joins(
            select_fields=required_fields,
            computed_fields=computed_fields,
            report_type=report_type,
        )

        where_clause, values = AIReportModel._build_filters(params)
        if where_extra:
            where_clause = f"({where_clause}) AND ({where_extra})"

        if not select_fields:
            select_fields = AIReportModel.DEFAULT_WORKORDER_COLUMNS

        select_expressions = []
        for field in select_fields:
            expr = AIReportModel.FIELD_MAP.get(field)
            if expr:
                select_expressions.append(f"{expr} AS {field}")

        for item in computed_fields:
            name = item.get("name")
            expression = item.get("expression")
            if name and expression:
                select_expressions.append(f"{expression} AS {name}")

        if not select_expressions:
            select_expressions.append("a.workorder AS workorder")

        query = f"""
        SELECT
            {", ".join(select_expressions)}
        {from_clause}
        WHERE {where_clause}
        """

        if group_by:
            group_by = AIReportModel._normalize_list(group_by)
            if group_by:
                group_exprs = []
                for g in group_by:
                    expr = AIReportModel.FIELD_MAP.get(g, g)
                    group_exprs.append(expr)
                query += "\nGROUP BY " + ", ".join(group_exprs)

        normalized_order_by = AIReportModel._normalize_order_by(order_by)
        if not normalized_order_by:
            normalized_order_by = "a.created_t DESC"
        query += f"\nORDER BY {normalized_order_by}"

        if limit is not None:
            query += "\nLIMIT :limit"
            values["limit"] = int(limit)

        return AIReportModel._fetch_all(query, values)

    # ---------------------------------------------------------------------
    # Backward-compatible public methods
    # ---------------------------------------------------------------------

    @staticmethod
    def get_contractors():
        query = """
            SELECT user_uid, name, email_id
            FROM users_t
            ORDER BY name
        """
        return AIReportModel._fetch_all(query)

    @staticmethod
    def get_workorder_report(
        start_date,
        end_date,
        limit=None,
        select_fields=None,
        sort_by=None,
    ):
        """
        Standard workorder report.
        """
        start_date = AIReportModel._parse_dt_start(start_date)
        end_date = AIReportModel._parse_dt_end(end_date)

        params = {
            "start_date": start_date,
            "end_date": end_date,
        }

        fields = AIReportModel._normalize_select_fields(select_fields) or AIReportModel.DEFAULT_WORKORDER_COLUMNS

        data = AIReportModel._query_dynamic(
            select_fields=fields,
            params=params,
            order_by="a.created_t DESC",
            limit=limit,
            report_type="workorder_report",
        )

        if sort_by:
            data = AIReportModel._apply_sort_rows(data, sort_by)

        return AIReportModel._project_rows(data, fields)

    @staticmethod
    def get_contractor_report(
        start_date,
        end_date,
        contractor_id,
        select_fields=None,
        sort_by=None,
    ):
        """
        Contractor-wise workorder report.
        """
        start_date = AIReportModel._parse_dt_start(start_date)
        end_date = AIReportModel._parse_dt_end(end_date)

        params = {
            "start_date": start_date,
            "end_date": end_date,
            "contractor_id": contractor_id,
        }

        fields = AIReportModel._normalize_select_fields(select_fields) or AIReportModel.DEFAULT_CONTRACTOR_REPORT_COLUMNS

        data = AIReportModel._query_dynamic(
            select_fields=fields,
            params=params,
            order_by="a.created_t DESC",
            report_type="contractor_report",
        )

        if sort_by:
            data = AIReportModel._apply_sort_rows(data, sort_by)

        return AIReportModel._project_rows(data, fields)

    @staticmethod
    def get_summary_report(
        category=None,
        year=None,
        month=None,
        select_fields=None,
        sort_by=None,
    ):
        """
        Summary report focused on CLOSED workorders.
        """
        conditions = ["a.status = 'CLOSED'"]
        params = {}

        if year:
            conditions.append("EXTRACT(YEAR FROM j.workorder_completed_time) = :year")
            params["year"] = int(year)

        if month:
            conditions.append("EXTRACT(MONTH FROM j.workorder_completed_time) = :month")
            params["month"] = int(month)

        if category:
            conditions.append("a.category = :category_id")
            params["category_id"] = int(category)

        where_clause = " AND ".join(conditions)

        fields = AIReportModel._normalize_select_fields(select_fields) or AIReportModel.DEFAULT_SUMMARY_COLUMNS

        data = AIReportModel._query_dynamic(
            select_fields=fields,
            params=params,
            where_extra=where_clause,
            order_by="j.workorder_completed_time DESC",
            report_type="summary_report",
        )

        if sort_by:
            data = AIReportModel._apply_sort_rows(data, sort_by)

        return AIReportModel._project_rows(data, fields)

    @staticmethod
    def get_rate_comparison_report(
        start_date,
        end_date,
        select_fields=None,
        sort_by=None,
    ):
        """
        Standard rate vs service rate comparison report.
        """
        start_date = AIReportModel._parse_dt_start(start_date)
        end_date = AIReportModel._parse_dt_end(end_date)

        params = {
            "start_date": start_date,
            "end_date": end_date,
        }

        fields = AIReportModel._normalize_select_fields(select_fields) or AIReportModel.DEFAULT_RATE_COMPARISON_COLUMNS

        # Ensure difference_rate exists if the user asked for comparison.
        computed_fields = [
            {
                "name": "difference_rate",
                "expression": "COALESCE(k.price_rm, 0) - COALESCE(l.service_rate, 0)",
                "operator": "-",
                "left": "price_rm",
                "right": "service_rate",
            }
        ]

        data = AIReportModel._query_dynamic(
            select_fields=fields,
            params=params,
            computed_fields=computed_fields,
            order_by="a.created_t DESC",
            report_type="rate_comparison_report",
        )

        if sort_by:
            data = AIReportModel._apply_sort_rows(data, sort_by)

        return AIReportModel._project_rows(data, fields)

    @staticmethod
    def get_top_contractors(
        start_date,
        end_date,
        limit=5,
        select_fields=None,
        sort_by=None,
    ):
        """
        Top contractors by workorder volume.
        """
        start_date = AIReportModel._parse_dt_start(start_date)
        end_date = AIReportModel._parse_dt_end(end_date)

        query = """
        SELECT
            COALESCE(j.contractor_id::text, 'NA') AS contractor_id,
            COALESCE(j.contractor_name, 'Unknown') AS contractor_name,
            COUNT(*) AS total_workorders,
            SUM(CASE WHEN a.status = 'CLOSED' THEN 1 ELSE 0 END) AS closed_workorders,
            SUM(CASE WHEN a.status <> 'CLOSED' THEN 1 ELSE 0 END) AS open_workorders
        FROM workorder_t a
        LEFT JOIN workorder_life_cycle_t j ON a.workorder = j.workorder
        WHERE a.created_t BETWEEN :start_date AND :end_date
          AND a.status NOT IN ('Rejected')
        GROUP BY j.contractor_id, j.contractor_name
        ORDER BY total_workorders DESC
        LIMIT :limit
        """

        data = AIReportModel._fetch_all(query, {
            "start_date": start_date,
            "end_date": end_date,
            "limit": int(limit),
        })

        fields = AIReportModel._normalize_select_fields(select_fields) or AIReportModel.DEFAULT_TOP_CONTRACTOR_COLUMNS

        if sort_by:
            data = AIReportModel._apply_sort_rows(data, sort_by)

        return AIReportModel._project_rows(data, fields)

    @staticmethod
    def get_top_clients(
        start_date,
        end_date,
        limit=5,
        select_fields=None,
        sort_by=None,
    ):
        """
        Top clients by workorder volume.
        """
        start_date = AIReportModel._parse_dt_start(start_date)
        end_date = AIReportModel._parse_dt_end(end_date)

        query = """
        SELECT
            COALESCE(a.client, 'Unknown') AS client,
            COUNT(*) AS total_workorders,
            SUM(CASE WHEN a.status = 'CLOSED' THEN 1 ELSE 0 END) AS closed_workorders,
            SUM(CASE WHEN a.status <> 'CLOSED' THEN 1 ELSE 0 END) AS open_workorders
        FROM workorder_t a
        WHERE a.created_t BETWEEN :start_date AND :end_date
          AND a.status NOT IN ('Rejected')
        GROUP BY a.client
        ORDER BY total_workorders DESC
        LIMIT :limit
        """

        data = AIReportModel._fetch_all(query, {
            "start_date": start_date,
            "end_date": end_date,
            "limit": int(limit),
        })

        fields = AIReportModel._normalize_select_fields(select_fields) or AIReportModel.DEFAULT_TOP_CLIENT_COLUMNS

        if sort_by:
            data = AIReportModel._apply_sort_rows(data, sort_by)

        return AIReportModel._project_rows(data, fields)

    @staticmethod
    def get_overdue_workorders(
        start_date,
        end_date,
        limit=100,
        select_fields=None,
        sort_by=None,
    ):
        """
        Workorders where completion happened after requested close time.
        """
        start_date = AIReportModel._parse_dt_start(start_date)
        end_date = AIReportModel._parse_dt_end(end_date)

        query = """
        SELECT
            a.workorder,
            a.status,
            a.created_t,
            a.requested_time_close,
            j.workorder_completed_time,
            CASE
                WHEN j.workorder_completed_time > a.requested_time_close THEN true
                ELSE false
            END AS is_overdue,
            b.category_name,
            c.item_name,
            d.type_name,
            e.description_name,
            a.client,
            j.contractor_name,
            j.contractor_id
        FROM workorder_t a
        LEFT JOIN workorder_life_cycle_t j ON a.workorder = j.workorder
        LEFT JOIN category_master_t b ON a.category = b.category_id
        LEFT JOIN item_master_t c ON a.item = c.item_id
        LEFT JOIN type_master_t d ON a.type = d.type_id
        LEFT JOIN description_master_t e ON a.description = e.description_id
        WHERE a.created_t BETWEEN :start_date AND :end_date
          AND a.status NOT IN ('Rejected')
          AND a.requested_time_close IS NOT NULL
          AND j.workorder_completed_time IS NOT NULL
          AND j.workorder_completed_time > a.requested_time_close
        ORDER BY j.workorder_completed_time DESC
        LIMIT :limit
        """

        data = AIReportModel._fetch_all(query, {
            "start_date": start_date,
            "end_date": end_date,
            "limit": int(limit),
        })

        fields = AIReportModel._normalize_select_fields(select_fields) or AIReportModel.DEFAULT_OVERDUE_COLUMNS

        if sort_by:
            data = AIReportModel._apply_sort_rows(data, sort_by)

        return AIReportModel._project_rows(data, fields)

    @staticmethod
    def get_recent_completed_workorders(
        limit=5,
        select_fields=None,
        sort_by=None,
    ):
        """
        Recently completed closed workorders.
        """
        query = """
        SELECT
            a.workorder,
            a.status,
            a.created_t,
            j.workorder_completed_time,
            j.contractor_id,
            j.contractor_name,
            a.client,
            b.category_name,
            c.item_name,
            d.type_name,
            e.description_name,
            f.region_name,
            g.state_name,
            h.city_name,
            a.remarks
        FROM workorder_t a
        LEFT JOIN workorder_life_cycle_t j ON a.workorder = j.workorder
        LEFT JOIN category_master_t b ON a.category = b.category_id
        LEFT JOIN item_master_t c ON a.item = c.item_id
        LEFT JOIN type_master_t d ON a.type = d.type_id
        LEFT JOIN description_master_t e ON a.description = e.description_id
        LEFT JOIN region_master_t f ON a.region = f.region_id
        LEFT JOIN state_master_t g ON a.state = g.state_id
        LEFT JOIN city_master_t h ON a.city = h.city_id
        WHERE a.status = 'CLOSED'
          AND j.workorder_completed_time IS NOT NULL
        ORDER BY j.workorder_completed_time DESC
        LIMIT :limit
        """

        data = AIReportModel._fetch_all(query, {"limit": int(limit)})

        fields = AIReportModel._normalize_select_fields(select_fields) or [
            "workorder",
            "status",
            "created_t",
            "workorder_completed_time",
            "contractor_id",
            "contractor_name",
            "client",
        ]

        if sort_by:
            data = AIReportModel._apply_sort_rows(data, sort_by)

        return AIReportModel._project_rows(data, fields)

    @staticmethod
    def get_recent_workorders(
        limit=5,
        select_fields=None,
        sort_by=None,
    ):
        """
        Latest created workorders.
        """
        query = """
        SELECT
            a.workorder,
            a.status,
            a.created_t,
            b.category_name,
            c.item_name,
            d.type_name,
            e.description_name,
            f.region_name,
            g.state_name,
            h.city_name,
            a.client,
            j.contractor_name,
            j.contractor_id,
            a.remarks
        FROM workorder_t a
        LEFT JOIN workorder_life_cycle_t j ON a.workorder = j.workorder
        LEFT JOIN category_master_t b ON a.category = b.category_id
        LEFT JOIN item_master_t c ON a.item = c.item_id
        LEFT JOIN type_master_t d ON a.type = d.type_id
        LEFT JOIN description_master_t e ON a.description = e.description_id
        LEFT JOIN region_master_t f ON a.region = f.region_id
        LEFT JOIN state_master_t g ON a.state = g.state_id
        LEFT JOIN city_master_t h ON a.city = h.city_id
        ORDER BY a.created_t DESC
        LIMIT :limit
        """

        data = AIReportModel._fetch_all(query, {"limit": int(limit)})

        fields = AIReportModel._normalize_select_fields(select_fields) or [
            "workorder",
            "status",
            "created_t",
            "category_name",
            "item_name",
            "type_name",
            "description_name",
            "region_name",
            "state_name",
            "city_name",
            "client",
            "contractor_name",
            "contractor_id",
            "remarks",
        ]

        if sort_by:
            data = AIReportModel._apply_sort_rows(data, sort_by)

        return AIReportModel._project_rows(data, fields)

    @staticmethod
    def get_contractor_side_by_side_report(
        contractor_ids: Sequence[Union[int, str]],
        start_date,
        end_date,
        select_fields=None,
    ):
        """
        Side-by-side comparison of two or more contractors.
        """
        contractor_ids = AIReportModel._normalize_list(contractor_ids)
        if not contractor_ids:
            return []

        start_date = AIReportModel._parse_dt_start(start_date)
        end_date = AIReportModel._parse_dt_end(end_date)

        params = {
            "start_date": start_date,
            "end_date": end_date,
        }

        placeholders = []
        for idx, contractor_id in enumerate(contractor_ids):
            key = f"cid_{idx}"
            placeholders.append(f":{key}")
            params[key] = contractor_id

        in_clause = ", ".join(placeholders)

        query = f"""
        SELECT
            COALESCE(j.contractor_id::text, 'NA') AS contractor_id,
            COALESCE(j.contractor_name, 'Unknown') AS contractor_name,
            COUNT(*) AS total_workorders,
            SUM(CASE WHEN a.status = 'CLOSED' THEN 1 ELSE 0 END) AS closed_workorders,
            SUM(CASE WHEN a.status <> 'CLOSED' THEN 1 ELSE 0 END) AS open_workorders
        FROM workorder_t a
        LEFT JOIN workorder_life_cycle_t j ON a.workorder = j.workorder
        WHERE a.created_t BETWEEN :start_date AND :end_date
          AND a.status NOT IN ('Rejected')
          AND j.contractor_id IN ({in_clause})
        GROUP BY j.contractor_id, j.contractor_name
        ORDER BY total_workorders DESC, contractor_name ASC
        """

        data = AIReportModel._fetch_all(query, params)

        fields = AIReportModel._normalize_select_fields(select_fields) or [
            "contractor_id",
            "contractor_name",
            "total_workorders",
            "open_workorders",
            "closed_workorders",
        ]

        return AIReportModel._project_rows(data, fields)

    # ---------------------------------------------------------------------
    # Generic query entry point
    # ---------------------------------------------------------------------

    @staticmethod
    def dynamic_workorder_query(
        select_clause,
        params=None,
        extra_joins="",
        where_extra=None,
        group_by=None,
        order_by=None,
        limit=None,
    ):
        """
        Generic report query builder.

        IMPORTANT:
        - Do NOT pass raw user SQL directly here.
        - The service layer should map intent -> safe select/order/group fragments.
        """
        params = params or {}

        where_clause, values = AIReportModel._build_filters(params)
        if where_extra:
            where_clause = f"({where_clause}) AND ({where_extra})"

        query = f"""
        SELECT
            {select_clause}
        {AIReportModel._base_workorder_from()}
        {extra_joins}
        WHERE {where_clause}
        """

        if group_by:
            query += f"\nGROUP BY {group_by}"

        normalized_order_by = AIReportModel._normalize_order_by(order_by)
        if not normalized_order_by:
            normalized_order_by = "a.created_t DESC"
        query += f"\nORDER BY {normalized_order_by}"

        if limit is not None:
            query += "\nLIMIT :limit"
            values["limit"] = int(limit)

        return AIReportModel._fetch_all(query, values)

    @staticmethod
    def get_dynamic_report(
        params=None,
    ):
        """
        High-level dynamic report path that can be used by the service
        when the parser decides the prompt is fully ad-hoc.
        """
        params = params or {}

        select_fields = AIReportModel._normalize_select_fields(
            params.get("select_fields")
        )

        computed_fields = AIReportModel._normalize_computed_fields(
            params.get("computed_fields")
        )

        if not select_fields and not computed_fields:
            select_fields = [
                "workorder",
                "created_time",
                "contractor_name",
                "client",
            ]

        fields = select_fields or []
        if computed_fields:
            for item in computed_fields:
                name = item.get("name")
                if name and name not in fields and name in AIReportModel.SAFE_FIELDS:
                    fields.append(name)

        data = AIReportModel._query_dynamic(
            select_fields=fields,
            params=params,
            group_by=params.get("group_by"),
            order_by=params.get("sort_by"),
            limit=params.get("limit"),
            report_type="dynamic_report",
            computed_fields=computed_fields,
        )

        return data