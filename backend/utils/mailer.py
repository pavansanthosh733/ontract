import smtplib

from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

from app.config import Config


EMAIL = Config.EMAIL_CONFIG


def send_acceptance_email(to_email, workorder_id):

    sender_email = EMAIL["sender_email"]
    sender_password = EMAIL["sender_password"]

    accept_link = (
        f"{Config.FRONTEND_URL}/workorder/{workorder_id}/accept"
    )

    reject_link = (
        f"{Config.FRONTEND_URL}/workorder/{workorder_id}/reject"
    )

    subject = f"Please confirm Work Order #{workorder_id}"

    html = f"""
    <html>
      <body>
        <p>Hello Contractor,</p>

        <p>
          The work order <b>{workorder_id}</b> has been updated.
          Please review below:
        </p>

        <a
          href="{accept_link}"
          style="
            background:#28a745;
            color:white;
            padding:10px 20px;
            text-decoration:none;
            border-radius:5px;
          "
        >
          Accept
        </a>

        &nbsp;&nbsp;

        <a
          href="{reject_link}"
          style="
            background:#dc3545;
            color:white;
            padding:10px 20px;
            text-decoration:none;
            border-radius:5px;
          "
        >
          Reject
        </a>

      </body>
    </html>
    """

    msg = MIMEMultipart("alternative")

    msg["Subject"] = subject
    msg["From"] = f"Ontract <{sender_email}>"
    msg["To"] = to_email

    msg.attach(MIMEText(html, "html", "utf-8"))

    with smtplib.SMTP_SSL(
        EMAIL["smtp_server"],
        EMAIL["smtp_port"]
    ) as server:

        server.login(
            sender_email,
            sender_password
        )

        server.send_message(msg)