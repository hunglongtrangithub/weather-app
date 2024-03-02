const API_BASE_URL = "http://localhost:3000";

const weekDayColorMap = [
  "#ff0000", // red
  "#ffffff", // white
  "#ff7f00", // orange
  "#0000ff", // blue
  "#008000", // green
  "#ffd700", // gold
  "#964b00", // brown
];

const defaultRegions = {
  en: "US",
  ja: "JP",
  vi: "VN",
  // Add more defaults as needed
};

i18next
  .use(i18nextXHRBackend)
  .init({
    backend: {
      loadPath: "/locales/{{lng}}.json",
    },
    lng: "en", // Default language
    fallbackLng: "en",
  })
  .then(() => {
    applyTranslationsToAllElements(document.body);
    loadCities();
  });

function toBCP47(simpleTag) {
  const region = defaultRegions[simpleTag];
  return region ? `${simpleTag}-${region}` : simpleTag;
}

function getContrastColor(bgColor) {
  const rgb = parseInt(bgColor.slice(1), 16); // convert rrggbb to decimal
  const r = (rgb >> 16) & 0xff; // extract red
  const g = (rgb >> 8) & 0xff; // extract green
  const b = (rgb >> 0) & 0xff; // extract blue

  const luma = 0.2126 * r + 0.7152 * g + 0.0722 * b; // per ITU-R BT.709

  return luma < 128 ? "white" : "black";
}

function displayLoadingStatus(message) {
  const loadingStatus = document.getElementById("loadingStatus");
  loadingStatus.style.display = "block";
  loadingStatus.textContent = message || "Loading...";
}

function clearLoadingStatus() {
  const loadingStatus = document.getElementById("loadingStatus");
  loadingStatus.style.display = "none";
}

function displayError(message) {
  const errorBox = document.getElementById("errorBox");
  errorBox.style.display = "block";
  errorBox.textContent = message;
}

function clearError() {
  const errorBox = document.getElementById("errorBox");
  errorBox.style.display = "none";
  errorBox.textContent = "";
}

function formattedDate(dateStr, timeZone) {
  // Assuming dateStr is in "YYYYMMDD" format
  const year = dateStr.substring(0, 4);
  const month = dateStr.substring(4, 6);
  const day = dateStr.substring(6, 8);
  // Correcting the month index by subtracting 1 since JavaScript months are 0-indexed
  const options = {
    timeZone: timeZone,
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  };
  const date = new Date(Date.UTC(year, month - 1, day)).toLocaleString(
    toBCP47(i18next.language),
    options
  );
  let datePart, weekDayPart;

  if (toBCP47(i18next.language) === "ja-JP") {
    // Make the week day go down one line (the date is in Japanese)
    datePart = date.slice(0, date.lastIndexOf("曜") - 1);
    weekDayPart = date.slice(date.lastIndexOf("曜") - 1);
  } else {
    // For English or other languages
    const parts = date.split(", ");
    weekDayPart = parts[0];
    datePart = parts.slice(1).join(", ");
  }

  // Translate weekdays using i18next keys
  const weekdays = [
    i18next.t("weekdaySunday"),
    i18next.t("weekdayMonday"),
    i18next.t("weekdayTuesday"),
    i18next.t("weekdayWednesday"),
    i18next.t("weekdayThursday"),
    i18next.t("weekdayFriday"),
    i18next.t("weekdaySaturday"),
  ];

  // Get the index of the formatted weekday in the translated weekdays array
  const weekDayNumber = weekdays.indexOf(weekDayPart);

  return { datePart, weekDayPart, weekDayNumber };
}

async function loadCities() {
  try {
    clearError();
    displayLoadingStatus(i18next.t("loadingCities"));
    let response = await fetch(`${API_BASE_URL}/cities`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    cities = await response.json();
    for (let i = 0; i < cities.length; i++) {
      let option = document.createElement("option");
      option.text = `${cities[i].city}, ${cities[i].country}`;
      dropDownButton.appendChild(option);
    }
  } catch (error) {
    console.error("Error:", error);
    displayError(`${i18next.t("cityLoadFailed")}${error.message}`);
  } finally {
    clearLoadingStatus();
  }
}

async function getTimeZone(cityObj) {
  try {
    clearError();
    displayLoadingStatus(i18next.t("loadingTimeZone"));
    let response = await fetch(`${API_BASE_URL}/timezone`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ cityObj }),
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const { timeZone } = await response.json();
    console.log(timeZone);
    return timeZone;
  } catch (error) {
    console.error("Error:", error);
    displayError(`${i18next.t("timeZoneFetchFailed")}${error.message}`);
  } finally {
    // Hide the loading status
    clearLoadingStatus();
  }
}

async function loadWeatherData(cityName) {
  try {
    // Show the loading status
    displayLoadingStatus(i18next.t("loadingWeather"));
    clearError();
    let response = await fetch(`${API_BASE_URL}/weather`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ cityName }),
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const weatherData = await response.json();

    const cityObj = cities.find((c) => c.city === cityName);
    const timeZone = await getTimeZone(cityObj);

    return { weatherData, timeZone };
  } catch (error) {
    console.error("Error:", error);
    displayError(`${i18next.t("weatherLoadFailed")}${error.message}`);
  } finally {
    // Hide the loading status
    clearLoadingStatus();
  }
}

