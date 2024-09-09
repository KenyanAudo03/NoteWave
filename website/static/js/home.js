document.addEventListener("DOMContentLoaded", function () {
    const carousel = document.querySelector(".carousel");
    const prevButton = document.querySelector(".carousel-prev");
    const nextButton = document.querySelector(".carousel-next");
    const indicators = document.querySelectorAll(".indicator");
    const sections = document.querySelectorAll('section[id^="section"]');
    let currentIndex = 0;
    const itemsToShow = 4;
    const totalItems = document.querySelectorAll(".carousel-item").length;
  
    const updateCarousel = () => {
      const itemWidth = carousel.clientWidth / itemsToShow;
      const totalWidth = itemWidth * totalItems;
      const maxIndex = Math.max(totalItems - itemsToShow, 0);
  
      // Ensure currentIndex is within bounds
      currentIndex = Math.max(0, Math.min(currentIndex, maxIndex));
  
      carousel.style.transform = `translateX(-${currentIndex * itemWidth}px)`;
    };
  
    prevButton.addEventListener("click", () => {
      currentIndex -= 1;
      updateCarousel();
    });
  
    nextButton.addEventListener("click", () => {
      currentIndex += 1;
      updateCarousel();
    });
  
    window.addEventListener("resize", updateCarousel);
    updateCarousel();
  
    // Scroll handling for section indicators
    const updateIndicators = () => {
      const scrollPosition = window.scrollY || window.pageYOffset;
  
      sections.forEach((section, index) => {
        const sectionTop = section.offsetTop;
        const sectionHeight = section.offsetHeight;
        const nextSection = sections[index + 1];
        const nextSectionTop = nextSection
          ? nextSection.offsetTop
          : Number.MAX_VALUE;
  
        if (
          scrollPosition >= sectionTop - 100 &&
          scrollPosition < nextSectionTop - 100
        ) {
          indicators.forEach((indicator) => indicator.classList.remove("active"));
          indicators[index].classList.add("active");
        }
      });
    };
  
    window.addEventListener("scroll", updateIndicators);
    updateIndicators();
  });
  
  document.addEventListener("DOMContentLoaded", function () {
    const scrollUpArrow = document.querySelector(".scroll-up-arrow");
  
    if (scrollUpArrow) {
      // Initially hide the scroll-up arrow
      scrollUpArrow.style.display = "none";
  
      // Function to toggle scroll-up arrow visibility based on scroll position
      function toggleScrollUpArrow() {
        if (window.scrollY > 0) {
          scrollUpArrow.style.display = "block";
        } else {
          scrollUpArrow.style.display = "none";
        }
      }
  
      // Event listener for scroll events
      window.addEventListener("scroll", toggleScrollUpArrow);
  
      // Event listener for click event on scroll-up arrow
      scrollUpArrow.addEventListener("click", function (event) {
        event.preventDefault();
  
        const section1 = document.querySelector("#head");
        if (section1) {
          section1.scrollIntoView({ behavior: "smooth" });
        }
      });
    }
  });
  
  function updateCharacterCount() {
    const textarea = document.getElementById("comments");
    const charCountElement = document.getElementById("char-count");
    const maxLength = 30;
    const currentLength = textarea.value.length;
  
    charCountElement.textContent = `${currentLength}/${maxLength} characters used`;
  }
  
  document.addEventListener("DOMContentLoaded", function () {
    const faqItems = document.querySelectorAll(".faq-item");
  
    faqItems.forEach((item) => {
      const question = item.querySelector(".faq-question");
      const answer = item.querySelector(".faq-answer");
      const icon = question.querySelector("i");
  
      question.addEventListener("click", () => {
        const isOpen = answer.classList.contains("open");
  
        // Close all other answers
        faqItems.forEach((i) => {
          i.querySelector(".faq-answer").classList.remove("open");
          i.querySelector(".faq-question").classList.remove("open");
          i.querySelector(".faq-question i").classList.replace(
            "fa-minus",
            "fa-plus"
          );
        });
  
        // Toggle the clicked answer
        if (!isOpen) {
          answer.classList.add("open");
          question.classList.add("open");
          icon.classList.replace("fa-plus", "fa-minus");
        } else {
          answer.classList.remove("open");
          question.classList.remove("open");
          icon.classList.replace("fa-minus", "fa-plus");
        }
      });
    });
  });
  
  //chatbot//
  
  
  let firstTimeOpening = true; 
  function toggleChat() {
    const chatContainer = document.getElementById("chat-window");
  
    if (firstTimeOpening) {
      firstTimeOpening = false;
      chatContainer.style.display = "flex"; 
      setTimeout(() => {
        sendBotMessage("Hello! How can I help you today?");
      }, 500); 
    } else {
  
      chatContainer.style.display = chatContainer.style.display === "none" ? "flex" : "none";
    }
  }
  
  function sendBotMessage(message) {
    const chatContent = document.getElementById("chat-messages");
    const botMessageElement = document.createElement("div");
    botMessageElement.className = "bot-message";
    botMessageElement.innerHTML = message;
    chatContent.appendChild(botMessageElement);
    chatContent.scrollTop = chatContent.scrollHeight;
  }
  
  function sendMessage() {
    const userInput = document.getElementById("user-input");
    const userMessage = userInput.value.trim();
    if (!userMessage) return;
  
    const chatContent = document.getElementById("chat-messages");
    const userMessageElement = document.createElement("div");
    userMessageElement.className = "user-message";
    userMessageElement.innerText = userMessage;
    chatContent.appendChild(userMessageElement);
  
    userInput.value = "";
  
    fetch("/chatbot/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ message: userMessage }),
    })
      .then((response) => response.json())
      .then((data) => {
        sendBotMessage(data.response);
      })
      .catch((error) => console.error("Error:", error));
  }
  