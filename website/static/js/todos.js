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
window.updateTodoStatus = function (todoId, isCompleted) {
  fetch(`/update_todo_status/${todoId}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-CSRFToken": getCookie("csrf_token"),
    },
    body: JSON.stringify({ is_completed: isCompleted }),
  })
    .then((response) => {
      if (!response.ok) {
        throw new Error("Failed to update To-Do status");
      }
      return response.json();
    })
    .then((data) => {
      console.log("To-Do status updated:", data);
    })
    .catch((error) => console.error("Error updating To-Do status:", error));
};

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

document.addEventListener("DOMContentLoaded", (event) => {
  const todos = document.querySelectorAll(".todo-item");
  todos.forEach((todo) => {
    const dueDateElement = todo.querySelector(".due-date");
    if (dueDateElement) {
      const dueDate = new Date(dueDateElement.textContent.replace("Due: ", ""));
      const currentDate = new Date();
      if (dueDate <= currentDate) {
        const checkbox = todo.querySelector('input[type="checkbox"]');
        if (!checkbox.checked) {
          checkbox.checked = true;
          updateTodoStatus(todo.dataset.todoId, true);
        }
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
  setTimeout(function () {
    const alerts = document.querySelectorAll(".alert");
    alerts.forEach((alert) => {
      alert.classList.remove("show");
      alert.classList.add("fade");
      setTimeout(() => alert.remove(), 150);
    });
  }, 3000);
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
    todosList.innerHTML = "";
    todos.forEach((todo) => {
      const li = document.createElement("li");
      li.classList.add("todo-item");
      li.style.setProperty("--background-", todo.color);
      li.setAttribute("data-note-id", todo.id);

      // Process the content
      const firstLine = processTodoContent(todo.content);

      li.innerHTML = `
        <input
          type="checkbox"
          ${todo.is_completed ? "checked" : ""}
          onclick="updateTodoStatus(${todo.id}, this.checked)"
          id="todo-${todo.id}"
        />
        <label for="todo-${todo.id}" style="--background-: ${todo.color};">
          <span class="todo-title">${todo.title}</span>
          ${todo.due_date ? `<span class="due-date">Due: ${new Date(todo.due_date).toLocaleDateString()}</span>` : ""}
        </label>
        <p class="todo-content">${firstLine}</p>
        <div class="todo-actions">
          <a href="/todos/edit/${todo.id}" class="edit-button" style="--background-: ${todo.color};">Edit</a>
          <form action="/delete_todo/${todo.id}" method="post" onsubmit="return confirm('Are you sure you want to delete this To-Do?');">
            <button type="submit" class="delete-button" style="--background-: ${todo.color};">Delete</button>
          </form>
        </div>
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
    const lines = content.replace(/<br\s*\/?>/gi, '\n').split('\n');
    const firstLine = lines[0] ? lines[0].slice(0, 50) : '';
    return decodeHtmlEntities(stripHtmlTags(firstLine));
  }

  function decodeHtmlEntities(text) {
    const textarea = document.createElement('textarea');
    textarea.innerHTML = text;
    return textarea.value;
  }

  function stripHtmlTags(text) {
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = text;
    return tempDiv.textContent || tempDiv.innerText || '';
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
