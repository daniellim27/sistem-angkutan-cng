// Simple location geocoder using OpenStreetMap Nominatim (free, no API key needed)
const axios = require('axios');
const logger = require('./logger');

/**
 * Get coordinates using OpenStreetMap Nominatim geocoding service
 * @param {string} locationName - The location name to search for
 * @returns {Promise<{lat: number, lng: number} | null>} - Coordinates or null if not found
 */
async function scrapeLocationCoordinates(locationName) {
  try {
    logger.info(`Geocoding location: ${locationName}`);
    
    // Use OpenStreetMap Nominatim geocoding service (free, no API key needed)
    const nominatimUrl = `https://nominatim.openstreetmap.org/search`;
    const params = {
      q: locationName,
      format: 'json',
      limit: 1,
      addressdetails: 1,
      extratags: 1,
      namedetails: 1
    };
    
    logger.debug(`Requesting geocoding for: ${locationName}`);
    
    const response = await axios.get(nominatimUrl, {
      params,
      headers: {
        'User-Agent': 'CNG-Transport-System/1.0 (contact: admin@example.com)', // Required by Nominatim
        'Accept': 'application/json',
        'Accept-Language': 'id,en-US,en;q=0.9', // Prefer Indonesian results
      },
      timeout: 15000
    });

    if (response.data && response.data.length > 0) {
      const result = response.data[0];
      const coords = {
        lat: parseFloat(result.lat),
        lng: parseFloat(result.lon)
      };
      
      logger.info(`Found coordinates via Nominatim for ${locationName}: ${coords.lat}, ${coords.lng}`);
      logger.debug(`Geocode details`, {
        displayName: result.display_name,
        placeType: result.type || 'unknown',
        placeClass: result.class || 'N/A'
      });
      
      return coords;
    }
    
    logger.warn(`No geocoding results for: ${locationName}`);
    return null;
    
  } catch (error) {
    console.error(`❌ Error geocoding location ${locationName}:`, error.message);
    return null;
  }
}

/**
 * Scrape coordinates for multiple locations
 * @param {Array<{type: string, location: string, index?: number}>} locations - Array of location objects
 * @returns {Promise<Object>} - Object with scraped coordinates
 */
async function scrapeMultipleLocations(locations) {
  logger.info(`Starting batch scraping for ${locations.length} locations`);
  
  const results = {
    load: { lat: null, lng: null },
    unload: { lat: null, lng: null },
    additional: []
  };
  
  for (const locationData of locations) {
    const coords = await scrapeLocationCoordinates(locationData.location);
    
    if (coords) {
      if (locationData.type === 'load') {
        results.load = coords;
      } else if (locationData.type === 'unload') {
        results.unload = coords;
      } else if (locationData.type === 'additional_unload') {
        const locationObj = {
          location: locationData.location,
          latitude: coords.lat,
          longitude: coords.lng
        };
        
        if (locationData.index !== undefined) {
          results.additional[locationData.index] = locationObj;
        } else {
          results.additional.push(locationObj);
        }
      }
    }
    
    // Add a 2-second delay between requests to be respectful to the service
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  logger.info(`Batch scraping completed for ${locations.length} locations`);
  logger.debug('Batch scraping results:', results);
  return results;
}

module.exports = {
  scrapeLocationCoordinates,
  scrapeMultipleLocations
};
