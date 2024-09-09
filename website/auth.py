from flask import (
    Blueprint,
    render_template,
    request,
    flash,
    redirect,
    url_for,
    jsonify,
    current_app,
)
from mailjet_rest import Client
from .models import User, PasswordResetToken
from werkzeug.security import generate_password_hash, check_password_hash
from . import db
from flask_login import login_user, login_required, logout_user, current_user
import re
from flask import url_for, make_response, send_file
import secrets
from datetime import datetime, timedelta
import smtplib
import pytz
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from .models import User, NoteTag, Notification, Note, LoginActivity, PushPreferences
import random
from pytz import timezone
from datetime import datetime
from werkzeug.utils import secure_filename
import os
from dateutil import parser
from flask import Response
import json
import io
import pyotp
from website.decorators import admin_required
from user_agents import parse

auth = Blueprint("auth", __name__)


@auth.route("/login", methods=["GET", "POST"])
def login():
    if request.method == "POST":
        email = request.form.get("email").strip()
        password = request.form.get("password-login").strip()
        user = User.query.filter_by(email=email).first()

        if user and check_password_hash(user.password, password):
            if not user.is_active:
                flash("Your account has been deactivated.", category="warning")
                return redirect(url_for("auth.login"))

            login_user(user, remember=True)
            log_login_activity(user)

            if user.is_2fa_enabled:
                if user.otp_method == "email":
                    otp, secret = generate_otp()
                    user.temp_otp = otp
                    user.otp_secret = secret
                    db.session.commit()
                    send_otp_email(user.email, otp)
                    flash("A new OTP has been sent to your email.", category="info")
                    return redirect(url_for("auth.verify_email_otp"))

                elif user.otp_method == "app":
                    return redirect(url_for("auth.verify_2fa"))

            flash("Login successful", category="success")
            return redirect(url_for("views.user_home"))

        flash("Login failed. Check your email and password.", category="error")

    return render_template("login.html")


@auth.route("/resend_otp_login", methods=["POST"])
@login_required
def resend_otp_login():
    if current_user.otp_method == "email":
        otp, _ = generate_otp(current_user.otp_secret)
        current_user.temp_otp = otp
        db.session.commit()
        resend_otp_email(current_user.email, otp)
        flash("A new OTP has been sent to your email.", category="info")
        return jsonify({"success": True})
    else:
        flash("OTP resend is only available for email-based 2FA.", category="warning")
        return jsonify({"success": False})


@auth.route("/verify_email_otp", methods=["GET", "POST"])
@login_required
def verify_email_otp():
    if request.method == "POST":
        otp = request.form.get("otp").strip()
        if not otp.isdigit() or len(otp) != 6:
            flash("OTP must be a 6-digit number.", category="warning")
            return redirect(url_for("auth.verify_email_otp"))

        if otp == current_user.temp_otp:
            current_user.is_2fa_enabled = True
            current_user.otp_secret = None
            current_user.temp_otp = None
            db.session.commit()

            flash(
                "2FA verification successful. You are now logged in.",
                category="success",
            )
            return redirect(url_for("views.user_home"))
        else:
            flash("Invalid OTP code. Please try again.", category="danger")

    return render_template("verify_email_otp.html")


def send_activity_alert(user, new_activity):
    sender = "vo4685336@gmail.com"
    receivers = [user.email]
    subject = "New Login Activity Detected"
    body = f"""
    Hi {user.full_name},

    A new login activity was detected on your account:

    - Timestamp (UTC): {new_activity.timestamp}
    - IP Address: {new_activity.ip_address}
    - Browser: {new_activity.browser_name}
    - Time Zone: {new_activity.time_zone}

    If this was not you, please secure your account immediately.

    Regards,
    NoteWave
    """

    message = MIMEText(body)
    message["Subject"] = subject
    message["From"] = sender
    message["To"] = user.email

    try:
        smtpObj = smtplib.SMTP_SSL("smtp.gmail.com", 465)
        smtpObj.login(sender, "mctvdqkjcupzsukn")
        smtpObj.sendmail(sender, receivers, message.as_string())
        smtpObj.quit()
        print("Successfully sent login activity email")
    except smtplib.SMTPException as e:
        print("SMTP error occurred: " + str(e))
    except Exception as e:
        print("Error: " + str(e))


def log_login_activity(user):
    try:
        user_timezone = user.time_zone if user.time_zone else "UTC"
        user_agent_string = request.headers.get("User-Agent")
        user_agent = parse(user_agent_string)
        browser_name = (
            user_agent.browser.family if user_agent.browser.family else "Unknown"
        )
        new_activity = LoginActivity(
            user_id=user.id,
            timestamp=datetime.utcnow(),
            ip_address=request.remote_addr,
            user_agent=user_agent_string,
            time_zone=user_timezone,
            browser_name=browser_name,
        )
        db.session.add(new_activity)
        db.session.commit()

        if user.email_preferences.activity_alerts:
            send_activity_alert(user, new_activity)

    except Exception as e:
        print(f"Error logging login activity: {e}")


@auth.before_request
def check_account_active():
    if current_user.is_authenticated and not current_user.is_active:
        logout_user()
        flash("Your account has been deactivated.", "warning")
        return redirect(url_for("auth.login"))


@auth.route("/activate_account/<int:user_id>", methods=["POST"])
@login_required
@admin_required
def activate_account(user_id):
    user = User.query.get(user_id)
    if not user:
        flash("User not found.", "error")
        return redirect(url_for("views.settings"))

    user.is_active = True
    db.session.commit()
    flash("User account has been activated.", "success")
    return redirect(url_for("views.settings"))


@auth.route("/make_admin/<int:user_id>", methods=["POST"])
@admin_required
def make_admin(user_id):
    user = User.query.get(user_id)
    if not user:
        flash("User not found.", category="danger")
        return redirect(url_for("views.settings"))

    if not user.email_verified:
        flash(
            "Only verified accounts can be granted admin privileges.", category="danger"
        )
        return redirect(url_for("views.settings"))

    user.is_admin = True
    db.session.commit()
    flash(f"User {user.email} has been granted admin privileges.", category="success")
    return redirect(url_for("views.settings"))


