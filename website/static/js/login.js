document.addEventListener("DOMContentLoaded", function () {
  document
    .getElementById("show-pass-checkbox")
    .addEventListener("change", function () {
      var passwordField = document.getElementById("password-login");
      if (this.checked) {
        passwordField.type = "text";
      } else {
        passwordField.type = "password";
      }
    });

    document
    .getElementById("form-login")
    .addEventListener("submit", function (event) {
      event.preventDefault();
  
      const emailInput = document.getElementById("email");
      const passwordInput = document.getElementById("password-login");
      const email = emailInput.value;
      const password = passwordInput.value;
      clearErrorMessages();
  
      function shakeInput(input, fullBorder = false) {
        input.classList.add("shake");
        input.classList.add("input-error");
        if (fullBorder) {
          input.classList.add("full-border-error");
        }
        setTimeout(() => {
          input.classList.remove("shake", "full-border-error", "input-error");
        }, 1000);
      }
  
      function showErrorMessage(input, message) {
        const errorElement = document.createElement("div");
        errorElement.classList.add("error-message");

        
        const closeIcon = document.createElement("span");
        closeIcon.classList.add("close-icon");
        closeIcon.innerHTML = "&times;";
        closeIcon.style.cursor = "pointer";
        closeIcon.style.fontSize = "18px";
        closeIcon.style.marginLeft = "10px";
        errorElement.textContent = message;
        errorElement.appendChild(closeIcon);
        input.parentNode.appendChild(errorElement);
        setTimeout(() => {
          errorElement.remove();
        }, 3000); 
      }
  
      function clearErrorMessages() {
        const errorMessages = document.querySelectorAll(".error-message");
        errorMessages.forEach((msg) => msg.remove());
      }
  
      // Remove previous error classes
      emailInput.classList.remove("input-error", "full-border-error");
      passwordInput.classList.remove("input-error");
  
      // Check if email exists
      fetch("/auth/check_email", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: `email=${encodeURIComponent(email)}`,
      })
        .then((response) => response.json())
        .then((data) => {
          if (!data.exists) {
            shakeInput(emailInput, true);
            showErrorMessage(emailInput, "Email does not exist.");
          } else {
            // Check if password is correct
            fetch("/auth/check_password", {
              method: "POST",
              headers: { "Content-Type": "application/x-www-form-urlencoded" },
              body: `email=${encodeURIComponent(
                email
              )}&password-login=${encodeURIComponent(password)}`,
            })
              .then((response) => response.json())
              .then((data) => {
                if (!data.exists) {
                  shakeInput(passwordInput);
                  showErrorMessage(passwordInput, "Password is wrong.");
                } else {
                  document.getElementById("form-login").submit();
                }
              });
          }
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

paper.install(window);
paper.setup(document.getElementById("canvas"));
var canvasWidth, canvasHeight, canvasMiddleX, canvasMiddleY;

var shapeGroup = new Group();

var positionArray = [];

function getCanvasBounds() {
  canvasWidth = view.size.width;
  canvasHeight = view.size.height;
  canvasMiddleX = canvasWidth / 2;
  canvasMiddleY = canvasHeight / 2;
  var position1 = {
    x: canvasMiddleX / 2 + 100,
    y: 100,
  };

  var position2 = {
    x: 200,
    y: canvasMiddleY,
  };

  var position3 = {
    x: canvasMiddleX - 50 + canvasMiddleX / 2,
    y: 150,
  };

  var position4 = {
    x: 0,
    y: canvasMiddleY + 100,
  };

  var position5 = {
    x: canvasWidth - 130,
    y: canvasHeight - 75,
  };

  var position6 = {
    x: canvasMiddleX + 80,
    y: canvasHeight - 50,
  };

  var position7 = {
    x: canvasWidth + 60,
    y: canvasMiddleY - 50,
  };

  var position8 = {
    x: canvasMiddleX + 100,
    y: canvasMiddleY + 100,
  };

  positionArray = [
    position3,
    position2,
    position5,
    position4,
    position1,
    position6,
    position7,
    position8,
  ];
}

function initializeShapes() {
  getCanvasBounds();

  var shapePathData = [
    "M231,352l445-156L600,0L452,54L331,3L0,48L231,352",
    "M0,0l64,219L29,343l535,30L478,37l-133,4L0,0z",
    "M0,65l16,138l96,107l270-2L470,0L337,4L0,65z",
    "M333,0L0,94l64,219L29,437l570-151l-196-42L333,0",
    "M331.9,3.6l-331,45l231,304l445-156l-76-196l-148,54L331.9,3.6z",
    "M389,352l92-113l195-43l0,0l0,0L445,48l-80,1L122.7,0L0,275.2L162,297L389,352",
    "M 50 100 L 300 150 L 550 50 L 750 300 L 500 250 L 300 450 L 50 100",
    "M 700 350 L 500 350 L 700 500 L 400 400 L 200 450 L 250 350 L 100 300 L 150 50 L 350 100 L 250 150 L 450 150 L 400 50 L 550 150 L 350 250 L 650 150 L 650 50 L 700 150 L 600 250 L 750 250 L 650 300 L 700 350 ",
  ];

  for (var i = 0; i <= shapePathData.length; i++) {
    var headerShape = new Path({
      strokeColor: "rgba(255, 255, 255, 0.5)",
      strokeWidth: 2,
      parent: shapeGroup,
    });
    headerShape.pathData = shapePathData[i];
    headerShape.scale(2);
    headerShape.position = positionArray[i];
  }
}

initializeShapes();
view.onFrame = function paperOnFrame(event) {
  if (event.count % 4 === 0) {
    for (var i = 0; i < shapeGroup.children.length; i++) {
      if (i % 2 === 0) {
        shapeGroup.children[i].rotate(-0.1);
      } else {
        shapeGroup.children[i].rotate(0.1);
      }
    }
  }
};

view.onResize = function paperOnResize() {
  getCanvasBounds();

  for (var i = 0; i < shapeGroup.children.length; i++) {
    shapeGroup.children[i].position = positionArray[i];
  }

  if (canvasWidth < 700) {
    shapeGroup.children[3].opacity = 0;
    shapeGroup.children[2].opacity = 0;
    shapeGroup.children[5].opacity = 0;
  } else {
    shapeGroup.children[3].opacity = 1;
    shapeGroup.children[2].opacity = 1;
    shapeGroup.children[5].opacity = 1;
  }
};
