document.addEventListener("DOMContentLoaded", function () {
  const noteItems = document.querySelectorAll(".note-item");

  noteItems.forEach((item) => {
    const tagColor = item.getAttribute("data-tag-color");

    item.style.setProperty("--bullet-color", tagColor);
    item.style.setProperty("--tag-color", tagColor);

    item.addEventListener("mouseenter", function () {
      const hrElement = this.querySelector("hr");
      hrElement.style.borderColor = tagColor;
    });

    item.addEventListener("mouseleave", function () {
      const hrElement = this.querySelector("hr");
      hrElement.style.borderColor = "#555";
    });

    item.addEventListener("click", function () {
      const noteId = this.getAttribute("data-note-id");
      window.location.href = `/note_viewer/${noteId}`;
    });
  });
});
document.addEventListener("DOMContentLoaded", function () {
  const searchInput = document.getElementById("searchInput");
  const notesList = document.getElementById("notesList");
  const tagId = searchInput.getAttribute("data-tag-id");

  function stripTags(str) {
    return str.replace(/<\/?[^>]+(>|$)/g, "");
  }

  function formatTime(dateString) {
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    const formattedDate = `${day}-${month}-${year}`;
    const formattedTime = date.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false });
    return `${formattedDate} ${formattedTime}`;
  }

  function attachEventListeners(noteItems) {
    noteItems.forEach((item) => {
      const tagColor = item.getAttribute("data-tag-color");
      item.style.setProperty("--bullet-color", tagColor);

      item.addEventListener("mouseenter", function () {
        const hrElement = this.nextElementSibling;
        if (hrElement) hrElement.style.borderColor = tagColor;
      });

      item.addEventListener("mouseleave", function () {
        const hrElement = this.nextElementSibling;
        if (hrElement) hrElement.style.borderColor = "#555";
      });

      item.addEventListener("click", function () {
        const noteId = this.getAttribute("data-note-id");
        window.location.href = `/note_viewer/${noteId}`;
      });
    });
  }

  const noteItems = document.querySelectorAll(".note-item");
  attachEventListeners(noteItems);

  searchInput.addEventListener("input", function () {
    const query = searchInput.value.trim();

    if (query) {
      fetch(`/search_notes?query=${encodeURIComponent(query)}&tag_id=${tagId}`)
        .then((response) => response.json())
        .then((notes) => {
          notesList.innerHTML = "";
          if (notes.length > 0) {
            notes.forEach((note) => {
              const listItem = document.createElement("li");
              listItem.className = "note-item";
              listItem.dataset.noteId = note.id;
              listItem.dataset.tagColor = note.color;

              const noteHeader = document.createElement("div");
              noteHeader.className = "note-header";

              const title = document.createElement("h3");
              title.style.setProperty("--bookmark-", note.color);
              title.innerHTML = note.title.split("\t")[0].substring(0, 10).replace(new RegExp(query, "gi"), (match) => `<span class="highlight">${match}</span>`) + "...";

              const noteTag = document.createElement("span");
              noteTag.className = "note-tag";
              noteTag.innerHTML = `Tag: ${note.tagName.split("\n")[0].substring(0, 20)}`;

              const noteContent = document.createElement("pre");
              noteContent.className = "note-content"; 
              const strippedContent = stripTags(note.content);
              noteContent.innerHTML = strippedContent.split("\n")[0].substring(0, 27).replace(new RegExp(query, "gi"), (match) => `<span class="highlight">${match}</span>`) + "...";

              const noteTime = document.createElement("p");
              noteTime.className = "note-time";
              noteTime.innerHTML = note.updated_at ? `Updated at: ${formatTime(note.updated_at)}` : `Created at: ${formatTime(note.created_at)}`;

              noteHeader.appendChild(title);
              noteHeader.appendChild(noteTag);
              listItem.appendChild(noteHeader);
              listItem.appendChild(noteContent);
              listItem.appendChild(noteTime);
              notesList.appendChild(listItem);

              const hr = document.createElement("hr");
              notesList.appendChild(hr);  
            });
            // Attach event listeners to newly created items
            const newNoteItems = notesList.querySelectorAll(".note-item");
            attachEventListeners(newNoteItems);
          } else {
            notesList.innerHTML = `<p class="no-notes" style="color: #fff;">No notes found</p>`;
          }
        });
    } else {
      notesList.innerHTML = "";
      noteItems.forEach((item) => {
        const clonedItem = item.cloneNode(true);
        notesList.appendChild(clonedItem); 
        const hr = document.createElement("hr");
        notesList.appendChild(hr); 
      });
      // Reattach event listeners to cloned items
      const clonedNoteItems = notesList.querySelectorAll(".note-item");
      attachEventListeners(clonedNoteItems);
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
              tagItem.remove(); 
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
function logoutUser() {
  fetch("/auth/logout_idle", {
      method: "POST",
      headers: {
          "Content-Type": "application/json",
          "X-CSRFToken": "{{ csrf_token() }}"
      }
  }).then(response => {
      if (response.ok) {
        window.location.href = "/auth/login";
      }
  });
}
window.onload = resetTimer;
document.onmousemove = resetTimer;
document.onkeypress = resetTimer;
document.onscroll = resetTimer;
document.onclick = resetTimer;