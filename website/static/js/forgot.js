document.addEventListener("DOMContentLoaded", function () {
  const form = document.getElementById("form-forgot");
  const email = document.getElementById("email");
  const errorMessage = document.getElementById("error-message");
  const errorText = document.getElementById("error-text");
  const errorClose = document.getElementById("error-close");
  const loader = document.getElementById("loader");

  // Show the error message with text and auto-hide after 3 seconds
  function showError(message) {
    errorText.textContent = message;
    errorMessage.style.display = "block";
    errorMessage.classList.remove("slide-out");

    // Auto-hide after 3 seconds
    setTimeout(function () {
      errorMessage.classList.add("slide-out");
    }, 3000);

    // Completely hide after the transition ends
    setTimeout(function () {
      errorMessage.style.display = "none";
    }, 3500);
  }

  // Hide the error message when close icon is clicked
  errorClose.addEventListener("click", function () {
    errorMessage.classList.add("slide-out");
    setTimeout(function () {
      errorMessage.style.display = "none";
    }, 500); // Hide quickly after close icon is clicked
  });

  // Add and remove error styles for the email input
  function addErrorStyles(element) {
    element.classList.add("input-error", "zoom-out-twice");
  }

  function removeErrorStyles(element) {
    element.classList.remove("input-error", "zoom-out-twice");
  }

  form.addEventListener("submit", function (event) {
    event.preventDefault(); // Prevent form submission for validation
    let valid = true;
    const emailValue = email.value.trim();

    // Check if email is provided and valid
    if (!emailValue) {
      valid = false;
      addErrorStyles(email);
      showError("Email is required.");
    } else if (!/^\S+@\S+\.\S+$/.test(emailValue)) {
      valid = false;
      addErrorStyles(email);
      showError("Please enter a valid email address.");
    } else {
      removeErrorStyles(email);
    }

    if (valid) {
      loader.style.display = "flex";

      setTimeout(() => {
        form.submit(); // Proceed with form submission
      }, 5000); // Simulate delay (e.g., for server response)

      setTimeout(() => {
        loader.style.display = "none"; // Hide loader after submission
      }, 5000);
    }
  });
});
