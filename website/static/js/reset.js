document.getElementById("show-pass-checkbox").addEventListener("change", function () {
    var passwordField = document.getElementById("password");
    if (this.checked) {
      passwordField.type = "text";
    } else {
      passwordField.type = "password";
    }
  });
  
  document.addEventListener("DOMContentLoaded", function () {
    const notepadInfo = document.getElementById("notepad-info");
    const infoSections = notepadInfo.querySelectorAll(".info-section");
    let currentIndex = 0;
    const leftArrow = document.querySelector(".left-arrow");
    const rightArrow = document.querySelector(".right-arrow");
    const dots = document.querySelectorAll(".dot");
  
    // Initially hide all sections except the first one
    for (let i = 1; i < infoSections.length; i++) {
      infoSections[i].style.display = "none";
    }
  
    // Function to update the active dot
    function updateActiveDot(index) {
      dots.forEach((dot, i) => {
        dot.classList.toggle("active", i === index);
      });
    }
  
    function updateArrowsVisibility(index) {
      if (infoSections.length === 1) {
        leftArrow.style.display = "none";
        rightArrow.style.display = "none";
      } else {
        leftArrow.style.display = index === 0 ? "none" : "";
        rightArrow.style.display =
          index === infoSections.length - 1 ? "none" : "";
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
  
    const form = document.getElementById("form-reset");
    const password = document.getElementById("password");
    const confirmPassword = document.getElementById("confirm_password");
    const checkLength = document.getElementById("check-length");
    const checkUppercase = document.getElementById("check-uppercase");
    const checkLowercase = document.getElementById("check-lowercase");
    const checkNumber = document.getElementById("check-number");
  
    function addErrorStyles(element) {
      element.classList.add("input-error", "zoom-out-twice");
    }
  
    function removeErrorStyles(element) {
      element.classList.remove("input-error", "zoom-out-twice");
    }
  
    function validatePassword() {
      const passwordValue = password.value;
  
      const lengthValid = passwordValue.length >= 8;
      const uppercaseValid = /[A-Z]/.test(passwordValue);
      const lowercaseValid = /[a-z]/.test(passwordValue);
      const numberValid = /\d/.test(passwordValue);
  
      checkLength.checked = lengthValid;
      checkUppercase.checked = uppercaseValid;
      checkLowercase.checked = lowercaseValid;
      checkNumber.checked = numberValid;
  
      if (lengthValid && uppercaseValid && lowercaseValid && numberValid) {
        removeErrorStyles(password);
      } else {
        addErrorStyles(password);
      }
    }
  
    form.addEventListener("submit", function (event) {
      event.preventDefault();
      let valid = true;
  
      const lengthValid = password.value.length >= 8;
      const uppercaseValid = /[A-Z]/.test(password.value);
      const lowercaseValid = /[a-z]/.test(password.value);
      const numberValid = /\d/.test(password.value);
  
      if (!lengthValid || !uppercaseValid || !lowercaseValid || !numberValid) {
        valid = false;
        addErrorStyles(password);
      } else {
        removeErrorStyles(password);
      }
  
      if (!password.value.trim()) {
        valid = false;
        addErrorStyles(password);
      } else {
        removeErrorStyles(password);
      }
  
      if (!confirmPassword.value.trim() || confirmPassword.value !== password.value) {
        valid = false;
        addErrorStyles(confirmPassword);
      } else {
        removeErrorStyles(confirmPassword);
      }
  
      if (!valid) {
        setTimeout(() => {
          removeErrorStyles(password);
          removeErrorStyles(confirmPassword);
        }, 1000);
      }
  
      if (valid) {
        form.submit();
      }
    });
  
    password.addEventListener("input", validatePassword);
  });