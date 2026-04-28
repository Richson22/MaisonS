 function toggleTheme() {
      document.body.classList.toggle("dark");
    }
    function toggleTheme() {
      document.body.classList.toggle("dark");

      const icon = document.querySelector(".toggle-btn");
      if (document.body.classList.contains("dark")) {
        icon.textContent = "☀️";
      } else {
        icon.textContent = "🌙";
      } 
    }