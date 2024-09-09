document.addEventListener("DOMContentLoaded", function () {
  const form = document.getElementById("contactForm");
  const button = document.getElementById("btn");
  const spinner = document.querySelector(".spinner");

  form.addEventListener("submit", function (event) {
    button.textContent = "Sending...";
    button.classList.add("sending");
    spinner.style.display = "inline-block";

    setTimeout(() => {}, 100);
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
