document.getElementById("show-pass-checkbox").addEventListener("change", function () {
    var passwordField = document.getElementById("password");
    if (this.checked) {
      passwordField.type = "text";
    } else {
      passwordField.type = "password";
    }
  });

  document.addEventListener("DOMContentLoaded", function () {
    const passwordField = document.getElementById("password");
    const confirmPasswordField = document.getElementById("confirm_password");
    const showPasswordCheckbox = document.getElementById("show-pass-checkbox");
    const errorMessage = document.getElementById("error-message");
    const errorText = document.getElementById("error-text");
    const errorClose = document.getElementById("error-close");
    const strengthMeter = document.querySelector(".strength-meter");
    const strengthBar = document.getElementById("password-strength-bar");
    const form = document.getElementById("form-reset");
    function showError(message) {
      errorText.textContent = message;
      errorMessage.style.display = "block";
      errorMessage.classList.remove("slide-out");
      setTimeout(function () {
        errorMessage.classList.add("slide-out"); 
      }, 3000);
      setTimeout(function () {
        errorMessage.style.display = "none";
      }, 3500); 
    }
  
    function checkPasswordMatch() {
      if (passwordField.value !== confirmPasswordField.value) {
        showError("Passwords do not match");
        return false;
      }
      return true;
    }
    function checkPasswordStrength(password) {
      let strength = 0;
  
      if (password.length >= 8) strength++; 
      if (/[A-Z]/.test(password)) strength++; 
      if (/[a-z]/.test(password)) strength++; 
      if (/[0-9]/.test(password)) strength++; 
      if (/[@$!%*?&]/.test(password)) strength++; 
  
      strengthBar.style.width = (strength * 20) + "%"; 

      strengthMeter.classList.remove("weak", "medium", "strong");
  
      if (strength <= 2) {
        strengthMeter.classList.add("weak");
      } else if (strength <= 4) {
        strengthMeter.classList.add("medium");
      } else {
        strengthMeter.classList.add("strong");
      }
  
      return strength;
    }
  
    // Show/Hide Password
    showPasswordCheckbox.addEventListener("change", function () {
      const type = showPasswordCheckbox.checked ? "text" : "password";
      passwordField.type = type;
      confirmPasswordField.type = type;
    });
    passwordField.addEventListener("input", function () {
      const password = passwordField.value;
      checkPasswordStrength(password);
    });
    form.addEventListener("submit", function (event) {
      event.preventDefault();
      const passwordStrength = checkPasswordStrength(passwordField.value);
  
      if (!checkPasswordMatch()) {
        return;
      }
  
      if (passwordStrength < 3) {
        showError("Password is too weak");
        return;
      }
      form.submit();
    });
  });
  
  
  
  