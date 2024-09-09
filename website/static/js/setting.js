document.addEventListener("DOMContentLoaded", function () {
  const links = document.querySelectorAll(".settings-menu a");

  links.forEach((link) => {
    link.addEventListener("click", function () {
      const dropdown = this.nextElementSibling;
      if (dropdown && dropdown.classList.contains("dropdown-content")) {
        dropdown.style.display =
          dropdown.style.display === "block" ? "none" : "block";
        this.classList.toggle("active");
      }

      links.forEach((otherLink) => {
        if (otherLink !== this) {
          const otherDropdown = otherLink.nextElementSibling;
          if (
            otherDropdown &&
            otherDropdown.classList.contains("dropdown-content")
          ) {
            otherDropdown.style.display = "none";
            otherLink.classList.remove("active");
          }
        }
      });
    });
  });
});

$(document).ready(function () {
  $("#profilePicFormSection").show();
  $(".settings-menu a").on("click", function (e) {
    e.preventDefault();

    var targetSection = $(this).data("target");
    $(".settings-content section").hide();
    $(targetSection).show();
    if (targetSection !== "#profilePicFormSection") {
      $("#profilePicFormSection").hide();
    } else {
      $("#profilePicFormSection").show();
    }
  });
});

// Username
document
  .getElementById("usernameForm")
  .addEventListener("submit", function (event) {
    event.preventDefault();

    var usernameInput = document.getElementById("newUsername");
    var username = usernameInput.value.startsWith("@")
      ? usernameInput.value
      : "@" + usernameInput.value;
    var regex = /^@[a-z0-9_]{4,}$/;
    var errorMessage = document.getElementById("usernameError");

    if (!regex.test(username)) {
      showError(
        "Username must be at least 4 characters long, containing only small letters, numbers, and underscores."
      );
      return;
    }

    fetch("/auth/check_username", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-CSRFToken": "{{ csrf_token() }}",
      },
      body: JSON.stringify({ username: username }),
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error("Network response was not ok");
        }
        return response.json();
      })
      .then((data) => {
        if (data.exists) {
          showError("Username already taken. Please choose a different one.");
        } else {
          usernameInput.value = username;
          document.getElementById("usernameForm").submit(); // Submit the form after successful validation
        }
      })
      .catch((error) => {
        showError(
          "An error occurred while checking the username. Please try again."
        );
        console.error("There was a problem with the fetch operation:", error);
      });
  });

function showError(message) {
  var errorMessage = document.getElementById("usernameError");
  errorMessage.textContent = message;
  errorMessage.style.display = "block";
  setTimeout(function () {
    errorMessage.style.display = "none";
  }, 3000);
}

// Name
document
  .getElementById("nameForm")
  .addEventListener("submit", function (event) {
    event.preventDefault();
    var firstNameInput = document.getElementById("firstName");
    var secondNameInput = document.getElementById("secondName");
    var errorMessage = document.getElementById("nameError");

    var firstName = firstNameInput.value.trim();
    var secondName = secondNameInput.value.trim();

    if (!firstName || !secondName) {
      showError("Both first name and second name are required.");
      return;
    }

    var nameRegex = /^[A-Za-z\s-]+$/;
    if (!nameRegex.test(firstName) || !nameRegex.test(secondName)) {
      showError("Names can only contain letters, spaces, and hyphens.");
      return;
    }

    if (firstName.length > 50 || secondName.length > 50) {
      showError("Names must be between 1 and 50 characters long.");
      return;
    }
    document.getElementById("nameForm").submit();
  });

function showError(message) {
  var errorMessage = document.getElementById("nameError");
  errorMessage.textContent = message;
  errorMessage.style.display = "block";
  setTimeout(function () {
    errorMessage.style.display = "none";
  }, 3000);
}

// // Password

