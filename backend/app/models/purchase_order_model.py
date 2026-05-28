from app.models.database import db
from datetime import datetime


class PurchaseOrder(db.Model):

    __tablename__ = "purchase_order_t"

    id = db.Column(db.Integer, primary_key=True)

    po_number = db.Column(db.String(100), unique=True)

    workorder_id = db.Column(db.String(100))

    contractor_id = db.Column(db.String(100))

    contractor_name = db.Column(db.String(255))

    contractor_email = db.Column(db.String(255))

    status = db.Column(db.String(50), default="GENERATED")

    created_at = db.Column(db.DateTime, default=datetime.utcnow)