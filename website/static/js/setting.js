document.addEventListener("DOMContentLoaded", function () {
  const generatedColorSelect = document.getElementById("generatedColor");
  const colorPreview = document.getElementById("colorPreview");

  function updateColorPreview() {
    const selectedColor = generatedColorSelect.value;
    colorPreview.style.backgroundColor = selectedColor;
  }
  updateColorPreview();
  generatedColorSelect.addEventListener("change", updateColorPreview);
});
document.addEventListener("DOMContentLoaded", function () {
  const firstNameInput = document.getElementById("firstName");
  const secondNameInput = document.getElementById("secondName");
  const generatedColor = document.getElementById("generatedColor");
  const dobInput = document.getElementById("dobInput");
  const genderSelect = document.getElementById("genderSelect");
  const submitBtn = document.getElementById("submitBtn");
  const personalInfoForm = document.getElementById("personalInfoForm");

  const firstNameError = document.getElementById("firstNameError");
  const secondNameError = document.getElementById("secondNameError");

  const nameRegex = /^[a-zA-Z\s'-]+$/;

  // Store original values
  const originalFirstName = firstNameInput.value;
  const originalSecondName = secondNameInput.value;
  const originalGeneratedColor = generatedColor.value;
  const originalDob = dobInput.value;
  const originalGender = genderSelect.value;

  function validateNames() {
    const firstNameMaxLength = 50;
    const secondNameMaxLength = 50;

    if (firstNameInput.value.length > firstNameMaxLength) {
      firstNameInput.value = firstNameInput.value.substring(
        0,
        firstNameMaxLength
      );
      return "First name cannot exceed 50 characters.";
    }

    if (secondNameInput.value.length > secondNameMaxLength) {
      secondNameInput.value = secondNameInput.value.substring(
        0,
        secondNameMaxLength
      );
      return "Second name cannot exceed 50 characters.";
    }

    return null;
  }

  function validateNameFormat(nameInput, fieldName) {
    if (!nameRegex.test(nameInput.value)) {
      return `${fieldName} can only contain letters, spaces, apostrophes, and hyphens.`;
    }
    return null;
  }

  function showSubmitButton() {
    submitBtn.style.display = "inline-block";
  }

  function hideSubmitButton() {
    submitBtn.style.display = "none";
  }

  function showError(element, message) {
    element.textContent = message;
    element.style.display = "block";

    setTimeout(() => {
      element.style.display = "none";
    }, 2000);
  }

  function checkForChanges() {
    if (
      firstNameInput.value === originalFirstName &&
      secondNameInput.value === originalSecondName &&
      dobInput.value === originalDob &&
      genderSelect.value === originalGender &&
      generatedColor.value === originalGeneratedColor
    ) {
      hideSubmitButton();
    } else {
      showSubmitButton();
    }
  }

  // Add event listeners to all inputs
  firstNameInput.addEventListener("input", function () {
    firstNameError.style.display = "none";
    checkForChanges();
  });

  secondNameInput.addEventListener("input", function () {
    secondNameError.style.display = "none";
    checkForChanges();
  });

  dobInput.addEventListener("input", function () {
    checkForChanges();
  });

  genderSelect.addEventListener("change", function () {
    checkForChanges();
  });

  generatedColor.addEventListener("input", function () {
    // Use 'input' to detect all changes
    checkForChanges();
  });

  personalInfoForm.addEventListener("submit", function (event) {
    event.preventDefault();
    firstNameError.style.display = "none";
    secondNameError.style.display = "none";

    const lengthError = validateNames();
    const firstNameFormatError = validateNameFormat(
      firstNameInput,
      "First Name"
    );
    const secondNameFormatError = validateNameFormat(
      secondNameInput,
      "Second Name"
    );

    if (!firstNameInput.value) {
      showError(firstNameError, "First Name is required.");
    } else if (lengthError) {
      showError(firstNameError, lengthError);
    } else if (firstNameFormatError) {
      showError(firstNameError, firstNameFormatError);
    } else if (!secondNameInput.value) {
      showError(secondNameError, "Second Name is required.");
    } else if (secondNameFormatError) {
      showError(secondNameError, secondNameFormatError);
    } else {
      // Programmatically submit the form
      personalInfoForm.submit();
    }
  });
});
document.addEventListener("DOMContentLoaded", function () {
  const profilePicInput = document.getElementById("profilePic");
  const croppingContainer = document.getElementById("croppingContainer");
  const imageToCrop = document.getElementById("imageToCrop");
  const cropButton = document.getElementById("cropButton");
  const cancelButton = document.getElementById("cancelButton");
  const progressContainer = document.getElementById("progressContainer");
  const progressText = document.querySelector(".progress-text");
  const progressBar = document.querySelector(".progress-bar");
  let cropper;
  let currentInput = null;

  document
    .getElementById("editProfilePicButton")
    .addEventListener("click", function () {
      profilePicInput.click();
    });

  const initializeCropper = (input) => {
    const file = input.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = function (e) {
        imageToCrop.src = e.target.result;
        croppingContainer.style.display = "flex";

        if (cropper) {
          cropper.destroy();
        }
        cropper = new Cropper(imageToCrop, {
          aspectRatio: 1,
          viewMode: 1,
          background: false,
          movable: false,
          zoomable: false,
          scalable: false,
          cropBoxMovable: true,
          cropBoxResizable: true,
        });

        currentInput = input;
      };
      reader.readAsDataURL(file);
    }
  };

  profilePicInput.addEventListener("change", () =>
    initializeCropper(profilePicInput)
  );

  cropButton.addEventListener("click", function () {
const canvas = cropper.getCroppedCanvas();
canvas.toBlob(function (blob) {
  const formData = new FormData();
  const userId = document.getElementById("userId").value;
  const csrfToken = document.querySelector('input[name="csrf_token"]').value;  // Get CSRF token

  const filename = `profile_pic_${userId}_${Date.now()}.png`;
  formData.append("profile_pic", blob, filename);
  formData.append("csrf_token", csrfToken);  // Append CSRF token here

  progressContainer.style.display = "flex";
  const xhr = new XMLHttpRequest();
  xhr.open("POST", document.getElementById("profilePicForm").action);

  xhr.upload.onprogress = function (event) {
      if (event.lengthComputable) {
          const percentComplete = Math.round((event.loaded / event.total) * 100);
          progressText.textContent = `${percentComplete}%`;
          progressBar.style.transform = `rotate(${percentComplete * 3.6 - 90}deg)`;
      }
  };

  xhr.onload = function () {
      if (xhr.status === 200) {
          progressText.textContent = "Done!";
          setTimeout(() => {
              progressContainer.style.display = "none";
              location.reload();
          }, 1000);
      } else {
          alert("Failed to update profile picture.");
      }
  };

  xhr.onerror = function () {
      alert("Failed to update profile picture.");
  };

  xhr.send(formData);
});
});


  cancelButton.addEventListener("click", function () {
    croppingContainer.style.display = "none";
    if (cropper) {
      cropper.destroy();
    }
  });
});

