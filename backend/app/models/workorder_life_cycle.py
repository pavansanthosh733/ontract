from app.models.database import db
from datetime import datetime

class WorkOrderLifeCycle(db.Model):
    __tablename__ = "workorder_life_cycle_t"
    __table_args__ = {'extend_existing': True}

    id = db.Column(db.Integer, primary_key=True)
    workorder = db.Column(db.String(255))
    workorder_type = db.Column(db.String(255))
    workorder_area = db.Column(db.String(255))
    created_t = db.Column(db.DateTime, default=datetime.utcnow)
    requested_time_closing = db.Column(db.DateTime)
    remarks = db.Column(db.String(255))
    status = db.Column(db.String(255))
    contractor_name = db.Column(db.String(255))
    contractor_id = db.Column(db.String(255))
    contractor_remarks = db.Column(db.String(255))

    def to_dict(self):
        return {
            "id": self.id,
            "workorder": self.workorder,
            "workorder_type": self.workorder_type,
            "workorder_area": self.workorder_area,
            "created_t": self.created_t.isoformat() if self.created_t else None,
            "requested_time_closing": self.requested_time_closing.isoformat() if self.requested_time_closing else None,
            "remarks": self.remarks,
            "status": self.status,
            "contractor_name": self.contractor_name,
            "contractor_id": self.contractor_id,
            "contractor_remarks": self.contractor_remarks,
        }
