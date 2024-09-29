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
  const confirmDownloadButton = document.getElementById(
    "confirmDownloadButton"
  );
  const subtasks = document.querySelectorAll(".subtaskContent");

  downloadTextButton.addEventListener("click", function () {
    fileTypeModal.style.display = "block";
  });

  const span = document.getElementById("closeModal");
  span.onclick = function (event) {
    event.preventDefault();
    fileTypeModal.style.display = "none";
  };

  confirmDownloadButton.addEventListener("click", function () {
    const fileType = fileTypeSelect.value;
    const mainContent = quill.root.innerHTML;
    const noteTitle = document
      .getElementById("todoTitle")
      .innerText.trim()
      .replace("Title: ", "");

    let content = mainContent;
    subtasks.forEach((subtask, index) => {
      content += `<hr />${subtask.innerHTML}`;
    });

    let blob, url;
    if (fileType === "txt") {
      const plainText = quill.getText() + "\n";
      subtasks.forEach((subtask) => {
        plainText += "\n---\n" + subtask.innerText + "\n";
      });
      blob = new Blob([plainText], { type: "text/plain" });
      url = URL.createObjectURL(blob);
      downloadFile(url, noteTitle, fileType);
    } else if (fileType === "html") {
      blob = new Blob([content], { type: "text/html" });
      url = URL.createObjectURL(blob);
      downloadFile(url, noteTitle, fileType);
    } else if (fileType === "pdf") {
      const { jsPDF } = window.jspdf;
      const pdf = new jsPDF();
      pdf.fromHTML(content);
      url = pdf.output("bloburl");
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

function updateTodoStatus(todoId, isCompleted, dueDate) {
  const currentDate = new Date();

  // Check if the due date is set and if it's in the future
  if (dueDate && new Date(dueDate) > currentDate && !isCompleted) {
    console.warn("Cannot mark as completed; due date has not been reached.");
    alert(
      "You cannot mark this todo as completed until the due date has been reached."
    );
    return;
  }

  // If already completed and trying to mark it again
  if (isCompleted) {
    displayAlreadyCompletedNote();
    return; // Prevent further execution if already completed
  }

  const newStatus = !isCompleted;

  fetch(`/update_todo_status/${todoId}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ is_completed: newStatus }),
  })
    .then((response) => response.json())
    .then((data) => {
      if (data.message) {
        console.log(data.message);
        displayCompletionNote(); // Show the completion note
        setTimeout(() => {
          location.reload(); // Reload after the note is displayed
        }, 3000); // Adjust the duration as necessary
      } else {
        console.error("Update failed:", data.error || "Unknown error");
      }
    })
    .catch((error) => {
      console.error("Error:", error);
    });
}

// Function to display a completion note
function displayCompletionNote() {
  const note = document.createElement("div");
  note.innerText = `Completed on ${new Date().toLocaleString()}`;
  note.style.position = "fixed";
  note.style.bottom = "10px";
  note.style.right = "10px";
  note.style.padding = "10px";
  note.style.backgroundColor = "lightgreen";
  note.style.border = "1px solid green";
  note.style.zIndex = "1000";

  document.body.appendChild(note);

  setTimeout(() => {
    document.body.removeChild(note);
  }, 3000);
}

// Function to display a message if already completed
function displayAlreadyCompletedNote() {
  const note = document.createElement("div");
  note.innerText = "This todo is already marked as completed.";
  note.style.position = "fixed";
  note.style.bottom = "10px";
  note.style.right = "10px";
  note.style.padding = "10px";
  note.style.backgroundColor = "lightcoral"; // Different color for distinction
  note.style.border = "1px solid red";
  note.style.zIndex = "1000";

  document.body.appendChild(note);

  setTimeout(() => {
    document.body.removeChild(note);
  }, 3000);
}

function toggleDeleteOption(subtaskId) {
  const deleteOption = document.getElementById(`delete-option-${subtaskId}`);
  if (
    deleteOption.style.display === "none" ||
    deleteOption.style.display === ""
  ) {
    deleteOption.style.display = "block";
  } else {
    deleteOption.style.display = "none";
  }
}

document.addEventListener("click", function (event) {
  const deleteOptions = document.querySelectorAll('[id^="delete-option-"]');

  deleteOptions.forEach((option) => {
    const subtaskId = option.id.split("-")[2];
    const header = document.querySelector(
      `[onclick="toggleDeleteOption(${subtaskId})"]`
    );
    if (!option.contains(event.target) && !header.contains(event.target)) {
      option.style.display = "none";
    }
  });
});

document.addEventListener("DOMContentLoaded", () => {
  const searchInput = document.getElementById("searchInput");
  const todosList = document.getElementById("todosList");

  // Fetch and display todos initially
  fetchTodos();

  searchInput.addEventListener("input", () => {
    const query = searchInput.value.trim();
    if (query.length > 0) {
      searchTodos(query);
    } else {
      fetchTodos();
    }
  });

  function searchTodos(query) {
    fetch(`/search_todos?query=${encodeURIComponent(query)}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "X-CSRFToken": getCookie("csrf_token"),
      },
    })
      .then((response) => response.json())
      .then((data) => {
        renderTodos(data);
      })
      .catch((error) => console.error("Error fetching todos:", error));
  }

  function fetchTodos() {
    fetch("/search_todos", {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "X-CSRFToken": getCookie("csrf_token"),
      },
    })
      .then((response) => response.json())
      .then((data) => {
        renderTodos(data);
      })
      .catch((error) => console.error("Error fetching todos:", error));
  }
  function renderTodos(todos) {
    todosList.innerHTML = ""; // Clear the current list
    if (todos.length === 0) {
      const noNotesMessage = document.createElement("p");
      noNotesMessage.classList.add("no-notes");
      noNotesMessage.textContent = "No Available To-Do";
      todosList.appendChild(noNotesMessage);
      return;
    }

    todos.forEach((todo) => {
      const li = document.createElement("li");
      li.classList.add("note-item");
      li.style.setProperty("--background-", todo.color);
      li.setAttribute("data-note-id", todo.id);
      const truncatedTitle =
        todo.title.split("\n")[0].slice(0, 6) +
        (todo.title.length > 13 ? "..." : "");

      const truncatedContent =
        processTodoContent(todo.content).slice(0, 20) +
        (todo.content.length > 20 ? "..." : "");

      const dueDate = todo.due_date
        ? new Date(todo.due_date).toLocaleDateString()
        : "";

      li.innerHTML = `
        <div class="note-header">
          <h3>${truncatedTitle}</h3>
          ${
            todo.due_date
              ? `
            <span class="note-tag">
              <input type="checkbox"
              class="checkbox"
                ${todo.is_completed ? "checked" : ""}
                onclick="updateTodoStatus(${todo.id}, this.checked)"
                id="todo-${todo.id}" disabled/>
              Due: ${dueDate}
            </span>
          `
              : ""
          }
        </div>
        <pre class="note-content">${truncatedContent}</pre>

      `;
      todosList.appendChild(li);
      const separator = document.createElement("hr");
      separator.style.setProperty("--background-", todo.color);
      todosList.appendChild(separator);
    });
  }
  function processTodoContent(content) {
    const lines = content.replace(/<br\s*\/?>/gi, "\n").split("\n");
    const firstLine = lines[0] ? lines[0].slice(0, 20) : "";
    return decodeHtmlEntities(stripHtmlTags(firstLine));
  }

  function decodeHtmlEntities(text) {
    const textarea = document.createElement("textarea");
    textarea.innerHTML = text;
    return textarea.value;
  }

  function stripHtmlTags(text) {
    const tempDiv = document.createElement("div");
    tempDiv.innerHTML = text;
    return tempDiv.textContent || tempDiv.innerText || "";
  }

  function getCookie(name) {
    let cookieValue = null;
    if (document.cookie && document.cookie !== "") {
      const cookies = document.cookie.split(";");
      for (let i = 0; i < cookies.length; i++) {
        const cookie = cookies[i].trim();
        if (cookie.substring(0, name.length + 1) === name + "=") {
          cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
          break;
        }
      }
    }
    return cookieValue;
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