document.addEventListener("DOMContentLoaded", function () {
  const profileImage = document.getElementById("profileImage");
  const imageModal = document.getElementById("imageModal");
  const modalImage = document.getElementById("modalImage");
  if (profileImage) {
    profileImage.addEventListener("click", function () {
      if (imageModal.style.display === "flex") {
        closeModal();
      } else {
        // Show the modal
        imageModal.style.display = "flex";
        modalImage.src = this.src;
        imageModal.classList.add("show");
      }
    });
  }
  imageModal.addEventListener("click", function (event) {
    if (event.target === imageModal) {
      closeModal();
    }
  });
  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape" && imageModal.style.display === "flex") {
      closeModal();
    }
  });
  function closeModal() {
    imageModal.classList.remove("show");
    setTimeout(() => {
      imageModal.style.display = "none";
    }, 500);
  }
});

document.addEventListener("DOMContentLoaded", function () {
  const passwordForm = document.getElementById("passwordForm");
  const currentPasswordInput = document.getElementById("currentPassword");
  const submitButton = passwordForm.querySelector(".submit");

  // Initially hide the submit button
  submitButton.style.display = "none";

  // Add event listener to show the submit button when typing starts in the current password field
  currentPasswordInput.addEventListener("input", function () {
    if (currentPasswordInput.value.length > 0) {
      submitButton.style.display = "block";
    } else {
      submitButton.style.display = "none";
    }
  });

  // Rest of the form validation and submission logic...
  let failedAttempts = 0;
  const maxFailedAttempts = 3;

  passwordForm.addEventListener("submit", function (event) {
    event.preventDefault();
    var newPasswordInput = document.getElementById("newPassword");
    var confirmPasswordInput = document.getElementById("confirmPassword");

    var currentPassword = currentPasswordInput.value.trim();
    var newPassword = newPasswordInput.value.trim();
    var confirmPassword = confirmPasswordInput.value.trim();
    clearErrorMessages();

    var hasError = false;
    if (!currentPassword) {
      showError("Current password is required.", "currentPasswordError");
      hasError = true;
    }

    if (!newPassword) {
      showError("Password is required.", "newPasswordError");
      hasError = true;
    } else {
      var hasUpperCase = /[A-Z]/.test(newPassword);
      var hasLowerCase = /[a-z]/.test(newPassword);
      var hasDigit = /\d/.test(newPassword);

      if (newPassword.length < 8) {
        showError(
          "Password must be at least 8 characters long.",
          "newPasswordError"
        );
        hasError = true;
      } else if (!hasUpperCase) {
        showError(
          "Password must include at least one uppercase letter.",
          "newPasswordError"
        );
        hasError = true;
      } else if (!hasLowerCase) {
        showError(
          "Password must include at least one lowercase letter.",
          "newPasswordError"
        );
        hasError = true;
      } else if (!hasDigit) {
        showError(
          "Password must include at least one number.",
          "newPasswordError"
        );
        hasError = true;
      }
    }
    if (newPassword !== confirmPassword) {
      showError("Passwords do not match.", "confirmPasswordError");
      hasError = true;
    }

    if (!hasError) {
      const csrfToken = document.querySelector('input[name="csrf_token"]').value;

      fetch("/auth/update_password", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          currentPassword: currentPassword,
          newPassword: newPassword,
          confirmPassword: confirmPassword,
          csrf_token: csrfToken
        }).toString(),
      })
        .then((response) => response.json())
        .then((data) => {
          if (data.redirect) {
            window.location.href = "/auth/login";
          } else if (data.success) {
            showNotification("Password has been successfully changed!");
            setTimeout(() => {
              window.location.href = "/settings";
            }, 3000);
          } else {
            failedAttempts++;
            showError(data.message, data.errorField);
            if (data.errorField === "currentPasswordError") {
              showError(
                `Attempts left: ${maxFailedAttempts - failedAttempts}`,
                "generalError"
              );
            }
          }
        })
        .catch((error) => {
          console.error("Error:", error);
          showError(
            "An unexpected error occurred. Please try again.",
            "generalError"
          );
        });
    }
  });

  function showError(message, errorFieldId) {
    var errorField = document.getElementById(errorFieldId);
    if (errorField) {
      errorField.textContent = message;

      setTimeout(() => {
        errorField.textContent = "";
      }, 3000);
    } else {
      console.error("Error field not found: " + errorFieldId);
    }
  }

  function clearErrorMessages() {
    document.getElementById("currentPasswordError").textContent = "";
    document.getElementById("newPasswordError").textContent = "";
    document.getElementById("confirmPasswordError").textContent = "";
    document.getElementById("generalError").textContent = "";
  }

  function showNotification(message) {
    var notification = document.getElementById("notification");
    notification.textContent = message;
    notification.style.display = "block";
    setTimeout(() => {
      notification.style.display = "none";
    }, 3000);
  }
});



