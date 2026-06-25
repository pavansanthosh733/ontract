import json
import os
from datetime import datetime, timedelta, date
from app.utils.ai_prompt_validator import validate_prompt

try:
    from google import genai
    from google.genai import types
    print("✅ genai library loaded successfully.")
except Exception:
    print("⚠️ genai library not available. AI summary will use fallback.")
    genai = None
    types = None

from app.models.ai_report_model import AIReportModel
from app.services.prompt_parser_service import parse_prompt_to_intent


DEFAULT_DYNAMIC_FIELDS = [
    "workorder",
    "created_time",
    "contractor_name",
    "client",
]

SAFE_DYNAMIC_FIELDS = {
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
    "difference",
    "ratio",
}


def _build_client():
    api_key = os.getenv("GEMINI_API_KEY", "").strip()

    if not api_key or genai is None:
        return None

    os.environ.setdefault("GEMINI_API_KEY", api_key)

    try:
        return genai.Client()
    except Exception:
        print("⚠️ Failed to initialize genai client.")
        return None


def _extract_text(response):
    text = getattr(response, "text", None)

    if text:
        return text.strip()
    print("⚠️ No text attribute in response, trying candidates...")

    try:
        return response.candidates[0].content.parts[0].text.strip()
    
    except Exception:
        print("⚠️ Failed to extract text from candidates.")
        return ""


def _to_iso_date(value):
    """
    Normalize date-like values before sending them to the model.
    Returns ISO string or None.
    """
    if value is None or value == "":
        return None

    if isinstance(value, datetime):
        return value.date().isoformat()

    if isinstance(value, date):
        return value.isoformat()

    if isinstance(value, str):
        value = value.strip()
        return value or None

    if hasattr(value, "isoformat"):
        try:
            return value.isoformat()
        except Exception:
            return None

    return None


def _recent_date_range(days=30):
    end = datetime.now()
    start = end - timedelta(days=days)

    return (
        start.date().isoformat(),
        end.date().isoformat(),
    )


def _resolve_contractor_id(intent):
    params = intent.get("params", {})

    if params.get("contractor_id"):
        return intent

    contractor_name = (
        params.get("contractor_name") or ""
    ).strip().lower()

    if not contractor_name:
        return intent

    contractors = AIReportModel.get_contractors()

    matched = None

    for contractor in contractors:
        name = (
            contractor.get("name") or ""
        ).lower()

        email = (
            contractor.get("email_id") or ""
        ).lower()

        if (
            contractor_name in name
            or contractor_name in email
        ):
            matched = contractor
            break

    if matched:
        params["contractor_id"] = matched["user_uid"]
        params["contractor_name"] = matched["name"]

    intent["params"] = params

    return intent


def _normalize_requested_fields(fields):
    if not fields:
        return []

    if isinstance(fields, str):
        fields = [fields]

    if not isinstance(fields, list):
        return []

    normalized = []
    seen = set()

    for field in fields:
        if field is None:
            continue

        field_name = str(field).strip()

        if not field_name:
            continue

        if field_name not in SAFE_DYNAMIC_FIELDS:
            continue

        if field_name not in seen:
            seen.add(field_name)
            normalized.append(field_name)

    return normalized


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

        expression = (
            item.get("expression") or ""
            
        ).strip()

        name = (
            item.get("name") or ""
        ).strip()

        if not expression or not name:
            continue

        cleaned.append({
            "name": name,
            "expression": expression,
            "operator": item.get("operator"),
            "left": item.get("left"),
            "right": item.get("right"),
            
        })
        print(f"✅ Added computed field: {name} with expression: {expression}")

    return cleaned


def _apply_sort(rows, sort_by):
    print(f"🔍 _apply_sort called with {len(rows) if rows else 0} rows, sort_by={sort_by}")
    if not rows or not sort_by:
        print("⚠️ No rows or sort_by provided, returning as-is")
        return rows

    if not isinstance(sort_by, str):
        print(f"⚠️ sort_by is not a string: {type(sort_by)}")
        return rows

    parts = sort_by.strip().split()

    if not parts:
        print("⚠️ sort_by split resulted in empty parts")
        return rows

    field = parts[0].strip()
    direction = (
        parts[1].strip().lower()
        if len(parts) > 1
        else "asc"
    )
    print(f"✅ Sorting by field='{field}', direction='{direction}'")

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
        sorted_rows = sorted(
            rows,
            key=sort_key,
            reverse=reverse,
        )
        print(f"✅ Successfully sorted {len(sorted_rows)} rows")
        return sorted_rows
    except Exception as e:
        print(f"❌ Error during sort: {str(e)}")
        return rows


