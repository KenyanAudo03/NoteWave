document.addEventListener("DOMContentLoaded", function () {
  document
    .getElementById("show-pass-checkbox")
    .addEventListener("change", function () {
      var passwordField = document.getElementById("password");
      if (this.checked) {
        passwordField.type = "text";
      } else {
        passwordField.type = "password";
      }
    });
    
  const form = document.getElementById("form-signup");
  const firstName = document.getElementById("firstName");
  const secondName = document.getElementById("secondName");
  const email = document.getElementById("email");
  const password = document.getElementById("password");
  const confirmTerms = document.getElementById("confirm-terms");
  const confirmPassword = document.getElementById("confirm-password");
  const passwordStrengthIndicator = document.getElementById("passwordStrength");
  const csrfToken = document.querySelector('input[name="csrf_token"]').value; // Get CSRF token
  
  function addErrorStyles(element, message) {
    element.classList.add("input-error", "zoom-out-twice");
    let errorElement = element.parentNode.querySelector(".error-message");
    
    if (!errorElement) {
      errorElement = document.createElement("div");
      errorElement.classList.add("error-message");
      
      const closeIcon = document.createElement("span");
      closeIcon.classList.add("close-icon");
      closeIcon.innerHTML = "&times;";
      closeIcon.style.cursor = "pointer";
      closeIcon.style.fontSize = "18px";
      closeIcon.style.marginLeft = "10px";
      
      // Append message and close icon
      errorElement.textContent = message;
      errorElement.appendChild(closeIcon);
      element.parentNode.appendChild(errorElement);
  
      // Close icon click event
      closeIcon.addEventListener("click", () => {
        errorElement.classList.add("slide-out");
        setTimeout(() => {
          errorElement.remove();
        }, 500);
      });
    } else {
      errorElement.textContent = message;
      errorElement.appendChild(closeIcon);
    }
  
    // Auto-remove after 3 seconds if not closed
    setTimeout(() => {
      errorElement.classList.add("slide-out");
      setTimeout(() => {
        errorElement.remove();
      }, 500);
    }, 3000);
  }
  
  function removeErrorStyles(element) {
    element.classList.remove("zoom-out-twice", "input-error");
  }
  
  function checkPasswordStrength() {
    const passwordValue = password.value;
    let strength = 0;
    
    if (passwordValue.length >= 8) strength += 1;
    if (/[a-z]/.test(passwordValue)) strength += 1;
    if (/[A-Z]/.test(passwordValue)) strength += 1;
    if (/\d/.test(passwordValue)) strength += 1;
  
    const width = strength * 25;
    passwordStrengthIndicator.style.width = width + "%";
    passwordStrengthIndicator.classList.remove("weak", "medium", "strong");
    
    if (strength <= 2) {
      passwordStrengthIndicator.classList.add("weak");
    } else if (strength === 3) {
      passwordStrengthIndicator.classList.add("medium");
    } else if (strength === 4) {
      passwordStrengthIndicator.classList.add("strong");
    }
    
    return strength === 4;
  }
  
  password.addEventListener("input", checkPasswordStrength);
  password.addEventListener("input", function () {
    confirmPassword.value = password.value;
  });
  confirmPassword.addEventListener("input", function () {
    password.value = confirmPassword.value;
  });
  
  function checkEmailExists(emailValue, callback) {
    var xhr = new XMLHttpRequest();
    xhr.open("POST", "/auth/check_email_signup", true);
    xhr.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
    xhr.onreadystatechange = function () {
      if (xhr.readyState === XMLHttpRequest.DONE) {
        var response = JSON.parse(xhr.responseText);
        callback(response.exists);
      }
    };
    xhr.send("email=" + encodeURIComponent(emailValue.trim()) + "&csrf_token=" + encodeURIComponent(csrfToken)); // Include CSRF token
  }
  
  form.addEventListener("submit", function (event) {
    event.preventDefault();
    
    let valid = true;
  
    if (!firstName.value.trim()) {
      valid = false;
      addErrorStyles(firstName, "First name is required.");
      return;
    }
  
    if (!secondName.value.trim()) {
      valid = false;
      addErrorStyles(secondName, "Second name is required.");
      return;
    }
  
    if (!email.value.trim() || !/^\S+@\S+\.\S+$/.test(email.value.trim())) {
      valid = false;
      addErrorStyles(email, "Valid email is required.");
      return;
    }
  
    if (!password.value.trim()) {
      valid = false;
      addErrorStyles(password, "Password is required.");
      return;
    } else if (!checkPasswordStrength()) {
      valid = false;
      addErrorStyles(password, "Password must meet strength requirements.");
      return;
    }
  
    if (!confirmPassword.value.trim() || confirmPassword.value !== password.value) {
      valid = false;
      addErrorStyles(confirmPassword, "Passwords must match.");
      return;
    }
  
    if (!confirmTerms.checked) {
      valid = false;
      addErrorStyles(confirmTerms, "You must agree to the terms and conditions.");
      return;
    }
  
    if (valid) {
      checkEmailExists(email.value, function (emailExists) {
        if (emailExists) {
          Swal.fire({
            icon: "error",
            title: "Oops...",
            text: "Account already exists. Please proceed to login.",
            timer: 2000,
            showConfirmButton: false,
            position: "top",
            customClass: {
              popup: "swal2-custom-popup",
              title: "swal2-custom-title",
              content: "swal2-custom-content",
            },
          });
        } else {
          form.submit();
        }
      });
    }
  });
});