document.addEventListener("DOMContentLoaded", function () {
  var currentPasswordInput = document.getElementById("currentPassword");
  var newPasswordInput = document.getElementById("newPassword");
  var confirmPasswordInput = document.getElementById("confirmPassword");
  var currentPasswordToggle = document.querySelector(
    ".toggle-password[data-target='#currentPassword']"
  );
  var newPasswordToggle = document.querySelector(
    ".toggle-password[data-target='#newPassword']"
  );
  var confirmPasswordToggle = document.querySelector(
    ".toggle-password[data-target='#confirmPassword']"
  );
  if (currentPasswordToggle) currentPasswordToggle.style.display = "none";
  if (newPasswordToggle) newPasswordToggle.style.display = "none";
  if (confirmPasswordToggle) confirmPasswordToggle.style.display = "none";
  currentPasswordInput.addEventListener("input", function () {
    if (this.value.length > 0) {
      currentPasswordToggle.style.display = "block";
    } else {
      currentPasswordToggle.style.display = "none";
    }
  });
  newPasswordInput.addEventListener("input", function () {
    if (this.value.length > 0) {
      newPasswordToggle.style.display = "block";
    } else {
      newPasswordToggle.style.display = "none";
    }
  });
  confirmPasswordInput.addEventListener("input", function () {
    if (this.value.length > 0) {
      confirmPasswordToggle.style.display = "block";
    } else {
      confirmPasswordToggle.style.display = "none";
    }
  });
  document
    .querySelectorAll(".toggle-password")
    .forEach(function (toggle) {
      toggle.addEventListener("click", function () {
        var targetInput = document.querySelector(
          toggle.getAttribute("data-target")
        );
        var type =
          targetInput.getAttribute("type") === "password"
            ? "text"
            : "password";
        targetInput.setAttribute("type", type);

        // Toggle between eye and eye-slash icon
        toggle.classList.toggle("fa-eye");
        toggle.classList.toggle("fa-eye-slash");
      });
    });
});