function populateWeatherData(weatherData, timeZone, language) {
  if (
    !weatherData ||
    !weatherData.dataseries ||
    weatherData.dataseries.length === 0
  ) {
    console.log("No weather data to display");
    return;
  }
  for (let i = 0; i < weatherData.dataseries.length; i++) {
    const weatherInfo = weatherData.dataseries[i];
    let { datePart, weekDayPart, weekDayNumber } = formattedDate(
      String(weatherInfo.date),
      timeZone,
      toBCP47(language)
    );

    let dayElement = document.getElementById(`day${i}`);
    dayElement.style.display = "block";

    let date = document.createElement("p");
    date.innerHTML = datePart;

    let weekDay = document.createElement("p");
    weekDay.innerHTML = weekDayPart;
    weekDay.style.backgroundColor = weekDayColorMap[weekDayNumber];
    weekDay.style.color = getContrastColor(weekDayColorMap[weekDayNumber]);
    weekDay.style.border = "1px solid black";

    let icon = document.createElement("img");
    icon.src = `${API_BASE_URL}/images/${weatherInfo.weather}.png`;

    let weatherDescription = document.createElement("p");
    weatherDescription.innerHTML = i18next.t(weatherInfo.weather);

    let tempMax = document.createElement("p");
    tempMax.setAttribute("class", `temp`);
    const tempMaxVal = convertTempToUnit(
      `${weatherInfo.temp2m.max}°C`,
      currentTempUnit
    );
    tempMax.innerHTML = tempMaxVal;
    tempMax.style.color = "red";

    let tempMin = document.createElement("p");
    tempMin.setAttribute("class", `temp`);
    const tempMinVal = convertTempToUnit(
      `${weatherInfo.temp2m.min}°C`,
      currentTempUnit
    );
    tempMin.innerHTML = tempMinVal;
    tempMin.style.color = "blue";

    dayElement.innerHTML = "";
    dayElement.appendChild(date);
    dayElement.appendChild(weekDay);
    dayElement.appendChild(icon);
    dayElement.appendChild(weatherDescription);
    dayElement.appendChild(tempMax);
    dayElement.appendChild(tempMin);
  }

  // Clear the content of the divs that don't have any data
  for (let i = weatherData.dataseries.length; i < 7; i++) {
    let dayElement = document.getElementById(`day${i}`);
    dayElement.innerHTML = "";
  }
}

let cities = [];
let weatherData = {};
let timeZone = "";
let currentTempUnit = "C";
const loadingStatus = document.getElementById("loadingStatus");
const languageSelect = document.getElementById("languageSelect");
const dropDownButton = document.getElementById("dropDownButton");
const dummyOption = document.getElementById("dummyOption");
const switchUnitButton = document.getElementById("switchUnitButton");

function updateTemp(unit) {
  tempElements = document.getElementsByClassName("temp");
  for (let i = 0; i < tempElements.length; i++) {
    let temp = Number(tempElements[i].innerHTML.slice(0, -2));
    if (unit === "C") {
      temp = ((temp - 32) * 5) / 9;
    } else {
      temp = temp * (9 / 5) + 32;
    }
    tempElements[i].innerHTML = `${Math.round(temp)}°${unit}`;
  }
}

function applyTranslationsToAllElements(element) {
  // If this element has a data-i18n attribute, apply the translation
  if (element.hasAttribute("data-i18n")) {
    const key = element.getAttribute("data-i18n");
    element.innerHTML = i18next.t(key);
  }

  // Recursively apply translations to all child elements
  const children = element.children;
  for (let i = 0; i < children.length; i++) {
    applyTranslationsToAllElements(children[i]);
  }
}

function hideWeatherCardsAndCityDisplay() {
  // Clear the weather cards
  for (let i = 0; i < 7; i++) {
    let dayElement = document.getElementById(`day${i}`);
    if (dayElement) {
      dayElement.style.display = "none";
    }
  }
  // Clear the current city display
  let cityDisplayElement = document.getElementById("selectedCity");
  if (cityDisplayElement) {
    cityDisplayElement.innerHTML = "";
  }
}

function convertTempToUnit(tempStr, currentUnit) {
  let temp = Number(tempStr.slice(0, -2));
  let unit = tempStr.slice(-1);
  if (unit === currentUnit) {
    return tempStr;
  }
  if (currentUnit === "C") {
    temp = ((temp - 32) * 5) / 9;
  } else {
    temp = temp * (9 / 5) + 32;
  }
  return `${Math.round(temp)}°${currentUnit}`;
}

languageSelect.addEventListener("change", async (event) => {
  const lang = event.target.value;
  console.log("Language changed to:", lang);
  await i18next.changeLanguage(lang);
  applyTranslationsToAllElements(document.body);
  populateWeatherData(weatherData, timeZone, i18next.language);
});

dropDownButton.addEventListener("change", async (event) => {
  const selection = event.target.value;
  const cityName = selection.split(",")[0];
  if (cityName === dummyOption.text) {
    console.log("No city selected");
    hideWeatherCardsAndCityDisplay();
    // Reset weather data and time zone
    weatherData = {};
    timeZone = "";
  } else {
    ({ weatherData, timeZone } = await loadWeatherData(cityName));
    console.log(weatherData, timeZone, i18next.language);
    populateWeatherData(weatherData, timeZone, i18next.language);
  }
});

switchUnitButton.addEventListener("click", () => {
  if (currentTempUnit === "C") {
    currentTempUnit = "F";
  } else {
    currentTempUnit = "C";
  }
  tempElements = document.getElementsByClassName("temp");
  for (let i = 0; i < tempElements.length; i++) {
    let temp = tempElements[i].innerHTML;
    tempElements[i].innerHTML = convertTempToUnit(temp, currentTempUnit);
  }
  console.log("Temperature unit switched to:", currentTempUnit);
});
