"""
Centralized email service for all transactional emails.
Supports verification, password reset, and other notifications.
"""

import os
import secrets
import smtplib
import ssl
from email.message import EmailMessage
from datetime import datetime, timezone, timedelta
from typing import Optional
import logging

logger = logging.getLogger(__name__)


class EmailService:
    """Handles all email sending functionality"""
    
    def __init__(self):
        self.gmail_user = os.getenv("GMAIL_USER", "").strip()
        self.gmail_password = os.getenv("GMAIL_APP_PASSWORD", "").strip()
        self.from_name = os.getenv("GMAIL_FROM_NAME", "EPQ").strip()
        self.public_base_url = os.getenv("PUBLIC_BASE_URL", "http://localhost:3000").rstrip("/")
        
        # Check if email is configured
        self.is_configured = bool(self.gmail_user and self.gmail_password)
        
        if not self.is_configured:
            logger.warning("Email service not configured. Set GMAIL_USER and GMAIL_APP_PASSWORD environment variables.")
    
    def send_verification_email(self, to_email: str, verification_token: str) -> bool:
        """Send email verification link to new user"""
        if not self.is_configured:
            logger.error(f"Cannot send verification email to {to_email} - email not configured")
            return False
        
        verification_link = f"{self.public_base_url}/verify-email?token={verification_token}"
        
        subject = "Verify your email address"
        
        html_body = f"""
        <html>
        <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background-color: #f8f9fa; padding: 30px; border-radius: 8px;">
                <h2 style="color: #333; margin-top: 0;">Welcome to EPQ Assessment Platform!</h2>
                
                <p style="color: #555; font-size: 16px; line-height: 1.6;">
                    Thank you for signing up. To complete your registration, please verify your email address 
                    by clicking the button below:
                </p>
                
                <div style="text-align: center; margin: 30px 0;">
                    <a href="{verification_link}" 
                       style="background-color: #007bff; color: white; padding: 14px 28px; 
                              text-decoration: none; border-radius: 5px; display: inline-block; 
                              font-weight: bold; font-size: 16px;">
                        Verify Email Address
                    </a>
                </div>
                
                <p style="color: #777; font-size: 14px; line-height: 1.6;">
                    Or copy and paste this link into your browser:<br>
                    <a href="{verification_link}" style="color: #007bff; word-break: break-all;">
                        {verification_link}
                    </a>
                </p>
                
                <p style="color: #999; font-size: 13px; margin-top: 30px; border-top: 1px solid #ddd; padding-top: 20px;">
                    This verification link will expire in 24 hours.<br>
                    If you didn't create an account, you can safely ignore this email.
                </p>
            </div>
        </body>
        </html>
        """
        
        text_body = f"""
        Welcome to EPQ Assessment Platform!
        
        Thank you for signing up. To complete your registration, please verify your email address 
        by clicking the link below:
        
        {verification_link}
        
        This verification link will expire in 24 hours.
        If you didn't create an account, you can safely ignore this email.
        """
        
        return self._send_email(to_email, subject, html_body, text_body)
    
    def send_password_reset_email(self, to_email: str, reset_token: str) -> bool:
        """Send password reset link to user"""
        if not self.is_configured:
            logger.error(f"Cannot send password reset email to {to_email} - email not configured")
            return False
        
        reset_link = f"{self.public_base_url}/reset-password?token={reset_token}"
        
        subject = "Password Reset Request"
        
        html_body = f"""
        <html>
        <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background-color: #f8f9fa; padding: 30px; border-radius: 8px;">
                <h2 style="color: #333; margin-top: 0;">Password Reset Request</h2>
                
                <p style="color: #555; font-size: 16px; line-height: 1.6;">
                    We received a request to reset your password. Click the button below to create a new password:
                </p>
                
                <div style="text-align: center; margin: 30px 0;">
                    <a href="{reset_link}" 
                       style="background-color: #dc3545; color: white; padding: 14px 28px; 
                              text-decoration: none; border-radius: 5px; display: inline-block; 
                              font-weight: bold; font-size: 16px;">
                        Reset Password
                    </a>
                </div>
                
                <p style="color: #777; font-size: 14px; line-height: 1.6;">
                    Or copy and paste this link into your browser:<br>
                    <a href="{reset_link}" style="color: #dc3545; word-break: break-all;">
                        {reset_link}
                    </a>
                </p>
                
                <div style="background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0;">
                    <p style="color: #856404; margin: 0; font-size: 14px;">
                        <strong>Security Notice:</strong> If you didn't request this password reset, 
                        please ignore this email. Your password will remain unchanged.
                    </p>
                </div>
                
                <p style="color: #999; font-size: 13px; margin-top: 30px; border-top: 1px solid #ddd; padding-top: 20px;">
                    This password reset link will expire in 1 hour for security reasons.
                </p>
            </div>
        </body>
        </html>
        """
        
        text_body = f"""
        Password Reset Request
        
        We received a request to reset your password. Click the link below to create a new password:
        
        {reset_link}
        
        If you didn't request this password reset, please ignore this email. 
        Your password will remain unchanged.
        
        This password reset link will expire in 1 hour for security reasons.
        """
        
        return self._send_email(to_email, subject, html_body, text_body)
    
    def _send_email(self, to_email: str, subject: str, html_body: str, text_body: str) -> bool:
        """Internal method to send email via Gmail SMTP"""
        try:
            msg = EmailMessage()
            msg["From"] = f"{self.from_name} <{self.gmail_user}>"
            msg["To"] = to_email
            msg["Subject"] = subject
            msg["Date"] = datetime.now(timezone.utc).strftime("%a, %d %b %Y %H:%M:%S %z")
            
            # Set text and HTML content
            msg.set_content(text_body)
            msg.add_alternative(html_body, subtype="html")
            
            # Send via Gmail SMTP
            context = ssl.create_default_context()
            with smtplib.SMTP_SSL("smtp.gmail.com", 465, context=context) as server:
                server.login(self.gmail_user, self.gmail_password)
                server.send_message(msg)
            
            logger.info(f"Email sent successfully to {to_email}: {subject}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to send email to {to_email}: {str(e)}")
            return False


# Global email service instance
email_service = EmailService()


def send_verification_email(to_email: str, verification_token: str) -> bool:
    """Convenience function to send verification email"""
    return email_service.send_verification_email(to_email, verification_token)


def send_password_reset_email(to_email: str, reset_token: str) -> bool:
    """Convenience function to send password reset email"""
    return email_service.send_password_reset_email(to_email, reset_token)
