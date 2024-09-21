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
  const noteItems = document.querySelectorAll(".note-item");

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

              listItem.style.setProperty("--bullet-color", note.color);

              listItem.addEventListener("mouseenter", function () {
                hr.style.borderColor = note.color;
              });

              listItem.addEventListener("mouseleave", function () {
                hr.style.borderColor = "#555";
              });

              listItem.addEventListener("click", function () {
                const noteId = this.getAttribute("data-note-id");
                window.location.href = `/note_viewer/${noteId}`;
              });
            });
          } else {
            notesList.innerHTML = `<p class="no-notes" style="color: #fff;">No notes found</p>`;
          }
        });
    } else {
      notesList.innerHTML = "";
      noteItems.forEach((item) => {
        notesList.appendChild(item.cloneNode(true)); 
        const hr = document.createElement("hr");
        notesList.appendChild(hr); 
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