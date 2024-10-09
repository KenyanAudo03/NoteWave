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
  const originalUsername = "{{ current_user.user_name[1:] }}";
  const originalBio = "{{ current_user.bio }}";

  const newUsernameInput = document.getElementById("newUsername");
  const bioInput = document.getElementById("bioInput");
  const updateInfoBtn = document.getElementById("updateInfoBtn");
  const bioCount = document.getElementById("bioCount");
  const accountForm = document.getElementById("accountForm");
  const usernameError = document.getElementById("usernameError");

  updateInfoBtn.style.display = "none";
  bioCount.style.display = "none";
  function checkUsernameExists(username) {
    fetch(`/auth/check_username?username=${encodeURIComponent(username)}`)
      .then((response) => response.json())
      .then((data) => {
        if (data.exists) {
          usernameError.textContent = "This username is already taken.";
          usernameError.style.display = "block";
          updateInfoBtn.style.display = "none";
        } else {
          usernameError.style.display = "none";
          checkForChanges();
        }
      });
  }

  newUsernameInput.addEventListener("keydown", function (e) {
    if (
      newUsernameInput.selectionStart === 0 &&
      (e.key === "Backspace" || e.key === "ArrowLeft")
    ) {
      e.preventDefault();
    }
  });

  newUsernameInput.addEventListener("input", function () {
    let newUsername = newUsernameInput.value;

    // Ensure the "@" symbol remains at the start
    if (!newUsername.startsWith("@")) {
      newUsername = "@" + newUsername.replace(/@/g, "");
    }

    newUsernameInput.value = newUsername;

    const usernameWithoutAt = newUsername.slice(1).trim();
    const isValidUsername = /^[a-z0-9_-]+$/.test(usernameWithoutAt);

    if (usernameWithoutAt.length < 5 || usernameWithoutAt.length > 15) {
      usernameError.textContent =
        "Username must be between 5 and 15 characters.";
      usernameError.style.display = "block";
      updateInfoBtn.style.display = "none";
    } else if (!isValidUsername) {
      usernameError.textContent =
        "Username can only contain lowercase letters, numbers, underscores, and hyphens.";
      usernameError.style.display = "block";
      updateInfoBtn.style.display = "none";
    } else {
      checkUsernameExists(usernameWithoutAt);
    }
  });

  function checkForChanges() {
    const newUsername = newUsernameInput.value.trim();
    const newBio = bioInput.value.trim();
    if (newUsername.slice(1) !== originalUsername || newBio !== originalBio) {
      updateInfoBtn.style.display = "block";
    } else {
      updateInfoBtn.style.display = "none";
    }
  }

  bioInput.addEventListener("input", function () {
    const bioLength = bioInput.value.length;
    bioCount.style.display = "block";
    document.getElementById("bioCount").textContent = `${bioLength}/60`;

    if (bioLength > 60) {
      bioInput.value = bioInput.value.slice(0, 60);
      document.getElementById("bioCount").textContent = `60/60`;
    }
    checkForChanges();
  });

  accountForm.addEventListener("submit", function (e) {
    const newUsername = newUsernameInput.value.trim();
    const usernameWithoutAt = newUsername.slice(1);

    if (
      usernameWithoutAt.length < 5 ||
      usernameWithoutAt.length > 15 ||
      !/^[a-z0-9_-]+$/.test(usernameWithoutAt)
    ) {
      e.preventDefault();
      return;
    }
    fetch(
      `/auth/check_username?username=${encodeURIComponent(usernameWithoutAt)}`
    )
      .then((response) => response.json())
      .then((data) => {
        if (data.exists) {
          e.preventDefault();
          usernameError.textContent = "This username is already taken.";
          usernameError.style.display = "block";
        } else {
          newUsernameInput.value = usernameWithoutAt;
        }
      });
  });
});

