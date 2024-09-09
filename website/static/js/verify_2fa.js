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
  currentIndex =
    currentIndex === 0 ? infoSections.length - 1 : currentIndex - 1;
  infoSections[currentIndex].style.display = "block";
  updateActiveDot(currentIndex);
  updateArrowsVisibility(currentIndex);
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
updateActiveDot(currentIndex);
updateArrowsVisibility(currentIndex);
document.getElementById("loading-spinner").hidden = true;


