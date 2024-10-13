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
    const formattedTime = date.toLocaleTimeString("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
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
              title.innerHTML =
                note.title
                  .split("\t")[0]
                  .substring(0, 10)
                  .replace(
                    new RegExp(query, "gi"),
                    (match) => `<span class="highlight">${match}</span>`
                  ) + "...";

              const noteTag = document.createElement("span");
              noteTag.className = "note-tag";
              noteTag.innerHTML = `Tag: ${note.tagName
                .split("\n")[0]
                .substring(0, 20)}`;

              const noteContent = document.createElement("pre");
              noteContent.className = "note-content";
              const strippedContent = stripTags(note.content);
              noteContent.innerHTML =
                strippedContent
                  .split("\n")[0]
                  .substring(0, 20)
                  .replace(
                    new RegExp(query, "gi"),
                    (match) => `<span class="highlight">${match}</span>`
                  ) + "...";

              const noteTime = document.createElement("p");
              noteTime.className = "note-time";
              noteTime.innerHTML = note.updated_at
                ? `Updated at: ${formatTime(note.updated_at)}`
                : `Created at: ${formatTime(note.created_at)}`;

              noteHeader.appendChild(title);
              noteHeader.appendChild(noteTag);
              listItem.appendChild(noteHeader);
              listItem.appendChild(noteContent);
              listItem.appendChild(noteTime);
              notesList.appendChild(listItem);

              const hr = document.createElement("hr");
              notesList.appendChild(hr);
            });
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
  const quill = new Quill("#editor", {
    theme: "snow",
    modules: {
      toolbar: false,
    },
    readOnly: true,
  });

  const downloadTextButton = document.getElementById("downloadTextButton");
  const fileTypeModal = document.getElementById("fileTypeModal");
  const fileTypeSelect = document.getElementById("fileTypeSelect");
  const downloadFileButton = document.getElementById("downloadFileButton");

  downloadTextButton.addEventListener("click", function () {
    fileTypeModal.style.display = "block";
  });

  const span = document.getElementById("span");
  span.onclick = function (event) {
    event.preventDefault();
    fileTypeModal.style.display = "none";
  };

  downloadFileButton.addEventListener("click", function () {
    const fileType = fileTypeSelect.value;
    const text = quill.root.innerHTML;
    const noteTitle = document
      .getElementById("noteTitle")
      .innerText.trim()
      .replace("Title: ", "");
    let blob, url;

    if (fileType === "txt") {
      const plainText = quill.getText();
      blob = new Blob([plainText], { type: "text/plain" });
      url = URL.createObjectURL(blob);
      downloadFile(url, noteTitle, fileType);
    } else if (fileType === "docx") {
      const doc = new docx.Document({
        sections: [
          {
            properties: {},
            children: [new docx.Paragraph(text)],
          },
        ],
      });
      docx.Packer.toBlob(doc).then((blob) => {
        url = URL.createObjectURL(blob);
        downloadFile(url, noteTitle, fileType);
      });
    } else if (fileType === "pdf") {
      const { jsPDF } = window.jspdf;
      const pdf = new jsPDF();
      pdf.fromHTML(text);
      url = pdf.output("bloburl");
      downloadFile(url, noteTitle, fileType);
    } else if (fileType === "html") {
      blob = new Blob([text], { type: "text/html" });
      url = URL.createObjectURL(blob);
      downloadFile(url, noteTitle, fileType);
    }

    fileTypeModal.style.display = "none";
  });

  function downloadFile(url, title, extension) {
    const a = document.createElement("a");
    a.href = url;
    a.download = `${title}.${extension}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
});

document.addEventListener("DOMContentLoaded", function () {
  document.querySelectorAll(".favorite-btn").forEach((button) => {
    button.addEventListener("click", function () {
      const noteId = this.getAttribute("data-note-id");

      fetch("/toggle_favorite", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CSRFToken": csrfToken,
        },
        body: JSON.stringify({ note_id: noteId }),
      })
        .then((response) => response.json())
        .then((data) => {
          if (data.is_favorite) {
            this.classList.remove("not-favorite");
            this.classList.add("favorite");
            this.innerHTML = '<i class="bx bxs-star"></i>';
            showFeedback("Note added to favorites!", "#4CAF50");  
          } else {
            this.classList.remove("favorite");
            this.classList.add("not-favorite");
            this.innerHTML = '<i class="bx bx-star"></i>';
            showFeedback("Note removed from favorites!", "#FF6347"); // Optional: Different color for removal
          }
          setTimeout(() => {
            window.location.reload();
          }, 3000);
        })
        .catch((error) => {
          console.error("Error:", error);
        });
    });
  });
  function showFeedback(message, backgroundColor = "#4CAF50") {
    const feedbackDiv = document.createElement("div");
    feedbackDiv.innerText = message;
    feedbackDiv.style.position = "fixed";
    feedbackDiv.style.bottom = "20px";
    feedbackDiv.style.right = "20px";
    feedbackDiv.style.backgroundColor = backgroundColor; 
    feedbackDiv.style.color = "#fff";
    feedbackDiv.style.padding = "10px";
    feedbackDiv.style.borderRadius = "5px";
    feedbackDiv.style.zIndex = "1000";
    feedbackDiv.style.boxShadow = "0 4px 8px rgba(0, 0, 0, 0.1)";
    
    document.body.appendChild(feedbackDiv);
    setTimeout(() => {
      document.body.removeChild(feedbackDiv);
    }, 2000);
  }
});


document.addEventListener("DOMContentLoaded", function () {
  const addToDoButton = document.getElementById("addToDoButton");

  if (addToDoButton) {
    addToDoButton.addEventListener("click", function () {
      const noteId = addToDoButton.getAttribute("data-note-id");

      fetch("/add_to_do", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CSRFToken": csrfToken,
        },
        body: JSON.stringify({ note_id: noteId }),
      })
        .then((response) => response.json())
        .then((data) => {
          if (data.success) {
            showFeedback(data.message, "#4CAF50"); // Green for success
            setTimeout(() => {
              window.location.reload();
            }, 2000);
          } else {
            showFeedback(data.message, "#FF6347"); 
          }
        })
        .catch((error) => {
          console.error("Error:", error);
          showFeedback("An error occurred. Please try again.", "#FF6347");
        });
    });
  }
  function showFeedback(message, backgroundColor = "#4CAF50") {
    const feedbackDiv = document.createElement("div");
    feedbackDiv.innerText = message;
    feedbackDiv.style.position = "fixed";
    feedbackDiv.style.bottom = "20px";
    feedbackDiv.style.right = "20px";
    feedbackDiv.style.backgroundColor = backgroundColor;
    feedbackDiv.style.color = "#fff";
    feedbackDiv.style.padding = "10px";
    feedbackDiv.style.borderRadius = "5px";
    feedbackDiv.style.zIndex = "1000";
    feedbackDiv.style.boxShadow = "0 4px 8px rgba(0, 0, 0, 0.1)";
    
    document.body.appendChild(feedbackDiv);

    setTimeout(() => {
      document.body.removeChild(feedbackDiv);
    }, 2000);
  }
});

document.addEventListener("DOMContentLoaded", function () {
  const copyIcon = document.getElementById("copyIcon");

  const getEditorContent = () => document.getElementById("editor").innerText;

  if (copyIcon) {
    copyIcon.addEventListener("click", function () {
      const editorContent = getEditorContent();
      const tempInput = document.createElement("input");
      tempInput.value = editorContent;
      document.body.appendChild(tempInput);
      tempInput.select();

      try {
        const successful = document.execCommand("copy");
        if (successful) {
          console.log("Copied to clipboard!");
          copyIcon.style.color = "green";
          showFeedback("Copied to clipboard!");
          setTimeout(() => {
            copyIcon.style.color = "white";
          }, 3000);
        }
      } catch (err) {
        console.error("Error copying text: ", err);
      } finally {
        document.body.removeChild(tempInput);
      }
    });
  }

  function showFeedback(message) {
    const feedbackDiv = document.createElement("div");
    feedbackDiv.innerText = message;
    feedbackDiv.style.position = "fixed";
    feedbackDiv.style.bottom = "20px";
    feedbackDiv.style.right = "20px";
    feedbackDiv.style.backgroundColor = "#333";
    feedbackDiv.style.color = "#fff";
    feedbackDiv.style.padding = "10px";
    feedbackDiv.style.borderRadius = "5px";
    feedbackDiv.style.zIndex = "1000";
    document.body.appendChild(feedbackDiv);
    setTimeout(() => {
      document.body.removeChild(feedbackDiv);
    }, 2000);
  }
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
  setTimeout(function () {
    const alerts = document.querySelectorAll(".alert");
    alerts.forEach((alert) => {
      alert.classList.remove("show");
      alert.classList.add("fade");
      setTimeout(() => alert.remove(), 150);
    });
  }, 3000);
});