document.addEventListener("DOMContentLoaded", () => {
  const toggleButton = document.querySelector(".toggle-tags");
  const tagsWrapper = document.querySelector(".tags-wrapper");
  const icon = toggleButton.querySelector("i");
  toggleButton.addEventListener("click", (event) => {
    event.stopPropagation();
    tagsWrapper.classList.toggle("show");
    if (tagsWrapper.classList.contains("show")) {
      icon.classList.remove("fa-chevron-down");
      icon.classList.add("fa-chevron-up");
    } else {
      icon.classList.remove("fa-chevron-up");
      icon.classList.add("fa-chevron-down");
    }
  });
  document.addEventListener("click", (event) => {
    if (
      !toggleButton.contains(event.target) &&
      !tagsWrapper.contains(event.target)
    ) {
      if (tagsWrapper.classList.contains("show")) {
        tagsWrapper.classList.remove("show");
        icon.classList.remove("fa-chevron-up");
        icon.classList.add("fa-chevron-down");
      }
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

  // Utility function to strip HTML tags from content
  function stripTags(content) {
    var div = document.createElement("div");
    div.innerHTML = content;
    return div.textContent || div.innerText || "";
  }

  // Utility function to format time
  function formatTime(dateString) {
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();

    const optionsTime = {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    };

    const formattedDate = `${day}-${month}-${year}`;
    const formattedTime = date.toLocaleTimeString("en-GB", optionsTime);

    return `${formattedDate} ${formattedTime}`;
  }

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
            noteItem.setAttribute("data-note-id", note.id);
            noteItem.style.setProperty("--background-", note.color);

            const noteHeader = document.createElement("div");
            noteHeader.classList.add("note-header");

            const noteTitle = document.createElement("h3");
            noteTitle.innerHTML = `${note.title.slice(0, 13)}${
              note.title.length > 13 ? "..." : ""
            }`;

            const noteTag = document.createElement("span");
            noteTag.classList.add("note-tag");
            noteTag.innerHTML = `Tag: ${note.tagName.slice(0, 20)}${
              note.tagName.length > 20 ? "..." : ""
            }`;
            noteTag.style.backgroundColor = `rgba(255, 191, 0, 0.1)`;
            noteHeader.appendChild(noteTitle);
            noteHeader.appendChild(noteTag);

            const noteContent = document.createElement("pre");
            noteContent.classList.add("note-content");

            const strippedContent = stripTags(note.content);
            const truncatedContent =
              strippedContent.length > 25
                ? strippedContent.slice(0, 25) + "..."
                : strippedContent;
            noteContent.innerHTML = truncatedContent;
            const noteTime = document.createElement("p");
            noteTime.classList.add("note-time");
            if (note.updated_at) {
              noteTime.innerHTML = `Updated at: ${formatTime(note.updated_at)}`;
            } else {
              noteTime.innerHTML = `Created at: ${formatTime(note.created_at)}`;
            }

            noteItem.appendChild(noteHeader);
            noteItem.appendChild(noteContent);
            noteItem.appendChild(noteTime);

            const separator = document.createElement("hr");
            separator.style.borderColor = "#555";
            noteItem.addEventListener("mouseenter", function () {
              separator.style.borderColor = "#fff";
            });
            noteItem.addEventListener("mouseleave", function () {
              separator.style.borderColor = "#555";
            });
            noteItem.addEventListener("click", function () {
              const noteId = this.getAttribute("data-note-id");
              window.location.href = `/note_viewer/${noteId}`;
            });
            notesList.appendChild(noteItem);
            notesList.appendChild(separator);
          });
        } else {
          notesList.innerHTML =
            '<p class="no-notes">No Available notes in this Bookmark</p>';
        }
      })
      .catch((error) => {
        console.error("Error fetching notes:", error);
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