@auth.route("/show_2fa_qr_code", methods=["GET"])
@login_required
def show_2fa_qr_code():
    otp_uri = request.args.get("otp_uri")
    return render_template("setup2fa.html", otp_uri=otp_uri)


@auth.route("/enable_2fa", methods=["POST"])
@login_required
def enable_2fa():
    otp_method = request.form.get("otp_method")
    if otp_method == "app":
        totp = pyotp.TOTP(pyotp.random_base32())
        current_user.otp_secret = totp.secret
        current_user.otp_method = "app"
        db.session.commit()
        otp_uri = totp.provisioning_uri(current_user.email, issuer_name="NoteWave")
        return redirect(url_for("auth.show_2fa_qr_code", otp_uri=otp_uri))
    elif otp_method == "email":
        otp, secret = generate_otp()
        current_user.otp_secret = secret
        current_user.temp_otp = otp
        current_user.otp_method = "email"
        db.session.commit()
        send_otp_email(current_user.email, otp)
        flash("OTP has been sent to your email.", category="info")
        return redirect(url_for("auth.verify_otp"))


def generate_otp(secret=None):
    if not secret:
        secret = pyotp.random_base32()
    totp = pyotp.TOTP(secret, interval=300)
    otp = totp.now()
    print(f"Generated OTP: {otp}, Secret: {secret}")
    return otp, secret


@auth.route("/resend_otp", methods=["POST"])
@login_required
def resend_otp():
    if current_user.otp_method == "email":
        otp, _ = generate_otp(current_user.otp_secret)
        current_user.temp_otp = otp
        db.session.commit()
        resend_otp_email(current_user.email, otp)
        flash("A new OTP has been sent to your email.", category="info")
        return jsonify({"success": True})
    else:
        flash("OTP resend is only available for email-based 2FA.", category="warning")
        return jsonify({"success": False})


def resend_otp_email(user_email, otp):
    sender = "vo4685336@gmail.com"
    receivers = [user_email]
    subject = "OTP"

    html_content = f"""
<!DOCTYPE html>
<html>
<head>
<style>
body{{
justify-content: center;
text-align: center;
position: relative;
}}
.container {{
border: 4px solid #ff7f50;
border-radius: 5px;
padding: 20px;
display: inline-block;
justify-content: space-between;
margin: 0 auto;
}}
.logo {{
font-family: "Roboto", sans-serif;
font-size: 48px;
font-weight: 700;
color: #00ffff;
text-align: center;
position: relative;
}}
.logo p {{
margin: 0;
}}
.logo span {{
color: #ff7f50;
text-shadow: 6px 6px 6px rgba(0, 0, 0, 0.815);
font-style: italic;
}}
.logo p::after {{
content: "";
display: block;
width: 50%;
height: 5px;
background: #ff7f50;
margin: 10px auto 0;
border-radius: 2px;
}}
a{{
text-decoration: none;
color: #fff;
font-size: 13px 
}}
@media (max-width: 768px) {{
p[type="cont"] {{
margin-left: 20px;
font-size: 13px;
}}
button{{
background: #ff7f50;
border: none;
height: 30px;
padding: 13px 15px;
border-radius: 5px;
width: auto;

}}
}}
p[type="cont"] {{
margin-left: 20px;
font-size: 16px;
}}
button{{
background: #ff7f50;
border: none;
padding: 13px 15px;
border-radius: 5px;

}}
.procedures, .end{{
max-width: 550px;
}}
</style>
</head>
<div class="container">
<div class="logo">
<p>Note<span>wave.</span></p>
</div>
<div class="content1">
<p>
<b>Dear {current_user.first_name},</b><br /><br />
Email 2FA verification:
</p>
<div class="procedures">
<p type="cont">
Your OTP is  {otp}
</p>
</div>
<div class="end">
<p>
If you did not request this, please ignore this email and contact
our support team immediately.
</p>
<p class="regards">
<b>Regards,<br />Notewave</b>
</p>
</div>
</div>

</div>
</body>
</html>
"""
    message = MIMEMultipart("alternative")
    html_part = MIMEText(html_content, "html")
    message.attach(html_part)
    message["Subject"] = subject
    message["From"] = sender
    message["To"] = user_email
    try:
        smtpObj = smtplib.SMTP_SSL("smtp.gmail.com", 465)
        smtpObj.login(sender, "mctvdqkjcupzsukn")
        smtpObj.sendmail(sender, receivers, message.as_string())
        smtpObj.quit()
        print("Successfully sent OTP email")
    except smtplib.SMTPException as e:
        print("SMTP error occurred: " + str(e))
    except Exception as e:
        print("Error: " + str(e))


@auth.route("/verify_otp", methods=["GET", "POST"])
@login_required
def verify_otp():
    if request.method == "POST":
        otp = request.form.get("otp").strip()
        if not otp.isdigit() or len(otp) != 6:
            flash("OTP must be a 6-digit number.", category="warning")
            return redirect(url_for("auth.verify_email_otp"))
        if current_user.otp_method == "app":
            totp = pyotp.TOTP(current_user.otp_secret)
            if totp.verify(otp):
                current_user.is_2fa_enabled = True
                current_user.otp_secret = None
                db.session.commit()
                flash(
                    "2FA verification successful. You are now logged in.",
                    category="success",
                )
                return redirect(url_for("views.user_home"))
            else:
                flash("Invalid OTP code. Please try again.", category="error")
        elif current_user.otp_method == "email":
            if not otp.isdigit() or len(otp) != 6:
                flash("OTP must be a 6-digit number.", category="warning")
                return redirect(url_for("auth.verify_otp"))

            if otp == current_user.temp_otp:
                current_user.is_2fa_enabled = True
                current_user.temp_otp = None
                current_user.otp_secret = None
                db.session.commit()
                flash(
                    "2FA verification successful. You are now logged in.",
                    category="success",
                )
                return redirect(url_for("views.user_home"))
            else:
                flash("Invalid OTP code. Please try again.", category="error")

    return render_template("verify_otp.html")


