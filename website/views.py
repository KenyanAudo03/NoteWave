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
from .models import User, NoteTag, Note, Notification, ToDo, Subtask, Friendship, Admin
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

@views.route("/pdf-text")
@login_required
def pdf_text():
    tags = NoteTag.query.filter_by(user_id=current_user.id).all()
    return render_template("scan.html", tags=tags)

@views.route("/user_home")
@login_required
def user_home():
    tags = NoteTag.query.filter_by(user_id=current_user.id).all()
    tags_with_counts = [
        {
            "id": tag.id,
            "name": tag.name,
            "color": tag.color,
            "note_count": Note.query.filter_by(tag_id=tag.id, user_id=current_user.id).count(),
        }
        for tag in tags
    ]
    notes = (
        Note.query.filter_by(user_id=current_user.id)
        .order_by(Note.created_at.desc(), Note.updated_at.desc())
        .all()
    )
    todos_count = ToDo.query.filter_by(user_id=current_user.id).count()
    user_statistics = {
        'notes_count': len(notes),
        'note_tags_count': len(tags),
        'todos_count': todos_count,
        'imported_notes_count': current_user.imported_notes_count,
        'exported_notes_count': current_user.exported_notes_count
    }
    return render_template(
        "user_home.html",
        tags=tags_with_counts,
        notes=notes,
        user_statistics=user_statistics
    )


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
                "tagName": note.tag.name,
                "updated_at": note.updated_at,
                "created_at": note.created_at,
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
        flash(notification_message, "success")
        return (
            jsonify(
                {
                    "is_favorite": note.is_favorite,
                    "redirect_url": url_for("views.view_note", note_id=note_id),
                }
            ),
            200,
        )
    else:
        flash("Note not found.", "error")
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
        notifications = Notification.query.filter_by(
            user_id=current_user.id, is_read=False
        ).all()
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
    if not data or "is_completed" not in data or not isinstance(data["is_completed"], bool):
        return jsonify({"error": "Invalid data"}), 400
    user_timezone = pytz.timezone(current_user.time_zone)
    current_time = datetime.now(user_timezone)
    if todo.due_date is not None:
        if todo.due_date.tzinfo is None:
            due_date_aware = user_timezone.localize(todo.due_date)
        else:
            due_date_aware = todo.due_date.astimezone(user_timezone) 
        if due_date_aware > current_time and not data["is_completed"]:
            return jsonify({"error": "Cannot mark as completed; due date has not been reached."}), 400

    todo.is_completed = data["is_completed"]
    todo.updated_at = current_time
    if todo.is_completed:
        for subtask in todo.subtasks:
            subtask.is_completed = True
            subtask.updated_at = current_time  
    else:
        for subtask in todo.subtasks:
            subtask.is_completed = False
            subtask.updated_at = current_time 

    try:
        db.session.commit()
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": "Failed to update todo status"}), 500

    return jsonify({"message": "To-Do status updated", "is_completed": todo.is_completed}), 200

