import { Resend } from 'resend';
import { settings } from '../config.js';

const resend = settings.RESEND_API_KEY ? new Resend(settings.RESEND_API_KEY) : null;

export async function sendWelcomeEmail(toEmail, name) {
  if (!resend) {
    console.warn('RESEND_API_KEY not set. Skipping welcome email.');
    return false;
  }

  try {
    const htmlContent = `
      <div>
          <h1>Welcome to ORBIT AI, ${name}!</h1>
          <p>We're thrilled to have you on board.</p>
          <p>ORBIT AI transforms your documents, websites, and data into an intelligent searchable knowledge base.</p>
          <br/>
          <p>Ready to get started? Log in and upload your first document.</p>
          <br/>
          <p>Best regards,</p>
          <p>The ORBIT AI Team</p>
      </div>
    `;

    await resend.emails.send({
      from: settings.RESEND_FROM_EMAIL,
      to: toEmail,
      subject: 'Welcome to ORBIT AI!',
      html: htmlContent
    });
    console.log(`Welcome email sent successfully to ${toEmail}.`);
    return true;
  } catch (error) {
    console.error(`Failed to send welcome email to ${toEmail}:`, error.message);
    return false;
  }
}

export async function sendOtpEmail(toEmail, name, otp) {
  if (!resend) {
    console.warn('RESEND_API_KEY not set. Skipping OTP email.');
    return false;
  }

  try {
    const htmlContent = `
      <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
          <h2 style="color: #3b82f6;">Verify Your ORBIT AI Registration</h2>
          <p>Hello ${name},</p>
          <p>Thank you for signing up for ORBIT AI. Please use the following 6-digit One-Time Password (OTP) to verify your email address:</p>
          <div style="background-color: #f3f4f6; padding: 15px; text-align: center; border-radius: 8px; font-size: 24px; font-weight: bold; letter-spacing: 5px; color: #1f2937; margin: 20px 0;">
              ${otp}
          </div>
          <p>This verification code is valid for 10 minutes. If you did not request this, you can safely ignore this email.</p>
          <br/>
          <p>Best regards,</p>
          <p>The ORBIT AI Team</p>
      </div>
    `;

    await resend.emails.send({
      from: settings.RESEND_FROM_EMAIL,
      to: toEmail,
      subject: `${otp} is your ORBIT AI verification code`,
      html: htmlContent
    });
    console.log(`OTP email sent successfully to ${toEmail}.`);
    return true;
  } catch (error) {
    console.error(`Failed to send OTP email to ${toEmail}:`, error.message);
    return false;
  }
}
