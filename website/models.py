from datetime import datetime, timedelta
from . import db
from pytz import timezone
from flask_login import UserMixin
from itsdangerous import URLSafeTimedSerializer
from flask import current_app
import os
import secrets
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Boolean, Text, JSON, Enum, extract



class EmailVerificationToken(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    token = db.Column(db.String(255), unique=True, nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False)
    expiration_date = db.Column(db.DateTime, nullable=False)

    user = db.relationship("User", back_populates="email_verification_tokens")

    def is_expired(self):
        return datetime.utcnow() > self.expiration_date


class User(db.Model, UserMixin):
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(150), unique=True)
    password = db.Column(db.String(255))
    first_name = db.Column(db.String(225))
    second_name = db.Column(db.String(225))
    full_name = db.Column(db.String(255))
    profile_picture = db.Column(db.String(255), nullable=True)
    cover_picture = db.Column(db.String(255), nullable=True)
    user_name = db.Column(db.String(255))
    phone_number = db.Column(db.String(20))
    country_code = db.Column(db.String(10), default="+254")
    bio = db.Column(db.String(255))
    time_zone = db.Column(db.String(255))
    date_birth = db.Column(db.String(255))
    gender = db.Column(db.String(255))
    generated_color = db.Column(db.String(7))
    is_2fa_enabled = db.Column(db.Boolean, default=False)
    otp_secret = db.Column(db.String(32), nullable=True)
    temp_otp = db.Column(db.String(32), nullable=True)
    otp_method = db.Column(db.String(10), nullable=True)
    is_active = db.Column(db.Boolean, default=True)
    email_verified = db.Column(db.Boolean, default=False)
    failed_attempts = db.Column(Integer, default=0)
    account_locked = db.Column(Boolean, default=False)
    lockout_time = db.Column(DateTime)
    is_admin = db.Column(db.Boolean, default=False)
    otp_expiry = db.Column(DateTime)
    profile_visibility = db.Column(db.String(20), default='public')
    role = db.Column(db.Enum('user', 'admin', 'superadmin', name='user_roles'), default='user')
    assigned_by_id = db.Column(db.Integer, ForeignKey('user.id'), nullable=True)
    assigned_admins = db.relationship('User', backref='assigned_by', remote_side=[id])
    imported_notes_count = db.Column(db.Integer, default=0)
    exported_notes_count = db.Column(db.Integer, default=0)

    encrypt_password = db.Column(db.String(128), nullable=True) 
    reset_encrypt_password = db.Column(db.String(128), nullable=True) 
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    note_tags = db.relationship(
        "NoteTag", back_populates="user", cascade="all, delete-orphan"
    )
    notes = db.relationship("Note", back_populates="user", cascade="all, delete-orphan")
    password_reset_tokens = db.relationship(
        "PasswordResetToken", back_populates="user", cascade="all, delete-orphan"
    )
    notifications = db.relationship(
        "Notification", back_populates="user", cascade="all, delete-orphan"
    )
    todos = db.relationship("ToDo", back_populates="user", cascade="all, delete-orphan")
    email_preferences = db.relationship(
        "EmailPreferences",
        uselist=False,
        back_populates="user",
        cascade="all, delete-orphan",
    )
    push_preferences = db.relationship(
        "PushPreferences",
        uselist=False,
        back_populates="user",
        cascade="all, delete-orphan",
    )
    email_verification_tokens = db.relationship(
        "EmailVerificationToken", back_populates="user", cascade="all, delete-orphan"
    )
    sessions = db.relationship(
        "UserSession", back_populates="user", cascade="all, delete-orphan"
    )

    def generate_verification_token(self):
        token = secrets.token_urlsafe(32)
        expiration_date = datetime.utcnow() + timedelta(hours=1)
        verification_token = EmailVerificationToken(
            token=token, user_id=self.id, expiration_date=expiration_date
        )
        db.session.add(verification_token)
        db.session.commit()
        return token

    @staticmethod
    def verify_verification_token(token):
        verification_token = EmailVerificationToken.query.filter_by(token=token).first()
        if verification_token and not verification_token.is_expired():
            return verification_token.user.email
        return None


    def __init__(
        self,
        email,
        password,
        first_name,
        second_name,
        full_name,
        user_name,
        time_zone,
        generated_color=None,
        role='user',
        assigned_by_id=None,
        failed_attempts=0,
        assigned_admins = None,
        account_locked=False,
        lockout_time=None,
        otp_expiry = None,
        otp_method=None,
        is_admin = False,
        encrypt_password=None, 
        reset_encrypt_password=None,
        imported_notes_count = None,
        exported_notes_count = None,
        profile_visibility='public' 
    ):
        self.email = email
        self.password = password
        self.assigned_by_id = assigned_by_id
        self.first_name = first_name
        self.second_name = second_name
        self.full_name = full_name
        self.profile_picture = None
        self.cover_picture = None
        self.user_name = user_name
        self.phone_number = None
        self.country_code = None
        self.bio = None
        self.time_zone = time_zone
        self.date_birth = None
        self.gender = None
        self.generated_color = generated_color
        self.is_active = True
        self.role = role 
        self.is_admin = is_admin
        self.assigned_admins = assigned_admins
        self.failed_attempts = failed_attempts
        self.account_locked = account_locked
        self.lockout_time = lockout_time
        self.profile_visibility = profile_visibility
        self.encrypt_password = encrypt_password
        self.reset_encrypt_password = reset_encrypt_password
        self.otp_method = None
        self.created_at = datetime.utcnow()
        self.otp_expiry = None
        self.email_preferences = EmailPreferences()
        self.imported_notes_count = imported_notes_count
        self.exported_notes_count = exported_notes_count
        self.push_preferences = PushPreferences(new_message=True)


    def serialize(self):
        return {
            "id": self.id,
            "email": self.email,
            "first_name": self.first_name,
            "second_name": self.second_name,
            "full_name": self.full_name,
            "user_name": self.user_name,
            "phone_number": self.phone_number,
            "country_code": self.country_code,
            "bio": self.bio,
            "role": self.role,
            "assigned_admins": self.assigned_admins,
            "time_zone": self.time_zone,
            "date_birth": self.date_birth,
            "gender": self.gender,
            "generated_color": self.generated_color,
            "is_active": self.is_active,
            "is_admin": self.is_admin,
            "failed_attempts": self.failed_attempts,
            "account_locked": self.account_locked,
            "lockout_time": self.lockout_time,
            "created_at": self.created_at,  
            "profile_visibility": self.profile_visibility,
            "encrypt_password": self.encrypt_password,
            "imported_notes_count": self.imported_notes_count,
            "exported_notes_count": seld.exported_notes_count,
            "reset_encrypt_password": self.reset_encrypt_password,
            "otp_method": self.otp_method,
            "email_preferences": {
                "newsletter": self.email_preferences.newsletter if self.email_preferences else None,
                "activity_alerts": self.email_preferences.activity_alerts if self.email_preferences else None,
            },
            "push_preferences": {
                "new_message": self.push_preferences.new_message if self.push_preferences else None,
            },
        }

