import os
import random
from datetime import datetime
from fpdf import FPDF


def generate_workorder_completion_certificate(details, workorder_no):
    """
    Single-page professional Workorder Completion Certificate.
    Footer always comes last.
    No extra pages.
    Compact, dynamic layout.
    """

    # ---------------------------------------------------
    # Paths
    # ---------------------------------------------------
    base_folder = "uploads"
    cert_folder = os.path.join(base_folder, "closing_certificates")
    os.makedirs(cert_folder, exist_ok=True)

    file_path = os.path.join(
        cert_folder,
        f"workorder_{workorder_no}_certificate.pdf"
    )

    # ---------------------------------------------------
    # PDF Setup (ONE PAGE ONLY)
    # ---------------------------------------------------
    pdf = FPDF(orientation="L", unit="mm", format="A4")
    pdf.set_auto_page_break(auto=False)
    pdf.add_page()

    # ---------------------------------------------------
    # TEMPLATE
    # ---------------------------------------------------
    def draw_template():
        pdf.set_line_width(1)
        pdf.set_draw_color(39, 174, 96)
        pdf.rect(10, 10, 277, 190)

        pdf.set_draw_color(46, 204, 113)
        pdf.rect(15, 15, 267, 180)

        pdf.set_fill_color(39, 174, 96)
        pdf.rect(15, 15, 267, 35, "F")

        pdf.set_font("Arial", "B", 26)
        pdf.set_text_color(255, 255, 255)
        pdf.set_xy(15, 25)
        pdf.cell(267, 15, "Workorder Completion Certificate", 0, 1, "C")

        cert_id = f"WOC{random.randint(1000, 9999)}"
        pdf.set_font("Arial", "I", 12)
        pdf.set_xy(15, 42)
        pdf.cell(267, 6, f"Certificate ID: {cert_id}", 0, 1, "C")

        pdf.set_text_color(0, 0, 0)
        pdf.set_font("Arial", "I", 14)
        pdf.set_xy(15, 60)
        pdf.cell(
            267,
            8,
            "This certifies that the following workorder has been successfully completed.",
            0,
            1,
            "C"
        )

    draw_template()

    # ---------------------------------------------------
    # CONTENT
    # ---------------------------------------------------
    left_margin = 45
    y_position = 78  # compact start

    # ---------------------------------------------------
    # SECTION TITLE
    # ---------------------------------------------------
    pdf.set_xy(left_margin, y_position)
    pdf.set_font("Arial", "B", 15)
    pdf.set_text_color(0, 0, 0)
    pdf.cell(0, 10, "Workorder Details", 0, 1)

    y_position = pdf.get_y() + 4

    # ---------------------------------------------------
    # DETAILS (INCLUDES WORKORDER NO & DATE)
    # ---------------------------------------------------
    full_details = {
        "Workorder Number": workorder_no,
        "Completion Date": datetime.now().strftime("%d-%m-%Y"),
        **details
    }

    for key, value in full_details.items():
        pdf.set_xy(left_margin, y_position)

        # Key
        pdf.set_font("Arial", "B", 12)
        pdf.set_text_color(39, 174, 96)
        pdf.cell(65, 7, f"{key}:", 0, 0)

        # Value
        pdf.set_font("Arial", "", 12)
        pdf.set_text_color(0, 0, 0)
        pdf.multi_cell(0, 7, str(value))

        y_position = pdf.get_y() + 2

    # ---------------------------------------------------
    # FOOTER (ALWAYS LAST)
    # ---------------------------------------------------
    y_position += 6

    pdf.set_font("Arial", "I", 10)
    pdf.set_text_color(120, 120, 120)

    issue_date = datetime.now().strftime("%B %d, %Y")
    pdf.set_xy(20, y_position)
    pdf.cell(120, 6, f"Issued on: {issue_date}", 0, 0, "L")

    # Signature
    pdf.set_xy(180, y_position)
    pdf.line(180, y_position + 5, 250, y_position + 5)

    pdf.set_xy(180, y_position + 7)
    pdf.cell(70, 6, "Authorized Signature", 0, 1, "C")

    # ---------------------------------------------------
    # SAVE
    # ---------------------------------------------------
    pdf.output(file_path)
    return file_path
