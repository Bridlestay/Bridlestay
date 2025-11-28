/**
 * Calculate distance of a route using Haversine formula
 */

/**
 * Calculate distance between two points on Earth (Haversine formula)
 * @param lat1 Latitude of point 1 (degrees)
 * @param lng1 Longitude of point 1 (degrees)
 * @param lat2 Latitude of point 2 (degrees)
 * @param lng2 Longitude of point 2 (degrees)
 * @returns Distance in kilometers
 */
export function haversineDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371; // Earth's radius in km
  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Convert degrees to radians
 */
function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Calculate total distance of a route from coordinate array
 * @param coordinates Array of [lng, lat] pairs
 * @returns Total distance in kilometers
 */
export function calculateDistanceKm(coordinates: [number, number][]): number {
  if (coordinates.length < 2) return 0;

  let totalDistance = 0;

  for (let i = 0; i < coordinates.length - 1; i++) {
    const [lng1, lat1] = coordinates[i];
    const [lng2, lat2] = coordinates[i + 1];

    totalDistance += haversineDistance(lat1, lng1, lat2, lng2);
  }

  return Number(totalDistance.toFixed(2));
}

/**
 * Calculate distance from a GeoJSON LineString geometry
 * @param geometry GeoJSON LineString object
 * @returns Distance in kilometers
 */
export function calculateDistanceFromGeometry(geometry: any): number {
  if (geometry.type !== "LineString" || !geometry.coordinates) {
    return 0;
  }

  return calculateDistanceKm(geometry.coordinates);
}
