import * as d3 from "d3";
import fs from "fs";
import fetch from "node-fetch";
import geoTz from "geo-tz";

function loadCSV() {
  const filePath = "city_coordinates.csv";
  try {
    const text = fs.readFileSync(filePath, "utf-8");
    const cities = d3.csvParse(text);
    return cities;
  } catch (error) {
    // Handle the file reading or parsing error
    console.error("Error reading the CSV file:", error);
    throw error; // Optionally re-throw the error if you want calling code to handle it as well
  }
}
async function loadWeatherData(cityObj) {
  try {
    const url = `http://7timer.info/bin/api.pl?lon=${cityObj.longitude}&lat=${cityObj.latitude}&product=civillight&output=json`;

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error("Network response was not ok");
    }

    const weatherData = await response.json();
    return weatherData;
  } catch (error) {
    // Handle the fetch error
    console.error("Error loading weather data:", error);
    throw error; // Optionally re-throw the error if you want calling code to handle it as well
  }
}

async function getTimeZone(latitude, longitude) {
  try {
    const timeZone = geoTz.find(latitude, longitude);
    return timeZone[0];
  } catch (error) {
    // Handle the timezone error
    console.error("Error fetching timezone:", error);
    throw error; // Optionally re-throw the error if you want calling code to handle it as well
  }
}

export default { loadCSV, loadWeatherData, getTimeZone };
