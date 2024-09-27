from flask import Flask, render_template, redirect, url_for, flash, request
from flask_socketio import SocketIO, emit, join_room, leave_room
from flask_login import login_required, current_user
import pytz
from datetime import datetime
from website import create_app, db
from website.models import User, Friendship, Message  # Ensure these are imported correctly

# Initialize Flask app
app = create_app()

# Initialize SocketIO with the app
socketio = SocketIO(app)

@socketio.on('typing')
@login_required
def handle_typing(data):
    receiver_id = data['receiver_id']
    # Construct room based on sender and receiver IDs
    room = f"chat_{min(current_user.id, receiver_id)}_{max(current_user.id, receiver_id)}"
    
    # Broadcast typing status to the room
    emit('typing', {
        'sender_name': current_user.first_name or current_user.user_name,
        'sender_id': current_user.id
    }, room=room)


@socketio.on('stop_typing')
@login_required
def handle_stop_typing(data):
    receiver_id = data['receiver_id']
    # Construct room based on sender and receiver IDs
    room = f"chat_{min(current_user.id, receiver_id)}_{max(current_user.id, receiver_id)}"
    
    # Broadcast stop typing status to the room with sender_id for consistency
    emit('stop_typing', {
        'sender_id': current_user.id
    }, room=room)

@socketio.on('send_message')
@login_required
def handle_send_message(data):
    receiver_id = data['receiver_id']
    content = data['content']

    receiver = User.query.get(receiver_id)
    if not receiver:
        return

    # Get the sender's timezone and timestamp the message
    sender_tz = pytz.timezone(current_user.time_zone) if current_user.time_zone else pytz.UTC
    created_at = datetime.now(sender_tz)


    new_message = Message(sender_id=current_user.id, receiver_id=receiver_id, content=content, timestamp=created_at)
    db.session.add(new_message)
    db.session.commit()

    # Emit the message to both sender and receiver using their room
    room = f"chat_{min(current_user.id, receiver_id)}_{max(current_user.id, receiver_id)}"
    emit('receive_message', {
        'sender_id': current_user.id,
        'content': content,
        'timestamp': created_at.strftime('%Y-%m-%d %H:%M:%S'),
        'sender_name': current_user.first_name or current_user.user_name,
    }, room=room)

# SocketIO event for joining a room
@socketio.on('join')
@login_required
def on_join(data):
    receiver_id = data['receiver_id']
    room = f"chat_{min(current_user.id, receiver_id)}_{max(current_user.id, receiver_id)}"
    join_room(room)

# SocketIO event for leaving a room
@socketio.on('leave')
@login_required
def on_leave(data):
    receiver_id = data['receiver_id']
    room = f"chat_{min(current_user.id, receiver_id)}_{max(current_user.id, receiver_id)}"
    leave_room(room)
@socket.on('reply_message')
def handle_reply_message(data):
    reply_to_id = data['reply_to_id']
    content = data['content']
    new_message = Message(
        sender_id=data['sender_id'],
        receiver_id=data['receiver_id'],
        content=content,
        reply_to_id=reply_to_id
    )
    db.session.add(new_message)
    db.session.commit()
    # Emit new message to the receiver
    socket.emit('new_message', new_message.to_dict(), room=new_message.receiver_id)
@socket.on('add_reaction')
def handle_add_reaction(data):
    message_id = data['message_id']
    reaction = data['reaction']
    
    message = Message.query.get(message_id)
    if message:
        if message.reactions.get(reaction):
            message.reactions[reaction] += 1  # Increment the reaction count
        else:
            message.reactions[reaction] = 1  # Initialize reaction count
        db.session.commit()
        # Emit updated message with reactions
        socket.emit('reaction_added', {'message_id': message.id, 'reactions': message.reactions}, room=message.receiver_id)
@socket.on('edit_message')
def handle_edit_message(data):
    message_id = data['message_id']
    new_content = data['content']
    
    message = Message.query.get(message_id)
    if message:
        message.content = new_content
        db.session.commit()
        # Emit the edited message to the chat
        socket.emit('message_edited', {'message_id': message.id, 'new_content': new_content}, room=message.receiver_id)
@socket.on('delete_message')
def handle_delete_message(data):
    message_id = data['message_id']
    message = Message.query.get(message_id)
    if message:
        message.is_deleted = True
        db.session.commit()
        # Notify other user that the message was deleted
        socket.emit('message_deleted', {'message_id': message_id}, room=message.receiver_id)



# Run the SocketIO app
if __name__ == '__main__':
    socketio.run(app, host='0.0.0.0', port=5000, debug=True)