def _infer_columns(rows):
    if not rows:
        return []

    columns = []
    seen = set()

    for row in rows:
        if not isinstance(row, dict):
            continue

        for key in row.keys():
            if key not in seen:
                seen.add(key)
                columns.append(key)

    return columns


def _filter_rows(rows, requested_fields):
    print(f"🔍 _filter_rows called with {len(rows) if rows else 0} rows")
    requested_fields = _normalize_requested_fields(
        requested_fields
    )
    print(f"✅ Normalized requested fields: {requested_fields}")

    if not requested_fields:
        print("⚠️ No requested fields after normalization, returning all rows")
        return rows

    filtered = []

    for row in rows or []:
        if not isinstance(row, dict):
            print(f"⚠️ Skipping non-dict row: {type(row)}")
            continue

        filtered.append({
            field: row.get(field)
            for field in requested_fields
        })

    print(f"✅ Filtered {len(filtered)} rows with selected fields")
    return filtered


def _add_computed_fields(rows, computed_fields):
    """
    Generic runtime computed-field engine.

    Examples:
    - difference = price_rm - service_rate
    - ratio = open_workorders / total_workorders
    """
    print(f"🔍 _add_computed_fields called with {len(rows) if rows else 0} rows")

    computed_fields = _normalize_computed_fields(
        computed_fields
    )
    print(f"✅ Normalized computed fields: {computed_fields}")

    if not computed_fields:
        print("⚠️ No computed fields to add, returning rows as-is")
        return rows

    processed_rows = []

    for idx, row in enumerate(rows):
        updated_row = dict(row)

        for item in computed_fields:
            name = item.get("name")
            operator = item.get("operator")
            left = item.get("left")
            right = item.get("right")

            left_value = updated_row.get(left)
            right_value = updated_row.get(right)

            print(f"  Computing {name}: {left}({left_value}) {operator} {right}({right_value})")

            try:
                left_num = float(left_value or 0)
            except Exception as e:
                print(f"  ⚠️ Failed to convert left value to float: {e}")
                left_num = 0

            try:
                right_num = float(right_value or 0)
            except Exception as e:
                print(f"  ⚠️ Failed to convert right value to float: {e}")
                right_num = 0

            result = None

            try:
                if operator == "-":
                    result = left_num - right_num

                elif operator == "+":
                    result = left_num + right_num

                elif operator == "*":
                    result = left_num * right_num

                elif operator == "/":
                    result = (
                        left_num / right_num
                        if right_num != 0
                        else None
                    )
                print(f"  ✅ {name} = {result}")

            except Exception as e:
                print(f"  ❌ Error computing {name}: {str(e)}")
                result = None

            updated_row[name] = result

        processed_rows.append(updated_row)
        
    print(f"✅ Added computed fields to {len(processed_rows)} rows")
    return processed_rows