@views.route('/delete_subtask/<int:subtask_id>', methods=['POST'])
@login_required
def delete_subtask(subtask_id):
    subtask = Subtask.query.get_or_404(subtask_id)
    if subtask.parent_todo.user_id != current_user.id:
        return jsonify({"error": "Unauthorized"}), 403

    try:
        todo_id = subtask.todo_id  
        db.session.delete(subtask)
        db.session.commit()
        flash("Subtask deleted successfully.", "success") 
        return redirect(url_for('views.todo_viewer', id=todo_id))  # Use 'id' here
    except Exception as e:
        db.session.rollback()
        flash("Failed to delete subtask.", "error") 
        return redirect(url_for('views.todo_viewer', id=todo_id))  # Use 'id' here



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
        existing_to_do = ToDo.query.filter_by(user_id=current_user.id, title=note.title).first()
        if existing_to_do:
            return jsonify({"success": False, "message": "Already a to-do."}), 400

        user_time_zone = current_user.time_zone

        if user_time_zone:
            user_tz = timezone(user_time_zone)
            created_at = datetime.now(user_tz)
            due_date = created_at.date()
        else:
            created_at = datetime.utcnow()
            due_date = datetime.utcnow().date()
        due_date_str = request.json.get("due_date")
        if due_date_str:
            due_date = datetime.strptime(due_date_str, "%Y-%m-%d").date()

        to_do = ToDo(
            title=note.title,
            content=note.content,
            user_id=current_user.id,
            is_completed=False,
            created_at=created_at,
            due_date=due_date 
        )

        db.session.add(to_do)
        db.session.commit()
        return jsonify({"success": True, "message": "To-do added successfully!"}), 200
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
@login_required  
def edit_todo(id):
    todo = ToDo.query.get_or_404(id)  
    user_time_zone = current_user.time_zone  

    if request.method == "POST":
        todo.title = request.form.get("title") 
        todo.content = request.form.get("content") 
        due_date_str = request.form.get("due_date") 

        if due_date_str:
            todo.due_date = datetime.strptime(due_date_str, "%Y-%m-%d")
        else:
            todo.due_date = None
        if user_time_zone:
            user_tz = timezone(user_time_zone)
            todo.updated_at = datetime.now(user_tz)  
        else:
            todo.updated_at = datetime.utcnow() 

        db.session.commit()  
        flash("To-do updated successfully!", "success")  # Flash success message
        return redirect(url_for("views.show_todo_page"))  # Redirect to the todo page

    return render_template("edit_todo.html", todo=todo)  # Render the edit page



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
            created_at=created_at,  
            updated_at=None,       
            due_date=due_date,
        )
        
        db.session.add(new_todo)
        db.session.commit()
        flash("To-do added successfully", "success")

        # Notification logic
        if current_user.push_preferences and current_user.push_preferences.new_message:
            notification = Notification(
                user_id=current_user.id,
                message=f"New To-do added: {title}",
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

    statistics = None
    monthly_statistics = None
    login_activities = None
    note_counts = [] 

    if current_user.role == 'superadmin':
        admin_instance = Admin()
        statistics = admin_instance.view_statistics()
        monthly_statistics = admin_instance.view_monthly_statistics()
        login_activities = admin_instance.view_login_activities()
        for user in users:
            note_counts.append({
                "user_id": user.id,
                "username": user.user_name,
                "imported_notes_count": user.imported_notes_count,
                "exported_notes_count": user.exported_notes_count,
            })

    return render_template(
        "setting.html", 
        users=users,
        statistics=statistics, 
        view_monthly_statistics=monthly_statistics,
        login_activities=login_activities,
        note_counts=note_counts  
    )

@views.route("/send_email", methods=["POST"])
def send_email():
    name = request.form.get("name")
    email = request.form.get("mail")
    phone = request.form.get("phone")
    query = request.form.get("query")

    api_key = "d432cee9047e3ce258e59b81514864cc"
    api_secret = "3ed35d6a4a8972eddaa96b89e130c39a"
    mailjet = Client(auth=(api_key, api_secret), version="v3.1")

    data = {
        "Messages": [
            {
                "From": {"Email": "vo4685336@gmail.com", "Name": "NoteWave"},
                "To": [{"Email": "vo4685336@gmail.com", "Name": "Support Team"}],
                "Subject": "New Support Request",
                "TextPart": f"Name: {name}\nEmail: {email}\nPhone: {phone}\nQuery: {query}",
                "HTMLPart": f"""
                    <h3>New Support Request</h3>
                    <p><strong>Name:</strong> {name}</p>
                    <p><strong>Email:</strong> {email}</p>
                    <p><strong>Phone:</strong> {phone}</p>
                    <p><strong>Query:</strong></p>
                    <p>{query}</p>
                """,
            }
        ]
    }

    result = mailjet.send.create(data=data)

    if result.status_code == 200:
        flash("Your message has been sent successfully!", category="success")
    else:
        flash("Failed to send message. Please try again.", category="error")

    return redirect(url_for("views.settings"))


@views.route("/send_email_contact", methods=["POST"])
def send_email_contact():
    name = request.form.get("name")
    email = request.form.get("mail")
    phone = request.form.get("phone")
    query = request.form.get("query")

    api_key = "d432cee9047e3ce258e59b81514864cc"
    api_secret = "3ed35d6a4a8972eddaa96b89e130c39a"
    mailjet = Client(auth=(api_key, api_secret), version="v3.1")

    data = {
        "Messages": [
            {
                "From": {"Email": "vo4685336@gmail.com", "Name": "NoteWave"},
                "To": [{"Email": "vo4685336@gmail.com", "Name": "Support Team"}],
                "Subject": "New Support Request",
                "TextPart": f"Name: {name}\nEmail: {email}\nPhone: {phone}\nQuery: {query}",
                "HTMLPart": f"""
                    <h3>New Support Request</h3>
                    <p><strong>Name:</strong> {name}</p>
                    <p><strong>Email:</strong> {email}</p>
                    <p><strong>Phone:</strong> {phone}</p>
                    <p><strong>Query:</strong></p>
                    <p>{query}</p>
                """,
            }
        ]
    }

    result = mailjet.send.create(data=data)

    if result.status_code == 200:
        flash("Your message has been sent successfully!", category="success")
    else:
        flash("Failed to send message. Please try again.", category="error")

    return redirect(url_for("views.home"))


@views.route("/contact")
def contact():
    return render_template("contact.html")


@views.route("/privacy_policy")
def privacy_policy():
    return render_template("privacy_policy.html")


@views.route("speech_text")
@login_required
def speech_text():
    tags = NoteTag.query.filter_by(user_id=current_user.id).all()
    return render_template("speech-to-text.html", tags=tags)


@views.route("/search_users", methods=["GET"])
@login_required
def search_users():
    search_query = request.args.get("q")
    users = User.query.filter(User.id != current_user.id).all()
    has_pending_requests = (
        Friendship.query.filter_by(friend_id=current_user.id, is_accepted=False).count()
        > 0
    )

    if search_query:
        search_query = search_query.lower()
        users = [
            user
            for user in users
            if (
                search_query in user.user_name.lower()
                or search_query in user.full_name.lower()
                or search_query in user.first_name.lower()
            )
        ]

    users_data = []
    for user in users:
        friendship = Friendship.query.filter(
            (Friendship.user_id == user.id) & (Friendship.friend_id == current_user.id)
        ).first()

        if friendship:
            friendship_status = "friends" if friendship.is_accepted else "pending"
        else:
            friendship_status = None

        users_data.append(
            {
                "id": user.id,
                "full_name": user.full_name,
                "user_name": user.user_name,
                "friendship_status": friendship_status,
                "profile_picture": user.profile_picture,
                "generated_color": user.generated_color,
                "first_name": user.first_name,
            }
        )

    return render_template(
        "platform_users.html",
        users=users_data,
        has_pending_requests=has_pending_requests,
    )


@views.route("/send_friend_request/<int:user_id>", methods=["POST"])
@login_required
def send_friend_request(user_id):
    user_to_follow = User.query.get_or_404(user_id)
    if Friendship.query.filter_by(
        user_id=current_user.id, friend_id=user_to_follow.id
    ).first():
        return jsonify(success=False, message="Already sent a request or are friends.")
    new_friendship = Friendship(user_id=current_user.id, friend_id=user_to_follow.id)
    db.session.add(new_friendship)
    recipient_time_zone = user_to_follow.time_zone
    created_at = datetime.utcnow()

    if recipient_time_zone:
        try:
            recipient_tz = timezone(recipient_time_zone)
            created_at = created_at.replace(tzinfo=pytz.utc).astimezone(recipient_tz)
        except Exception as e:
            created_at = created_at
    notification_message = f"{current_user.user_name} has sent you a friend request."
    notification = Notification(
        user_id=user_to_follow.id, message=notification_message, created_at=created_at
    )
    db.session.add(notification)
    db.session.commit()

    return jsonify(success=True, message="Friend request sent.")


@views.route("/remove_friend/<int:user_id>", methods=["POST"])
@login_required
def remove_friend(user_id):
    friendship_1 = Friendship.query.filter(
        (Friendship.user_id == current_user.id) & (Friendship.friend_id == user_id)
    ).first()

    friendship_2 = Friendship.query.filter(
        (Friendship.user_id == user_id) & (Friendship.friend_id == current_user.id)
    ).first()
    if not friendship_1 and not friendship_2:
        return jsonify(success=False, message="You are not friends with this user.")
    if friendship_1:
        db.session.delete(friendship_1)

    if friendship_2:
        db.session.delete(friendship_2)
    db.session.commit()

    return jsonify(
        success=True, message="You have removed this user from your friends."
    )


@views.route("/friend_requests", methods=["GET"])
@login_required
def friend_requests():
    pending_requests = Friendship.query.filter_by(
        friend_id=current_user.id, is_accepted=False
    ).all()
    has_pending_requests = (
        Friendship.query.filter_by(friend_id=current_user.id, is_accepted=False).count()
        > 0
    )

    requests_data = []
    for friendship in pending_requests:
        user = User.query.get(friendship.user_id)
        if user:
            requests_data.append(
                {
                    "id": user.id,
                    "full_name": user.full_name,
                    "user_name": user.user_name,
                    "friendship_status": "pending",
                    "profile_picture": user.profile_picture,
                    "generated_color": user.generated_color,
                    "first_name": user.first_name,
                }
            )

    return render_template(
        "friend_requests.html",
        requests=requests_data,
        has_pending_requests=has_pending_requests,
    )


@views.route("/accept_friend_request/<int:user_id>", methods=["POST"])
@login_required
def accept_friend_request(user_id):
    friendship = Friendship.query.filter_by(
        user_id=user_id, friend_id=current_user.id, is_accepted=False
    ).first()

    if friendship:
        friendship.is_accepted = True
        reverse_friendship = Friendship.query.filter_by(
            user_id=current_user.id, friend_id=user_id
        ).first()

        if not reverse_friendship:
            reverse_friendship = Friendship(
                user_id=current_user.id, friend_id=user_id, is_accepted=True
            )
            db.session.add(reverse_friendship)
        else:
            reverse_friendship.is_accepted = True

        db.session.commit()
        user_to_notify = User.query.get_or_404(user_id)
        user_time_zone = user_to_notify.time_zone
        created_at = datetime.utcnow()
        if user_time_zone:
            try:
                user_tz = timezone(user_time_zone)
                created_at = created_at.replace(tzinfo=pytz.utc).astimezone(user_tz)
            except Exception as e:
                created_at = created_at

        notification_message = (
            f"{current_user.user_name} has accepted your friend request!"
        )
        notification = Notification(
            user_id=user_id, message=notification_message, created_at=created_at
        )
        db.session.add(notification)
        db.session.commit()

        return jsonify(success=True, message="Friend request accepted.")

    return jsonify(success=False, message="Friend request not found.")


@views.route("/decline_friend_request/<int:user_id>", methods=["POST"])
@login_required
def decline_friend_request(user_id):
    friendship = Friendship.query.filter_by(
        user_id=user_id, friend_id=current_user.id, is_accepted=False
    ).first()

    if friendship:
        db.session.delete(friendship)
        db.session.commit()
        user_to_notify = User.query.get_or_404(user_id)
        user_time_zone = user_to_notify.time_zone
        created_at = datetime.utcnow()

        if user_time_zone:
            try:
                user_tz = timezone(user_time_zone)
                created_at = created_at.replace(tzinfo=pytz.utc).astimezone(user_tz)
            except Exception:
                created_at = created_at
        notification_message = (
            f"{current_user.user_name} has declined your friend request."
        )
        notification = Notification(
            user_id=user_id, message=notification_message, created_at=created_at
        )
        db.session.add(notification)
        db.session.commit()

        return jsonify(success=True, message="Friend request declined.")

    return jsonify(success=False, message="Friend request not found.")




@views.route("/friends", methods=["GET"])
@login_required
def view_friends():
    has_pending_requests = (
        Friendship.query.filter_by(friend_id=current_user.id, is_accepted=False).count()
        > 0
    )

    # Fetch friends from both directions
    friends_as_user = db.session.query(User).join(Friendship, User.id == Friendship.friend_id).filter(
        Friendship.user_id == current_user.id, 
        Friendship.is_accepted == True
    ).all()

    friends_as_friend = db.session.query(User).join(Friendship, User.id == Friendship.user_id).filter(
        Friendship.friend_id == current_user.id, 
        Friendship.is_accepted == True
    ).all()

    # Merge the two lists and remove duplicates by using a dictionary keyed on 'id'
    unique_friends = {friend.id: friend for friend in friends_as_user + friends_as_friend}

    # Check for potential None values and handle them
    friends_data = []
    for friend in unique_friends.values():
        full_name = friend.full_name or "Unknown"  # Handle None full_name
        user_name = friend.user_name or "No username"  # Handle None user_name
        profile_picture = friend.profile_picture or "/static/default_profile.png"  # Handle None profile picture
        generated_color = friend.generated_color or "#000000"  # Handle None generated color
        
        # Log any potential None values to diagnose issues
        print(f"Friend ID: {friend.id}, Full Name: {full_name}, Username: {user_name}, Profile Picture: {profile_picture}, Generated Color: {generated_color}")

        # Add the friend data to the list
        friends_data.append({
            "id": friend.id,
            "full_name": full_name,
            "user_name": user_name,
            "profile_picture": profile_picture,
            "generated_color": generated_color
        })

    # Render the template with friends data
    return render_template("your_friends.html", friends=friends_data, has_pending_requests=has_pending_requests, current_user=current_user)

@views.route("/user/<int:user_id>", methods=["GET"])
@login_required
def user_profile(user_id):
    user = User.query.get_or_404(user_id)
    has_pending_requests = (
        Friendship.query.filter_by(friend_id=current_user.id, is_accepted=False).count() > 0
    )
    
    # Get the search query from request arguments
    query = request.args.get('q', '').strip()

    # Followers
    followers_query = (
        db.session.query(User)
        .join(Friendship, User.id == Friendship.user_id)
        .filter(Friendship.friend_id == user_id, Friendship.is_accepted == True)
    )
    
    # If there's a search query, filter followers
    if query:
        followers_query = followers_query.filter(
            User.username.ilike(f'%{query}%') |
            User.full_name.ilike(f'%{query}%') |
            User.first_name.ilike(f'%{query}%')
        )
    
    followers = followers_query.all()
    followers_data = [
        {
            "id": follower.id,
            "full_name": follower.full_name,
            "user_name": follower.user_name,
            "profile_picture": follower.profile_picture,
            "generated_color": follower.generated_color,
            "friendship": Friendship.query.filter_by(user_id=current_user.id, friend_id=follower.id).first(),
        }
        for follower in followers
    ]

    # Following
    following_query = (
        db.session.query(User)
        .join(Friendship, User.id == Friendship.friend_id)
        .filter(Friendship.user_id == user_id, Friendship.is_accepted == True)
    )

    # If there's a search query, filter following
    if query:
        following_query = following_query.filter(
            User.username.ilike(f'%{query}%') |
            User.full_name.ilike(f'%{query}%') |
            User.first_name.ilike(f'%{query}%')
        )

    following = following_query.all()
    following_data = [
        {
            "id": follow.id,
            "full_name": follow.full_name,
            "user_name": follow.user_name,
            "profile_picture": follow.profile_picture,
            "generated_color": follow.generated_color,
            "friendship": Friendship.query.filter_by(user_id=current_user.id, friend_id=follow.id).first(),
        }
        for follow in following
    ]

    # Friendship status
    friendship_status = Friendship.query.filter(
        ((Friendship.user_id == current_user.id) & (Friendship.friend_id == user_id)) |
        ((Friendship.user_id == user_id) & (Friendship.friend_id == current_user.id))
    ).first()

    return render_template(
        "user_profile.html",
        user=user,
        followers=followers_data,
        following=following_data,
        friendship_status=friendship_status,
        has_pending_requests=has_pending_requests,
        query=query  # Pass the query to the template
    )
