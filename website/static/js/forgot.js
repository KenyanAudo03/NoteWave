document.addEventListener("DOMContentLoaded", function () {
    const notepadInfo = document.getElementById("notepad-info");
    const infoSections = notepadInfo.querySelectorAll(".info-section");
    let currentIndex = 0;
    const leftArrow = document.querySelector(".left-arrow");
    const rightArrow = document.querySelector(".right-arrow");
    const dots = document.querySelectorAll(".dot");
  
    // Initially hide all sections except the first one
    infoSections.forEach((section, index) => {
      section.style.display = index === 0 ? "block" : "none";
    });
  
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
        rightArrow.style.display = index === infoSections.length - 1 ? "none" : "";
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
  
    const form = document.getElementById("form-forgot");
    const email = document.getElementById("email");
  
    function addErrorStyles(element) {
      element.classList.add("input-error", "zoom-out-twice");
    }
  
    function removeErrorStyles(element) {
      element.classList.remove("input-error", "zoom-out-twice");
    }
  
    form.addEventListener("submit", function (event) {
      event.preventDefault();
      let valid = true;
      const emailValue = email.value.trim();
  
      if (!emailValue || !/^\S+@\S+\.\S+$/.test(emailValue)) {
        valid = false;
        addErrorStyles(email);
        setTimeout(() => {
          removeErrorStyles(email);
        }, 1000);
      }
  
      if (valid) {
        form.submit();
      }
    });
  });