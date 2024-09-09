document.addEventListener("DOMContentLoaded", function () {
    // Show Password Functionality
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
  
    var notepadInfo = document.getElementById("notepad-info");
    var infoSections = notepadInfo.querySelectorAll(".info-section");
    var currentIndex = 0;
    var leftArrow = document.querySelector(".left-arrow");
    var rightArrow = document.querySelector(".right-arrow");
    var dots = document.querySelectorAll(".dot");
  
    // Initially hide all sections except the first one
    for (var i = 1; i < infoSections.length; i++) {
      infoSections[i].style.display = "none";
    }
  
    // Function to update the active dot
    function updateActiveDot(index) {
      dots.forEach(function (dot, i) {
        if (i === index) {
          dot.classList.add("active");
        } else {
          dot.classList.remove("active");
        }
      });
    }
  
    function updateArrowsVisibility(index) {
      if (infoSections.length === 1) {
        leftArrow.style.display = "none";
        rightArrow.style.display = "";
      } else {
        if (index === 0) {
          leftArrow.style.display = "none";
          rightArrow.style.display = "";
        } else if (index === infoSections.length - 1) {
          leftArrow.style.display = "";
          rightArrow.style.display = "none";
        } else {
          leftArrow.style.display = "";
          rightArrow.style.display = "";
        }
      }
    }
  
    rightArrow.addEventListener("click", function () {
      infoSections[currentIndex].style.display = "none";
      currentIndex = (currentIndex + 1) % infoSections.length;
      infoSections[currentIndex].style.display = "block";
      updateActiveDot(currentIndex);
      updateArrowsVisibility(currentIndex);
    });
  
    leftArrow.addEventListener("click", function () {
      infoSections[currentIndex].style.display = "none";
      currentIndex =
        currentIndex === 0 ? infoSections.length - 1 : currentIndex - 1;
      infoSections[currentIndex].style.display = "block";
      updateActiveDot(currentIndex);
      updateArrowsVisibility(currentIndex);
    });
  
    updateActiveDot(currentIndex);
    updateArrowsVisibility(currentIndex);
  
    const form = document.getElementById("form-signup");
    const firstName = document.getElementById("firstName");
    const secondName = document.getElementById("secondName");
    const email = document.getElementById("email");
    const password = document.getElementById("password");
    const confirmPassword = document.getElementById("confirm-password");
    const passwordStrengthIndicator = document.getElementById("passwordStrength");
  
  
    // Function to add error styles and animations
    function addErrorStyles(element) {
      element.classList.add("input-error");
      element.classList.add("zoom-out-twice");
    }
  
    // Function to remove error styles and animations
    function removeErrorStyles(element) {
      element.classList.remove("zoom-out-twice");
      element.classList.remove("input-error");
    }
  
    // Function to check password strength
    function checkPasswordStrength() {
      var passwordValue = password.value;
      var strength = 0;
  
      if (passwordValue.length >= 8) {
        strength += 1;
      }
  
      if (/[a-z]/.test(passwordValue)) {
        strength += 1;
      }
      if (/[A-Z]/.test(passwordValue)) {
        strength += 1;
      }
      if (/\d/.test(passwordValue)) {
        strength += 1;
      }
  
      var width = strength * 25; // Each condition contributes 25% width
      passwordStrengthIndicator.style.width = width + "%";
  
      passwordStrengthIndicator.classList.remove("weak", "medium", "strong");
      if (strength <= 2) {
        passwordStrengthIndicator.classList.add("weak");
      } else if (strength <= 3) {
        passwordStrengthIndicator.classList.add("medium");
      } else {
        passwordStrengthIndicator.classList.add("strong");
      }
  
      return strength === 4;
    }
  
    // Event listener for password input
    password.addEventListener("input", function () {
      checkPasswordStrength();
    });
  
    // Sync confirm password field when password field changes
    password.addEventListener("input", function () {
      confirmPassword.value = password.value;
    });
  
    confirmPassword.addEventListener("input", function () {
      password.value = confirmPassword.value;
    });
  
    // Form submission event listener
    form.addEventListener("submit", function (event) {
      event.preventDefault(); // Prevent default form submission
  
      let valid = true;
  
      // Check if the first name is filled
      if (!firstName.value.trim()) {
        valid = false;
        addErrorStyles(firstName);
      }
  
      // Check if the second name is filled
      if (!secondName.value.trim()) {
        valid = false;
        addErrorStyles(secondName);
      }
  
      // Check if the password is filled
      if (!password.value.trim()) {
        valid = false;
        addErrorStyles(password);
      }
      if (!checkPasswordStrength()) {
        valid = false;
        addErrorStyles(password);
      }
  
      // Check if the email is filled and valid
      if (!email.value.trim() || !/^\S+@\S+\.\S+$/.test(email.value.trim())) {
        valid = false;
        addErrorStyles(email);
      }
  
      // Check if the confirm password is filled and matches password
      if (
        !confirmPassword.value.trim() ||
        confirmPassword.value !== password.value
      ) {
        valid = false;
        addErrorStyles(confirmPassword);
      }
  
      // If any field is invalid, prevent form submission and show alerts
      if (!valid) {
        // Add zooming animation to empty fields
        if (!firstName.value.trim()) {
          addErrorStyles(firstName);
        }
        if (!secondName.value.trim()) {
          addErrorStyles(secondName);
        }
        if (!email.value.trim() || !/^\S+@\S+\.\S+$/.test(email.value.trim())) {
          addErrorStyles(email);
        }
        if (!password.value.trim()) {
          addErrorStyles(password);
        }
        if (
          !confirmPassword.value.trim() ||
          confirmPassword.value !== password.value
        ) {
          addErrorStyles(confirmPassword);
        }
  
        // Remove the animation and error class after it completes to allow future animations
        setTimeout(() => {
          removeErrorStyles(firstName);
          removeErrorStyles(secondName);
          removeErrorStyles(email);
          removeErrorStyles(password);
          removeErrorStyles(confirmPassword);
        }, 1000);
  
        return; // Stop form submission
      }
  
      // Check email existence
      var xhr = new XMLHttpRequest();
      xhr.open("POST", "/auth/check_email_signup", true);
      xhr.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
      xhr.onreadystatechange = function () {
        if (xhr.readyState === XMLHttpRequest.DONE) {
          var response = JSON.parse(xhr.responseText);
          if (response.exists) {
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
        }
      };
      xhr.send("email=" + encodeURIComponent(email.value.trim()));
    });
  });