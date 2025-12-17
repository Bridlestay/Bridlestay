/**
 * Geocode a UK postcode to get approximate latitude/longitude
 * Uses postcodes.io API which is free and doesn't require an API key
 */
export interface GeocodeResult {
  latitude: number;
  longitude: number;
  region?: string;
  admin_district?: string;
}

export async function geocodeUKPostcode(postcode: string): Promise<GeocodeResult | null> {
  try {
    // Clean up postcode - remove spaces and convert to uppercase
    const cleanPostcode = postcode.replace(/\s+/g, '').toUpperCase();
    
    const response = await fetch(`https://api.postcodes.io/postcodes/${encodeURIComponent(cleanPostcode)}`);
    
    if (!response.ok) {
      console.error('Geocoding failed:', response.status);
      return null;
    }
    
    const data = await response.json();
    
    if (data.status !== 200 || !data.result) {
      console.error('Invalid postcode response:', data);
      return null;
    }
    
    return {
      latitude: data.result.latitude,
      longitude: data.result.longitude,
      region: data.result.region,
      admin_district: data.result.admin_district,
    };
  } catch (error) {
    console.error('Geocoding error:', error);
    return null;
  }
}

/**
 * Add random offset to coordinates for privacy (approx 500m - 1km radius)
 * This prevents exact property location from being revealed
 */
export function addPrivacyOffset(lat: number, lng: number): { latitude: number; longitude: number } {
  // Random offset between 0.005 and 0.01 degrees (roughly 500m - 1km)
  const latOffset = (Math.random() - 0.5) * 0.015;
  const lngOffset = (Math.random() - 0.5) * 0.02; // lng degrees are smaller at UK latitudes
  
  return {
    latitude: Math.round((lat + latOffset) * 10000) / 10000, // Round to 4 decimal places
    longitude: Math.round((lng + lngOffset) * 10000) / 10000,
  };
}

