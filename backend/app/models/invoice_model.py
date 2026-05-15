from sqlalchemy import text
from app import db
import os
from datetime import datetime
from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas


class InvoiceModel:

    @staticmethod
    def create_invoice(data):
        header = data["header"]
        rows = data["rows"]
        subtotal = data["subtotal"]
        sst = data["sst"]
        total = data["total"]

        # 🔹 Get last invoice number
        last = db.session.execute(
            text("SELECT invoice_number FROM invoices_t ORDER BY id DESC LIMIT 1")
        ).scalar()

        if last:
            last_no = int(last.split("_")[-1])
            next_no = last_no + 1
        else:
            next_no = 1

        year = datetime.now().year
        invoice_number = f"INV_{year}-{year+1}_{str(next_no).zfill(6)}"

        # 🔹 Create PDF
        base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
        pdf_dir = os.path.join(base_dir, "static", "invoices")
        os.makedirs(pdf_dir, exist_ok=True)

        pdf_filename = f"{invoice_number}.pdf"
        pdf_path = os.path.join(pdf_dir, pdf_filename)

        c = canvas.Canvas(pdf_path, pagesize=A4)
        y = 800

        c.setFont("Helvetica-Bold", 14)
        c.drawString(200, y, "INVOICE")
        y -= 30

        c.setFont("Helvetica", 10)
        c.drawString(50, y, f"Invoice No: {invoice_number}")
        y -= 20
        c.drawString(50, y, f"Date: {datetime.now().strftime('%d-%m-%Y')}")
        y -= 30

        for r in rows:
            c.drawString(50, y, f"{r['workorder']}  {r['desc']}  RM {r['qty'] * r['unit']}")
            y -= 20

        y -= 20
        c.drawString(50, y, f"Subtotal: RM {subtotal}")
        y -= 20
        c.drawString(50, y, f"SST (8%): RM {sst}")
        y -= 20
        c.drawString(50, y, f"TOTAL: RM {total}")

        c.save()

        # 🔹 Save DB record
        db.session.execute(
            text("""
                INSERT INTO invoices_t
                (invoice_number, subtotal, sst, total, pdf_path)
                VALUES (:inv, :sub, :sst, :tot, :pdf)
            """),
            {
                "inv": invoice_number,
                "sub": subtotal,
                "sst": sst,
                "tot": total,
                "pdf": pdf_path
            }
        )
        db.session.commit()

        pdf_url = f"http://localhost:5000/api/admin/invoice/download/{pdf_filename}"

        return invoice_number, pdf_url