def send_otp_email(user_email, otp):
    sender = "vo4685336@gmail.com"
    receivers = [user_email]
    subject = "OTP"

    html_content = f"""
<!DOCTYPE html>
<html>
<head>
<style>
body{{
justify-content: center;
text-align: center;
position: relative;
}}
.container {{
border: 4px solid #ff7f50;
border-radius: 5px;
padding: 20px;
display: inline-block;
justify-content: space-between;
margin: 0 auto;
}}
.logo {{
font-family: "Roboto", sans-serif;
font-size: 48px;
font-weight: 700;
color: #00ffff;
text-align: center;
position: relative;
}}
.logo p {{
margin: 0;
}}
.logo span {{
color: #ff7f50;
text-shadow: 6px 6px 6px rgba(0, 0, 0, 0.815);
font-style: italic;
}}
.logo p::after {{
content: "";
display: block;
width: 50%;
height: 5px;
background: #ff7f50;
margin: 10px auto 0;
border-radius: 2px;
}}
a{{
text-decoration: none;
color: #fff;
font-size: 13px 
}}
@media (max-width: 768px) {{
p[type="cont"] {{
margin-left: 20px;
font-size: 13px;
}}
button{{
background: #ff7f50;
border: none;
height: 30px;
padding: 13px 15px;
border-radius: 5px;
width: auto;

}}
}}
p[type="cont"] {{
margin-left: 20px;
font-size: 16px;
}}
button{{
background: #ff7f50;
border: none;
padding: 13px 15px;
border-radius: 5px;

}}
.procedures, .end{{
max-width: 550px;
}}
</style>
</head>
<div class="container">
<div class="logo">
<p>Note<span>wave.</span></p>
</div>
<div class="content1">
<p>
<b>Dear {current_user.first_name},</b><br /><br />
Email 2FA verification:
</p>
<div class="procedures">
<p type="cont">
Your OTP is  {otp}
</p>
</div>
<div class="end">
<p>
If you did not request this, please ignore this email and contact
our support team immediately.
</p>
<p class="regards">
<b>Regards,<br />Notewave</b>
</p>
</div>
</div>

</div>
</body>
</html>
"""
    message = MIMEMultipart("alternative")
    html_part = MIMEText(html_content, "html")
    message.attach(html_part)
    message["Subject"] = subject
    message["From"] = sender
    message["To"] = user_email
    try:
        smtpObj = smtplib.SMTP_SSL("smtp.gmail.com", 465)
        smtpObj.login(sender, "mctvdqkjcupzsukn")
        smtpObj.sendmail(sender, receivers, message.as_string())
        smtpObj.quit()
        print("Successfully sent OTP email")
    except smtplib.SMTPException as e:
        print("SMTP error occurred: " + str(e))
    except Exception as e:
        print("Error: " + str(e))


@auth.route("/confirm_enable_2fa", methods=["POST"])
@login_required
def confirm_enable_2fa():
    token = request.form.get("token")
    totp = pyotp.TOTP(current_user.otp_secret)
    if totp.verify(token):
        current_user.is_2fa_enabled = True
        db.session.commit()
        flash("Two-Factor Authentication has been enabled.", "success")
        return redirect(url_for("views.user_home"))
    else:
        flash("Invalid 2FA code. Please try again.", "danger")
        otp_uri = totp.provisioning_uri(current_user.email, issuer_name="NoteWave")
        return redirect(url_for("auth.show_2fa_qr_code", otp_uri=otp_uri))


@auth.route("/disable_2fa", methods=["POST"])
@login_required
def disable_2fa():
    current_user.is_2fa_enabled = False
    current_user.otp_secret = None
    db.session.commit()
    flash("2FA has been disabled.", category="success")
    return redirect(url_for("views.user_home"))


@auth.route("/verify_2fa", methods=["GET", "POST"])
@login_required
def verify_2fa():
    if request.method == "POST":
        token = request.form.get("token")
        totp = pyotp.TOTP(current_user.otp_secret)

        if totp.verify(token):
            login_user(current_user)
            flash(
                "2FA verification successful. You are now logged in.",
                category="success",
            )
            return redirect(url_for("views.user_home"))
        flash("Invalid 2FA token. Please try again.", category="error")
    return render_template("verify_2fa.html")


@auth.route("/check_email", methods=["POST"])
def check_email():
    email = request.form.get("email")
    user = User.query.filter_by(email=email).first()
    return jsonify({"exists": bool(user)})


@auth.route("/logout", methods=["POST"])
@login_required
def logout():
    logout_user()
    flash("Logged out successfully", category="success")
    return redirect(url_for("auth.login"))


@auth.route("/logout_idle", methods=["POST"])
@login_required
def logout_idle():
    logout_user()
    flash("You have been logged out due to inactivity", category="warning")
    return redirect(url_for("auth.login"))


@auth.route("/delete_account", methods=["POST"])
@login_required
def delete_account():
    user = User.query.get(current_user.id)
    if user:

        NoteTag.query.filter_by(user_id=user.id).delete()

        Note.query.filter_by(user_id=user.id).delete()

        db.session.delete(user)
        db.session.commit()
        logout_user()
        flash("Your account has been deleted successfully.", category="success")
        return redirect(url_for("auth.login"))
    else:
        flash("Account deletion failed. User not found.", category="danger")
        return redirect(url_for("views.profile"))


@auth.route("/deactivate_account", methods=["POST"])
@login_required
def deactivate_account():
    user_email = current_user.email
    current_user.is_active = False
    db.session.commit()
    logout_user()
    flash("Your account has been deactivated.", category="warning")
    send_deactivation_email(user_email)

    return redirect(url_for("auth.login"))


def send_deactivation_email(user_email):
    sender = "vo4685336@gmail.com"
    receivers = [user_email]
    subject = "Account Deactivation"
    body = (
        "Your account has been deactivated. If you have any questions or "
        "need to reactivate your account, please contact vo4685336@gmail.com. Incude your email address in your message"
        "\n\nFrom NoteWave"
    )

    message = MIMEText(body)
    message["Subject"] = subject
    message["From"] = sender
    message["To"] = user_email

    try:
        smtpObj = smtplib.SMTP_SSL("smtp.gmail.com", 465)
        smtpObj.login(sender, "mctvdqkjcupzsukn")
        smtpObj.sendmail(sender, receivers, message.as_string())
        smtpObj.quit()
        print("Successfully sent deactivation email")
    except smtplib.SMTPException as e:
        print("SMTP error occurred: " + str(e))
    except Exception as e:
        print("Error: " + str(e))


