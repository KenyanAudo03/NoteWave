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
      hrElement.style.borderColor = "white";
    });

    item.addEventListener("click", function () {
      const noteId = this.getAttribute("data-note-id");
      window.location.href = `/note_viewer/${noteId}`;
    });
  });
});

document.addEventListener("DOMContentLoaded", function () {
  const noteItems = document.querySelectorAll(".note-item");
  const searchInput = document.getElementById("searchInput");
  const notesList = document.getElementById("notesList");
  const tagId = searchInput.getAttribute("data-tag-id");

  noteItems.forEach((item) => {
    const tagColor = item.getAttribute("data-tag-color");

    item.style.setProperty("--bullet-color", tagColor);
    item.style.setProperty("--tag-color", tagColor);

    item.addEventListener("mouseenter", function () {
      this.style.setProperty("--bullet-color", tagColor);
      const hrElement = this.querySelector("hr");
      hrElement.style.borderColor = tagColor;
    });

    item.addEventListener("mouseleave", function () {
      this.style.setProperty("--bullet-color", tagColor);
      const hrElement = this.querySelector("hr");
      hrElement.style.borderColor = "white";
    });

    item.addEventListener("click", function () {
      const noteId = this.getAttribute("data-note-id");
      window.location.href = `/note_viewer/${noteId}`;
    });
  });

  searchInput.addEventListener("input", function () {
    const query = searchInput.value.trim();

    if (query) {
      fetch(`/search_notes?query=${query}&tag_id=${tagId}`)
        .then((response) => response.json())
        .then((notes) => {
          notesList.innerHTML = "";
          if (notes.length > 0) {
            notes.forEach((note) => {
              const listItem = document.createElement("li");
              listItem.className = "note-item";
              listItem.dataset.noteId = note.id;
              listItem.dataset.tagColor = note.color;

              const title = document.createElement("h3");
              title.style.setProperty("--bookmark-", note.color);
              title.innerHTML = `${note.title
                .split("\t")[0]
                .substring(0, 10)}...`.replace(
                new RegExp(query, "gi"),
                (match) => `<span class="highlight">${match}</span>`
              );

              const content = document.createElement("p");
              content.innerHTML =
                note.content
                  .split("\n")[0]
                  .substring(0, 27)
                  .replace(
                    new RegExp(query, "gi"),
                    (match) => `<span class="highlight">${match}</span>`
                  ) + "...";

              const hr = document.createElement("hr");
              hr.style.borderColor = "#fff";

              listItem.appendChild(title);
              listItem.appendChild(content);
              listItem.appendChild(hr);
              notesList.appendChild(listItem);

              listItem.style.setProperty("--bullet-color", note.color);

              listItem.addEventListener("mouseenter", function () {
                const hrElement = this.querySelector("hr");
                hrElement.style.borderColor = note.color;
              });

              listItem.addEventListener("mouseleave", function () {
                const hrElement = this.querySelector("hr");
                hrElement.style.borderColor = "#fff";
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
        notesList.appendChild(item);
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