document.addEventListener("DOMContentLoaded", function () {
  var modal = document.getElementById("menuModal");
  var btn = document.getElementById("openModalBtn");
  var span = document.querySelector(".close");
  var closeLeftContainer = document.getElementById("closeLeftContainer");
  var returnLeftContainer = document.getElementById("returnLeftContainer");
  var leftContainer = document.querySelector(".left-container");
  var rightContainer = document.querySelector(".right-container");
  var editIcon = document.querySelector(".edit");
  var favoriteIcon = document.querySelector(".done");
  var subTask = document.querySelector(".add_subtask");

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
    editIcon.style.marginLeft = "40px";
    editIcon.style.top = "52px";
    favoriteIcon.style.top = "52px";
    favoriteIcon.style.marginLeft = "36px";
    subTask.style.marginLeft = "66px";
  };
  returnLeftContainer.onclick = function (event) {
    event.preventDefault();
    leftContainer.style.display = "block";
    rightContainer.style.width = "80%";
    returnLeftContainer.style.display = "none";
    editIcon.style.marginLeft = "0px";
    editIcon.style.top = "50px";
    favoriteIcon.style.marginLeft = "0px";
    favoriteIcon.style.top = "50px";
    subTask.style.marginLeft = "30px";
  };
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

function updateTodoStatus(todoId, isCompleted) {
  fetch(`/update_todo_status/${todoId}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ is_completed: isCompleted }),
  })
    .then((response) => response.json())
    .then((data) => {
      console.log(data.message);
      location.reload();
    })
    .catch((error) => {
      console.error("Error:", error);
    });
}

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
    todosList.innerHTML = "";
    todos.forEach((todo) => {
      const li = document.createElement("li");
      li.classList.add("todo-item");
      li.style.setProperty("--background-", todo.color);
      li.setAttribute("data-note-id", todo.id);

      // Process the content
      const firstLine = processTodoContent(todo.content);

      li.innerHTML = `
          <span class="todo-title">${todo.title.slice(0, 10) + (todo.title.length > 10 ? '...' : '')}</span>
          ${
            todo.due_date
              ? `<span class="due-date">Due: ${new Date(
                  todo.due_date
                ).toLocaleDateString()}</span>`
              : ""
          }
        </label>
        <pre class="todo-content">${firstLine}</pre>
      `;
      li.addEventListener("click", function (event) {
        if (!event.target.closest("input, a, button, form")) {
          const noteId = this.getAttribute("data-note-id");
          window.location.href = `/todo_viewer/${noteId}`;
        }
      });

      todosList.appendChild(li);
      const separator = document.createElement("hr");
      separator.style.setProperty("--background-", todo.color);
      todosList.appendChild(separator);

      li.addEventListener("mouseenter", function () {
        separator.style.borderColor = todo.color;
      });

      li.addEventListener("mouseleave", function () {
        separator.style.borderColor = "#fff";
      });
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
