let clicks = localStorage.getItem("clicks");

if (clicks === null) {
    clicks = 0;
} else {
    clicks = parseInt(clicks);
}

const counter = document.getElementById("clickCounter");
const button = document.getElementById("clickButton");

counter.textContent = "Clicks: " + clicks;

button.addEventListener("click", function() {
    clicks++;
    counter.textContent = "Clicks: " + clicks;
    localStorage.setItem("clicks", clicks);
});