def _fallback_summary(report_type, rows):
    print(f"📋 _fallback_summary called for {report_type} with {len(rows) if rows else 0} rows")
    if not rows:
        msg = (
            "No records found for the "
            "given prompt and filters."
        )
        print(f"⚠️ {msg}")
        return msg

    if report_type == "top_contractors":
        top = rows[0]
        msg = (
            f"Top contractor is "
            f"{top.get('contractor_name')} "
            f"with "
            f"{top.get('total_workorders')} "
            f"workorders."
        )
        print(f"✅ {msg}")
        return msg

    if report_type == "top_clients":
        top = rows[0]
        msg = (
            f"Top client is "
            f"{top.get('client')} "
            f"with "
            f"{top.get('total_workorders')} "
            f"workorders."
        )
        print(f"✅ {msg}")
        return msg

    if report_type == "overdue_workorders":
        msg = (
            f"Found {len(rows)} overdue "
            f"workorders in the "
            f"selected period."
        )
        print(f"✅ Fallback summary for {report_type}: {msg}")
        return msg

    if report_type == "recent_completed_workorders":
        msg = (
            f"Found {len(rows)} recently "
            f"completed workorders."
        )
        print(f"✅ Fallback summary for {report_type}: {msg}")
        return msg

    if report_type in {"rate_comparison_report", "comparison_report"}:
        diffs = []
        for row in rows:
            if "difference_rate" in row:
                try:
                    diffs.append(float(row.get("difference_rate") or 0))
                except Exception:
                    pass
            elif "difference" in row:
                try:
                    diffs.append(float(row.get("difference") or 0))
                except Exception:
                    pass

        if diffs:
            msg = (
                f"Generated {len(rows)} comparison records. "
                f"Difference range: {min(diffs)} to {max(diffs)}."
            )
            print(f"✅ Fallback summary for {report_type}: {msg}")
            return msg

    msg = (
        f"Generated {len(rows)} "
        f"records for {report_type}."
    )
    print(f"⚠️ Fallback summary for {report_type}: {msg}")
    return msg


def _generate_ai_summary(
    prompt,
    intent,
    rows,
):
    print(f"🔍 _generate_ai_summary called with {len(rows) if rows else 0} rows")
    print(f"   Prompt: {prompt[:80]}..." if len(prompt) > 80 else f"   Prompt: {prompt}")
    
    client = _build_client()
    print(f"📊 AI Client initialized: {client is not None}")

    if client is None:
        print("⚠️ AI client is None, using fallback summary")
        return _fallback_summary(
            intent.get("report_type"),
            rows,
        )

    model = os.getenv(
        "GEMINI_MODEL",
        "gemini-2.5-flash",
    ).strip()
    print(f"📍 Using model: {model}")

    compact_rows = rows[:20]
    print(f"🔄 Compacting {len(rows)} rows to {len(compact_rows)} for AI processing")

    system_msg = """
You are a business analyst for workorder analytics.

Summarize the report result in clear,
short business language.

Mention:
- trends
- outliers
- anomalies
- comparisons
- counts
- operational insights

Do not invent data.
Keep it concise and useful for management.
""".strip()

    payload = {
        "prompt": prompt,
        "intent": intent,
        "sample_rows": compact_rows,
        "total_rows": len(rows),
    }

    try:
        print("📤 Sending request to Gemini API...")
        response = client.models.generate_content(
            model=model,
            contents=json.dumps(
                payload,
                default=str,
            ),
            config=types.GenerateContentConfig(
                system_instruction=system_msg,
                temperature=0.2,
            ),
        )
        print("✅ Response received from Gemini API")

        summary = _extract_text(response)
        print(f"📝 Extracted summary: {summary[:100]}..." if len(summary) > 100 else f"📝 Extracted summary: {summary}")

        if summary:
            return summary
        else:
            print("⚠️ Empty summary from model, using fallback")
            return _fallback_summary(
                intent.get("report_type"),
                rows,
            )

    except Exception as e:
        print(f"❌ Exception during AI summary generation: {str(e)}")
        print("⚠️ Using fallback summary due to exception")
        return _fallback_summary(
            intent.get("report_type"),
            rows,
        )


