"""
Automation Controller - Handles automation business logic
File: app/controllers/workorder_automation_controller.py
"""

import traceback
from app.models.workorder_automation_model import (
    get_assignment_attempts_from_db,
    trigger_automation_background,
    mark_automation_stopped
)


# ----------------------------------------------------------------------
# CONTROLLER 1: GET ASSIGNMENT ATTEMPTS
# ----------------------------------------------------------------------
def handle_get_assignment_attempts(workorder_id):
    """
    Get all assignment attempts for a workorder.
    Returns: (response_dict, status_code)
    """
    try:
        attempts = get_assignment_attempts_from_db(workorder_id)
        
        # Format response
        formatted_attempts = []
        for attempt in attempts:
            formatted_attempts.append({
                "id": attempt.id,
                "workorder_id": attempt.workorder_id,
                "contractor_id": attempt.contractor_id,
                "contractor_name": attempt.contractor_name,
                "attempt_number": attempt.attempt_number,
                "status": attempt.status,
                "remark": attempt.remark,
                "created_at": attempt.created_at.isoformat() if attempt.created_at else None,
                "updated_at": attempt.updated_at.isoformat() if attempt.updated_at else None
            })
        
        return formatted_attempts, 200
        
    except Exception as e:
        print(f"[ERROR] handle_get_assignment_attempts: {e}")
        traceback.print_exc()
        return {"error": str(e)}, 500


# ----------------------------------------------------------------------
# CONTROLLER 2: MANUALLY TRIGGER RETRY
# ----------------------------------------------------------------------
def handle_trigger_manual_retry(workorder_id, base_url):
    """
    Manually trigger automation for a workorder.
    Used when automation stopped or failed.
    Returns: (response_dict, status_code)
    """
    try:
        from app.models.workorder import WorkOrder
        
        workorder = WorkOrder.query.get(workorder_id)
        if not workorder:
            return {"error": "Workorder not found"}, 404
        
        if workorder.STATUS == "Accepted":
            return {"error": "Workorder already accepted"}, 400
        
        # Trigger automation
        success = trigger_automation_background(workorder_id, base_url)
        
        if success:
            return {
                "message": "Automation retry triggered successfully",
                "workorder_id": workorder_id
            }, 200
        else:
            return {"error": "Failed to trigger automation"}, 500
            
    except Exception as e:
        print(f"[ERROR] handle_trigger_manual_retry: {e}")
        traceback.print_exc()
        return {"error": str(e)}, 500


# ----------------------------------------------------------------------
# CONTROLLER 3: STOP AUTOMATION
# ----------------------------------------------------------------------
def handle_stop_automation(workorder_id):
    """
    Stop ongoing automation for a workorder.
    Returns: (response_dict, status_code)
    """
    try:
        success = mark_automation_stopped(workorder_id)
        
        if success:
            return {
                "message": "Automation stopped successfully",
                "workorder_id": workorder_id
            }, 200
        else:
            return {"error": "Failed to stop automation"}, 500
            
    except Exception as e:
        print(f"[ERROR] handle_stop_automation: {e}")
        traceback.print_exc()
        return {"error": str(e)}, 500