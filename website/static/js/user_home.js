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
            const noteHeader = document.createElement("div");
            noteHeader.classList.add("note-header");
            const noteTitle = document.createElement("h3");
            noteTitle.style.setProperty("--background-", note.color);
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

            const formatTime = (dateString) => {
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
              const formattedTime = date.toLocaleTimeString(
                "en-GB",
                optionsTime
              );

              return `${formattedDate} ${formattedTime}`;
            };
            if (note.updated_at) {
              noteTime.innerHTML = `Updated at: ${formatTime(note.updated_at)}`;
            } else {
              noteTime.innerHTML = `Created at: ${formatTime(note.created_at)}`;
            }

            noteItem.appendChild(noteHeader);
            noteItem.appendChild(noteContent);
            noteItem.appendChild(noteTime);
            notesList.appendChild(noteItem);
            const separator = document.createElement("hr");
            separator.style.borderColor = "#555";
            noteItem.addEventListener("mouseenter", function () {
              separator.style.borderColor = "#fff";
            });

            noteItem.addEventListener("mouseleave", function () {
              separator.style.borderColor = "#555";
            });
            notesList.appendChild(separator);
            noteItem.addEventListener("click", function () {
              const noteId = this.getAttribute("data-note-id");
              window.location.href = `/note_viewer/${noteId}`;
            });
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
  const editTagsModal = document.getElementById("editTagsModal");
  const colorPickerModal = document.getElementById("colorPickerModal");

  let currentTagColor = "";
  document.querySelector(".edit-notes").addEventListener("click", function (e) {
    e.preventDefault();
    editTagsModal.style.display = "block";
  });
  document.querySelector(".close-modal").addEventListener("click", function () {
    editTagsModal.style.display = "none";
    location.reload();
  });

  document
    .querySelector(".close-color-modal")
    .addEventListener("click", function () {
      colorPickerModal.style.display = "none";
    });

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") {
      if (editTagsModal.style.display === "block") {
        editTagsModal.style.display = "none";
      }
      if (colorPickerModal.style.display === "block") {
        colorPickerModal.style.display = "none";
      }
    }
  });

  document.querySelectorAll(".edit-pen").forEach((button) => {
    button.addEventListener("click", function () {
      const tagItem = this.closest(".tag-item");
      const tagNameInput = tagItem.querySelector(".tag-name");
      const saveButton = tagItem.querySelector(".save-tag");

      currentTagColor =
        tagItem.querySelector(".color-picker").style.backgroundColor;
      if (!currentTagColor || currentTagColor === "none") {
        currentTagColor = "#3498db";
      }

      // Enable editing
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
      let tagColor =
        tagItem.querySelector(".color-picker").style.backgroundColor ||
        currentTagColor;
      if (!tagColor || tagColor === "none") {
        tagColor = "#3498db";
      }

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
      const tagItem = this.closest(".tag-item");
      const tagId = tagItem.getAttribute("data-tag-id");

      colorPickerModal.style.display = "block";

      const colorOptions = document.querySelectorAll(".color-option");
      colorOptions.forEach((option) => {
        option.replaceWith(option.cloneNode(true));
      });

      document.querySelectorAll(".color-option").forEach((option) => {
        option.addEventListener("click", function () {
          const color = this.getAttribute("data-color");
          tagItem.querySelector(".color-picker").style.backgroundColor = color;

          currentTagColor = color;

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
  const modal = document.getElementById("addTagModal");

  document.querySelector(".new-tag").addEventListener("click", function (e) {
    e.preventDefault();
    modal.style.display = "flex"; // Changed to flex for centering
    modal.querySelector(".modal-body").style.transform = "scale(0.8)";
    modal.querySelector(".modal-body").style.opacity = "0";
    setTimeout(() => {
      modal.querySelector(".modal-body").style.transform = "scale(1)";
      modal.querySelector(".modal-body").style.opacity = "1";
    }, 50);
  });

  document
    .querySelector(".close-button")
    .addEventListener("click", function () {
      modal.style.display = "none";
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
            modal.style.display = "none";
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

  // Close modal when Esc key is pressed
  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape") {
      modal.style.display = "none";
    }
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
      alert.classList.add("fade");
      setTimeout(() => {
        alert.remove();
      }, 400);
    });
  }, 3000);
});

document.addEventListener("DOMContentLoaded", function () {
  const alertElement = document.querySelector(".email-verification-alert");

  if (alertElement) {
    alertElement.style.display = "";

    setTimeout(() => {
      alertElement.style.display = "none";
    }, 5 * 1000);
  }
});
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
    if (!toggleButton.contains(event.target) && !tagsWrapper.contains(event.target)) {
      if (tagsWrapper.classList.contains("show")) {
        tagsWrapper.classList.remove("show");
        icon.classList.remove("fa-chevron-up");
        icon.classList.add("fa-chevron-down");
      }
    }
  });
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
