function goBackToTagNotes() {
  window.history.back();
}
document.querySelector(".back-arrow").addEventListener("click", function () {
  goBackToTagNotes();
});

document.addEventListener("DOMContentLoaded", function () {
  var closeLeftContainer = document.getElementById("closeLeftContainer");
  var returnLeftContainer = document.getElementById("returnLeftContainer");
  var leftContainer = document.querySelector(".left-container");
  var rightContainer = document.querySelector(".right-container");
  var returnIcon = document.getElementById("returnIcon");

  closeLeftContainer.onclick = function (event) {
    event.preventDefault();
    leftContainer.style.display = "none";
    rightContainer.style.width = "100%";
    returnLeftContainer.style.display = "flex";
    returnIcon.style.display = "inline";
  };

  returnLeftContainer.onclick = function (event) {
    event.preventDefault();
    leftContainer.style.display = "block";
    rightContainer.style.width = "80%";
    returnLeftContainer.style.display = "none";
    returnIcon.style.display = "none";
  };
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