@auth.route("/check_password", methods=["POST"])
def check_password():
    email = request.form.get("email")
    password = request.form.get("password-login")
    user = User.query.filter_by(email=email).first()
    if user and check_password_hash(user.password, password):
        return jsonify({"exists": True})
    return jsonify({"exists": False})


def generate_random_color():
    color = "#{:06x}".format(random.randint(0, 0xFFFFFF))
    return color


def generate_unique_username(first_name, second_name):
    first_initial = first_name[0].lower() if first_name else ""
    second_initial = second_name[0].lower() if second_name else ""
    random_numbers = "".join(random.choices("0123456789", k=3))
    username = f"@{first_initial}{second_initial}{random_numbers}"

    return username


from mailjet_rest import Client
from flask import url_for


def send_verification_email(user, token):
    api_key = "d432cee9047e3ce258e59b81514864cc"
    api_secret = "3ed35d6a4a8972eddaa96b89e130c39a"
    mailjet = Client(auth=(api_key, api_secret), version="v3.1")
    verification_url = url_for("auth.verify_email", token=token, _external=True)

    data = {
        "Messages": [
            {
                "From": {"Email": "vo4685336@gmail.com", "Name": "NoteWave"},
                "To": [{"Email": user.email, "Name": user.first_name}],
                "Subject": "Verify Your Account",
                "TextPart": "Please click the link to verify your account:",
                "HTMLPart": f"""
<!DOCTYPE html>
<html>
<head>
<style>
body{{
    justify-content: center;
    text-align: center;
    position: relative;
}}
.container {{
    border: 4px solid #ff7f50;
    border-radius: 5px;
    padding: 20px;
    display: inline-block;
    justify-content: space-between;
    margin: 0 auto;
}}
.logo {{
    font-family: "Roboto", sans-serif;
    font-size: 48px;
    font-weight: 700;
    color: #00ffff;
    text-align: center;
    position: relative;
}}
.logo p {{
    margin: 0;
}}
.logo span {{
    color: #ff7f50;
    text-shadow: 6px 6px 6px rgba(0, 0, 0, 0.815);
    font-style: italic;
}}
.logo p::after {{
    content: "";
    display: block;
    width: 50%;
    height: 5px;
    background: #ff7f50;
    margin: 10px auto 0;
    border-radius: 2px;
}}
a{{
    text-decoration: none;
    color: #fff;
    font-size: 13px;
}}
@media (max-width: 768px) {{
    p[type="cont"] {{
        margin-left: 20px;
        font-size: 13px;
    }}
    button{{
        background: #ff7f50;
        border: none;
        height: 30px;
        padding: 13px 15px;
        border-radius: 5px;
        width: auto;
    }}
}}
p[type="cont"] {{
    margin-left: 20px;
    font-size: 16px;
}}
button{{
    background: #ff7f50;
    border: none;
    padding: 13px 15px;
    border-radius: 5px;
}}
.procedures, .end{{
    max-width: 550px;
}}
</style>
</head>
<body>
<div class="container">
    <div class="logo">
        <p>Note<span>wave.</span></p>
    </div>
    <div class="content1">
      <p>
          <b>Dear {user.first_name},</b><br /><br />
          Account Validation:
        </p>
        <div class="procedures">
        <p type="cont">
            Please click the following link to validate your account:
        <button><a class="link" href="{verification_url}">Verify Account</a></button>
          </p>
        </div>
        <div class="end">
          <p>
            If you did not request this, please ignore this email and contact
            our support team immediately.
          </p>
          <p class="regards">
            <b>Regards,<br />Notewave</b>
          </p>
        </div>
    </div>
</div>
</body>
</html>
""",
            }
        ]
    }

    try:
        result = mailjet.send.create(data=data)
        print(f"Status Code: {result.status_code}")
        print(f"Response: {result.json()}")
        if result.status_code != 200:
            raise Exception(f"Failed to send email: {result.json()}")
    except Exception as e:
        print(f"Error sending email: {e}")


@auth.route("/sign_up", methods=["GET", "POST"])
def sign_up():
    if request.method == "POST":
        first_name = request.form.get("firstName").strip()
        second_name = request.form.get("secondName").strip()
        email = request.form.get("email").strip()
        password1 = request.form.get("password").strip()
        password2 = request.form.get("confirm-password").strip()

        if (
            not first_name
            or not second_name
            or not email
            or not password1
            or not password2
        ):
            flash("All fields are required.", "error")
        elif password1 != password2:
            flash("Passwords do not match.", "error")
        else:
            full_name = f"{first_name} {second_name}"
            user_name = generate_unique_username(first_name, second_name)
            generated_color = generate_random_color()
            is_admin = email == "vo4685336@gmail.com"

            new_user = User(
                email=email,
                first_name=first_name,
                second_name=second_name,
                full_name=full_name,
                user_name=user_name,
                password=generate_password_hash(password1, method="pbkdf2:sha256"),
                time_zone="Africa/Nairobi",
                generated_color=generated_color,
                is_admin=is_admin,
            )
            db.session.add(new_user)
            db.session.commit()

            default_tags = [
                {"name": "Travel", "color": "#3498db"},
                {"name": "Personal", "color": "#2ecc71"},
                {"name": "Life", "color": "#e67e22"},
                {"name": "Work", "color": "#95a5a6"},
                {"name": "Untagged", "color": "#9b59b6"},
            ]
            for tag in default_tags:
                new_tag = NoteTag(
                    name=tag["name"],
                    color=tag["color"],
                    user_id=new_user.id,
                )
                db.session.add(new_tag)

            db.session.commit()

            token = new_user.generate_verification_token()
            send_verification_email(new_user, token)

            login_user(new_user, remember=True)
            flash(
                "Account created! Please check your email to verify your account.",
                "success",
            )
            return redirect(url_for("views.user_home"))

    return render_template("sign_up.html")


