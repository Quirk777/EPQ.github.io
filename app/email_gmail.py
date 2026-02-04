import os
import smtplib
import ssl
from email.message import EmailMessage
from datetime import datetime, timezone

def _env(name: str, default: str = "") -> str:
    return (os.getenv(name) or default).strip()

def send_email_gmail_smtp(to_email: str, subject: str, html: str, text: str | None = None):
    gmail_user = _env("GMAIL_USER")
    app_pw = _env("GMAIL_APP_PASSWORD")
    from_name = _env("GMAIL_FROM_NAME", "EPQ")

    if not gmail_user or not app_pw:
        raise RuntimeError("Missing GMAIL_USER or GMAIL_APP_PASSWORD env vars")

    msg = EmailMessage()
    msg["From"] = f"{from_name} <{gmail_user}>"
    msg["To"] = to_email
    msg["Subject"] = subject
    msg["Date"] = datetime.now(timezone.utc).strftime("%a, %d %b %Y %H:%M:%S %z")

    if not text:
        text = "Thanks for signing up for EPQ. Unsubscribe link is included in the email."

    msg.set_content(text)
    msg.add_alternative(html, subtype="html")

    context = ssl.create_default_context()
    with smtplib.SMTP_SSL("smtp.gmail.com", 465, context=context) as server:
        server.login(gmail_user, app_pw)
        server.send_message(msg)
