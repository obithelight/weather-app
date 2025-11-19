/* 
=============================================================
1) GLOBALS & DOM REFERENCES
============================================================= 
*/

// Public API Key 
const apiKey = "af8fbe24883c891023e1721af134f40a";

// Main UI elements
const actionBtn = document.getElementById("actionBtn");
const cityInput = document.getElementById("cityInput");
const weatherResult = document.getElementById("weatherResult");

// Defensive checks and early fail message in console
if (!actionBtn || !cityInput || !weatherResult) {
  console.error("Missing required DOM elements. Check IDs in index.html");
}

// Interval references (cleared before reassigning)
let localClockInterval = null; // Shows user's local clock on page load
let cityClockInterval = null; // Runs city time after a search


/*
=============================================================
2) UTILITY FUNCTIONS: Simple Helper functions
============================================================= 
*/

// (2.1) Capitalize Each Word in a string — for weather descriptions
function capitalizeWords(str = "") {
  return String(str)
    .split(" ")
    .map((word) => word ? word[0].toUpperCase() + word.slice(1) : "")
    .join(" ");
}

// (2.2) Show the USER'S local time (default view before searching)
function displayUserLocalTime() {
  const now = new Date();

  const formattedDate = now.toLocaleDateString(undefined, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const formattedTime = now.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  weatherResult.innerHTML = `
    <div class="parent-weather fade-in weather-card formatted-date-time">
      <p>${formattedDate}<br> Current Local Time: ${formattedTime}</p>
    </div>
  `;
}

// (2.3) Convert API timezone offset to CITY local time
function getCityLocalDateTime(offsetSeconds) {
  const now = new Date();
  const utcMs = now.getTime() + now.getTimezoneOffset() * 60000;
  const cityMs = utcMs + offsetSeconds * 1000;
  const cityDate = new Date(cityMs);

  return {
    formattedDate: cityDate.toLocaleDateString(undefined, {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    }),
    formattedTime: cityDate.toLocaleTimeString(undefined, {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    }),
  };
}

/* ========================= 
X) Ripple Effect Function
============================*/

function addRippleEffect(event) {
  const btn = event.currentTarget;

  // Create ripple element
  const ripple = document.createElement("span");
  ripple.classList.add("ripple");

  // Button dimensions
  const rect = btn.getBoundingClientRect();
  const size = Math.max(rect.width, rect.height);
  ripple.style.width = ripple.style.height = `${size}px`;

  // Position ripple at click point
  const x = event.clientX - rect.left - size / 2;
  const y = event.clientY - rect.top - size / 2;
  ripple.style.left = `${x}px`;
  ripple.style.top = `${y}px`;

  // Add ripple to button
  btn.appendChild(ripple);

  // Remove ripple after animation
  ripple.addEventListener("animationend", () => {
    ripple.remove();
  });
}

/* ----------- LOADING ----------- */
// (2.4) Show loading text while fetching data
function showLoading() {
  //actionBtn.disabled = true;
  weatherResult.innerHTML = `
    <div class="parent-weather fade-in weather-card loading">
      <p style="padding: 10px;">Fetching weather...</p>
    </div>
  `;
}

// (2.5) Show blinking error message in the local clock card

let errorBlinkInterval = null;
let errorTimeout = null;

function showBlinkingError(message, duration = 5000) {
  // If an error is already showing, clear existing timers and replace message
  if (errorBlinkInterval) {
    clearInterval(errorBlinkInterval);
    errorBlinkInterval = null;
  }
  if (errorTimeout) {
    clearTimeout(errorTimeout);
    errorTimeout = null;
  }

  // Stop local clock
  if (localClockInterval) {
    clearInterval(localClockInterval);
    localClockInterval = null;
  }

  let visible = true;
  errorBlinkInterval = setInterval(() => {
    weatherResult.innerHTML = `
      <div class="fade-in weather-card parent-weather">
        <p>${visible ? message : "&nbsp;"}</p>
      </div>
    `;
    visible = !visible;
  }, 2500);

  // Restore local clock after duration
  errorTimeout = setTimeout(() => {
    if (errorBlinkInterval) {
      clearInterval(errorBlinkInterval);
      errorBlinkInterval = null;
    }

    displayUserLocalTime();
    localClockInterval = setInterval(displayUserLocalTime, 2000);
    errorTimeout = null;
  }, duration);
}

/* 
=============================================================
3) FETCH WEATHER DATA FOR A GIVEN CITY
** Steps:
** 1) Start loading animation
** 2) Build API URL
** 3) Send API request
** 4) Handle API "city not found" response
** 5) Decode data and display weather
** 6) Handle ALL errors (network + API)
******** (6A) Network error (no internet)
******** (6B) API error (bad city, server issues, etc.)
================================================================
*/

async function fetchWeather(city) {
  const heartEmoji = "\u2764";

  /*
  if (!navigator.onLine) {
    showBlinkingError("Network error. Please check your internet connection.");
    return;
  }*/

 // actionBtn.disabled = true;

  try {
    // (1) Start loading state
    showLoading();

    // const controller = new AbortController();
    // const timeout = setTimeout(() => controller.abort(), 10000); // 10s timeout
    // const signal = controller.signal;

    // (2) Build the API URL
    const url = `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${apiKey}&units=metric`;

    // (3) Send the API request
    const response = await fetch(url); 
    //clearTimeout(timeoutId);

    // (4) If API returns an error (e.g., city not found)
    if (!response.ok) {
      showBlinkingError(`Oops, city not found ${heartEmoji}`);
      return;
    }

    // (5) Convert raw JSON into usable JS object
    const data = await response.json();

    // (5B) Display weather result in UI
    displayWeather(data);
  } catch (error) {

    // (6A) Detect NETWORK error (no internet connection)
    const offlineErrors = ["Failed to fetch", "NetworkError", "load failed"];

    if (error.name === 'AbortError') {
      showBlinkingError("Request timed out. Please try again.");
      return;
    }

    if (offlineErrors.some((msg) => error.message.includes(msg))) {
      showBlinkingError("Network error. Please check your internet connection.");
      return;
    }

    // Default API error message
    showBlinkingError(error.message);
    }
}

/* 
=============================================================
4) DISPLAY WEATHER DATA
** Build weather card, weather icon, clock, and background
============================================================= 
*/

function displayWeather(data) {
  // (4.1) Stop previous clocks to prevent duplicates
  if (localClockInterval) {
    clearInterval(localClockInterval);
    localClockInterval = null;
  }

  if (cityClockInterval) {
    clearInterval(cityClockInterval);
    cityClockInterval = null;
  }

  // (4.2) Prepare data for weather card
  const iconCode = data.weather[0].icon;
  const iconUrl = `https://openweathermap.org/img/wn/${iconCode}@2x.png`;
  const description = capitalizeWords(data.weather[0].description);

  const { formattedDate, formattedTime } = getCityLocalDateTime(data.timezone);

  // (4.3) Render weather card into the UI
  weatherResult.innerHTML = `
    <div class="fade-in weather-card">
      <h2>${data.name}, ${data.sys.country}</h2>
      <img src="${iconUrl}" alt="Weather Icon" />
      <h3 class="temp-display">${data.main.temp}°C</h3>

      <p style="margin-bottom: 15px;">${description}</p>
      <p>Humidity: ${data.main.humidity}%</p>
      <p>Wind Speed: ${data.wind.speed} m/s</p>

      <div class="city-date-time">
        <p class="city-date">${formattedDate}</p>
        <p class="city-time">${formattedTime}</p>
      </div>
    </div>
  `;

  // (4.4) Keep city time ticking every second
  cityClockInterval = setInterval(() => {
    const { formattedDate, formattedTime } = getCityLocalDateTime(
      data.timezone
    );

    const dateEl = document.querySelector(".city-date");
    const timeEl = document.querySelector(".city-time");

    if (dateEl && timeEl) {
      dateEl.textContent = formattedDate;
      timeEl.textContent = formattedTime;
    }
  }, 1000);

  // (4.5) Update background color based on weather
  const condition = data.weather[0].main.toLowerCase();

  if (condition.includes("cloud")) {
    document.body.style.background =
      "linear-gradient(to right, #4b4b4b, #2e2e2e)";
  } else if (condition.includes("rain")) {
    document.body.style.background =
      "linear-gradient(to right, #87CEEB, #00BFFF)";
  } else if (condition.includes("clear")) {
    document.body.style.background =
      "linear-gradient(to right, #FFFACD, #c3e4f3)";
  } else if (condition.includes("snow")) {
    document.body.style.background =
      "linear-gradient(to right, #f7f7f7, #e3e8e4)";
  } else if (condition.includes("thunder")) {
    document.body.style.background =
      "linear-gradient(to right, #FF8C00, #FF4500)";
  } else if (condition.includes("mist")) {
    document.body.style.background =
      "linear-gradient(to right, #BB4466, #AA4CC5)";
  } else {
    document.body.style.background =
      "linear-gradient(to right, #4facfe, #00f2fe)";
  }
}

/*
=============================================================
6) EVENT LISTENERS
** Button click, Enter key, default local clock
============================================================= 
*/

// (6.1) Handle SEARCH button click
actionBtn.addEventListener("click", () => {
  const city = cityInput.value.trim();

  if (city === "") {
      //showLoading();
      showBlinkingError(`Search field cannot be empty.`);
      return;
  }

  // (6.1B) Reject inputs that contain NO letters (only numbers/symbols)
  const lettersOnly = /[a-zA-Z]/;

  if (!lettersOnly.test(city)) {
    showLoading();
    showBlinkingError(`Only letters are allowed.`);
    return;
  }

  if (city.length < 2) {
    showLoading();
    showBlinkingError(`City name is too short.`);
    return;
  }

  // (6.1D) If all checks pass → proceed with search
  fetchWeather(city);
});

// (6.2) Handle Enter key for search
cityInput.addEventListener("keyup", (e) => {
  if (e.key === "Enter") {
    actionBtn.click();
  }
});

// (6.3) Show user's local clock at start
displayUserLocalTime();
localClockInterval = setInterval(displayUserLocalTime, 1000);

/* 
-----------------------------------------------
7) U1-C: ULTRA-MINIMAL GLASS RIPPLE
-----------------------------------------------
*/

actionBtn.addEventListener("mouseup", () => {
  actionBtn.classList.add("bounce");

  setTimeout(() => {
    actionBtn.classList.remove("bounce");
  }, 180); // matches animation duration
});

// For mobile touchscreens:
actionBtn.addEventListener("touchend", () => {
  actionBtn.classList.add("bounce");

  setTimeout(() => {
    actionBtn.classList.remove("bounce");
  }, 180);
});

