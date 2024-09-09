from flask import (
    Blueprint,
    render_template,
    request,
    redirect,
    url_for,
    flash,
    current_app,
    jsonify,
)
from mailjet_rest import Client
from . import db
from .models import User, Rating
from flask_login import login_required, current_user
from werkzeug.utils import secure_filename
import os
from datetime import datetime
import re
from .models import User, NoteTag, Note, Notification, ToDo, Subtask
import pytz
from html import escape
from pytz import timezone
from datetime import datetime


views = Blueprint("views", __name__)


def allowed_file(filename):
    return "." in filename and filename.rsplit(".", 1)[1].lower() in {
        "png",
        "jpg",
        "jpeg",
        "gif",
    }


@views.route("/", methods=["GET", "POST"])
def home():
    if request.method == "POST":
        username = request.form["username"]
        email = request.form["email"]
        rating = int(request.form["rating"])
        comments = request.form["comments"]

        new_rating = Rating(
            username=username, email=email, rating=rating, comments=comments
        )
        db.session.add(new_rating)
        db.session.commit()

        flash("Rating submitted successfully!", "success")
        return redirect(url_for("views.home"))

    latest_ratings = Rating.query.order_by(Rating.timestamp.desc()).limit(4).all()
    user_count = User.query.count()
    total_reviews_count = Rating.query.count()
    return render_template(
        "home.html",
        user_count=user_count,
        latest_ratings=latest_ratings,
        total_reviews_count=total_reviews_count,
    )


@views.route("/all-reviews")
def all_reviews():
    all_ratings = Rating.query.order_by(Rating.timestamp.desc()).all()
    return render_template("all_reviews.html", all_ratings=all_ratings)


@views.route("/user_home")
@login_required
def user_home():
    tags = NoteTag.query.filter_by(user_id=current_user.id).all()
    tags_with_counts = [
        {
            "id": tag.id,
            "name": tag.name,
            "color": tag.color,
            "note_count": Note.query.filter_by(
                tag_id=tag.id, user_id=current_user.id
            ).count(),
        }
        for tag in tags
    ]
    notes = Note.query.filter_by(user_id=current_user.id).order_by(
        Note.created_at.desc(),
        Note.updated_at.desc()
    ).all()
    
    return render_template("user_home.html", tags=tags_with_counts, notes=notes)


@views.route("/profile")
@login_required
def profile():
    today = datetime.today().date().isoformat()
    return render_template("profile.html", current_user=current_user, today=today)


@views.route("/tag/<int:tag_id>", defaults={"note_id": None})
@views.route("/tag/<int:tag_id>/note/<int:note_id>")
@login_required
def tag_notes(tag_id, note_id):
    tag = NoteTag.query.get_or_404(tag_id)
    notes = (
        Note.query.filter_by(tag_id=tag_id, user_id=current_user.id)
        .order_by(db.desc(db.func.coalesce(Note.updated_at, Note.created_at)))
        .all()
    )
    tags = NoteTag.query.filter_by(user_id=current_user.id).all()
    tags_with_counts = []
    for t in tags:
        note_count = Note.query.filter_by(tag_id=t.id, user_id=current_user.id).count()
        tags_with_counts.append(
            {"id": t.id, "name": t.name, "color": t.color, "note_count": note_count}
        )

    note = None
    if note_id:
        note = Note.query.get_or_404(note_id)

    return render_template(
        "tag_notes.html", tag=tag, notes=notes, tags=tags_with_counts, note=note
    )


@views.route("/add_note/<int:tag_id>", methods=["GET"])
def show_add_note(tag_id):
    tag = NoteTag.query.get_or_404(tag_id)
    tags = NoteTag.query.filter_by(user_id=current_user.id).all()
    return render_template("add_note.html", tag=tag, tags=tags)


from flask import abort


