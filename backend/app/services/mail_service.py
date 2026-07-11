import logging
import os

from email.mime.application import MIMEApplication
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

from app.config import Config
from app.utils.smtp_utils import get_smtp_server


EMAIL = Config.EMAIL_CONFIG


class MailService:
    """
    Centralized application mail service.

    Responsible for:
    - Building MIME messages
    - Plain text and HTML emails
    - File attachments
    - Sending messages through common SMTP utility
    """

    @staticmethod
    def send_email(
        to_email,
        subject,
        body,
        body_type="plain",
        attachments=None,
    ):
        if not to_email:
            raise ValueError("Recipient email is required")

        if not subject:
            raise ValueError("Email subject is required")

        if body_type not in ("plain", "html"):
            raise ValueError(
                "body_type must be either 'plain' or 'html'"
            )

        msg = MIMEMultipart("mixed")

        msg["Subject"] = subject
        msg["From"] = (
            f"Ontract <{EMAIL['sender_email']}>"
        )
        msg["To"] = to_email

        body_container = MIMEMultipart("alternative")

        body_container.attach(
            MIMEText(
                body,
                body_type,
                "utf-8"
            )
        )

        msg.attach(body_container)

        for attachment in attachments or []:
            MailService._attach_file(
                msg,
                attachment
            )

        try:
            with get_smtp_server() as server:
                server.send_message(msg)

            logging.info(
                "Email sent successfully to %s "
                "with subject '%s'",
                to_email,
                subject,
            )

            return True

        except Exception:
            logging.exception(
                "Failed to send email to %s "
                "with subject '%s'",
                to_email,
                subject,
            )

            raise

    @staticmethod
    def _attach_file(msg, file_path):
        if not os.path.isfile(file_path):
            raise FileNotFoundError(
                f"Email attachment not found: {file_path}"
            )

        with open(file_path, "rb") as file:
            attachment = MIMEApplication(
                file.read(),
                Name=os.path.basename(file_path),
            )

        attachment["Content-Disposition"] = (
            f'attachment; '
            f'filename="{os.path.basename(file_path)}"'
        )

        msg.attach(attachment)