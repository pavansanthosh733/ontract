import os
import random
from datetime import datetime
from fpdf import FPDF

def generate_certificate_pdf(details, email, upload_folder="uploads"):
    """
    Generates a professional provider/company certificate PDF.
    Accepts a details dict and saves it under uploads/<email>_certificate.pdf
    Returns the full PDF file path.
    """

    pdf = FPDF(orientation='L', unit='mm', format='A4')
    pdf.set_auto_page_break(auto=False, margin=15)
    pdf.add_page()

    # ---------- Inner template drawer ----------
    def draw_template():
        pdf.set_line_width(1)
        pdf.set_draw_color(41, 128, 185)
        pdf.rect(10, 10, 277, 190)
        pdf.set_draw_color(52, 152, 219)
        pdf.rect(15, 15, 267, 180)
        pdf.set_fill_color(41, 128, 185)
        pdf.rect(15, 15, 267, 35, 'F')

        pdf.set_font("Arial", 'B', 28)
        pdf.set_text_color(255, 255, 255)
        pdf.set_xy(15, 25)
        pdf.cell(267, 15, "Ontract Registration Certificate", 0, 1, 'C')

        cert_id = f"ONC{random.randint(1000, 9999)}"
        pdf.set_font("Arial", 'I', 12)
        pdf.set_xy(15, 42)
        pdf.cell(267, 6, f"Certificate ID: {cert_id}", 0, 1, 'C')

        pdf.set_text_color(0, 0, 0)
        pdf.set_font("Arial", 'I', 14)
        pdf.set_xy(15, 60)
        pdf.cell(267, 8, "This certifies that the following entity has been registered under Ontract", 0, 1, 'C')

    # Draw header once
    draw_template()

    pdf.set_font("Arial", '', 12)
    y_position = 78
    left_margin = 50

    # ---------- Loop over certificate details ----------
    for key, value in details.items():
        # Skip hidden/internal keys
        if key.lower() in ["provider id", "company id"]:
            continue

        # Page overflow handling
        if y_position > 175:
            pdf.add_page()
            draw_template()
            y_position = 78

        pdf.set_xy(left_margin, y_position)
        pdf.set_font("Arial", 'B', 12)
        pdf.set_text_color(41, 128, 185)
        pdf.cell(60, 8, f"{key}:", 0, 0, 'L')

        pdf.set_font("Arial", '', 12)
        pdf.set_text_color(0, 0, 0)

        # --- Handle services list ---
        if key.lower() == "services" and isinstance(value, list):
            for svc in value:
                if y_position > 175:
                    pdf.add_page()
                    draw_template()
                    y_position = 78

                location = svc.get('Service Location') or f"{svc.get('city','')}, {svc.get('state','')}".strip(", ")
                svc_text = f"- {svc.get('Service Name')} | RM {svc.get('Service Rate')} | {location}"

                pdf.set_xy(left_margin + 60, y_position)
                pdf.cell(0, 8, svc_text.encode('latin-1', 'replace').decode('latin-1'), 0, 1, 'L')
                y_position += 8
        else:
            # Handle normal key-value pairs
            pdf.cell(0, 8, str(value)[:100], 0, 1, 'L')
            y_position += 12

    # ---------- Footer ----------
    pdf.set_font("Arial", 'I', 10)
    pdf.set_text_color(100, 100, 100)
    pdf.set_xy(15, 170)
    issue_date = datetime.now().strftime("%B %d, %Y")
    pdf.cell(133, 6, f"Issued on: {issue_date}", 0, 0, 'L')

    pdf.set_xy(180, 165)
    pdf.line(180, 170, 250, 170)
    pdf.set_xy(180, 171)
    pdf.cell(70, 6, "Authorized Signature", 0, 1, 'C')

    # ---------- Save File ----------
    os.makedirs(upload_folder, exist_ok=True)
    safe_email = email.replace('@', '_').replace('.', '_')
    pdf_path = os.path.join(upload_folder, f"{safe_email}_certificate.pdf")
    pdf.output(pdf_path)

    return pdf_path