@views.route("/add_note", methods=["POST"])
def add_note():
    title = request.form.get("title")
    content = request.form.get("content")
    tag_id = request.form.get("tag_id")
    user_id = current_user.id

    # Debugging prints
    print(f"Title: {title}")
    print(f"Content: {content}")
    print(f"Tag ID: {tag_id}")

    if not all([title, content, tag_id]):
        abort(400, "Missing required form fields.")

    user_time_zone = current_user.time_zone
    created_at = (
        datetime.now(timezone(user_time_zone)) if user_time_zone else datetime.utcnow()
    )

    new_note = Note(
        title=title,
        content=content,
        tag_id=tag_id,
        user_id=user_id,
        created_at=created_at,
    )

    db.session.add(new_note)
    db.session.commit()

    if current_user.push_preferences and current_user.push_preferences.new_message:
        notification = Notification(
            user_id=current_user.id,
            message=f"New note added: {title}",
            created_at=created_at,
        )
        db.session.add(notification)
        db.session.commit()

    flash("Note added successfully", "success")
    return redirect(url_for("views.tag_notes", tag_id=tag_id))


@views.route("/add_note", methods=["GET"])
def show_add_note2():
    tags = NoteTag.query.filter_by(user_id=current_user.id).all()
    return render_template("all_notes_add.html", tags=tags)


from flask import abort


@views.route("/add_note2", methods=["POST"])
def add_note_all():
    title = request.form["title"]
    content = request.form["content"]
    tag_id = request.form["tag_id"]
    user_id = current_user.id

    if not all([title, content, tag_id]):
        abort(400, "Missing required form fields.")
    user_time_zone = current_user.time_zone

    if user_time_zone:
        user_tz = timezone(user_time_zone)
        created_at = datetime.now(user_tz)
    else:
        created_at = datetime.utcnow()

    user_timezone = current_user.time_zone
    user_tz = pytz.timezone(user_timezone)
    created_at = datetime.now(pytz.utc).astimezone(user_tz)

    new_note = Note(
        title=title,
        content=content,
        tag_id=tag_id,
        user_id=user_id,
        created_at=created_at,
    )
    db.session.add(new_note)
    db.session.commit()

    if current_user.push_preferences and current_user.push_preferences.new_message:
        notification = Notification(
            user_id=current_user.id,
            message=f"New note added: {title}",
            created_at=created_at,
        )
        db.session.add(notification)
        db.session.commit()
    return redirect(url_for("views.user_home"))


@views.route("/edit_note/<int:note_id>", methods=["GET"])
@login_required
def show_edit_note(note_id):
    note = Note.query.get_or_404(note_id)
    if note.user_id != current_user.id:
        flash("You do not have permission to edit this note.", "danger")
        return redirect(url_for("views.home"))
    tags = NoteTag.query.filter_by(user_id=current_user.id).all()
    return render_template("edit_note.html", note=note, tags=tags)


@views.route("/edit_note/<int:note_id>", methods=["POST"])
@login_required
def edit_note(note_id):
    user_time_zone = current_user.time_zone
    note = Note.query.get_or_404(note_id)
    if note.user_id != current_user.id:
        flash("You do not have permission to edit this note.", "danger")
        return redirect(url_for("views.home"))

    note.title = request.form["title"]
    note.content = request.form["content"]
    note.updated_at = datetime.now(pytz.utc).astimezone(
        pytz.timezone(current_user.time_zone)
    )

    if user_time_zone:
        user_tz = timezone(user_time_zone)
        created_at = datetime.now(user_tz)
    else:
        created_at = datetime.utcnow()
    db.session.commit()
    if current_user.push_preferences and current_user.push_preferences.new_message:
        notification = Notification(
            user_id=current_user.id,
            message=f"Note updated: {note.title}",
            created_at=created_at,
        )
        db.session.add(notification)
        db.session.commit()
    flash("Note updated Successfully", "success")
    return redirect(url_for("views.view_note", note_id=note.id))


@views.route("/note_viewer/<int:note_id>", methods=["GET"])
@login_required
def view_note(note_id):
    note = Note.query.get_or_404(note_id)
    tag = note.tag
    tags = NoteTag.query.filter_by(user_id=current_user.id).all()

    if note.user_id != current_user.id:
        flash("You do not have permission to view this note.", "danger")
        return redirect(url_for("views.home"))

    notes = (
        Note.query.filter_by(tag_id=tag.id, user_id=current_user.id)
        .order_by(db.desc(db.func.coalesce(Note.updated_at, Note.created_at)))
        .all()
    )

    return render_template(
        "view_note.html", note=note, tag=tag, tags=tags, notes=notes, escape=escape
    )


