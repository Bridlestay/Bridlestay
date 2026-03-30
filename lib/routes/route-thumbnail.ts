/**
 * Generate a static map thumbnail URL showing the route
 * Uses Google Maps Static API
 */

// Encode coordinates for Google Maps Static API polyline
function encodePolyline(coordinates: [number, number][]): string {
  let encoded = "";
  let prevLat = 0;
  let prevLng = 0;

  for (const [lng, lat] of coordinates) {
    // Google expects lat, lng order but our coordinates are [lng, lat]
    const latE5 = Math.round(lat * 1e5);
    const lngE5 = Math.round(lng * 1e5);

    encoded += encodeSignedNumber(latE5 - prevLat);
    encoded += encodeSignedNumber(lngE5 - prevLng);

    prevLat = latE5;
    prevLng = lngE5;
  }

  return encoded;
}

function encodeSignedNumber(num: number): string {
  let sgn_num = num << 1;
  if (num < 0) {
    sgn_num = ~sgn_num;
  }
  return encodeNumber(sgn_num);
}

function encodeNumber(num: number): string {
  let encoded = "";
  while (num >= 0x20) {
    encoded += String.fromCharCode((0x20 | (num & 0x1f)) + 63);
    num >>= 5;
  }
  encoded += String.fromCharCode(num + 63);
  return encoded;
}

export interface RouteGeometry {
  type: "LineString";
  coordinates: [number, number][]; // [lng, lat][]
}

export interface RouteThumbnailOptions {
  width?: number;
  height?: number;
  routeColor?: string; // hex without #
  routeWeight?: number;
  mapType?: "roadmap" | "terrain" | "satellite" | "hybrid";
  style?: "default" | "minimal";
}

/**
 * Generate a Google Maps Static API URL for a route thumbnail
 */
export function getRouteThumbnailUrl(
  geometry: RouteGeometry | null | undefined,
  options: RouteThumbnailOptions = {}
): string | null {
  if (!geometry?.coordinates || geometry.coordinates.length < 2) {
    return null;
  }

  const {
    width = 200,
    height = 150,
    routeColor = "5E35B1", // Purple like OS Maps
    routeWeight = 4,
    mapType = "terrain",
    style = "minimal",
  } = options;

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    console.warn("Google Maps API key not found");
    return null;
  }

  // Encode the route as a polyline
  const encodedPath = encodePolyline(geometry.coordinates);
  
  // Build the URL
  const baseUrl = "https://maps.googleapis.com/maps/api/staticmap";
  const params = new URLSearchParams({
    size: `${width}x${height}`,
    maptype: mapType,
    key: apiKey,
    // Path with encoded polyline
    path: `color:0x${routeColor}|weight:${routeWeight}|enc:${encodedPath}`,
  });

  // Add minimal styling for cleaner look
  if (style === "minimal") {
    // Simplified map style - less labels, muted colors
    const styles = [
      "feature:poi|visibility:off",
      "feature:transit|visibility:off",
      "feature:road|element:labels|visibility:simplified",
      "feature:administrative|element:labels|visibility:simplified",
    ];
    styles.forEach((s) => params.append("style", s));
  }

  return `${baseUrl}?${params.toString()}`;
}

/**
 * Generate thumbnail URL from route data (handles both geometry formats)
 */
export function getRouteThumbnailFromRoute(
  route: {
    geometry?: RouteGeometry | null;
    route_geometry?: RouteGeometry | null;
  } | null,
  options?: RouteThumbnailOptions
): string | null {
  if (!route) return null;
  
  const geometry = route.geometry || route.route_geometry;
  return getRouteThumbnailUrl(geometry, options);
}

/**
 * Get a placeholder image for routes without geometry
 */
export function getRoutePlaceholderUrl(width = 200, height = 150): string {
  return `https://via.placeholder.com/${width}x${height}/e8e8e8/666666?text=No+Route`;
}

// ============================================
// MAPBOX STATIC IMAGES API
// ============================================

/**
 * Generate a Mapbox Static Images API URL for a route thumbnail
 * Mapbox uses a different polyline encoding format
 */
export function getMapboxThumbnailUrl(
  geometry: RouteGeometry | null | undefined,
  options: RouteThumbnailOptions = {}
): string | null {
  if (!geometry?.coordinates || geometry.coordinates.length < 2) {
    return null;
  }

  const {
    width = 200,
    height = 150,
    routeColor = "5E35B1", // Purple
    routeWeight = 4,
    mapType = "outdoors-v12", // Mapbox Outdoors — terrain colours
  } = options;

  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
  if (!token) {
    console.warn("Mapbox token not found");
    return null;
  }

  // Encode the route as a polyline for Mapbox
  const encodedPath = encodePolyline(geometry.coordinates);

  // Calculate bounds for auto-fit
  let minLng = Infinity, maxLng = -Infinity, minLat = Infinity, maxLat = -Infinity;
  geometry.coordinates.forEach(([lng, lat]) => {
    minLng = Math.min(minLng, lng);
    maxLng = Math.max(maxLng, lng);
    minLat = Math.min(minLat, lat);
    maxLat = Math.max(maxLat, lat);
  });

  // Add padding to bounds
  const padding = 0.01;
  const bounds = `[${minLng - padding},${minLat - padding},${maxLng + padding},${maxLat + padding}]`;

  // Mapbox Static Images URL
  // path-{strokeWidth}+{strokeColor}({encodedPolyline})
  const pathOverlay = `path-${routeWeight}+${routeColor}(${encodeURIComponent(encodedPath)})`;

  const baseUrl = "https://api.mapbox.com/styles/v1/mapbox";
  return `${baseUrl}/${mapType}/static/${pathOverlay}/auto/${width}x${height}@2x?access_token=${token}&padding=30&attribution=false&logo=false`;
}

/**
 * Get route thumbnail URL - tries Mapbox first, falls back to Google
 */
export function getRouteThumbnailUrlAuto(
  geometry: RouteGeometry | null | undefined,
  options: RouteThumbnailOptions = {}
): string | null {
  // Try Mapbox first if token is available
  if (process.env.NEXT_PUBLIC_MAPBOX_TOKEN) {
    const mapboxUrl = getMapboxThumbnailUrl(geometry, options);
    if (mapboxUrl) return mapboxUrl;
  }
  
  // Fall back to Google Maps
  return getRouteThumbnailUrl(geometry, options);
}

