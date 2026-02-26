let clicks = 0;

const counter = document.getElementById("clickCounter");
const button = document.getElementById("clickButton");

button.addEventListener("click", function () {
    clicks++;
    counter.textContent = "Clicks: " + clicks;
});