@views.route("/delete_note/<int:note_id>", methods=["POST"])
@login_required
def delete_note(note_id):
    note = Note.query.get_or_404(note_id)

    if note.user_id != current_user.id:
        flash("You do not have permission to delete this note.", "danger")
        return redirect(url_for("views.tag_notes", tag_id=note.tag_id))

    tag_id = note.tag_id
    db.session.delete(note)
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
            message=f"Note deleted: {note.title}",
            created_at=created_at,
        )
        db.session.add(notification)
        db.session.commit()

    flash("Note deleted successfully.", "success")
    return redirect(url_for("views.tag_notes", tag_id=tag_id))


import logging

logging.basicConfig(level=logging.DEBUG)


@views.route("/search_notes", methods=["GET"])
@login_required
def search_notes():
    query = request.args.get("query", "")
    tag_id = request.args.get("tag_id", type=int)

    logging.debug(f"Search query: {query}, Tag ID: {tag_id}")

    if not query or not tag_id:
        return jsonify([])

    notes = Note.query.filter(
        Note.tag_id == tag_id,
        Note.user_id == current_user.id,
        (Note.title.contains(query) | Note.content.contains(query)),
    ).all()

    logging.debug(f"Found notes: {notes}")

    result = []
    for note in notes:
        result.append(
            {
                "id": note.id,
                "title": note.title,
                "content": note.content,
                "color": note.tag.color,
            }
        )

    return jsonify(result)


@views.route("/search_all_notes", methods=["GET"])
@login_required
def search_all_notes():
    query = request.args.get("query", "")
    if not query:
        notes = (
            Note.query.filter_by(user_id=current_user.id)
            .order_by(db.desc(db.func.coalesce(Note.updated_at, Note.created_at)))
            .all()
        )
    else:
        notes = (
            Note.query.filter(
                Note.user_id == current_user.id,
                (Note.title.contains(query) | Note.content.contains(query)),
            )
            .order_by(db.desc(db.func.coalesce(Note.updated_at, Note.created_at)))
            .all()
        )

    result = [
        {
            "id": note.id,
            "title": note.title,
            "content": note.content,
            "color": current_user.generated_color,
            "tagName": note.tag.name if note.tag else "No Tag",
            "updated_at": note.updated_at.isoformat() if note.updated_at else None,
            "created_at": note.created_at.isoformat(),
        }
        for note in notes
    ]

    return jsonify(result)


@views.route("/add_favorite", methods=["POST"])
def add_favorite():
    note_id = request.json.get("note_id")
    note = Note.query.get(note_id)
    if note:
        if note.is_favorite:
            return jsonify({"message": "Note is already in favorites."}), 200
        else:
            note.is_favorite = True
            db.session.commit()

            user_time_zone = current_user.time_zone

            if user_time_zone:
                user_tz = timezone(user_time_zone)
                created_at = datetime.now(user_tz)
            else:
                created_at = datetime.utcnow()
            if (
                current_user.push_preferences
                and current_user.push_preferences.new_message
            ):
                notification = Notification(
                    user_id=current_user.id,
                    message=f"Note added to favorites: {note.title}",
                    created_at=created_at,
                )
            db.session.add(notification)
            db.session.commit()
            flash("Successfully added to favorites list", "success")

            return jsonify({"message": "Note added to favorites."}), 200
    else:
        return jsonify({"message": "Note not found."}), 404


from flask import url_for

