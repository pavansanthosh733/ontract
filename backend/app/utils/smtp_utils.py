import smtplib
import logging

from app.config import Config


EMAIL = Config.EMAIL_CONFIG


def get_smtp_server():
    """
    Create and return an authenticated SMTP connection.

    SMTP_USE_SSL=true
        -> SMTP_SSL
        -> Used for port 465

    SMTP_USE_SSL=false
        -> SMTP + STARTTLS
        -> Used for port 587
    """

    smtp_host = EMAIL["smtp_server"]
    smtp_port = EMAIL["smtp_port"]
    sender_email = EMAIL["sender_email"]
    sender_password = EMAIL["sender_password"]
    use_ssl = EMAIL["use_ssl"]

    # -------------------------------------------------------
    # Validate SMTP configuration
    # -------------------------------------------------------
    if not all([
        smtp_host,
        smtp_port,
        sender_email,
        sender_password
    ]):
        logging.error(
            "SMTP configuration is incomplete. "
            "Check SMTP_HOST, SMTP_PORT, SMTP_USER "
            "and SMTP_PASSWORD."
        )

        raise RuntimeError("Missing SMTP configuration")

    logging.info(
        f"Connecting to SMTP server "
        f"{smtp_host}:{smtp_port} as {sender_email}"
    )

    try:
        # ---------------------------------------------------
        # SSL - normally port 465
        # ---------------------------------------------------
        if use_ssl:
            server = smtplib.SMTP_SSL(
                smtp_host,
                smtp_port,
                timeout=30
            )

        # ---------------------------------------------------
        # STARTTLS - normally port 587
        # ---------------------------------------------------
        else:
            server = smtplib.SMTP(
                smtp_host,
                smtp_port,
                timeout=30
            )

            server.ehlo()
            server.starttls()
            server.ehlo()

        # ---------------------------------------------------
        # SMTP authentication
        # ---------------------------------------------------
        server.login(
            sender_email,
            sender_password
        )

        logging.info(
            f"SMTP authentication successful for {sender_email}"
        )

        return server

    except smtplib.SMTPAuthenticationError as e:
        logging.error(
            f"SMTP authentication failed for "
            f"{sender_email}: {e}"
        )
        raise

    except (smtplib.SMTPException, OSError) as e:
        logging.error(
            f"SMTP connection failed to "
            f"{smtp_host}:{smtp_port}: {e}"
        )
        raise