document.addEventListener("DOMContentLoaded", function () {
  const originalEmail = "{{ current_user.email }}";
  const newEmailInput = document.getElementById("newEmail");
  const sendOtpBtn = document.getElementById("sendOtpBtn");
  const otpLabel = document.getElementById("otpLabel");
  const otpInput = document.getElementById("otpInput");
  const verifyOtpBtn = document.getElementById("verifyOtpBtn");
  const resendOtpBtn = document.getElementById("resendOtpBtn");
  const csrfToken = document.querySelector("input[name='csrf_token']").value;
  const emailError = document.getElementById("emailError");
  const otpError = document.getElementById("otpError");
  const form = document.querySelector("form");

  function isValidEmail(email) {
    const emailPattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return emailPattern.test(email);
  }
  otpLabel.style.display = "none";
  otpInput.style.display = "none";
  verifyOtpBtn.style.display = "none";
  resendOtpBtn.style.display = "none";

  newEmailInput.addEventListener("input", function () {
    const email = newEmailInput.value.trim();
    if (email !== originalEmail && isValidEmail(email)) {
      sendOtpBtn.style.display = "block";
    } else {
      sendOtpBtn.style.display = "none";
      otpLabel.style.display = "none";
      otpInput.style.display = "none";
      verifyOtpBtn.style.display = "none";
      resendOtpBtn.style.display = "none";
      otpError.style.display = "none";
    }
  });
  sendOtpBtn.addEventListener("click", function () {
    const email = newEmailInput.value.trim();

    if (!isValidEmail(email)) {
      emailError.textContent = "Please enter a valid email address.";
      emailError.style.display = "block";
      setTimeout(function () {
        emailError.style.display = "none";
      }, 2000);
      return;
    }

    sendOtpBtn.textContent = "Sending...";
    sendOtpBtn.style.color = "green";
    sendOtpBtn.disabled = true;
    fetch("/auth/send_otp", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: "email=" + encodeURIComponent(email) + "&csrf_token=" + csrfToken,
    })
      .then((response) => response.json())
      .then((data) => {
        sendOtpBtn.textContent = "Send Verification OTP";
        sendOtpBtn.disabled = false;

        if (data.exists) {
          emailError.textContent = "Email already exists in the database.";
          emailError.style.display = "block";
          setTimeout(function () {
            emailError.style.display = "none";
          }, 2000);
        } else {
          // OTP sent successfully, show OTP input and related buttons
          otpLabel.style.display = "block";
          otpInput.style.display = "block";
          verifyOtpBtn.style.display = "block";
          resendOtpBtn.style.display = "block";
          sendOtpBtn.style.display = "none"; // Hide "Send OTP" button
        }
      })
      .catch((error) => {
        sendOtpBtn.textContent = "Send Verification OTP";
        sendOtpBtn.disabled = false;
        emailError.textContent = "An error occurred. Please try again.";
        emailError.style.display = "block";
        setTimeout(function () {
          emailError.style.display = "none";
        }, 2000);
      });
  });
  verifyOtpBtn.addEventListener("click", function () {
    const otp = otpInput.value.trim();

    if (!otp) {
      otpError.textContent = "Please enter the OTP.";
      otpError.style.display = "block";
      setTimeout(function () {
        otpError.style.display = "none";
      }, 2000);
      return;
    }
    fetch("/auth/verify_otp_verification", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: "otp=" + encodeURIComponent(otp) + "&csrf_token=" + csrfToken,
    })
      .then((response) => response.json())
      .then((data) => {
        if (data.success) {
          otpError.style.display = "none";
          const newEmail = newEmailInput.value.trim();
          fetch("/auth/update_email", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body:
              "newEmail=" +
              encodeURIComponent(newEmail) +
              "&csrf_token=" +
              csrfToken,
          }).then((emailResponse) => {
            if (emailResponse.ok) {
              form.submit();
            }
          });
        } else {
          otpError.textContent = "Invalid OTP. Please try again.";
          otpError.style.display = "block";
          setTimeout(function () {
            otpError.style.display = "none";
          }, 2000);
        }
      })
      .catch((error) => {
        otpError.textContent = "An error occurred. Please try again.";
        otpError.style.display = "block";
        setTimeout(function () {
          otpError.style.display = "none";
        }, 2000);
      });
  });

  // Handle OTP resend
  resendOtpBtn.addEventListener("click", function () {
    resendOtpBtn.textContent = "Sending...";
    resendOtpBtn.style.color = "green";
    resendOtpBtn.disabled = true;

    const email = newEmailInput.value.trim();
    fetch("/auth/send_otp", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: "email=" + encodeURIComponent(email) + "&csrf_token=" + csrfToken,
    })
      .then((response) => response.json())
      .then((data) => {
        resendOtpBtn.textContent = "Resend OTP";
        resendOtpBtn.style.color = "";
        resendOtpBtn.disabled = false;

        if (data.exists) {
          emailError.textContent = "Email already exists in the database.";
          emailError.style.display = "block";
          setTimeout(function () {
            emailError.style.display = "none";
          }, 2000);
        } else {
          otpLabel.style.display = "block";
          otpInput.style.display = "block";
          verifyOtpBtn.style.display = "block";
        }
      })
      .catch((error) => {
        resendOtpBtn.textContent = "Resend OTP";
        resendOtpBtn.style.color = "";
        resendOtpBtn.disabled = false;
        emailError.textContent = "An error occurred. Please try again.";
        emailError.style.display = "block";
        setTimeout(function () {
          emailError.style.display = "none";
        }, 2000);
      });
  });
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

  const originalFirstName = firstNameInput.value;
  const originalSecondName = secondNameInput.value;
  const originalGeneratedColor = generatedColor.value;
  const originalDob = dobInput.value;
  const originalGender = genderSelect.value;

  function validateNames() {
    const firstNameMaxLength = 50;
    const secondNameMaxLength = 50;

    if (firstNameInput.value.length > firstNameMaxLength) {
      firstNameInput.value = firstNameInput.value.substring(0, firstNameMaxLength);
      return "First name cannot exceed 50 characters.";
    }

    if (secondNameInput.value.length > secondNameMaxLength) {
      secondNameInput.value = secondNameInput.value.substring(0, secondNameMaxLength);
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

  // Prevent the form from submitting when pressing Enter
  function preventEnterSubmission(event) {
    if (event.key === "Enter") {
      event.preventDefault(); // Prevent form submission
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
    checkForChanges();
  });

  // Add keypress event listeners to prevent Enter from submitting
  firstNameInput.addEventListener("keypress", preventEnterSubmission);
  secondNameInput.addEventListener("keypress", preventEnterSubmission);
  dobInput.addEventListener("keypress", preventEnterSubmission);
  genderSelect.addEventListener("keypress", preventEnterSubmission);
  generatedColor.addEventListener("keypress", preventEnterSubmission);

  personalInfoForm.addEventListener("submit", function (event) {
    event.preventDefault();
    firstNameError.style.display = "none";
    secondNameError.style.display = "none";

    const lengthError = validateNames();
    const firstNameFormatError = validateNameFormat(firstNameInput, "First Name");
    const secondNameFormatError = validateNameFormat(secondNameInput, "Second Name");

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
      const csrfToken = document.querySelector(
        'input[name="csrf_token"]'
      ).value; // Get CSRF token

      const filename = `profile_pic_${userId}_${Date.now()}.png`;
      formData.append("profile_pic", blob, filename);
      formData.append("csrf_token", csrfToken); // Append CSRF token here

      progressContainer.style.display = "flex";
      const xhr = new XMLHttpRequest();
      xhr.open("POST", document.getElementById("profilePicForm").action);

      xhr.upload.onprogress = function (event) {
        if (event.lengthComputable) {
          const percentComplete = Math.round(
            (event.loaded / event.total) * 100
          );
          progressText.textContent = `${percentComplete}%`;
          progressBar.style.transform = `rotate(${
            percentComplete * 3.6 - 90
          }deg)`;
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
  submitButton.style.display = "none";
  currentPasswordInput.addEventListener("input", function () {
    if (currentPasswordInput.value.length > 0) {
      submitButton.style.display = "block";
    } else {
      submitButton.style.display = "none";
    }
  });
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
      const csrfToken = document.querySelector(
        'input[name="csrf_token"]'
      ).value;

      fetch("/auth/update_password", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          currentPassword: currentPassword,
          newPassword: newPassword,
          confirmPassword: confirmPassword,
          csrf_token: csrfToken,
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
  document.querySelectorAll(".toggle-password").forEach(function (toggle) {
    toggle.addEventListener("click", function () {
      var targetInput = document.querySelector(
        toggle.getAttribute("data-target")
      );
      var type =
        targetInput.getAttribute("type") === "password" ? "text" : "password";
      targetInput.setAttribute("type", type);
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
    const csrfToken = deactivateForm.querySelector(
      'input[name="csrf_token"]'
    ).value;

    fetch("/auth/check_password_delete_account", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        password: password,
        csrf_token: csrfToken,
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
    const csrfToken = deactivateForm.querySelector(
      'input[name="csrf_token"]'
    ).value;

    fetch("/auth/check_password_delete_account", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        password: password,
        csrf_token: csrfToken,
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
    const csrfToken = deactivateForm.querySelector(
      'input[name="csrf_token"]'
    ).value;

    fetch("/auth/check_password_delete_account", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        password: password,
        csrf_token: csrfToken,
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

    const newPassword = document.getElementById("set_encrypt_password").value;
    const confirmPassword = document.getElementById(
      "confirm_encrypt_password"
    ).value;
    const strengthMessage = document.getElementById(
      "password-strength-message"
    );
    const confirmMessage = document.getElementById("confirm-password-message");
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
  let phoneNumber = input.value.replace(/\D/g, "");
  if (phoneNumber.startsWith("0")) {
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
  let phoneNumber = input.value.replace(/\D/g, "");

  if (phoneNumber.startsWith("0")) {
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
