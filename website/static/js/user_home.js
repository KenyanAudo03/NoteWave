document.addEventListener("DOMContentLoaded", function () {
  const noteItems = document.querySelectorAll(".note-item");

  noteItems.forEach(function (noteItem) {
    noteItem.addEventListener("click", function () {
      const noteId = this.getAttribute("data-note-id");
      window.location.href = `/note_viewer/${noteId}`;
    });
  });
});

document.addEventListener("DOMContentLoaded", function () {
  const searchInput = document.getElementById("searchInput");
  const notesList = document.getElementById("notesList");
  function stripTags(str) {
    return str.replace(/<\/?[^>]+(>|$)/g, "");
  }

  searchInput.addEventListener("input", function () {
    const query = searchInput.value;
    fetch(`/search_all_notes?query=${query}`)
      .then((response) => response.json())
      .then((data) => {
        notesList.innerHTML = "";
        if (data.length > 0) {
          data.forEach((note) => {
            const noteItem = document.createElement("li");
            noteItem.classList.add("note-item");
            noteItem.setAttribute("data-note-id", note.id);
            noteItem.style.setProperty("--background-", note.color);

            const noteTitle = document.createElement("h3");
            noteTitle.style.setProperty("--background-", note.color);
            noteTitle.innerHTML = `${note.title.slice(0, 20)}${note.title.length > 20 ? '...' : ''} -- <span>Tag: ${note.tagName}</span>`;

            const noteContent = document.createElement("p");
            noteContent.innerHTML = stripTags(
              `${note.content.split("\n")[0].slice(0, 40)}`
            );

            const noteTime = document.createElement("p");
            noteTime.classList.add("note-time");
            if (note.updated_at) {
              noteTime.innerHTML = `Updated at: ${new Date(
                note.updated_at
              ).toLocaleString()}`;
            } else {
              noteTime.innerHTML = `Created at: ${new Date(
                note.created_at
              ).toLocaleString()}`;
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
            '<p class="no-notes">No Available notes In this Bookmark</p>';
        }
      });
  });
});

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
  document.querySelector(".edit-notes").addEventListener("click", function (e) {
    e.preventDefault();
    document.getElementById("editTagsModal").style.display = "block";
  });
  document.querySelector(".close-modal").addEventListener("click", function () {
    document.getElementById("editTagsModal").style.display = "none";
    location.reload();
  });

  document
    .querySelector(".close-color-modal")
    .addEventListener("click", function () {
      document.getElementById("colorPickerModal").style.display = "none";
    });
  document.querySelectorAll(".edit-pen").forEach((button) => {
    button.addEventListener("click", function () {
      const tagItem = this.closest(".tag-item");
      const tagNameInput = tagItem.querySelector(".tag-name");
      const saveButton = tagItem.querySelector(".save-tag");
      tagNameInput.removeAttribute("readonly");
      tagNameInput.focus();
      this.style.display = "none";
      saveButton.style.display = "inline-block";
    });
  });

  document.querySelectorAll(".save-tag").forEach((button) => {
    button.addEventListener("click", function () {
      const tagItem = this.closest(".tag-item");
      const tagNameInput = tagItem.querySelector(".tag-name");
      const tagName = tagNameInput.value;
      const tagColor =
        tagItem.querySelector(".color-picker").style.backgroundColor;
      const tagId = tagItem.getAttribute("data-tag-id");
      fetch(`/update_tag/${tagId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name: tagName, color: tagColor }),
      })
        .then((response) => response.json())
        .then((data) => {
          if (data.success) {
            console.log("Tag updated successfully:", data);
            tagNameInput.setAttribute("readonly", true);
            this.style.display = "none";
            tagItem.querySelector(".edit-pen").style.display = "inline-block";
          } else {
            console.error("Error updating tag:", data);
          }
        })
        .catch((error) => {
          console.error("Error updating tag:", error);
        });
    });
  });
  document.querySelectorAll(".color-picker").forEach((picker) => {
    picker.addEventListener("click", function () {
      const colorPickerModal = document.getElementById("colorPickerModal");
      colorPickerModal.style.display = "block";
      const tagItem = this.closest(".tag-item");
      const tagId = tagItem.getAttribute("data-tag-id");
      document.querySelectorAll(".color-option").forEach((option) => {
        option.addEventListener("click", function () {
          const color = this.getAttribute("data-color");
          tagItem.querySelector(".color-picker").style.backgroundColor = color;
          colorPickerModal.style.display = "none";
          fetch(`/update_tag_color/${tagId}`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ color: color }),
          })
            .then((response) => response.json())
            .then((data) => {
              console.log("Color update response:", data);
            })
            .catch((error) => {
              console.error("Error updating color:", error);
            });
        });
      });
    });
  });
});

document.addEventListener("DOMContentLoaded", function () {
  document.querySelector(".new-tag").addEventListener("click", function (e) {
    e.preventDefault();
    document.getElementById("addTagModal").style.display = "block";
  });

  document
    .querySelector(".close-button")
    .addEventListener("click", function () {
      document.getElementById("addTagModal").style.display = "none";
    });

  document
    .getElementById("addTagForm")
    .addEventListener("submit", function (e) {
      e.preventDefault();
      const tagName = document.getElementById("tagName").value;
      const tagColor =
        document.querySelector(".color-container").style.backgroundColor;

      fetch("/add_tag", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name: tagName, color: tagColor }),
      })
        .then((response) => response.json())
        .then((data) => {
          if (data.success) {
            console.log("Tag added successfully:", data);
            document.getElementById("addTagModal").style.display = "none";
            location.reload();
          } else {
            console.error("Error adding tag:", data);
          }
        })
        .catch((error) => {
          console.error("Error adding tag:", error);
        });
    });

  document.querySelectorAll(".color-swatch").forEach((option) => {
    option.addEventListener("click", function () {
      const color = this.getAttribute("data-color");
      document.querySelector(".color-container").style.backgroundColor = color;
    });
  });
});

document.addEventListener("DOMContentLoaded", function () {
  document.querySelectorAll(".delete-tag").forEach((button) => {
    button.addEventListener("click", function () {
      const tagItem = this.closest(".tag-item");
      const tagId = tagItem.getAttribute("data-tag-id");

      if (confirm("Are you sure you want to delete this tag?")) {
        fetch(`/delete_tag/${tagId}`, {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
          },
        })
          .then((response) => response.json())
          .then((data) => {
            if (data.success) {
              console.log("Tag deleted successfully:", data);
              tagItem.remove(); // Remove the tag from the UI
            } else {
              console.error("Error deleting tag:", data);
            }
          })
          .catch((error) => {
            console.error("Error deleting tag:", error);
          });
      }
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

document.addEventListener('DOMContentLoaded', function () {
  const alertElement = document.querySelector('.email-verification-alert');

  if (alertElement) {
    alertElement.style.display = '';

    setTimeout(() => {
      alertElement.style.display = 'none';
    }, 5 * 1000);
  }
});



function logoutUser() {
  fetch("/auth/logout_idle", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-CSRFToken": "{{ csrf_token() }}",
    },
  }).then((response) => {
    if (response.ok) {
      window.location.href = "/auth/login";
    }
  });
}

document.onmousemove = resetTimer;
document.onkeypress = resetTimer;
document.onscroll = resetTimer;
document.onclick = resetTimer;
