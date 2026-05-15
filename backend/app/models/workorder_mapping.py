from app.models.database import db
from datetime import datetime

class WorkOrderMapping(db.Model):
    """
    Model for storing parent-child workorder mapping relationships.
    """
    __tablename__ = "workorder_mapping_t"

    id = db.Column(db.Integer, primary_key=True)
    parent_workorder = db.Column(db.String(255), nullable=False)
    child_workorder = db.Column(db.String(255), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    # ---------- BASIC HELPERS ----------
    def to_dict(self):
        return {
            "id": self.id,
            "parent_workorder": self.parent_workorder,
            "child_workorder": self.child_workorder,
            "created_at": self.created_at
        }

    # ---------- DB LOGIC ----------
    @staticmethod
    def get_all_mappings():
        """Return all mappings."""
        return WorkOrderMapping.query.all()

    @staticmethod
    def get_mappings_by_parent(parent_workorder):
        """Return all mappings for a specific parent."""
        return WorkOrderMapping.query.filter_by(parent_workorder=parent_workorder).all()

    @staticmethod
    def get_existing_children(child_workorders):
        """Return list of already mapped child workorders."""
        records = WorkOrderMapping.query.filter(
            WorkOrderMapping.child_workorder.in_(child_workorders)
        ).all()
        return [r.child_workorder for r in records]

    @staticmethod
    def create_mapping(parent_workorder, child_workorder):
        """Create a new parent-child mapping."""
        mapping = WorkOrderMapping(
            parent_workorder=parent_workorder,
            child_workorder=child_workorder
        )
        db.session.add(mapping)
        return mapping

    @staticmethod
    def commit_changes():
        """Commit DB changes."""
        db.session.commit()

    @staticmethod
    def rollback_changes():
        """Rollback any pending transactions."""
        db.session.rollback()
