document.addEventListener("DOMContentLoaded", () => {
  const notificationItems = document.querySelectorAll(".notification-item");

  notificationItems.forEach((item) => {
    item.addEventListener("click", function () {
      const notificationId = this.dataset.notificationId;

      fetch(`/mark_as_read/${notificationId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CSRFToken": "{{ csrf_token() }}",
        },
      })
        .then((response) => response.json())
        .then((data) => {
          if (data.message === "Notification marked as read.") {
            this.classList.add("read");
            updateNotificationBadge();
          } else {
            console.error("Failed to mark notification as read");
          }
        })
        .catch((error) =>
          console.error("Error marking notification as read:", error)
        );
    });
  });
  updateNotificationBadge(); 
});

function updateNotificationBadge() {
  const unreadCount = document.querySelectorAll(".notification-item:not(.read)")
    .length;
  const badgeElement = document.getElementById("notificationBadge");

  if (badgeElement) {
    badgeElement.textContent = unreadCount; 
  }
}


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
  const notificationBell = document.querySelector(".notification a");

  if (notificationBell) {
    notificationBell.addEventListener("click", function () {
      fetch("/mark_all_as_read", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CSRFToken": "{{ csrf_token() }}",
        },
      })
        .then((response) => response.json())
        .then((data) => {
          if (data.message === "All notifications marked as read.") {
            document
              .querySelectorAll(".notification-item")
              .forEach((item) => item.classList.add("read"));
            updateNotificationBadge();
          } else {
            console.error("Failed to mark all notifications as read");
          }
        })
        .catch((error) =>
          console.error("Error marking all notifications as read:", error)
        );
    });
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
window.onload = resetTimer;
document.onmousemove = resetTimer;
document.onkeypress = resetTimer;
document.onscroll = resetTimer;
document.onclick = resetTimer;
