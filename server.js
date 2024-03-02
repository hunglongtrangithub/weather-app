import api from "./api.js";
import express from "express";
import cors from "cors";

const app = express();
const port = 3000;

let cities = [];

app.use(express.json());
app.use(cors());
// express app runs in the root directory, not where the server.js file is located
app.use(express.static("public"));
app.use("/images", express.static("images"));
app.use("/locales", express.static("locales"));

app.get("/cities", (req, res) => {
  try {
    cities = api.loadCSV();
    res.send(cities);
  } catch (error) {
    console.error("Error loading cities:", error);
    res.status(500).send({ error: "Error loading cities from CSV file." });
  }
});

app.post("/weather", async (req, res) => {
  try {
    const { cityName } = req.body;
    cities = api.loadCSV(); // You may want to move this outside the endpoint or cache the result for performance reasons
    const cityObj = cities.find((c) => c.city === cityName);

    if (!cityObj) {
      return res.status(404).send({ error: `City '${cityName}' not found.` });
    }

    const weatherData = await api.loadWeatherData(cityObj);
    res.send(weatherData);
  } catch (error) {
    console.error("Error retrieving weather data:", error);
    res.status(500).send({
      error: `Error retrieving weather data for city '${req.body.cityName}'.`,
    });
  }
});

app.post("/timezone", async (req, res) => {
  try {
    const { cityObj } = req.body;
    if (!cityObj || !cityObj.latitude || !cityObj.longitude) {
      return res.status(400).send({
        error: "Invalid city object. Latitude and longitude are required.",
      });
    }

    const timeZone = await api.getTimeZone(cityObj);
    res.send({ timeZone });
  } catch (error) {
    console.error("Error fetching timezone information:", error);
    res.status(500).send({ error: "Error fetching timezone information." });
  }
});

app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);
  res.status(500).send({ error: "Internal Server Error" });
});

app.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}`);
});
