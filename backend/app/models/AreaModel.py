from app.core.database import db
from sqlalchemy import Column, Integer, String, Sequence

class WorkOrderType(db.Model):
    __tablename__ = "workorder_type_t"

    id = Column(Integer, primary_key=True, autoincrement=True)
    workordertype_id = Column(Integer, nullable=True)  # can auto-generate if needed
    workorder_type = Column(String, nullable=False)
    status = Column(String, default="Active")

    def as_dict(self):
        return {
            "id": self.id,
            "workordertype_id": self.workordertype_id,
            "workorder_type": self.workorder_type,
            "status": self.status,
        }