@auth.route("/verify/<token>")
def verify_email(token):
    email = User.verify_verification_token(token)
    if not email:
        flash("The verification link is invalid or has expired.", category="error")
        return redirect(url_for("auth.login"))

    user = User.query.filter_by(email=email).first_or_404()
    if user.email_verified:
        flash("Account already verified. Please log in.", category="success")
    else:
        user.email_verified = True
        db.session.commit()
        flash("Account verified! You can now log in.", category="success")

    return redirect(url_for("auth.login"))


@auth.route("/resend_verification", methods=["POST"])
def resend_verification():
    email = request.form.get("email").strip()
    user = User.query.filter_by(email=email).first()

    if user and not user.email_verified:
        token = user.generate_verification_token()
        send_verification_email(user, token)
        flash(
            "A new verification email has been sent. Please check your inbox.",
            "success",
        )
    else:
        flash("This email is either not registered or already verified.", "error")

    return redirect(url_for("views.user_home"))


@auth.route("/terms", methods=["GET", "POST"])
def terms():
    return render_template("terms.html")


@auth.route("/check_email_signup", methods=["POST"])
def check_email_signup():
    email = request.form.get("email")
    user = User.query.filter_by(email=email).first()
    return jsonify({"exists": bool(user)})


def generate_token():
    return secrets.token_urlsafe(32)


def send_password_reset_email(user, token):
    reset_url = url_for("auth.reset_password", token=token, _external=True)

    message = MIMEMultipart("alternative")
    message["Subject"] = "Password Reset Request"
    message["From"] = "YourApp <your_email@example.com>"
    message["To"] = f"{user.full_name} <{user.email}>"

    html_content = f"""
<!DOCTYPE html>
<html>
<head>
<style>
/* Define your CSS styles for the email */
body{{
    justify-content: center;
    text-align: center;
    position: relative;
    min-height: 100vh;
}}
.container {{
    border: 4px solid #ff7f50;
    border-radius: 5px;
    padding: 20px;
    display: inline-block;
    justify-content: space-between;
    margin: 0 auto;
    min-height: 100vh;
}}
.logo {{
    font-family: "Roboto", sans-serif;
    font-size: 48px;
    font-weight: 700;
    color: #00ffff;
    text-align: center;
    position: relative;
}}
.logo p {{
    margin: 0;
}}
.logo span {{
    color: #ff7f50;
    text-shadow: 6px 6px 6px rgba(0, 0, 0, 0.815);
    font-style: italic;
}}
.logo p::after {{
    content: "";
    display: block;
    width: 50%;
    height: 5px;
    background: #ff7f50;
    margin: 10px auto 0;
    border-radius: 2px;
}}
.procedures, .end{{
    max-width: 550px;
}}
p[type="proceed"]{{
    font-size: 14px;
    }}
p[type="cont"] {{
    margin-left: 20px;
    font-size: 16px;
    }}
button{{
    background: #ff7f50;
    border: none;
    padding: 13px 15px;
    border-radius: 5px;
    width: auto;

    }}
a{{
    text-decoration: none;
    color: #fff;
    font-size: 17px 
    }}
@media (max-width: 768px) {{
    p[type="cont"] {{
        margin-left: 20px;
        font-size: 13px;
        }}
    button{{
        background: #ff7f50;
        border: none;
        padding: 13px 15px;
        border-radius: 5px;
        width: auto;

       }}
    a{{
        text-decoration: none;
        color: #fff;
        font-size: 13px 
       }}
    }}
</style>
</head>
<body>
<div class="container">
      <div class="logo">
        <p>Note<span>wave.</span></p>
      </div>
      <div class="content1">
        <p>
          <b>Dear {user.first_name },</b><br /><br />
          We received a request to reset your password for account:
        </p>

        <h4><b>Account Details</b></h4>
        <p>
          Email: <i>{user.email}</i> <br />
          Full Name:<i> {user.full_name}</i> <br /><br />
        </p>

        <div class="procedures">
          <p type="proceed">
            < To proceed with resetting your password, please follow the steps
            below>:
          </p>
          <h5>
            <b>Step 1: <i>Click the Password Reset Link</i></b>
          </h5>
          <p type="cont">
            Please click the following link to reset your password:
        <button><a class="link" href="{reset_url}">Password Reset Link</a></button>
          </p>

          <h5>
            <b>Step 2: <i>Choose a New Password</i></b>
          </h5>
          <p type="cont">
            Once your identity has been verified,you will be prompted to create
            a new password for your account. Please choose a strong password
            that will be passed on the password checker below the
            password reset button.
          </p>
          <h5>
            <b>Step 3: <i>Confirmations</i></b>
          </h5>
          <p type="cont">
            After successful ressetting your password, you will receive a
            confirmation email.
          </p>
        </div>
        <div class="end">
          <p>
            If you did not request this, please ignore this email and contact
            our support team immediately.
          </p>
          <p class="regards">
            <b>Regards,<br />Notewave</b>
          </p>
        </div>
      </div>
    </div> 
</body>
</html>
"""

    html_part = MIMEText(html_content, "html")
    message.attach(html_part)

    sender = "your_email@example.com"
    receivers = [user.email]

    try:
        smtpObj = smtplib.SMTP_SSL("smtp.gmail.com", 465)
        smtpObj.login("vo4685336@gmail.com", "mctvdqkjcupzsukn")
        smtpObj.sendmail(sender, receivers, message.as_string())
        print("Successfully sent forgot password email")
        smtpObj.quit()
    except smtplib.SMTPException as e:
        print("SMTP error occurred: " + str(e))
    except Exception as e:
        print("Error: " + str(e))


@auth.route("/forgot-password", methods=["GET", "POST"])
def forgot_password():
    if request.method == "POST":
        email = request.form["email"]
        user = User.query.filter_by(email=email).first()
        if user:
            token = generate_token()
            expiration = datetime.utcnow() + timedelta(hours=5)
            password_reset_token = PasswordResetToken(
                user_id=user.id, token=token, expiration=expiration
            )
            db.session.add(password_reset_token)
            db.session.commit()
            send_password_reset_email(user, token)
        return redirect(url_for("auth.password_reset_email_sent"))
    return render_template("forgot_password.html")


@auth.route("/password-reset-email-sent")
def password_reset_email_sent():
    return render_template("password_reset_email_sent.html", user=current_user)