document
  .getElementById("passwordForm")
  .addEventListener("submit", function (event) {
    event.preventDefault();

    var currentPasswordInput = document.getElementById("currentPassword");
    var newPasswordInput = document.getElementById("newPassword");
    var confirmPasswordInput = document.getElementById("confirmPassword");

    var currentPassword = currentPasswordInput.value.trim();
    var newPassword = newPasswordInput.value.trim();
    var confirmPassword = confirmPasswordInput.value.trim();

    document.getElementById("currentPasswordError").textContent = "";
    document.getElementById("newPasswordError").textContent = "";
    document.getElementById("confirmPasswordError").textContent = "";

    var hasError = false;

    if (!currentPassword) {
      showError("Current password is required.", "currentPasswordError");
      hasError = true;
    }

    if (!newPassword) {
      showError("New password is required.", "newPasswordError");
      hasError = true;
    } else {
      var hasUpperCase = /[A-Z]/.test(newPassword);
      var hasLowerCase = /[a-z]/.test(newPassword);
      var hasDigit = /\d/.test(newPassword);

      if (newPassword.length < 8) {
        showError(
          "New password must be at least 8 characters long.",
          "newPasswordError"
        );
        hasError = true;
      } else if (!hasUpperCase) {
        showError(
          "New password must include at least one uppercase letter.",
          "newPasswordError"
        );
        hasError = true;
      } else if (!hasLowerCase) {
        showError(
          "New password must include at least one lowercase letter.",
          "newPasswordError"
        );
        hasError = true;
      } else if (!hasDigit) {
        showError(
          "New password must include at least one number.",
          "newPasswordError"
        );
        hasError = true;
      }
    }

    if (newPassword !== confirmPassword) {
      showError("New passwords do not match.", "confirmPasswordError");
      hasError = true;
    }

    if (!hasError) {
      fetch("/auth/update_password", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          currentPassword: currentPassword,
          newPassword: newPassword,
          confirmPassword: confirmPassword,
        }).toString(),
      })
        .then((response) => response.json())
        .then((data) => {
          if (data.success) {
            window.location.href = "/settings";
          } else {
            showError(data.message, data.errorField);
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

function showError(message, errorElementId) {
  var errorMessage = document.getElementById(errorElementId);
  errorMessage.textContent = message;
  errorMessage.style.display = "block";
  setTimeout(function () {
    errorMessage.style.display = "none";
  }, 3000);
}

document.querySelectorAll(".toggle-password").forEach((button) => {
  button.addEventListener("click", function () {
    var targetId = this.getAttribute("data-target");
    var input = document.querySelector(targetId);
    if (input.type === "password") {
      input.type = "text";
      this.classList.remove("fa-eye");
      this.classList.add("fa-eye-slash");
    } else {
      input.type = "password";
      this.classList.remove("fa-eye-slash");
      this.classList.add("fa-eye");
    }
  });
});

// Profile Pic
document
  .getElementById("editProfilePicButton")
  .addEventListener("click", function () {
    document.getElementById("profilePic").click();
  });

document
  .getElementById("editCoverPicButton")
  .addEventListener("click", function () {
    document.getElementById("coverPic").click();
  });

document.addEventListener("DOMContentLoaded", function () {
  const profilePicInput = document.getElementById("profilePic");
  const coverPicInput = document.getElementById("coverPic");
  const croppingContainer = document.getElementById("croppingContainer");
  const imageToCrop = document.getElementById("imageToCrop");
  const cropButton = document.getElementById("cropButton");
  const cancelButton = document.getElementById("cancelButton");
  const progressContainer = document.getElementById("progressContainer");
  const progressText = document.querySelector(".progress-text");
  const progressBar = document.querySelector(".progress-bar");
  let cropper;
  let currentInput = null;

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
          aspectRatio: input === profilePicInput ? 1 : 16 / 9,
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
  coverPicInput.addEventListener("change", () =>
    initializeCropper(coverPicInput)
  );

  cropButton.addEventListener("click", function () {
    const canvas = cropper.getCroppedCanvas();
    canvas.toBlob(function (blob) {
      const formData = new FormData();
      const userId = document.getElementById("userId").value;
      const filename = `${
        currentInput === profilePicInput ? "profile_pic" : "cover_pic"
      }_${userId}_${Date.now()}.png`;
      formData.append(currentInput.name, blob, filename);

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
          alert(
            `Failed to update ${
              currentInput === profilePicInput ? "profile" : "cover"
            } picture.`
          );
        }
      };

      xhr.onerror = function () {
        alert(
          `Failed to update ${
            currentInput === profilePicInput ? "profile" : "cover"
          } picture.`
        );
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

// Phone Number
document.addEventListener("DOMContentLoaded", function () {
  const phoneNumberInput = document.getElementById("phoneNumber");
  const editPhoneNumberButton = document.getElementById(
    "editPhoneNumberButton"
  );
  const savePhoneNumberButton = document.getElementById(
    "savePhoneNumberButton"
  );
  const countryCodeSelect = document.getElementById("countryCode");
  const userId = document.getElementById("userId").value;
  const newNumberError = document.getElementById("newNumberError");

  const MAX_PHONE_NUMBER_LENGTH = 15;
  function formatPhoneNumber(phoneNumber) {
    const cleaned = ("" + phoneNumber).replace(/\D/g, "");
    const numberWithoutLeadingZero = cleaned.startsWith("0")
      ? cleaned.substring(1)
      : cleaned;
    const trimmedNumber = numberWithoutLeadingZero.substring(
      0,
      MAX_PHONE_NUMBER_LENGTH
    );

    const match = trimmedNumber.match(/^(\d{1,3})(\d{1,3})(\d{1,4})$/);
    if (match) {
      return `(${match[1]}) ${match[2]}-${match[3]}`;
    }
    return trimmedNumber;
  }
  editPhoneNumberButton.addEventListener("click", function () {
    phoneNumberInput.removeAttribute("readonly");
    phoneNumberInput.style.pointerEvents = "auto";
    phoneNumberInput.focus();
    newNumberError.textContent = "";
  });
  phoneNumberInput.addEventListener("input", function () {
    const value = phoneNumberInput.value;
    phoneNumberInput.value = formatPhoneNumber(value);
    phoneNumberInput.value = phoneNumberInput.value.substring(
      0,
      MAX_PHONE_NUMBER_LENGTH
    );
  });

  savePhoneNumberButton.addEventListener("click", function () {
    const phoneNumberValue = phoneNumberInput.value;
    const formattedPhoneNumber = formatPhoneNumber(phoneNumberValue);
    const countryCode = countryCodeSelect.value;
    const fullPhoneNumber = `${countryCode}${formattedPhoneNumber.replace(
      /\D/g,
      ""
    )}`;
    newNumberError.textContent = "";
    newNumberError.style.display = "none";

    if (!formattedPhoneNumber || formattedPhoneNumber === countryCode) {
      newNumberError.textContent = "Please enter a valid phone number.";
      newNumberError.style.display = "block";
      setTimeout(() => {
        newNumberError.style.display = "none";
      }, 3000);
      return;
    }

    const formData = new FormData();
    formData.append("phone_number", fullPhoneNumber);
    formData.append("country_code", countryCode);
    formData.append("user_id", userId);

    fetch("/auth/update_phone_number", {
      method: "POST",
      body: formData,
    })
      .then((response) => response.text())
      .then((result) => {
        alert("Phone number updated successfully!");
        phoneNumberInput.setAttribute("readonly", "readonly");
        phoneNumberInput.style.pointerEvents = "none";
        window.location.href = "/settings";
      })
      .catch((error) => {
        console.error("Error:", error);
        alert("Failed to update phone number.");
      });
  });
});

// DOB
document.addEventListener("DOMContentLoaded", function () {
  const dobInput = document.getElementById("dobInput");
  const saveDobButton = document.getElementById("saveDobButton");
  const dobError = document.getElementById("dobError");
  const today = new Date().toISOString().split("T")[0];
  dobInput.setAttribute("max", today);

  saveDobButton.addEventListener("click", function () {
    const dobValue = dobInput.value;
    if (!dobValue) {
      dobError.textContent = "Please select a date of birth.";
      dobError.style.display = "block";
      setTimeout(() => {
        dobError.style.display = "none";
      }, 3000);
      return;
    }
    if (dobValue > today) {
      dobError.textContent = "Date of birth cannot be in the future.";
      dobError.style.display = "block";
      setTimeout(() => {
        dobError.style.display = "none";
      }, 3000);
      return;
    }

    dobError.textContent = "";
    dobError.style.display = "none";

    const formData = new FormData();
    formData.append("date_of_birth", dobValue);

    fetch("/auth/update_date_of_birth", {
      method: "POST",
      body: formData,
    })
      .then((response) => response.text())
      .then((result) => {
        alert("Date of birth updated successfully!");
        window.location.href = "/settings";
      })
      .catch((error) => {
        console.error("Error:", error);
        alert("Failed to update date of birth.");
      });
  });
});
document.addEventListener("DOMContentLoaded", function () {
  const today = new Date().toISOString().split("T")[0];

  flatpickr("#dobInput", {
    dateFormat: "Y-m-d",
    maxDate: today,
  });
});

// Timezone
document.addEventListener("DOMContentLoaded", function () {
  const timeZoneSearch = document.getElementById("timeZoneSearch");
  const timeZoneList = document.getElementById("timeZoneList");
  const timeZoneError = document.getElementById("timeZoneError");
  const saveTimeZoneButton = document.getElementById("saveTimeZoneButton");
  let selectedTimeZone = "";

  timeZoneSearch.addEventListener("focus", function () {
    timeZoneList.style.display = "block";
  });

  timeZoneSearch.addEventListener("input", function () {
    const searchValue = timeZoneSearch.value.toLowerCase();
    const items = timeZoneList.getElementsByTagName("li");

    let anyVisible = false;
    Array.from(items).forEach((item) => {
      const text = item.textContent.toLowerCase();
      if (text.includes(searchValue)) {
        item.style.display = "";
        anyVisible = true;
      } else {
        item.style.display = "none";
      }
    });

    timeZoneList.style.display = anyVisible ? "block" : "none";
  });

  timeZoneList.addEventListener("click", function (event) {
    if (event.target.tagName === "LI") {
      selectedTimeZone = event.target.dataset.value;
      timeZoneSearch.value = event.target.textContent;
      timeZoneList.style.display = "none";
      timeZoneError.textContent = "";
    }
  });

  saveTimeZoneButton.addEventListener("click", function () {
    if (!selectedTimeZone) {
      timeZoneError.textContent = "Please select a time zone.";
      timeZoneError.style.display = "block";
      setTimeout(() => (timeZoneError.style.display = "none"), 3000);
      return;
    }
    timeZoneError.textContent = "";
    timeZoneError.style.display = "none";
    const formData = new FormData();
    formData.append("time_zone", selectedTimeZone);
    fetch("/auth/update_time_zone", {
      method: "POST",
      body: formData,
    })
      .then((response) => response.json())
      .then((result) => {
        if (result.error) {
          timeZoneError.textContent = result.error;
          timeZoneError.style.display = "block";
          setTimeout(() => (timeZoneError.style.display = "none"), 3000);
        } else {
          alert("Time zone updated successfully!");
          window.location.href = "/settings";
        }
      })
      .catch((error) => {
        console.error("Error:", error);
        alert("Failed to update time zone.");
      });
  });

  document.addEventListener("click", function (event) {
    if (!timeZoneContainer.contains(event.target)) {
      timeZoneList.style.display = "none";
    }
  });
});

// Bio
document.addEventListener("DOMContentLoaded", function () {
  const bioInput = document.getElementById("bioInput");
  const editBioButton = document.getElementById("editBioButton");
  const saveBioButton = document.getElementById("saveBioButton");
  const bioError = document.getElementById("bioError");

  editBioButton.addEventListener("click", function () {
    bioInput.removeAttribute("readonly");
    bioInput.style.pointerEvents = "auto";
    bioInput.focus();
    editBioButton.style.display = "none";
    saveBioButton.style.display = "inline-block"; // Show the save button
  });

  saveBioButton.addEventListener("click", function () {
    const bioValue = bioInput.value;
    if (!bioValue) {
      bioError.textContent = "Please enter your bio.";
      bioError.style.display = "block";
      setTimeout(() => (bioError.style.display = "none"), 3000);
      return;
    }

    bioError.textContent = "";
    bioError.style.display = "none";

    const formData = new FormData();
    formData.append("bio", bioValue);

    fetch("/auth/update_bio", {
      method: "POST",
      body: formData,
    })
      .then((response) => response.text())
      .then((result) => {
        alert("Bio updated successfully!");
        window.location.href = "/settings";
      })
      .catch((error) => {
        console.error("Error:", error);
        alert("Failed to update bio.");
      });
  });
});

// Color
document.addEventListener("DOMContentLoaded", function () {
  const colorOptions = document.querySelectorAll(".color-option");
  const saveGeneratedColorButton = document.getElementById(
    "saveGeneratedColorButton"
  );
  const generatedColorError = document.getElementById("generatedColorError");
  const colorOptionContainer = document.getElementById("colorOptionContainer");
  let selectedColor = "";

  colorOptions.forEach((option) => {
    option.addEventListener("click", function () {
      colorOptions.forEach((opt) => opt.classList.remove("selected"));

      option.classList.add("selected");

      selectedColor = option.dataset.color;

      colorOptionContainer.style.backgroundColor = selectedColor;
      saveGeneratedColorButton.style.display = "inline-block";
    });
  });

  saveGeneratedColorButton.addEventListener("click", function () {
    if (!selectedColor) {
      generatedColorError.textContent = "Please select a color.";
      generatedColorError.style.display = "block";
      setTimeout(() => (generatedColorError.style.display = "none"), 3000);
      return;
    }

    generatedColorError.textContent = "";
    generatedColorError.style.display = "none";

    const formData = new FormData();
    formData.append("generated_color", selectedColor);

    fetch("/auth/update_generated_color", {
      method: "POST",
      body: formData,
    })
      .then((response) => response.json())
      .then((result) => {
        if (result.message) {
          alert("Color updated successfully!");
          window.location.href = "/settings";
        } else {
          throw new Error(result.error);
        }
      })
      .catch((error) => {
        console.error("Error:", error);
        generatedColorError.textContent = "Failed to update color.";
        generatedColorError.style.display = "block";
        setTimeout(() => (generatedColorError.style.display = "none"), 3000);
      });
  });
  saveGeneratedColorButton.style.display = "none";
});

// Gender
document.addEventListener("DOMContentLoaded", function () {
  const genderSelect = document.getElementById("genderSelect");
  const saveGenderButton = document.getElementById("saveGenderButton");
  const genderError = document.getElementById("genderError");

  let selectedGender = "";

  genderSelect.addEventListener("change", function () {
    selectedGender = genderSelect.value;
    if (selectedGender) {
      saveGenderButton.style.display = "inline-block";
    } else {
      saveGenderButton.style.display = "none";
    }
  });

  saveGenderButton.addEventListener("click", function () {
    if (!selectedGender) {
      genderError.textContent = "Please select a gender.";
      genderError.style.display = "block";
      setTimeout(() => (genderError.style.display = "none"), 3000);
      return;
    }

    genderError.textContent = "";
    genderError.style.display = "none";

    const formData = new FormData();
    formData.append("gender", selectedGender);

    fetch("/auth/update_gender", {
      method: "POST",
      body: formData,
    })
      .then((response) => response.json())
      .then((result) => {
        if (result.message) {
          alert("Gender updated successfully!");
          window.location.href = "/settings";
        } else {
          throw new Error(result.error);
        }
      })
      .catch((error) => {
        console.error("Error:", error);
        genderError.textContent = "Failed to update gender.";
        genderError.style.display = "block";
        setTimeout(() => (genderError.style.display = "none"), 3000);
      });
  });
  saveGenderButton.style.display = "none";
});
// Age
document.addEventListener("DOMContentLoaded", function () {
  fetch("/auth/calculate_age", {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
  })
    .then((response) => response.json())
    .then((data) => {
      const ageElement = document.getElementById("age");
      if (data.age !== undefined) {
        ageElement.textContent = data.age;
        ageElement.style.color = "#1abc9c";
      } else {
        console.error("Error fetching age:", data.error);
      }
    })
    .catch((error) => {
      console.error("Error:", error);
    });
});

// Hand UserSettings
document.addEventListener("DOMContentLoaded", function () {
  document.querySelectorAll(".form-section").forEach((section) => {
    section.style.display = "none";
  });

  function showSection(sectionId) {
    document.querySelectorAll(".form-section").forEach((section) => {
      section.style.display = "none";
    });
    const profilePicFormSection = document.getElementById(
      "profilePicFormSection"
    );
    if (
      profilePicFormSection &&
      profilePicFormSection.style.display === "block"
    ) {
      profilePicFormSection.style.display = "none";
    }
    document.getElementById(sectionId).style.display = "block";
  }
  document.querySelectorAll("a[href^='#']").forEach((anchor) => {
    anchor.addEventListener("click", function (e) {
      e.preventDefault();
      const targetId = this.getAttribute("href").substring(1);
      showSection(targetId);
    });
  });
  document.querySelectorAll("button[id^='add']").forEach((button) => {
    button.addEventListener("click", function () {
      const targetId = this.id.replace("add", "") + "FormSection";
      showSection(targetId);
    });
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

const IDLE_TIMEOUT = 5 * 60 * 1000;

let idleTimer;

function resetTimer() {
  clearTimeout(idleTimer);
  idleTimer = setTimeout(logoutUser, IDLE_TIMEOUT);
}

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
