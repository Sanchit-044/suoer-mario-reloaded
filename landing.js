const playBtn = document.querySelector(".play-btn");
const heading = document.querySelector("h1");
const bg = document.querySelector(".bg");
const canvas = document.getElementById("screen");

playBtn.addEventListener("click", () => {
  // Hide menu
  playBtn.style.display = "none";
  heading.style.display = "none";
  bg.style.display = "none";

  // Show game canvas
  canvas.style.display = "block";

  // Start game loop (already inside scriptfinal.js)
  if (typeof startGame === "function") {
    startGame(); // optional if you expose startGame in scriptfinal.js
  }
});