document.addEventListener("DOMContentLoaded", function () {
  const deactivateForm = document.getElementById("checkSessions");
  const passwordInput = document.getElementById("sessionLog");
  const passwordError = document.getElementById("sessionLogError");
  const submitButton = deactivateForm.querySelector(".submit");

  if (!deactivateForm) {
    console.error("Deactivate form not found");
    return;
  }

  if (!passwordInput) {
    console.error("Password input not found");
    return;
  }

  // Show the submit button immediately
  submitButton.style.display = "block";

  deactivateForm.addEventListener("submit", function (event) {
    event.preventDefault();

    const password = passwordInput.value.trim();
    console.log("Password input value:", password);
    passwordError.style.display = "none";
    passwordError.textContent = "";

    if (!password) {
      passwordError.textContent = "Password cannot be empty.";
      passwordError.style.display = "block";
      return;
    }

    console.log("Attempting to send password:", password);
    
    // Get the CSRF token from the hidden input field
    const csrfToken = deactivateForm.querySelector('input[name="csrf_token"]').value;

    fetch("/auth/check_password_delete_account", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        password: password,
        csrf_token: csrfToken // Include CSRF token in the body
      }).toString(),
    })
      .then((response) => {
        if (!response.ok) {
          return response.json().then((data) => {
            throw new Error(data.message);
          });
        }
        return response.json();
      })
      .then((data) => {
        if (data.success) {
          deactivateForm.submit();
        }
      })
      .catch((error) => {
        passwordError.style.display = "block";
        passwordError.textContent = error.message;
        setTimeout(() => {
          passwordError.style.display = "none";
        }, 2000);
      });
  });
});


document.addEventListener("DOMContentLoaded", function () {
  const deactivateForm = document.getElementById("deactivateForm");
  const passwordInput = document.getElementById("logOut");
  const passwordError = document.getElementById("passwordError");

  if (!deactivateForm) {
    console.error("Deactivate form not found");
    return;
  }

  if (!passwordInput) {
    console.error("Password input not found");
    return;
  }

  deactivateForm.addEventListener("submit", function (event) {
    event.preventDefault();

    const password = passwordInput.value.trim();
    console.log("Password input value:", password);
    passwordError.style.display = "none";
    passwordError.textContent = "";
    
    if (!password) {
      passwordError.textContent = "Password cannot be empty.";
      passwordError.style.display = "block";
      return;
    }

    console.log("Attempting to send password:", password);
    const csrfToken = deactivateForm.querySelector('input[name="csrf_token"]').value;

    fetch("/auth/check_password_delete_account", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        password: password,
        csrf_token: csrfToken 
      }).toString(),
    })
      .then((response) => {
        if (!response.ok) {
          return response.json().then((data) => {
            throw new Error(data.message);
          });
        }
        return response.json();
      })
      .then((data) => {
        if (data.success) {
          deactivateForm.submit(); 
        }
      })
      .catch((error) => {
        passwordError.style.display = "block";
        passwordError.textContent = error.message;
        setTimeout(() => {
          passwordError.style.display = "none";
        }, 2000);
      });
  });
});


