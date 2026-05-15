from app.utils.workorder_certificate import generate_workorder_completion_certificate

# ✅ Hardcoded sample workorder number
workorder_no = "03022026W000001"

# ✅ Hardcoded details (example data)
details = {
    "Contractor Name": "ABC Constructions Pvt Ltd",
    "Work Location": "Chennai, Tamil Nadu",
    "Total Amount": "RM 25,000",
    "Admin Remarks": "Work completed successfully with good quality.",
    "Status": "Closed Successfully"
}

# ✅ Generate PDF
pdf_path = generate_workorder_completion_certificate(details, workorder_no)

print("✅ Certificate Generated Successfully!")
print("📄 PDF Location:", pdf_path)