@auth.route("/reset-password/<token>", methods=["GET", "POST"])
def reset_password(token):
    password_reset_token = PasswordResetToken.query.filter_by(token=token).first()
    if password_reset_token and password_reset_token.expiration > datetime.utcnow():
        if request.method == "POST":
            new_password = request.form["password"]
            user = User.query.get(password_reset_token.user_id)
            user.password = generate_password_hash(new_password, method="pbkdf2:sha256")
            db.session.delete(password_reset_token)
            db.session.commit()

            return redirect(url_for("auth.login"))
        return render_template("reset_password.html", token=token)

    return "Token expired or invalid"


@auth.route("/resend-password-reset", methods=["POST"])
def resend_password_reset():
    email = request.form.get("email")
    user = User.query.filter_by(email=email).first()

    if user:
        token = generate_token()
        expiration = datetime.utcnow() + timedelta(hours=5)
        password_reset_token = PasswordResetToken(
            user_id=user.id, token=token, expiration=expiration
        )
        db.session.add(password_reset_token)
        db.session.commit()
        send_password_reset_email(user, token)
        flash("Password reset email resent successfully!", "success")
    else:
        flash("User not found. Please check the email address.", "error")
    return redirect(url_for("auth.password_reset_email_sent"))


@auth.route("/check_username", methods=["POST"])
def check_username():
    data = request.get_json()
    user_name = data.get("username")
    user = User.query.filter_by(user_name=user_name).first()
    return jsonify({"exists": bool(user)})


@auth.route("/update_username", methods=["POST"])
@login_required
def update_username():
    new_username = request.form.get("newUsername")
    if not new_username.startswith("@"):
        flash('Username must start with "@".', "error")
        return redirect(url_for("views.settings"))

    username_without_at = new_username[1:]
    if not (
        4 <= len(username_without_at) <= 50
        and username_without_at.islower()
        and all(c.isalnum() or c == "_" for c in username_without_at)
    ):
        flash(
            "Invalid username. It must be at least 4 characters long and contain only small letters, numbers, and underscores.",
            "error",
        )
        return redirect(url_for("settings"))

    existing_user = User.query.filter(
        User.user_name == new_username, User.id != current_user.id
    ).first()
    if existing_user:
        flash("Username already taken. Please choose a different one.", "error")
        return redirect(url_for("views.settings"))

    current_user.user_name = new_username
    db.session.commit()
    user_time_zone = current_user.time_zone

    if user_time_zone:
        user_tz = timezone(user_time_zone)
        created_at = datetime.now(user_tz)
    else:
        created_at = datetime.utcnow()
    if current_user.push_preferences and current_user.push_preferences.new_message:
        notification = Notification(
            user_id=current_user.id, message="Username Updated", created_at=created_at
        )
        db.session.add(notification)
        db.session.commit()
    return redirect(url_for("views.settings"))


@auth.route("/update_name", methods=["POST"])
@login_required
def update_name():
    first_name = request.form.get("firstName")
    second_name = request.form.get("secondName")

    if not first_name or not second_name:
        flash("Both first name and second name are required.", "error")
        return redirect(url_for("views.settings"))

    if not (
        first_name.replace(" ", "").replace("-", "").isalpha()
        and second_name.replace(" ", "").replace("-", "").isalpha()
    ):
        flash("Names can only contain letters, spaces, and hyphens.", "error")
        return redirect(url_for("views.settings"))

    if not (1 <= len(first_name) <= 50 and 1 <= len(second_name) <= 50):
        flash("Names must be between 1 and 50 characters long.", "error")
        return redirect(url_for("views.settings"))

    try:
        current_user.first_name = first_name
        current_user.second_name = second_name
        current_user.full_name = f"{first_name} {second_name}"
        db.session.commit()
        user_time_zone = current_user.time_zone

        if user_time_zone:
            user_tz = timezone(user_time_zone)
            created_at = datetime.now(user_tz)
        else:
            created_at = datetime.utcnow()
        if current_user.push_preferences and current_user.push_preferences.new_message:
            notification = Notification(
                user_id=current_user.id, message="Name Updated", created_at=created_at
            )
            db.session.add(notification)
            db.session.commit()

        flash("Name updated successfully!", "success")
    except Exception as e:
        db.session.rollback()
        flash("An error occurred while updating your name. Please try again.", "error")
        print(f"Error: {e}")

    return redirect(url_for("views.settings"))


@auth.route("/update_password", methods=["POST"])
@login_required
def update_password():
    current_password = request.form.get("currentPassword")
    new_password = request.form.get("newPassword")
    confirm_password = request.form.get("confirmPassword")

    if not check_password_hash(current_user.password, current_password):
        return jsonify(
            {
                "success": False,
                "message": "Current password is incorrect.",
                "errorField": "currentPasswordError",
            }
        )

    if not (8 <= len(new_password) <= 50):
        return jsonify(
            {
                "success": False,
                "message": "New password must be between 8 and 50 characters long.",
                "errorField": "newPasswordError",
            }
        )

    if new_password != confirm_password:
        return jsonify(
            {
                "success": False,
                "message": "New passwords do not match.",
                "errorField": "confirmPasswordError",
            }
        )

    hashed_password = generate_password_hash(
        new_password, method="pbkdf2:sha256", salt_length=16
    )
    current_user.password = hashed_password
    db.session.commit()

    user_time_zone = current_user.time_zone

    if user_time_zone:
        user_tz = timezone(user_time_zone)
        created_at = datetime.now(user_tz)
    else:
        created_at = datetime.utcnow()
    if current_user.push_preferences and current_user.push_preferences.new_message:
        notification = Notification(
            user_id=current_user.id, message="Password Updated", created_at=created_at
        )
        db.session.add(notification)
        db.session.commit()

    return jsonify({"success": True, "message": "Password updated successfully!"})


