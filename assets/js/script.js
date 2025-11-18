/* 
=============================================================
1) GLOBALS & DOM REFERENCES
============================================================= 
*/

const apiKey = "af8fbe24883c891023e1721af134f40a";

// Main UI elements
const actionBtn = document.getElementById("actionBtn");
const cityInput = document.getElementById("cityInput");
const weatherResult = document.getElementById("weatherResult");

// Interval references (cleared before reassigning)
let localClockInterval = null; // Shows user's local clock on page load
let cityClockInterval = null; // Runs city time after a search

/*
=============================================================
2) UTILITY FUNCTIONS 
** Simple Helper functions reused multiple times
============================================================= 
*/

// (2.1) Capitalize Each Word in a string — for weather descriptions
function capitalizeWords(str) {
  return str
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
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
    <div class="fade-in weather-card">
      <p>${formattedDate}</p>
      <p>Current Local Time: ${formattedTime}</p>
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

// (2.4) Show loading text while fetching data
function showLoading() {
  weatherResult.innerHTML = `
    <div class="loading">Fetching weather...</div>
  `;
}

// (2.5) Show blinking error message in the local clock card
function showBlinkingError(message, duration = 10000) {
  // Stop local clock
  if (localClockInterval) {
    clearInterval(localClockInterval);
    localClockInterval = null;
  }

  let visible = true;

  // Use the same weather-card container
  const errorBlinkInterval = setInterval(() => {
    weatherResult.innerHTML = `
      <div class="fade-in weather-card" style="text-align:center; color:#FFB200;">
        <p>${visible ? message : "&nbsp;"}</p>
      </div>
    `;
    visible = !visible;
  }, 1000);

  // Restore local clock after 'duration' ms
  setTimeout(() => {
    clearInterval(errorBlinkInterval); // Stop blinking
    displayUserLocalTime(); // Show clock immediately
    localClockInterval = setInterval(displayUserLocalTime, 1000); // Resume clock
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
  let heartEmoji = "\u2764";
  try {
    // (1) Start loading state
    showLoading();

    // (2) Build the API URL
    const url = `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${apiKey}&units=metric`;

    // (3) Send the API request
    const response = await fetch(url);

    // (4) If API returns an error (e.g., city not found)
    if (!response.ok) {
      showBlinkingError(`Oops, city not found ${heartEmoji}`);
      return;
    }
    /** 
    if (!response.ok) {
    *** throw new Error(`oops, city not found ${heartEmoji}.`);
    ** }
    */

    // (5) Convert raw JSON into usable JS object
    const data = await response.json();

    // (5B) Display weather result in UI
    displayWeather(data);
  } catch (error) {
    /* 
    -----------------------------------------
    ERROR HANDLING
    -----------------------------------------
    */

    // (6A) Detect NETWORK error (no internet connection)
    const offlineErrors = ["Failed to fetch", "NetworkError", "load failed"];

    if (offlineErrors.some((msg) => error.message.includes(msg))) {
      showBlinkingError(
        "Network error. Please check your internet connection."
      );
      return;
    }

    // Default API errors
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
  const iconUrl = `http://openweathermap.org/img/wn/${iconCode}@2x.png`;
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
      "linear-gradient(to right, #87CEEB, #0efe06)";
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
5) EVENT LISTENERS
** Button click, Enter key, default local clock
============================================================= 
*/

// (5.1) Handle SEARCH button click
actionBtn.addEventListener("click", () => {
  const city = cityInput.value.trim();

  // (5.1A) Reject empty input
  // if (city === "") {
  //   weatherResult.innerHTML = `
  //   <p style="color:#4facfe;">Search field cannot be blank.</p>
  //   `;
  //   return;
  // }

  if (city == "") {
    showBlinkingError(`oh, no. Search field is empty.`);
    return;
  }

  // (5.1B) Reject inputs that contain NO letters (only numbers/symbols)
  const lettersOnly = /[a-zA-Z]/;

  // if (!lettersOnly.test(city)) {
  //   let enterValidCity = "Invalid Characters. Letters Only.";
  //   weatherResult.innerHTML = `
  //     <p style="color:#ff4c4c;">
  //       ${enterValidCity}
  //     </p>
  //   `;
  //   return;
  // }

  if (!lettersOnly.test(city)) {
    showBlinkingError(`Invalid. Alphanumeric characters only.`);
    return;
  }

  // (5.1C) Require at least 2 characters
  /**
  if (city.length < 2) {
    weatherResult.innerHTML = `
      <p style="color:#FFB200;">
        Try again. name is too short.
      </p>
    `;
    return;
  }
  */

  if (city.length < 2) {
    showBlinkingError(`Check spelling. name is too short.`);
    return;
  }

  // (5.1D) If all checks pass → proceed with search
  fetchWeather(city);
});

// (5.2) Handle Enter key for search
cityInput.addEventListener("keypress", (e) => {
  if (e.key === "Enter") {
    actionBtn.click();
  }
});

// (5.3) Show user's local clock at start
displayUserLocalTime();
localClockInterval = setInterval(displayUserLocalTime, 1000);
