import smtplib, os
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.mime.application import MIMEApplication
from app.config import Config


EMAIL = Config.EMAIL_CONFIG


def send_email(to_email, subject, body, attachment=None):
    msg = MIMEMultipart()
    msg['Subject'] = subject
    msg['From'] = EMAIL['sender_email']
    msg['To'] = to_email
    msg.attach(MIMEText(body))

    if attachment:
        with open(attachment, 'rb') as f:
            part = MIMEApplication(f.read(), Name=os.path.basename(attachment))
        part['Content-Disposition'] = f'attachment; filename="{os.path.basename(attachment)}"'
        msg.attach(part)

    with smtplib.SMTP(EMAIL['smtp_server'], EMAIL['smtp_port']) as server:
        server.starttls()
        server.login(EMAIL['sender_email'], EMAIL['sender_password'])
        server.send_message(msg)


# ===============================================================
# PROVIDER EMAILS
# ===============================================================

def send_activation_email(email, token):
    link = f"{Config.FRONTEND_URL}/activate?token={token}"
    subject = "Activate Your Provider Account"
    body = f"""
    Dear Provider,

    Please activate your Ontract account by clicking this link:
    {link}

    Thank you for choosing Ontract.

    Regards,
    Ontract Team
    """
    return send_email(email, subject, body.strip())


def send_otp_email(email, otp):
    subject = "Your Ontract OTP Code"
    body = f"""
    Dear User,

    Your One-Time Password (OTP) for logging in to your Ontract account is {otp}.

    Please enter this code to complete your login process.
    This OTP is valid for 5 minutes. For your security, do not share this code with anyone.

    Thank you,
    Ontract
    """
    return send_email(email, subject, body.strip())


def send_reset_otp_email(email, otp):
    subject = "Your Ontract Password Reset OTP"
    body = f"""
    Dear User,

    Your One-Time Password (OTP) for resetting your Ontract account password is {otp}.

    Please enter this code to proceed with password reset.
    This OTP is valid for 5 minutes. For your security, do not share this code with anyone.

    Thank you,
    Ontract
    """
    return send_email(email, subject, body.strip())


# ===============================================================
# CONTRACTOR EMAILS
# ===============================================================

def send_contractor_activation_email(email, token):
    """Send activation link for Contractor"""
    link = f"{Config.FRONTEND_URL}/contractor/activate?token={token}"
    subject = "Activate Your Company Account"
    body = f"""
    Dear Company User,

    Please click the link below to activate your company account:
    {link}

    Thank you for joining Ontract Business Portal.

    Regards,
    Ontract Team
    """
    return send_email(email, subject, body.strip())


def send_contractor_otp_email(email, otp):
    """Send login OTP for Contractor"""
    subject = "Your Ontract Contractor OTP Code"
    body = f"""
    Dear Contractor,

    Your One-Time Password (OTP) for logging in to your company account is {otp}.

    Please enter this code to complete your login process.
    This OTP is valid for 5 minutes. For your security, do not share this code with anyone.

    Regards,
    Ontract Team
    """
    return send_email(email, subject, body.strip())


def send_contractor_profile_submitted_email(email, company_name):
    """Notify contractor their profile was submitted"""
    subject = "Your Company Profile Has Been Submitted"
    body = f"""
    Dear {company_name},

    Your company profile has been submitted successfully and is pending admin approval.
    You will be notified once it is approved.

    Regards,
    Ontract Admin Team
    """
    return send_email(email, subject, body.strip())


def send_admin_new_contractor_notification(admin_email, company_name, email):
    """Notify Admin about new contractor registration/profile update"""
    subject = "New Contractor Profile Submitted"
    body = f"""
    A new contractor profile has been submitted for review.

    Company Name: {company_name}
    Contact Email: {email}

    Please log in to the Admin Portal to review and approve.
    """
    return send_email(admin_email, subject, body.strip())


def send_admin_otp_email(email, otp):
    subject = "Your Ontract Admin OTP Code"
    body = f"""
    Dear Admin,

    Your One-Time Password (OTP) for logging in to your Ontract admin account is {otp}.

    This OTP is valid for 5 minutes. Do not share this code.

    Thanks,
    Ontract
    """.strip()
    return send_email(email, subject, body)


def send_workorder_closure_email(email, workorder_no, remarks, pdf_path):
    """
    Sends Workorder Closure Certificate Email with PDF attachment
    """

    subject = f"Workorder Closure Certificate - {workorder_no}"

    body = f"""
    Dear User,

    The workorder {workorder_no} has been successfully closed.

    Admin Remarks:
    {remarks}

    Please find the Workorder Completion Certificate attached.

    Regards,
    Ontract Team
    """.strip()

    return send_email(email, subject, body, attachment=pdf_path)