document.addEventListener("DOMContentLoaded", function () {
  const deactivateForm = document.getElementById("deleteForm");
  const passwordInput = document.getElementById("delOut");
  const passwordError = document.getElementById("deletepasswordError");
  const loadingOverlay = document.getElementById("loadingOverlay"); // Get the loading overlay

  if (!deactivateForm) {
    console.error("Deactivate form not found");
    return;
  }
  
  if (!passwordInput) {
    console.error("Password input not found");
    return;
  }

  deactivateForm.addEventListener("submit", function (event) {
    event.preventDefault();

    const password = passwordInput.value.trim();
    console.log("Password input value:", password);
    passwordError.style.display = "none";
    passwordError.textContent = "";
    
    if (!password) {
      passwordError.textContent = "Password cannot be empty.";
      passwordError.style.display = "block";
      return;
    }

    console.log("Attempting to send password:", password);
    
    // Get the CSRF token from the hidden input field
    const csrfToken = deactivateForm.querySelector('input[name="csrf_token"]').value;

    fetch("/auth/check_password_delete_account", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        password: password,
        csrf_token: csrfToken 
      }).toString(),
    })
      .then((response) => {
        if (!response.ok) {
          return response.json().then((data) => {
            throw new Error(data.message);
          });
        }
        return response.json();
      })
      .then((data) => {
        if (data.success) {
          loadingOverlay.style.display = "flex"; 
          setTimeout(() => {
            deactivateForm.submit();
          }, 5000); 
        }
      })
      .catch((error) => {
        passwordError.style.display = "block";
        passwordError.textContent = error.message;
        setTimeout(() => {
          passwordError.style.display = "none";
        }, 2000);
      });
  });
});


function isStrongPassword(password) {
  const minLength = 8;
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumbers = /[0-9]/.test(password);
  const hasSpecialChars = /[!@#$%^&*]/.test(password);
  return (
    password.length >= minLength &&
    hasUpperCase &&
    hasLowerCase &&
    (hasNumbers || hasSpecialChars)
  );
}
function showErrorMessage(messageElement, message) {
  messageElement.textContent = message;
  setTimeout(() => {
    messageElement.textContent = "";
  }, 2000);
}

document
  .getElementById("setEncryptPasswordForm")
  .addEventListener("submit", function (event) {
    event.preventDefault();

    const newPassword = document.getElementById(
      "set_encrypt_password"
    ).value;
    const confirmPassword = document.getElementById(
      "confirm_encrypt_password"
    ).value;
    const strengthMessage = document.getElementById(
      "password-strength-message"
    );
    const confirmMessage = document.getElementById(
      "confirm-password-message"
    );
    let isValid = true;
    strengthMessage.textContent = "";
    confirmMessage.textContent = "";
    if (!isStrongPassword(newPassword)) {
      showErrorMessage(
        strengthMessage,
        "Password must be at least 8 characters long, include an uppercase letter, a lowercase letter, and either a number or a special character (or both)."
      );
      isValid = false;
    }
    if (newPassword !== confirmPassword) {
      showErrorMessage(confirmMessage, "Passwords do not match!");
      isValid = false;
    }
    if (isValid) {
      this.submit();
    }
  });

function showErrorMessage(messageElement, message) {
  messageElement.textContent = message;
  setTimeout(() => {
    messageElement.textContent = "";
  }, 2000);
}

function togglePasswordVisibility(passwordFieldId, eyeIconId) {
  const passwordField = document.getElementById(passwordFieldId);
  const eyeIcon = document.getElementById(eyeIconId);
  if (passwordField.type === "password") {
    passwordField.type = "text";
    eyeIcon.textContent = "🙈";
  } else {
    passwordField.type = "password";
    eyeIcon.textContent = "👁️";
  }
}

function toggleEyeIcon(passwordField, eyeIconId) {
  const eyeIcon = document.getElementById(eyeIconId);
  if (passwordField.value.length > 0) {
    eyeIcon.style.display = "inline";
  } else {
    eyeIcon.style.display = "none";
  }
}


function formatPhoneNumber(input) {
  let phoneNumber = input.value.replace(/\D/g, '');
  if (phoneNumber.startsWith('0')) {
      phoneNumber = phoneNumber.substring(1);
  }
  if (phoneNumber.length > 3) {
      const areaCode = phoneNumber.substring(0, 3);
      const numberPart = phoneNumber.substring(3);
      const formattedNumber = `(${areaCode}) ${numberPart}`;
      input.value = formattedNumber;
  } else {
      input.value = phoneNumber; 
  }
}
function formatPhoneNumber(input) {
  let phoneNumber = input.value.replace(/\D/g, '');
  
  if (phoneNumber.startsWith('0')) {
      phoneNumber = phoneNumber.substring(1);
  }

  if (phoneNumber.length > 3) {
      const areaCode = phoneNumber.substring(0, 3);
      const numberPart = phoneNumber.substring(3);
      const formattedNumber = `(${areaCode}) ${numberPart}`;
      input.value = formattedNumber;
  } else {
      input.value = phoneNumber; 
  }
}