@auth.route("/update_profile_pic", methods=["POST"])
@login_required
def update_profile_pic():
    def delete_file(filename):
        if filename:
            file_path = os.path.join(current_app.config["UPLOAD_FOLDER"], filename)
            if os.path.isfile(file_path):
                os.remove(file_path)
    if "profile_pic" in request.files:
        profile_pic = request.files["profile_pic"]
        if profile_pic and allowed_file(profile_pic.filename):
            old_profile_pic = current_user.profile_picture
            if old_profile_pic:
                delete_file(old_profile_pic)
                
            profile_pic_filename = secure_filename(profile_pic.filename)
            profile_pic_path = os.path.join(
                current_app.config["UPLOAD_FOLDER"], profile_pic_filename
            )
            profile_pic.save(profile_pic_path)
            current_user.profile_picture = profile_pic_filename

    if "cover_pic" in request.files:
        cover_pic = request.files["cover_pic"]
        if cover_pic and allowed_file(cover_pic.filename):
            old_cover_pic = current_user.cover_picture
            if old_cover_pic:
                delete_file(old_cover_pic)
                
            cover_pic_filename = secure_filename(cover_pic.filename)
            cover_pic_path = os.path.join(
                current_app.config["UPLOAD_FOLDER"], cover_pic_filename
            )
            cover_pic.save(cover_pic_path)
            current_user.cover_picture = cover_pic_filename

    db.session.commit()
    flash("Profile and/or cover picture updated successfully!", "success")
    return redirect(url_for("views.settings"))


def allowed_file(filename):
    allowed_extensions = {"png", "jpg", "jpeg", "gif"}
    return "." in filename and filename.rsplit(".", 1)[1].lower() in allowed_extensions


# PN
@auth.route("/update_phone_number", methods=["POST"])
@login_required
def update_phone_number():
    user_id = request.form.get("user_id")
    full_phone_number = request.form.get("phone_number")
    country_code = request.form.get("country_code")
    if full_phone_number.startswith(country_code):
        phone_number = full_phone_number[len(country_code) :].strip()
    else:
        phone_number = full_phone_number

    user = User.query.get(user_id)
    if user:
        user.phone_number = phone_number
        user.country_code = country_code
        db.session.commit()
        user_time_zone = current_user.time_zone

    if user_time_zone:
        user_tz = timezone(user_time_zone)
        created_at = datetime.now(user_tz)
    else:
        created_at = datetime.utcnow()

    if current_user.push_preferences and current_user.push_preferences.new_message:
        notification = Notification(
            user_id=current_user.id,
            message="Phone Number Updated",
            created_at=created_at,
        )
        db.session.add(notification)
        db.session.commit()
        return "Phone number updated successfully", 200
    return "Failed to update phone number", 400


from datetime import datetime


# DOB
@auth.route("/update_date_of_birth", methods=["POST"])
@login_required
def update_date_of_birth():
    dob = request.form.get("date_of_birth")
    try:
        dob_date = datetime.strptime(dob, "%Y-%m-%d").date()
        today = datetime.today().date()
        if dob_date > today:
            return "Date of birth cannot be in the future.", 400
    except ValueError:
        return "Invalid date format.", 400

    user = User.query.get(current_user.id)
    if user:
        user.date_birth = dob
        db.session.commit()
    user_time_zone = current_user.time_zone

    if user_time_zone:
        user_tz = timezone(user_time_zone)
        created_at = datetime.now(user_tz)
    else:
        created_at = datetime.utcnow()

    if current_user.push_preferences and current_user.push_preferences.new_message:
        notification = Notification(
            user_id=current_user.id, message="DOB Updated", created_at=created_at
        )
        db.session.add(notification)
        db.session.commit()
        return "Date of birth updated successfully", 200

    return "Failed to update date of birth", 400


@auth.route("/update_time_zone", methods=["POST"])
@login_required
def update_time_zone():
    time_zone = request.form.get("time_zone")

    if not time_zone:
        return jsonify({"error": "Time zone is required"}), 400

    user = User.query.get(current_user.id)
    if user:
        user.time_zone = time_zone
        db.session.commit()

    user_time_zone = current_user.time_zone

    if user_time_zone:
        user_tz = timezone(user_time_zone)
        created_at = datetime.now(user_tz)
    else:
        created_at = datetime.utcnow()
    if current_user.push_preferences and current_user.push_preferences.new_message:
        notification = Notification(
            user_id=current_user.id, message="Timezone Updated", created_at=created_at
        )
        db.session.add(notification)
        db.session.commit()
    return jsonify({"message": "Time zone updated successfully"}), 200


@auth.route("/update_bio", methods=["POST"])
@login_required
def update_bio():
    bio = request.form.get("bio")

    if not bio:
        return jsonify({"error": "Bio is required"}), 400

    user = User.query.get(current_user.id)
    if user:
        user.bio = bio
        db.session.commit()
    user_time_zone = current_user.time_zone

    if user_time_zone:
        user_tz = timezone(user_time_zone)
        created_at = datetime.now(user_tz)
    else:
        created_at = datetime.utcnow()

    if current_user.push_preferences and current_user.push_preferences.new_message:
        notification = Notification(
            user_id=current_user.id, message="Bio Updated", created_at=created_at
        )
        db.session.add(notification)
        db.session.commit()
        return jsonify({"message": "Bio updated successfully"}), 200

    return jsonify({"error": "User not found"}), 404


@auth.route("/update_generated_color", methods=["POST"])
@login_required
def update_generated_color():
    generated_color = request.form.get("generated_color")
    if not generated_color:
        return jsonify({"error": "Color value is required"}), 400

    user = User.query.get(current_user.id)
    if user:
        user.generated_color = generated_color
        db.session.commit()
        user_time_zone = current_user.time_zone

        if user_time_zone:
            user_tz = timezone(user_time_zone)
            created_at = datetime.now(user_tz)
        else:
            created_at = datetime.utcnow()

        if current_user.push_preferences and current_user.push_preferences.new_message:
            notification = Notification(
                user_id=current_user.id,
                message="Color Text Updated",
                created_at=created_at,
            )
            db.session.add(notification)
            db.session.commit()
        return jsonify({"message": "Color updated successfully"}), 200
    return jsonify({"error": "Failed to update color"}), 400


