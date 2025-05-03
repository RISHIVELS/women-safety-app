/**
 * Utility functions for nearby services (hospitals, police stations)
 */

/**
 * Fetch nearby places from Google Places API
 * @param {Object} location - Current location coordinates
 * @param {string} type - Type of place to search for ('hospital' or 'police')
 * @param {number} radius - Search radius in meters (default: 5000)
 * @returns {Promise<Array>} - Array of nearby places
 */
export const fetchNearbyPlaces = async (location, type, radius = 5000) => {
  try {
    const { latitude, longitude } = location.coords;
    
    // Note: In a production app, you would make a real API call to Google Places API
    // This would require a valid API key and proper implementation
    // Example URL: https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${latitude},${longitude}&radius=${radius}&type=${type}&key=YOUR_API_KEY
    
    // For demo purposes, we're using mock data
    const mockPlaces = generateMockPlaces(latitude, longitude, type);
    return mockPlaces;
  } catch (error) {
    console.error('Error fetching nearby places:', error);
    throw error;
  }
};

/**
 * Generate mock place data for demo purposes
 * @param {number} latitude - Current latitude
 * @param {number} longitude - Current longitude
 * @param {string} type - Type of place ('hospital' or 'police')
 * @returns {Array} - Array of mock places
 */
export const generateMockPlaces = (latitude, longitude, type) => {
  // Generate 5-10 random places around the current location
  const places = [];
  const count = Math.floor(Math.random() * 6) + 5; // 5-10 places
  
  const placeType = type === 'police' ? 'police' : 'hospital';
  
  const namesByType = {
    police: [
      'Central Police Station',
      'City Police Department',
      'Metropolitan Police',
      'District Police Station',
      'Police Headquarters',
      'County Sheriff Office',
      'Highway Patrol Station',
      'Community Police Station',
      'Public Safety Complex',
      'Law Enforcement Center'
    ],
    hospital: [
      'General Hospital',
      'Community Medical Center',
      'Memorial Hospital',
      'University Hospital',
      'Regional Medical Center',
      'City Health Center',
      'St. Mary\'s Hospital',
      'County Medical Center',
      'Emergency Medical Center',
      'Children\'s Hospital'
    ]
  };
  
  const streets = [
    'Main Street',
    'Park Avenue', 
    'Oak Road',
    'Maple Drive',
    'Washington Blvd',
    'Lincoln Avenue',
    'Broadway',
    'Center Street',
    'Pine Road',
    'Riverside Drive'
  ];
  
  for (let i = 0; i < count; i++) {
    // Generate random offset from current location (within ~3km)
    const latOffset = (Math.random() - 0.5) * 0.03;
    const lngOffset = (Math.random() - 0.5) * 0.03;
    
    // Calculate approximate distance in km (Haversine formula simplified)
    const R = 6371; // Earth radius in km
    const dLat = latOffset;
    const dLon = lngOffset;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(latitude) * Math.cos(latitude + latOffset) * 
      Math.sin(dLon/2) * Math.sin(dLon/2); 
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
    const distance = R * c;
    
    places.push({
      id: `place-${i}`,
      name: namesByType[placeType][i % namesByType[placeType].length],
      vicinity: `${Math.floor(Math.random() * 200) + 1} ${streets[i % streets.length]}`,
      type: placeType,
      coordinates: {
        latitude: latitude + latOffset,
        longitude: longitude + lngOffset,
      },
      distance: Math.round(distance * 100) / 100, // Round to 2 decimal places
      rating: (Math.random() * 3 + 2).toFixed(1), // Random rating between 2.0 and 5.0
      open_now: Math.random() > 0.2, // 80% chance of being open
    });
  }
  
  // Sort by distance
  return places.sort((a, b) => a.distance - b.distance);
};

/**
 * Get directions URL to a place
 * @param {Object} currentLocation - Current location coordinates
 * @param {Object} destinationCoords - Destination coordinates
 * @returns {string} - URL for directions
 */
export const getDirectionsUrl = (currentLocation, destinationCoords) => {
  const { latitude: fromLat, longitude: fromLng } = currentLocation.coords;
  const { latitude: toLat, longitude: toLng } = destinationCoords;
  
  if (Platform.OS === 'ios') {
    return `maps://app?saddr=${fromLat},${fromLng}&daddr=${toLat},${toLng}`;
  } else {
    return `google.navigation:q=${toLat},${toLng}`;
  }
}; 