class Admin:
    @staticmethod
    def view_statistics():
        users_data = []
        users = User.query.all()

        for user in users:
            user_data = {
                "id": user.id,
                "full_name": user.full_name,
                "username" : user.user_name,
                "total_notes": Note.query.filter_by(user_id=user.id).count(),
                "total_todos": ToDo.query.filter_by(user_id=user.id).count(),
                "note_tags": NoteTag.query.filter_by(user_id=user.id).count()
            }
            users_data.append(user_data)

        return {
            "total_users": len(users),
            "users_data": users_data,  
            "total_notes": Note.query.count(),
            "total_todos": ToDo.query.count(),
            "note_tags": NoteTag.query.count()
        }



    @staticmethod
    def deactivate_user(user_id):
        user = User.query.get(user_id)
        if user:
            user.is_active = False
            db.session.commit()
            return True
        return False

    @staticmethod
    def delete_user(user_id):
        user = User.query.get(user_id)
        if user:
            db.session.delete(user)
            db.session.commit()
            return True
        return False

    @staticmethod
    def assign_admin(user_id):
        user = User.query.get(user_id)
        if user and user.role != 'admin':
            user.role = 'admin'
            db.session.commit()
            return True
        return False

    @staticmethod
    def activate_deactivated_user(user_id):
        user = User.query.get(user_id)
        if user and not user.is_active:
            user.is_active = True
            db.session.commit()
            return True
        return False
    
    @staticmethod
    def view_monthly_statistics():
        current_year = datetime.now().year
        current_month = datetime.now().month
        users_this_month = User.query.filter(
            extract('year', User.created_at) == current_year,
            extract('month', User.created_at) == current_month
        ).count()
        notes_this_month = Note.query.filter(
            extract('year', Note.created_at) == current_year,
            extract('month', Note.created_at) == current_month
        ).count()
        todos_this_month = ToDo.query.filter(
            extract('year', ToDo.created_at) == current_year,
            extract('month', ToDo.created_at) == current_month
        ).count()

        return {
            "users_this_month": users_this_month,
            "notes_this_month": notes_this_month,
            "todos_this_month": todos_this_month
        }

    @staticmethod
    def view_login_activities():
        login_activities = LoginActivity.query.order_by(LoginActivity.timestamp.desc()).all()
        activities_data = []
        for activity in login_activities:
            activities_data.append({
                "user_id": activity.user_id,
                "email": activity.user.email,
                "timestamp": activity.get_local_timestamp(),
                "ip_address": activity.ip_address,
                "user_agent": activity.user_agent,
                "time_zone": activity.time_zone,
                "browser_name": activity.browser_name
            })
        return activities_data
    
    @staticmethod
    def view_user_notes_statistics():
        users_data = []
        users = User.query.all()

        for user in users:
            users_data.append({
                "id": user.id,
                "full_name": user.full_name,
                "username": user.user_name,
                "imported_notes_count": user.imported_notes_count,
                "exported_notes_count": user.exported_notes_count,
            })

        return {
            "total_users": len(users),
            "users_data": users_data,
        }