@views.route("/toggle_favorite", methods=["POST"])
def toggle_favorite():
    note_id = request.json.get("note_id")
    note = Note.query.get(note_id)

    if note:
        note.is_favorite = not note.is_favorite
        user_time_zone = current_user.time_zone
        if user_time_zone:
            user_tz = timezone(user_time_zone)
            created_at = datetime.now(user_tz)
        else:
            created_at = datetime.utcnow()
        note.updated_at = created_at
        db.session.commit()
        if note.is_favorite:
            notification_message = "Note added to favorites."
        else:
            notification_message = "Note removed from favorites."
        if current_user.push_preferences and current_user.push_preferences.new_message:
            notification = Notification(
                user_id=current_user.id,
                message=notification_message,
                created_at=created_at,
            )
            db.session.add(notification)
            db.session.commit()
        flash(notification_message, 'success')
        return jsonify({
            "is_favorite": note.is_favorite,
            "redirect_url": url_for('views.view_note', note_id=note_id)
        }), 200
    else:
        flash("Note not found.", 'error')
        return jsonify({"message": "Note not found."}), 404

@views.route("/get_favorite_count", methods=["GET"])
def get_favorite_count():
    if current_user.is_authenticated:
        favorite_count = Note.query.filter_by(
            user_id=current_user.id, is_favorite=True
        ).count()
        return jsonify({"favorite_count": favorite_count}), 200
    else:
        return jsonify({"error": "User not authenticated"}), 401


@views.route("/search_favorite_notes", methods=["GET"])
@login_required
def search_favorite_notes():
    query = request.args.get("query", "")
    if not query:
        favorite_notes = (
            Note.query.filter_by(user_id=current_user.id, is_favorite=True)
            .order_by(db.desc(db.func.coalesce(Note.updated_at, Note.created_at)))
            .all()
        )
    else:
        favorite_notes = (
            Note.query.filter(
                Note.user_id == current_user.id,
                Note.is_favorite == True,
                (Note.title.contains(query) | Note.content.contains(query)),
            )
            .order_by(db.desc(db.func.coalesce(Note.updated_at, Note.created_at)))
            .all()
        )

    result = [
        {
            "id": note.id,
            "title": note.title,
            "content": note.content,
            "color": current_user.generated_color,
            "tagName": note.tag.name if note.tag else "No Tag",
            "updated_at": note.updated_at.isoformat() if note.updated_at else None,
            "created_at": note.created_at.isoformat(),
        }
        for note in favorite_notes
    ]

    return jsonify(result)


@views.route("/favorites")
@login_required
def favorites():
    tags = NoteTag.query.filter_by(user_id=current_user.id).all()

    tag_counts = {}
    for tag in tags:
        note_count = Note.query.filter_by(
            tag_id=tag.id, user_id=current_user.id
        ).count()
        tag_counts[tag.id] = note_count

    favorite_notes = (
        Note.query.filter_by(user_id=current_user.id, is_favorite=True)
        .order_by(db.desc(db.func.coalesce(Note.updated_at, Note.created_at)))
        .all()
    )

    return render_template(
        "favorite.html", tags=tags, favorite_notes=favorite_notes, tag_counts=tag_counts
    )


@views.route("/get_favorite_notes", methods=["GET"])
def get_favorite_notes():
    if current_user.is_authenticated:
        favorite_notes = Note.query.filter_by(
            user_id=current_user.id, is_favorite=True
        ).all()
        favorite_count = len(favorite_notes)
        notes_list = [note.serialize() for note in favorite_notes]
        return (
            jsonify({"favorite_notes": notes_list, "favorite_count": favorite_count}),
            200,
        )
    else:
        return jsonify({"error": "User not authenticated"}), 401


@views.route("/remove_favorite", methods=["POST"])
def remove_favorite():
    note_id = request.json.get("note_id")
    note = Note.query.get(note_id)
    if note:
        if note.is_favorite:
            note.is_favorite = False
            db.session.commit()

            db.session.commit()
            user_time_zone = current_user.time_zone

            if user_time_zone:
                user_tz = timezone(user_time_zone)
                created_at = datetime.now(user_tz)
            else:
                created_at = datetime.utcnow()
            flash("Note Removed from Favorite", "success")
            if (
                current_user.push_preferences
                and current_user.push_preferences.new_message
            ):
                notification = Notification(
                    user_id=current_user.id,
                    message=f"Note removed from favorites: {note.title}",
                    created_at=created_at,
                )
                db.session.add(notification)
                db.session.commit()
            favorite_count = Note.query.filter_by(
                user_id=current_user.id, is_favorite=True
            ).count()
            return (
                jsonify(
                    {
                        "message": "Note removed from favorites.",
                        "favorite_count": favorite_count,
                    }
                ),
                200,
            )
        else:
            return jsonify({"message": "Note is not in favorites."}), 200
    else:
        return jsonify({"message": "Note not found."}), 404


