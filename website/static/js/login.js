document.addEventListener('DOMContentLoaded', function () {
    // Show Password Functionality
    document.getElementById('show-pass-checkbox').addEventListener('change', function () {
      var passwordField = document.getElementById('password-login');
      if (this.checked) {
        passwordField.type = 'text';
      } else {
        passwordField.type = 'password';
      }
    });
  
  
    // Form Submission and Validation Handling
  document.getElementById('form-login').addEventListener('submit', function (event) {
    event.preventDefault(); 
  
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password-login');
    const email = emailInput.value;
    const password = passwordInput.value;
  
    function shakeInput(input, fullBorder = false) {
      input.classList.add('shake');
      input.classList.add('input-error');
      if (fullBorder) {
        input.classList.add('full-border-error');
      }
      setTimeout(() => {
        input.classList.remove('shake', 'full-border-error', 'input-error');
      }, 1000);
    }
  
    // Remove previous error classes
    emailInput.classList.remove('input-error', 'full-border-error');
    passwordInput.classList.remove('input-error');
  
    // Check if email exists
    fetch('/auth/check_email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `email=${encodeURIComponent(email)}`
    })
    .then(response => response.json())
    .then(data => {
      if (!data.exists) {
        shakeInput(emailInput, true);
      } else {
        // Check if password is correct
        fetch('/auth/check_password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: `email=${encodeURIComponent(email)}&password-login=${encodeURIComponent(password)}`
        })
        .then(response => response.json())
        .then(data => {
          if (!data.exists) {
            shakeInput(passwordInput);
            passwordInput.classList.add('full-border-error');
          } else {
              document.getElementById('form-login').submit(); 
            }
        });
      }
    });
  });
  
    // Information Section Carousel
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
      currentIndex = currentIndex === 0 ? infoSections.length - 1 : currentIndex - 1;
      infoSections[currentIndex].style.display = "block";
      updateActiveDot(currentIndex);
      updateArrowsVisibility(currentIndex);
    });
  
    updateActiveDot(currentIndex);
    updateArrowsVisibility(currentIndex);
  
    // Hide the spinner initially
    document.getElementById('loading-spinner').hidden = true;
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