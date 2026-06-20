import resend
import logging
from app.config import settings

logger = logging.getLogger(__name__)

# Initialize Resend with the API key from settings
resend.api_key = settings.RESEND_API_KEY

def send_welcome_email(to_email: str, name: str) -> bool:
    """
    Sends a welcome email using Resend API.
    Returns True if successful, False otherwise.
    """
    if not settings.RESEND_API_KEY:
        logger.warning("RESEND_API_KEY not set. Skipping welcome email.")
        return False

    try:
        html_content = f"""
        <div>
            <h1>Welcome to ORBIT AI, {name}!</h1>
            <p>We're thrilled to have you on board.</p>
            <p>ORBIT AI transforms your documents, websites, and data into an intelligent searchable knowledge base.</p>
            <br/>
            <p>Ready to get started? Log in and upload your first document.</p>
            <br/>
            <p>Best regards,</p>
            <p>The ORBIT AI Team</p>
        </div>
        """

        params: resend.Emails.SendParams = {
            "from": settings.RESEND_FROM_EMAIL,
            "to": [to_email],
            "subject": "Welcome to ORBIT AI!",
            "html": html_content,
        }

        email = resend.Emails.send(params)
        logger.info(f"Welcome email sent successfully to {to_email}. ID: {email.get('id')}")
        return True
    except Exception as e:
        logger.error(f"Failed to send welcome email to {to_email}: {e}")
        return False


def send_otp_email(to_email: str, name: str, otp: str) -> bool:
    """
    Sends an OTP verification code email using Resend API.
    Returns True if successful, False otherwise.
    """
    if not settings.RESEND_API_KEY:
        logger.warning("RESEND_API_KEY not set. Skipping OTP email.")
        return False

    try:
        html_content = f"""
        <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
            <h2 style="color: #3b82f6;">Verify Your ORBIT AI Registration</h2>
            <p>Hello {name},</p>
            <p>Thank you for signing up for ORBIT AI. Please use the following 6-digit One-Time Password (OTP) to verify your email address:</p>
            <div style="background-color: #f3f4f6; padding: 15px; text-align: center; border-radius: 8px; font-size: 24px; font-weight: bold; letter-spacing: 5px; color: #1f2937; margin: 20px 0;">
                {otp}
            </div>
            <p>This verification code is valid for 10 minutes. If you did not request this, you can safely ignore this email.</p>
            <br/>
            <p>Best regards,</p>
            <p>The ORBIT AI Team</p>
        </div>
        """

        params: resend.Emails.SendParams = {
            "from": settings.RESEND_FROM_EMAIL,
            "to": [to_email],
            "subject": f"{otp} is your ORBIT AI verification code",
            "html": html_content,
        }

        email = resend.Emails.send(params)
        logger.info(f"OTP email sent successfully to {to_email}. ID: {email.get('id')}")
        return True
    except Exception as e:
        logger.error(f"Failed to send OTP email to {to_email}: {e}")
        return False