@views.route("/get_notifications")
@login_required
def get_notifications():
    unread_count = Notification.query.filter_by(
        user_id=current_user.id, is_read=False
    ).count()
    return jsonify({"unread_count": unread_count})


@views.route("/notifications")
@login_required
def notifications():
    tags = NoteTag.query.filter_by(user_id=current_user.id).all()

    tag_counts = {}
    for tag in tags:
        note_count = Note.query.filter_by(
            tag_id=tag.id, user_id=current_user.id
        ).count()
        tag_counts[tag.id] = note_count

    notifications = (
        Notification.query.filter_by(user_id=current_user.id)
        .order_by(db.desc(Notification.created_at))
        .all()
    )

    return render_template(
        "notifications.html",
        notifications=notifications,
        tags=tags,
        tag_counts=tag_counts,
    )

@views.route("/mark_all_as_read", methods=["POST"])
@login_required
def mark_all_as_read():
    try:
        notifications = Notification.query.filter_by(user_id=current_user.id, is_read=False).all()
        for notification in notifications:
            notification.is_read = True
        db.session.commit()
        return jsonify({"message": "All notifications marked as read."}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500

@views.route("/mark_as_read/<int:notification_id>", methods=["POST"])
@login_required
def mark_as_read(notification_id):
    notification = Notification.query.get_or_404(notification_id)
    if notification.user_id == current_user.id:
        notification.is_read = True
        db.session.commit()
        return jsonify({"message": "Notification marked as read."}), 200
    else:
        return jsonify({"message": "Unauthorized."}), 403


@views.route("/todos")
@login_required
def show_todo_page():
    tags = NoteTag.query.filter_by(user_id=current_user.id).all()

    tag_counts = {}
    for tag in tags:
        note_count = Note.query.filter_by(
            tag_id=tag.id, user_id=current_user.id
        ).count()
        tag_counts[tag.id] = note_count

    todos = (
        ToDo.query.filter_by(user_id=current_user.id)
        .order_by(db.desc(ToDo.created_at))
        .all()
    )

    user_time_zone = current_user.time_zone if current_user.time_zone else "UTC"
    utc_now = datetime.utcnow().replace(tzinfo=pytz.utc)
    user_tz = pytz.timezone(user_time_zone)
    current_date = utc_now.astimezone(user_tz)

    for todo in todos:
        if todo.due_date:
            if todo.due_date.tzinfo is None:
                todo.due_date = pytz.utc.localize(todo.due_date)
            todo.due_date = todo.due_date.astimezone(user_tz)
            if todo.due_date < current_date and not todo.is_completed:
                todo.is_completed = True
                todo.updated_at = datetime.utcnow()
                db.session.commit()

    return render_template(
        "todos.html",
        todos=todos,
        tags=tags,
        tag_counts=tag_counts,
        current_date=current_date,
    )


@views.route("/search_todos", methods=["GET"])
@login_required
def search_todos():
    query = request.args.get("query", "")
    if not query:
        todos = (
            ToDo.query.filter_by(user_id=current_user.id)
            .order_by(db.desc(db.func.coalesce(ToDo.updated_at, ToDo.created_at)))
            .all()
        )
    else:
        todos = (
            ToDo.query.filter(
                ToDo.user_id == current_user.id,
                (ToDo.title.contains(query) | ToDo.content.contains(query)),
            )
            .order_by(db.desc(db.func.coalesce(ToDo.updated_at, ToDo.created_at)))
            .all()
        )

    result = [
        {
            "id": todo.id,
            "title": todo.title,
            "content": todo.content,
            "color": current_user.generated_color,
            "due_date": todo.due_date.isoformat() if todo.due_date else None,
            "is_completed": todo.is_completed,
            "updated_at": todo.updated_at.isoformat() if todo.updated_at else None,
            "created_at": todo.created_at.isoformat(),
        }
        for todo in todos
    ]

    return jsonify(result)


@views.route("/update_todo_status/<int:todo_id>", methods=["POST"])
@login_required
def update_todo_status(todo_id):
    todo = ToDo.query.get_or_404(todo_id)

    if todo.user_id != current_user.id:
        abort(403)

    data = request.get_json()
    if not data or "is_completed" not in data:
        return jsonify({"error": "Invalid data"}), 400

    is_completed = data.get("is_completed")
    if not isinstance(is_completed, bool):
        return jsonify({"error": "Invalid data"}), 400

    todo.is_completed = is_completed
    todo.updated_at = datetime.utcnow()

    if is_completed:
        # Mark all subtasks as completed
        for subtask in todo.subtasks:
            subtask.is_completed = True
            subtask.updated_at = datetime.utcnow()

    db.session.commit()

    return jsonify({"message": "To-Do status updated"}), 200


@views.route("/get_todo_count", methods=["GET"])
@login_required
def get_todo_count():
    todo_count = ToDo.query.filter_by(
        user_id=current_user.id, is_completed=False
    ).count()
    return jsonify({"count": todo_count}), 200


@views.route("/add_to_do", methods=["POST"])
@login_required
def add_to_do():
    note_id = request.json.get("note_id")
    note = Note.query.get(note_id)

    if note:
        user_time_zone = current_user.time_zone

        if user_time_zone:
            user_tz = timezone(user_time_zone)
            created_at = datetime.now(user_tz)
        else:
            created_at = datetime.utcnow()

        to_do = ToDo(
            title=note.title,
            content=note.content,
            user_id=current_user.id,
            is_completed=False,
            created_at=created_at,
        )
        db.session.add(to_do)
        db.session.commit()
        flash("To-do added successfully", "success")
        return jsonify({"success": True}), 200
    else:
        return jsonify({"success": False, "message": "Note not found."}), 404


@views.route("/delete_todo/<int:todo_id>", methods=["POST"])
@login_required
def delete_todo(todo_id):
    todo = ToDo.query.get_or_404(todo_id)

    if todo.user_id != current_user.id:
        flash("You do not have permission to delete this To-Do.", "danger")
        return redirect(url_for("views.show_todo_page"))

    db.session.delete(todo)
    db.session.commit()

    flash("To-do deleted successfully", "success")

    user_time_zone = current_user.time_zone
    created_at = datetime.utcnow()

    if user_time_zone:
        user_tz = timezone(user_time_zone)
        created_at = created_at.replace(tzinfo=pytz.utc).astimezone(user_tz)

    if current_user.push_preferences and current_user.push_preferences.new_message:
        notification = Notification(
            user_id=current_user.id, message="To-do Deleted", created_at=created_at
        )
        db.session.add(notification)
        db.session.commit()

    return redirect(url_for("views.show_todo_page"))


@views.route("/todos/edit/<int:id>", methods=["GET", "POST"])
def edit_todo(id):
    todo = ToDo.query.get_or_404(id)
    if request.method == "POST":
        todo.title = request.form.get("title")
        todo.content = request.form.get("content")
        due_date_str = request.form.get("due_date")
        if due_date_str:
            todo.due_date = datetime.strptime(due_date_str, "%Y-%m-%d")
        else:
            todo.due_date = None

        db.session.commit()
        return redirect(url_for("views.show_todo_page"))

    return render_template("edit_todo.html", todo=todo)


@views.route("/add_todo_page", methods=["GET", "POST"])
@login_required
def add_todo_page():
    if request.method == "POST":
        title = request.form.get("title")
        content = request.form.get("content")
        due_date = request.form.get("due_date")
        due_date = datetime.strptime(due_date, "%Y-%m-%d") if due_date else None
        user_time_zone = current_user.time_zone

        if user_time_zone:
            user_tz = timezone(user_time_zone)
            created_at = datetime.now(user_tz)
        else:
            created_at = datetime.utcnow()

        new_todo = ToDo(
            title=title,
            content=content,
            user_id=current_user.id,
            is_completed=False,
            created_at=datetime.utcnow(),
            due_date=due_date,
        )
        db.session.add(new_todo)
        db.session.commit()
        flash("To-do added successfully", "success")

        if current_user.push_preferences and current_user.push_preferences.new_message:
            notification = Notification(
                user_id=current_user.id,
                message=f"New To-do added {title}",
                created_at=created_at,
            )
            db.session.add(notification)
            db.session.commit()
        return redirect(url_for("views.show_todo_page"))

    return render_template("add_todo.html")


@views.route("/update_tag/<int:tag_id>", methods=["POST"])
@login_required
def update_tag(tag_id):
    data = request.json
    tag = NoteTag.query.get_or_404(tag_id)

    tag.name = data.get("name", tag.name)
    tag.color = data.get("color", tag.color)

    try:
        db.session.commit()
        return jsonify({"success": True, "name": tag.name, "color": tag.color}), 200
    except Exception as e:
        db.session.rollback()
        flash("An error occurred while updating the tag.", "danger")
        return jsonify({"success": False}), 500


from flask import render_template, request


@views.route("/todo_viewer/<int:id>", methods=["GET"])
def todo_viewer(id):
    todo = ToDo.query.get_or_404(id)
    todos = (
        ToDo.query.filter_by(user_id=current_user.id)
        .order_by(db.desc(ToDo.created_at))
        .all()
    )

    user_time_zone = current_user.time_zone if current_user.time_zone else "UTC"
    utc_now = datetime.utcnow().replace(tzinfo=pytz.utc)
    user_tz = pytz.timezone(user_time_zone)
    current_date = utc_now.astimezone(user_tz)

    for todo_item in todos:
        if todo_item.due_date:
            if todo_item.due_date.tzinfo is None:
                todo_item.due_date = pytz.utc.localize(todo_item.due_date)
            todo_item.due_date = todo_item.due_date.astimezone(user_tz)
            if todo_item.due_date < current_date and not todo_item.is_completed:
                todo_item.is_completed = True
                todo_item.updated_at = datetime.utcnow()
                db.session.commit()

    return render_template(
        "todo_viewer.html", todo=todo, todos=todos, current_date=current_date
    )


@views.route("/add_subtask/<int:todo_id>", methods=["GET", "POST"])
@login_required
def add_subtask(todo_id):
    todo = ToDo.query.get_or_404(todo_id)
    user_time_zone = current_user.time_zone
    if user_time_zone:
        user_tz = timezone(user_time_zone)
        created_at = datetime.now(user_tz)
    else:
        created_at = datetime.utcnow()
    if request.method == "POST":
        title = request.form["title"]
        content = request.form["content"]
        new_subtask = Subtask(
            title=title, content=content, parent_todo=todo, created_at=created_at
        )
        db.session.add(new_subtask)
        db.session.commit()
        flash("Subtask added successfully!", "success")
        return redirect(url_for("views.todo_viewer", id=todo.id))
    return render_template("add_subtask.html", todo=todo)


@views.route("/update_tag_color/<int:tag_id>", methods=["POST"])
@login_required
def update_tag_color(tag_id):
    data = request.json
    new_color = data.get("color")

    tag = NoteTag.query.get_or_404(tag_id)
    tag.color = new_color

    try:
        db.session.commit()
        return jsonify({"status": "success", "color": new_color}), 200
    except Exception as e:
        db.session.rollback()
        flash("An error occurred while updating the color.", "danger")
        return jsonify({"status": "error"}), 500


@views.route("/add_tag", methods=["POST"])
@login_required
def add_tag():
    data = request.json
    name = data.get("name")
    color = data.get("color")

    if not name or not color:
        return (
            jsonify({"success": False, "message": "Name and color are required."}),
            400,
        )

    new_tag = NoteTag(name=name, color=color, user_id=current_user.id)
    db.session.add(new_tag)
    try:
        db.session.commit()
        return (
            jsonify(
                {
                    "success": True,
                    "tag": {
                        "id": new_tag.id,
                        "name": new_tag.name,
                        "color": new_tag.color,
                    },
                }
            ),
            201,
        )
    except Exception as e:
        db.session.rollback()
        return (
            jsonify(
                {"success": False, "message": "An error occurred while adding the tag."}
            ),
            500,
        )


@views.route("/delete_tag/<int:tag_id>", methods=["DELETE"])
@login_required
def delete_tag(tag_id):
    tag = NoteTag.query.get_or_404(tag_id)

    try:
        db.session.delete(tag)
        db.session.commit()
        return jsonify({"success": True}), 200
    except Exception as e:
        db.session.rollback()
        return (
            jsonify(
                {
                    "success": False,
                    "message": "An error occurred while deleting the tag.",
                }
            ),
            500,
        )


@views.route("/settings")
@login_required
def settings():
    users = User.query.all()
    return render_template("setting.html", users=users)

@views.route('/send_email', methods=['POST'])
def send_email():
    name = request.form.get('name')
    email = request.form.get('mail')
    phone = request.form.get('phone')
    query = request.form.get('query')

    api_key = 'd432cee9047e3ce258e59b81514864cc'
    api_secret = '3ed35d6a4a8972eddaa96b89e130c39a'
    mailjet = Client(auth=(api_key, api_secret), version='v3.1')
    
    data = {
        'Messages': [
            {
                "From": {
                    "Email": "vo4685336@gmail.com",
                    "Name": "NoteWave"
                },
                "To": [
                    {
                        "Email": "vo4685336@gmail.com",
                        "Name": "Support Team"
                    }
                ],
                "Subject": "New Support Request",
                "TextPart": f"Name: {name}\nEmail: {email}\nPhone: {phone}\nQuery: {query}",
                "HTMLPart": f"""
                    <h3>New Support Request</h3>
                    <p><strong>Name:</strong> {name}</p>
                    <p><strong>Email:</strong> {email}</p>
                    <p><strong>Phone:</strong> {phone}</p>
                    <p><strong>Query:</strong></p>
                    <p>{query}</p>
                """
            }
        ]
    }

    result = mailjet.send.create(data=data)

    if result.status_code == 200:
        flash("Your message has been sent successfully!", category="success")
    else:
        flash("Failed to send message. Please try again.", category="error")

    return redirect(url_for('views.settings'))

@views.route('/send_email_contact', methods=['POST'])
def send_email_contact():
    name = request.form.get('name')
    email = request.form.get('mail')
    phone = request.form.get('phone')
    query = request.form.get('query')

    api_key = 'd432cee9047e3ce258e59b81514864cc'
    api_secret = '3ed35d6a4a8972eddaa96b89e130c39a'
    mailjet = Client(auth=(api_key, api_secret), version='v3.1')
    
    data = {
        'Messages': [
            {
                "From": {
                    "Email": "vo4685336@gmail.com",
                    "Name": "NoteWave"
                },
                "To": [
                    {
                        "Email": "vo4685336@gmail.com",
                        "Name": "Support Team"
                    }
                ],
                "Subject": "New Support Request",
                "TextPart": f"Name: {name}\nEmail: {email}\nPhone: {phone}\nQuery: {query}",
                "HTMLPart": f"""
                    <h3>New Support Request</h3>
                    <p><strong>Name:</strong> {name}</p>
                    <p><strong>Email:</strong> {email}</p>
                    <p><strong>Phone:</strong> {phone}</p>
                    <p><strong>Query:</strong></p>
                    <p>{query}</p>
                """
            }
        ]
    }

    result = mailjet.send.create(data=data)

    if result.status_code == 200:
        flash("Your message has been sent successfully!", category="success")
    else:
        flash("Failed to send message. Please try again.", category="error")

    return redirect(url_for('views.contact'))


@views.route('/contact')
def contact():
    return render_template('contact.html')


@views.route('/privacy_policy')
def privacy_policy():
    return render_template('privacy_policy.html')