def _execute_standard_report(
    report_type,
    params,
):
    """
    Existing fixed reports.
    """
    print(f"🔍 _execute_standard_report called with report_type='{report_type}'")
    print(f"   params keys: {list(params.keys())}")

    if report_type == "contractor_report":
        print(f"✅ Executing contractor_report")
        result = AIReportModel.get_contractor_report(
            params.get("start_date"),
            params.get("end_date"),
            params.get("contractor_id"),
            select_fields=params.get("select_fields"),
            sort_by=params.get("sort_by"),
        )
        print(f"✅ contractor_report returned {len(result) if result else 0} rows")
        return result

    if report_type == "summary_report":
        print(f"✅ Executing summary_report")
        result = AIReportModel.get_summary_report(
            category=params.get("category"),
            year=params.get("year"),
            month=params.get("month"),
            select_fields=params.get("select_fields"),
            sort_by=params.get("sort_by"),
        )
        print(f"✅ summary_report returned {len(result) if result else 0} rows")
        return result

    if report_type in {
        "rate_comparison_report",
        "comparison_report",
    }:
        print(f"✅ Executing rate_comparison_report")
        result = AIReportModel.get_rate_comparison_report(
            params.get("start_date"),
            params.get("end_date"),
            select_fields=params.get("select_fields"),
            sort_by=params.get("sort_by"),
        )
        print(f"✅ rate_comparison_report returned {len(result) if result else 0} rows")
        return result

    if report_type == "top_contractors":
        print(f"✅ Executing top_contractors")
        result = AIReportModel.get_top_contractors(
            params.get("start_date"),
            params.get("end_date"),
            params.get("limit", 5),
            select_fields=params.get("select_fields"),
            sort_by=params.get("sort_by"),
        )
        print(f"✅ top_contractors returned {len(result) if result else 0} rows")
        return result

    if report_type == "top_clients":
        print(f"✅ Executing top_clients")
        result = AIReportModel.get_top_clients(
            params.get("start_date"),
            params.get("end_date"),
            params.get("limit", 5),
            select_fields=params.get("select_fields"),
            sort_by=params.get("sort_by"),
        )
        print(f"✅ top_clients returned {len(result) if result else 0} rows")
        return result

    if report_type == "overdue_workorders":
        print(f"✅ Executing overdue_workorders")
        result = AIReportModel.get_overdue_workorders(
            params.get("start_date"),
            params.get("end_date"),
            params.get("limit", 100),
            select_fields=params.get("select_fields"),
            sort_by=params.get("sort_by"),
        )
        print(f"✅ overdue_workorders returned {len(result) if result else 0} rows")
        return result

    if report_type == "recent_completed_workorders":
        print(f"✅ Executing recent_completed_workorders")
        result = AIReportModel.get_recent_completed_workorders(
            params.get("limit", 5),
            select_fields=params.get("select_fields"),
            sort_by=params.get("sort_by"),
        )
        print(f"✅ recent_completed_workorders returned {len(result) if result else 0} rows")
        return result

    print(f"✅ Executing default get_workorder_report")
    result = AIReportModel.get_workorder_report(
        params.get("start_date"),
        params.get("end_date"),
        limit=params.get("limit"),
        select_fields=params.get("select_fields"),
        sort_by=params.get("sort_by"),
    )
    print(f"✅ get_workorder_report returned {len(result) if result else 0} rows")
    return result


def _execute_dynamic_report(
    params,
):
    """
    Future-ready dynamic reporting path.
    """
    print(f"🔍 _execute_dynamic_report called")

    select_fields = (
        _normalize_requested_fields(
            params.get("select_fields")
        )
        or DEFAULT_DYNAMIC_FIELDS
    )
    print(f"✅ select_fields: {select_fields}")

    computed_fields = (
        _normalize_computed_fields(
            params.get("computed_fields")
        )
    )
    print(f"✅ computed_fields: {computed_fields}")

    group_by = params.get("group_by") or []
    sort_by = params.get("sort_by")
    limit = params.get("limit", 50)
    print(f"✅ group_by: {group_by}, sort_by: {sort_by}, limit: {limit}")

    print(f"🔍 Calling get_dynamic_report...")
    data = AIReportModel.get_dynamic_report(
        {
            "start_date": params.get("start_date"),
            "end_date": params.get("end_date"),
            "select_fields": select_fields,
            "group_by": group_by,
            "sort_by": sort_by,
            "limit": limit,
            "computed_fields": computed_fields,
        }
    )
    print(f"✅ get_dynamic_report returned {len(data) if data else 0} rows")

    if computed_fields:
        print(f"🔍 Adding computed fields to {len(data)} rows...")
        data = _add_computed_fields(
            data,
            computed_fields,
        )

    return data


