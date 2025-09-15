const express = require("express");
const router = express.Router();

// POST /api/utils/resolve-location
router.post("/resolve-location", async (req, res) => {
  const { input } = req.body;
  console.log("Received input:", input);
  if (!input) return res.status(400).json({ message: "Missing input" });

  try {
    // 1. Handle direct coordinates
    const coordMatch = input.match(/(-?\d+\.\d+)[,\s]+(-?\d+\.\d+)/);
    if (coordMatch) {
      return res.json({
        lat: parseFloat(coordMatch[1]),
        lng: parseFloat(coordMatch[2]),
        method: "direct-coords"
      });
    }

    // 2. Use OpenStreetMap Nominatim geocoding service
    const { scrapeLocationCoordinates } = require("../utils/locationScraper");
    
    let locationName = input;
    if (input.startsWith("https://www.google.com/maps")) {
      // Extract location name from Google Maps URL if provided
      const urlMatch = input.match(/maps\/place\/([^\/]+)/);
      if (urlMatch) {
        locationName = decodeURIComponent(urlMatch[1].replace(/\+/g, ' '));
      }
    }
    
    const coords = await scrapeLocationCoordinates(locationName);
    
    if (coords) {
      return res.json({ ...coords, method: "nominatim-geocoding" });
    }

    return res.status(404).json({ message: "Coordinates not found for location." });
  } catch (err) {
    console.error(`Scraping error: ${err.stack}`);
    return res.status(500).json({ message: "Scraping failed", error: err.message });
  }
});

// POST /api/utils/scrape-locations - Batch location geocoding using Nominatim
router.post("/scrape-locations", async (req, res) => {
  const { locations } = req.body;
  console.log("Received locations to geocode:", locations);
  
  if (!locations || !Array.isArray(locations)) {
    return res.status(400).json({ message: "Missing or invalid locations array" });
  }

  const { scrapeLocationCoordinates } = require("../utils/locationScraper");
  const results = [];

  try {
    for (const location of locations) {
      try {
        console.log(`Geocoding location: ${location}`);
        const coords = await scrapeLocationCoordinates(location);

        results.push({
          location: location,
          coordinates: coords,
          success: coords !== null,
          method: coords ? "nominatim-geocoding" : "not-found"
        });

        // Add delay between requests to be respectful to Nominatim
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (err) {
        console.error(`Error geocoding location ${location}:`, err.message);
        results.push({
          location: location,
          coordinates: null,
          success: false,
          error: err.message
        });
      }
    }

    return res.json({
      success: true,
      results: results,
      geocoded_count: results.filter(r => r.success).length,
      total_count: results.length,
      method: "nominatim-geocoding"
    });

  } catch (err) {
    console.error(`Batch geocoding error: ${err.stack}`);
    return res.status(500).json({ message: "Batch geocoding failed", error: err.message });
  }
});

module.exports = router;
