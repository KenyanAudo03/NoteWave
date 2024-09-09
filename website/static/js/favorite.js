document.addEventListener("DOMContentLoaded", function () {
  const rightContainer = document.querySelector(".right-container");
  const userTimezone = rightContainer.getAttribute("data-user-timezone");
  const userName = rightContainer.getAttribute("data-user-fullname");

  function updateGreeting() {
    const greetingElement = document.querySelector(".left");
    const datetimeElement = document.querySelector(".right");
    const now = moment().tz(userTimezone);
    const hours = now.hours();
    let greeting = "Hello";

    if (hours < 12) {
      greeting = "Good Morning";
    } else if (hours < 18) {
      greeting = "Good Afternoon";
    } else {
      greeting = "Good Evening";
    }

    const dateString = now.format("DD/MM/YYYY");
    const timeString = now.format("HH:mm");

    greetingElement.textContent = `${greeting}, ${userName}!`;
    datetimeElement.textContent = `${dateString} ${timeString}`;
  }

  setInterval(updateGreeting, 1000);
  updateGreeting();
});
document.addEventListener("DOMContentLoaded", function () {
  const favoritesListDiv = document.getElementById("favoritesList");
  const favoriteCountSpan = document.getElementById("favoriteCount");
  const noNotesMessage = document.getElementById("noNotesMessage");

  favoritesListDiv.addEventListener("click", function (event) {
    if (event.target.classList.contains("remove-favorite")) {
      event.stopPropagation();
      const noteId = event.target.getAttribute("data-note-id");

      fetch("/remove_favorite", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ note_id: noteId }),
      })
        .then((response) => response.json())
        .then((data) => {
          if (data.message === "Note removed from favorites.") {
            event.target.parentElement.remove();
            window.location.reload();
          } else {
            alert("Error: " + data.message);
          }
        })
        .catch((error) => {
          console.error("Error:", error);
        });
    }
  });
});

document.addEventListener("DOMContentLoaded", function () {
  const favoriteCountSpan = document.getElementById("favoriteCount");

  fetch("/get_favorite_count")
    .then((response) => response.json())
    .then((data) => {
      if (data.favorite_count !== undefined) {
        favoriteCountSpan.textContent = data.favorite_count;
      } else {
        console.error("Error fetching favorite count:", data.error);
      }
    })
    .catch((error) => {
      console.error("Error:", error);
    });
});

document.addEventListener("DOMContentLoaded", function () {
  function updateTodoCount() {
    fetch("/get_todo_count")
      .then((response) => response.json())
      .then((data) => {
        const todoCountElement = document.getElementById("todoCount");
        if (todoCountElement) {
          todoCountElement.textContent = data.count;
        }
      })
      .catch((error) => console.error("Error fetching To-Do count:", error));
  }

  updateTodoCount();

  setInterval(updateTodoCount, 60000);
});


document.addEventListener("DOMContentLoaded", function () {
  const searchInput = document.getElementById("searchInput");
  const notesList = document.getElementById("notesList");

  searchInput.addEventListener("input", function () {
    const query = searchInput.value;
    fetch(`/search_favorite_notes?query=${query}`)
      .then((response) => response.json())
      .then((data) => {
        notesList.innerHTML = "";
        if (data.length > 0) {
          data.forEach((note) => {
            const noteItem = document.createElement("li");
            noteItem.classList.add("note-item");
            noteItem.setAttribute("data-note-id", note.id); // Add note ID here
            noteItem.style.setProperty("--background-", note.color); // Use note.color here

            const noteTitle = document.createElement("h3");
            noteTitle.style.setProperty("--background-", note.color); // Use note.color here
            noteTitle.innerHTML = `${note.title} -- <span>Tag: ${note.tagName}</span>`;

            const noteContent = document.createElement("p");
            noteContent.innerHTML = `${note.content.split("\n")[0].slice(0, 100)}`;

            const noteTime = document.createElement("p");
            noteTime.classList.add("note-time");
            if (note.updated_at) {
              noteTime.innerHTML = `Updated at: ${new Date(note.updated_at).toLocaleString()}`;
            } else {
              noteTime.innerHTML = `Created at: ${new Date(note.created_at).toLocaleString()}`;
            }

            noteItem.appendChild(noteTitle);
            noteItem.appendChild(noteContent);
            noteItem.appendChild(noteTime);

            const separator = document.createElement("hr");
            separator.style.setProperty("--background-", note.color);
            noteItem.appendChild(separator);

            noteItem.addEventListener("mouseenter", function () {
              separator.style.borderColor = note.color;
            });

            noteItem.addEventListener("mouseleave", function () {
              separator.style.borderColor = "#fff";
            });

            noteItem.addEventListener("click", function () {
              const noteId = this.getAttribute("data-note-id");
              window.location.href = `/note_viewer/${noteId}`;
            });

            notesList.appendChild(noteItem);
          });
        } else {
          notesList.innerHTML =
            '<p class="no-notes">No Available notes in this Bookmark</p>';
        }
      });
  });
});

document.addEventListener("DOMContentLoaded", function () {
  const noteItems = document.querySelectorAll(".note-item");
  noteItems.forEach((item) => {
    item.addEventListener("click", function () {
      const noteId = this.getAttribute("data-note-id");
      window.location.href = `/note_viewer/${noteId}`;
    });
  });
});

document.addEventListener("DOMContentLoaded", function () {
  setTimeout(function () {
    const alerts = document.querySelectorAll(".alert");
    alerts.forEach((alert) => {
      alert.classList.remove("show");
      alert.classList.add("fade");
      setTimeout(() => alert.remove(), 150);
    });
  }, 3000);
});

document.addEventListener("DOMContentLoaded", function () {
  function updateNotificationBadge() {
    fetch("/get_notifications")
      .then((response) => response.json())
      .then((data) => {
        const badge = document.getElementById("notificationBadge");
        if (badge) {
          badge.textContent = data.unread_count;
          badge.style.display = data.unread_count > 0 ? "inline" : "none";
        }
      })
      .catch((error) => console.error("Error fetching notifications:", error));
  }

  updateNotificationBadge();

  setInterval(updateNotificationBadge, 60000);
});