def generate_ai_report(
    prompt,
    payload=None,
):
    print(f"\n\n🚀 ========== generate_ai_report STARTED ==========")
    print(f"📝 Prompt: {prompt}")
    print(f"📦 Payload: {payload}")
    
    payload = payload or {}
    
    try:
        prompt = validate_prompt(prompt)
    except ValueError as e:
        return {
            "success": False,
            "error": str(e),
        }

    print(f"🔍 Parsing prompt to intent...")
    intent = parse_prompt_to_intent(
        prompt
    )
    print(f"✅ Initial intent: {intent}")

    print(f"🔍 Resolving contractor ID...")
    intent = _resolve_contractor_id(
        intent
    )
    print(f"✅ Intent after contractor resolution: {intent}")

    report_type = intent.get(
        "report_type"
    )
    print(f"📊 Report type: {report_type}")

    query_mode = intent.get(
        "query_mode",
        "standard",
    )
    print(f"🔄 Query mode: {query_mode}")

    params = intent.get(
        "params",
        {},
    )
    print(f"⚙️ Initial params: {params}")

    # Normalize all incoming dates before model usage.
    print(f"🔍 Normalizing dates...")
    params["start_date"] = _to_iso_date(
        params.get("start_date")
    )
    params["end_date"] = _to_iso_date(
        params.get("end_date")
    )
    print(f"✅ After normalization - start_date: {params.get('start_date')}, end_date: {params.get('end_date')}")

    if payload.get("start_date") and not params.get("start_date"):
        params["start_date"] = _to_iso_date(payload.get("start_date"))
        print(f"✅ Using payload start_date: {params.get('start_date')}")

    if payload.get("end_date") and not params.get("end_date"):
        params["end_date"] = _to_iso_date(payload.get("end_date"))
        print(f"✅ Using payload end_date: {params.get('end_date')}")

    if not params.get("start_date") or not params.get("end_date"):
        print(f"⚠️ Missing dates, using default 30-day range")
        start_date, end_date = _recent_date_range(30)

        params["start_date"] = params.get("start_date") or start_date
        params["end_date"] = params.get("end_date") or end_date
        print(f"✅ Default dates set - start_date: {params.get('start_date')}, end_date: {params.get('end_date')}")

    if (
        report_type == "contractor_report"
        and not params.get("contractor_id")
    ):
        print(f"❌ Contractor report requested but no contractor_id found")
        return {
            "success": False,
            "error": (
                "Contractor not found. "
                "Please provide a valid "
                "contractor name or ID."
            ),
            "intent": intent,
        }

    if query_mode == "dynamic":
        print(f"🔍 Executing DYNAMIC report...")
        full_data = _execute_dynamic_report(
            params
        )
    else:
        print(f"🔍 Executing STANDARD report...")
        full_data = _execute_standard_report(
            report_type,
            params,
        )
    print(f"✅ Report execution returned {len(full_data) if full_data else 0} rows")

    computed_fields = (
        params.get("computed_fields")
        or []
    )
    print(f"🔍 Processing computed fields...")

    if computed_fields:
        print(f"✅ Adding {len(computed_fields)} computed fields...")
        full_data = _add_computed_fields(
            full_data,
            computed_fields,
        )
    else:
        print(f"⚠️ No computed fields to add")

    sort_by = params.get("sort_by")
    print(f"🔍 Processing sort...")

    if sort_by:
        print(f"✅ Sorting by: {sort_by}")
        full_data = _apply_sort(
            full_data,
            sort_by,
        )
    else:
        print(f"⚠️ No sort specified")

    requested_fields = (
        _normalize_requested_fields(
            params.get("select_fields")
        )
    )
    print(f"🔍 Processing field filtering...")

    if requested_fields:
        print(f"✅ Filtering to requested fields: {requested_fields}")
        response_data = _filter_rows(
            full_data,
            requested_fields,
        )
    else:
        print(f"⚠️ No field filtering, using all data")
        response_data = full_data

    columns = (
        requested_fields
        if requested_fields
        else _infer_columns(
            response_data
        )
    )
    print(f"✅ Final columns: {columns}")

    print(f"🔍 Generating AI summary...")
    summary = _generate_ai_summary(
        prompt,
        intent,
        response_data,
    )
    print(f"✅ Summary generated: {summary[:100]}..." if len(summary) > 100 else f"✅ Summary generated: {summary}")

    result = {
        "success": True,
        "report_type": report_type,
        "query_mode": query_mode,
        "intent": intent,
        "count": len(response_data),
        "columns": columns,
        "summary": summary,
        "data": response_data,
    }
    print(f"\n✅ ========== generate_ai_report COMPLETED ==========")
    print(f"📊 Final result: {len(response_data)} rows, {len(columns)} columns")
    print(f"=========================================\n")
    return result