@auth.route("/update_gender", methods=["POST"])
@login_required
def update_gender():
    gender = request.form.get("gender")
    if not gender:
        return jsonify({"error": "Gender is required"}), 400

    user = User.query.get(current_user.id)
    if user:
        user.gender = gender
        db.session.commit()
        user_time_zone = current_user.time_zone

        if user_time_zone:
            user_tz = timezone(user_time_zone)
            created_at = datetime.now(user_tz)
        else:
            created_at = datetime.utcnow()

        if current_user.push_preferences and current_user.push_preferences.new_message:
            notification = Notification(
                user_id=current_user.id, message="Gender Updated", created_at=created_at
            )
            db.session.add(notification)
            db.session.commit()
        return jsonify({"message": "Gender updated successfully"}), 200
    return jsonify({"error": "Failed to update gender"}), 400


@auth.route("/calculate_age", methods=["GET"])
@login_required
def calculate_age():
    date_of_birth_str = current_user.date_birth
    time_zone_str = current_user.time_zone

    if not date_of_birth_str or not time_zone_str:
        return jsonify({"error": "Date of birth or time zone not set"}), 400

    try:
        date_of_birth = parser.parse(date_of_birth_str)
        user_tz = pytz.timezone(time_zone_str)
        current_time = datetime.now(user_tz)

        age = (
            current_time.year
            - date_of_birth.year
            - (
                (current_time.month, current_time.day)
                < (date_of_birth.month, date_of_birth.day)
            )
        )
        return jsonify({"age": age})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@auth.route("/export_notes", methods=["GET"])
@login_required
def export_notes():

    user = User.query.get(current_user.id)
    if not user:
        flash("User not found.", "error")
        return redirect(url_for("views.profile"))

    notes = Note.query.filter_by(user_id=user.id).all()
    notes_data = [note.serialize() for note in notes]
    export_data = {"notes": notes_data}
    json_data = json.dumps(export_data, indent=4)
    buffer = io.BytesIO()
    buffer.write(json_data.encode("utf-8"))
    buffer.seek(0)
    response = make_response(
        send_file(
            buffer,
            as_attachment=True,
            download_name="user_notes.json",
            mimetype="application/json",
        )
    )
    return response


@auth.route("/export_user_details", methods=["GET"])
@login_required
def export_user_details():
    user = User.query.get(current_user.id)
    if not user:
        flash("User not found.", "error")
        return redirect(url_for("views.profile"))
    user_data = user.serialize()
    export_data = {"user": user_data}
    json_data = json.dumps(export_data, indent=4)
    buffer = io.BytesIO()
    buffer.write(json_data.encode("utf-8"))
    buffer.seek(0)
    response = make_response(
        send_file(
            buffer,
            as_attachment=True,
            download_name="user_details.json",
            mimetype="application/json",
        )
    )
    return response


@auth.route("/import_notes", methods=["POST"])
@login_required
def import_notes():
    file = request.files.get("file")

    if not file:
        flash("No file uploaded.", "error")
        return redirect(url_for("views.settings"))

    if not file.filename.endswith(".json"):
        flash("Invalid file format. Please upload a JSON file.", "error")
        return redirect(url_for("views.settings"))

    try:
        filename = secure_filename(file.filename)
        temp_file_path = os.path.join("/tmp", filename)
        file.save(temp_file_path)

        with open(temp_file_path, "r") as f:
            notes_data = json.load(f)

        notes = notes_data.get("notes", [])

        if not isinstance(notes, list):
            flash(
                "Invalid JSON format. The file should contain a list of notes.", "error"
            )
            return redirect(url_for("views.settings"))
        default_tag = NoteTag.query.filter_by(
            name="Default", user_id=current_user.id
        ).first()
        if not default_tag:
            default_tag = NoteTag(
                name="Default", color="#e67e22", user_id=current_user.id
            )
            db.session.add(default_tag)
            db.session.commit()

        default_tag_id = default_tag.id

        for note_data in notes:
            tag_id = note_data["tag_id"]

            existing_tag = NoteTag.query.filter_by(
                id=tag_id, user_id=current_user.id
            ).first()
            if not existing_tag:
                tag_id = default_tag_id

            note = Note.query.filter_by(id=note_data["id"]).first()
            created_at = (
                datetime.fromisoformat(note_data["created_at"])
                if note_data.get("created_at")
                else None
            )
            updated_at = (
                datetime.fromisoformat(note_data["updated_at"])
                if note_data.get("updated_at")
                else None
            )

            if not note:
                note = Note(
                    id=note_data["id"],
                    title=note_data["title"],
                    content=note_data["content"],
                    tag_id=tag_id,
                    user_id=current_user.id,
                    created_at=created_at,
                    updated_at=updated_at,
                    is_favorite=note_data.get("is_favorite", False),
                )
                db.session.add(note)
            else:
                note.title = note_data["title"]
                note.content = note_data["content"]
                note.tag_id = tag_id
                note.updated_at = updated_at
                note.is_favorite = note_data.get("is_favorite", False)
                note.user_id = current_user.id

        db.session.commit()
        flash("Notes imported successfully in Default Bookmark.", "success")

    except json.JSONDecodeError:
        flash("Error decoding JSON file.", "error")
    except Exception as e:
        flash(f"An error occurred: {str(e)}", "error")
    finally:
        if os.path.exists(temp_file_path):
            os.remove(temp_file_path)

    return redirect(url_for("views.settings"))


@auth.route("/update_email_preferences", methods=["POST"])
@login_required
def update_email_preferences():
    newsletter = request.form.get("newsletter") == "on"
    activity_alerts = request.form.get("activity_alerts") == "on"

    current_user.email_preferences.newsletter = newsletter
    current_user.email_preferences.activity_alerts = activity_alerts

    db.session.commit()
    flash("Email preferences updated successfully.", "success")

    return redirect(url_for("views.settings"))


@auth.route("/update_push_notifications", methods=["POST"])
def update_push_notifications():
    if not current_user.is_authenticated:
        flash("You need to log in to update your preferences.", category="warning")
        return redirect(url_for("auth.login"))

    new_message_alerts = request.form.get("new_message") == "on"
    if not current_user.push_preferences:
        current_user.push_preferences = PushPreferences(new_message=new_message_alerts)
    else:
        current_user.push_preferences.new_message = new_message_alerts

    db.session.commit()

    flash("Push notifications preferences updated.", category="success")
    return redirect(url_for("views.settings"))
