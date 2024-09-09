document.addEventListener("DOMContentLoaded", function () {
  const noteItems = document.querySelectorAll(".note-item");
  const searchInput = document.getElementById("searchInput");
  const notesList = document.getElementById("notesList");
  const tagId = searchInput.getAttribute("data-tag-id");

  // Set initial styles and add event listeners for note items
  noteItems.forEach((item) => {
    const tagColor = item.getAttribute("data-tag-color");

    item.style.setProperty("--bullet-color", tagColor);
    item.style.setProperty("--tag-color", tagColor);

    item.addEventListener("mouseenter", function () {
      this.style.setProperty("--bullet-color", tagColor); // Set bullet color on hover
      const hrElement = this.querySelector("hr");
      hrElement.style.borderColor = tagColor;
    });

    item.addEventListener("mouseleave", function () {
      this.style.setProperty("--bullet-color", tagColor); // Reset bullet color on leave
      const hrElement = this.querySelector("hr");
      hrElement.style.borderColor = "white";
    });

    item.addEventListener("click", function () {
      const noteId = this.getAttribute("data-note-id");
      window.location.href = `/note_viewer/${noteId}`;
    });
  });

  // Add input event listener to search input
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

              // Add event listeners to maintain hover behavior
              listItem.addEventListener("mouseenter", function () {
                const hrElement = this.querySelector("hr");
                hrElement.style.borderColor = note.color;
              });

              listItem.addEventListener("mouseleave", function () {
                const hrElement = this.querySelector("hr");
                hrElement.style.borderColor = "#fff";
              });

              // Add click event listener to newly created note-item
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
  var modal = document.getElementById("menuModal");
  var btn = document.getElementById("openModalBtn");
  var span = document.querySelector(".close");
  var closeLeftContainer = document.getElementById("closeLeftContainer");
  var returnLeftContainer = document.getElementById("returnLeftContainer");
  var leftContainer = document.querySelector(".left-container");
  var rightContainer = document.querySelector(".right-container");
  var returnIcon = document.getElementById("returnIcon");
  var editIcon = document.querySelector(".edit");
  var favoriteIcon = document.querySelector(".favorite");

  btn.onclick = function (event) {
    event.preventDefault();
    modal.style.display = "flex";
  };

  span.onclick = function (event) {
    event.preventDefault();
    modal.style.display = "none";
  };

  closeLeftContainer.onclick = function (event) {
    event.preventDefault();
    leftContainer.style.display = "none";
    rightContainer.style.width = "100%";
    returnLeftContainer.style.display = "flex";
    returnIcon.style.display = "inline";
    editIcon.style.marginLeft = "40px";
    editIcon.style.top = "52px";
    favoriteIcon.style.top = "52px";
    favoriteIcon.style.marginLeft = "36px";
  };

  returnLeftContainer.onclick = function (event) {
    event.preventDefault();
    leftContainer.style.display = "block";
    rightContainer.style.width = "80%";
    returnLeftContainer.style.display = "none";
    returnIcon.style.display = "none";
    editIcon.style.marginLeft = "0px";
    editIcon.style.top = "50px";
    favoriteIcon.style.marginLeft = "0px";
    favoriteIcon.style.top = "50px";
  };
});

document.addEventListener("DOMContentLoaded", function () {
  // Initialize Quill editor
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
        },
        body: JSON.stringify({ note_id: noteId }),
      })
        .then((response) => response.json())
        .then((data) => {
          if (data.is_favorite) {
            this.classList.remove("not-favorite");
            this.classList.add("favorite");
            this.innerHTML = '<i class="bx bxs-star"></i>';
          } else {
            this.classList.remove("favorite");
            this.classList.add("not-favorite");
            this.innerHTML = '<i class="bx bx-star"></i>';
          }
          window.location.reload();
        })
        .catch((error) => {
          console.error("Error:", error);
        });
    });
  });
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
        },
        body: JSON.stringify({ note_id: noteId }),
      })
        .then((response) => response.json())
        .then((data) => {
          if (data.success) {
            window.location.reload();
          } else {
            console.error("Failed to add note to To-Dos.");
          }
        })
        .catch((error) => {
          console.error("Error:", error);
        });
    });
  }
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
      "X-CSRFToken": "{{ csrf_token() }}",
    },
  }).then((response) => {
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
