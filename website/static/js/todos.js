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

