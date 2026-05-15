import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import os

def send_acceptance_email(to_email, workorder_id):
    sender_email = os.getenv("EMAIL_USER")
    sender_pass = os.getenv("EMAIL_PASS")

    accept_link = f"http://localhost:3000/workorder/{workorder_id}/accept"
    reject_link = f"http://localhost:3000/workorder/{workorder_id}/reject"

    subject = f"Please confirm Work Order #{workorder_id}"
    html = f"""
    <html>
      <body>
        <p>Hello Contractor,</p>
        <p>The work order <b>{workorder_id}</b> has been updated. Please review below:</p>
        <a href="{accept_link}" style="background:#28a745;color:white;padding:10px 20px;text-decoration:none;border-radius:5px;">Accept</a>
        &nbsp;&nbsp;
        <a href="{reject_link}" style="background:#dc3545;color:white;padding:10px 20px;text-decoration:none;border-radius:5px;">Reject</a>
      </body>
    </html>
    """

    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = sender_email
    msg["To"] = to_email
    msg.attach(MIMEText(html, "html"))

    with smtplib.SMTP("smtp.gmail.com", 587) as server:
        server.starttls()
        server.login(sender_email, sender_pass)
        server.sendmail(sender_email, to_email, msg.as_string())