class UserSession(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False)
    session_id = db.Column(db.String(128), nullable=False)
    device_info = db.Column(db.String(256))
    login_time = db.Column(db.DateTime, default=datetime.utcnow)
    last_active_time = db.Column(db.DateTime, default=datetime.utcnow)
    is_active = db.Column(db.Boolean, default=True)

    user = db.relationship("User", back_populates="sessions")


class Message(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    sender_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False)
    receiver_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False)
    content = db.Column(db.Text, nullable=False)
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)
    is_read = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    edited_at = db.Column(db.DateTime, onupdate=datetime.utcnow)
    is_deleted = db.Column(db.Boolean, default=False)
    reply_to_id = db.Column(db.Integer, db.ForeignKey("message.id"), nullable=True)
    reactions = db.Column(db.JSON, default=dict)

    sender = db.relationship("User", foreign_keys=[sender_id])
    receiver = db.relationship("User", foreign_keys=[receiver_id])
    reply_to = db.relationship(
        "Message", remote_side=[id], backref="replies", foreign_keys=[reply_to_id]
    )


class Friendship(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(
        db.Integer, db.ForeignKey("user.id"), nullable=False
    )  # Who sent the request
    friend_id = db.Column(
        db.Integer, db.ForeignKey("user.id"), nullable=False
    )  # Who received the request
    is_accepted = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    user = db.relationship("User", foreign_keys=[user_id])
    friend = db.relationship("User", foreign_keys=[friend_id])


class Following(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    follower_id = db.Column(
        db.Integer, db.ForeignKey("user.id"), nullable=False
    )  # User who is following
    followed_id = db.Column(
        db.Integer, db.ForeignKey("user.id"), nullable=False
    )  # User being followed
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    follower = db.relationship("User", foreign_keys=[follower_id])
    followed = db.relationship("User", foreign_keys=[followed_id])


class PushPreferences(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("user.id"))
    new_message = db.Column(db.Boolean, default=True)

    user = db.relationship("User", back_populates="push_preferences")


class EmailPreferences(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False)
    newsletter = db.Column(db.Boolean, default=False)
    activity_alerts = db.Column(db.Boolean, default=False)

    user = db.relationship("User", back_populates="email_preferences")


class NoteTag(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    color = db.Column(db.String(7), nullable=False, default="#000000")
    user_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    user = db.relationship("User", back_populates="note_tags")
    notes = db.relationship("Note", back_populates="tag", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<NoteTag {self.name}>"


class Note(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(255), nullable=False)
    content = db.Column(db.Text, nullable=False)
    tag_id = db.Column(db.Integer, db.ForeignKey("note_tag.id"), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, onupdate=datetime.utcnow)
    is_favorite = db.Column(db.Boolean, default=False)

    user = db.relationship("User", back_populates="notes")
    tag = db.relationship("NoteTag", back_populates="notes")

    def serialize(self):
        return {
            "id": self.id,
            "title": self.title,
            "content": self.content,
            "tag_id": self.tag_id,
            "user_id": self.user_id,
            "created_at": self.created_at.isoformat(),
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
            "is_favorite": self.is_favorite,
        }


class PasswordResetToken(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False)
    token = db.Column(db.String(120), nullable=False, unique=True)
    expiration = db.Column(db.DateTime, nullable=False)

    user = db.relationship("User", back_populates="password_reset_tokens")


class ToDo(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(255), nullable=False)
    content = db.Column(db.Text, nullable=True)
    user_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False)
    is_completed = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow)
    due_date = db.Column(db.DateTime, nullable=True)

    user = db.relationship("User", back_populates="todos")
    subtasks = db.relationship(
        "Subtask", back_populates="parent_todo", cascade="all, delete-orphan"
    )

    def __repr__(self):
        return f"<ToDo {self.title}>"


class Subtask(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(255), nullable=False)
    content = db.Column(db.Text, nullable=True)
    is_completed = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    todo_id = db.Column(db.Integer, db.ForeignKey("to_do.id"), nullable=False)

    parent_todo = db.relationship("ToDo", back_populates="subtasks")

    def __repr__(self):
        return f"<Subtask {self.title}>"


class Rating(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(100), nullable=False)
    rating = db.Column(db.Integer, nullable=False)
    comments = db.Column(db.Text, nullable=True)
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)

    def __repr__(self):
        return f"<Rating {self.username} - {self.rating}>"


class LoginActivity(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False)
    timestamp = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    ip_address = db.Column(db.String(45), nullable=False)
    user_agent = db.Column(db.String(256), nullable=False)
    time_zone = db.Column(db.String(255), nullable=False, default="UTC")
    browser_name = db.Column(db.String(50), nullable=False)  # Add this line

    user = db.relationship("User", backref=db.backref("login_activities", lazy=True))

    def get_local_timestamp(self):
        local_tz = timezone(self.time_zone)
        return self.timestamp.astimezone(local_tz) if self.timestamp else None


class Notification(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("user.id"))
    message = db.Column(db.String(255))
    is_read = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    user = db.relationship("User", back_populates="notifications")

    @staticmethod
    def add_notification(user, message):
        if user.push_preferences and user.push_preferences.new_message:
            notification = Notification(user_id=user.id, message=message)
            db.session.add(notification)
            db.session.commit()

    @staticmethod
    def remove_notification(user, message_id):
        notification = Notification.query.filter_by(
            id=message_id, user_id=user.id
        ).first()
        if notification:
            db.session.delete(notification)
            db.session.commit()
