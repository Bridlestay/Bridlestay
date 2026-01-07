/**
 * GPX Converter - Convert between GeoJSON and GPX formats
 * Allows users to download routes as GPX files for GPS devices
 */

import { calculateDistanceKm } from "./distance-calculator";

export interface GeoJSONLineString {
  type: "LineString";
  coordinates: [number, number][]; // [lng, lat]
}

export interface Waypoint {
  lat: number;
  lng: number;
  name: string;
  description?: string;
}

export interface RouteData {
  title: string;
  description?: string;
  geometry: GeoJSONLineString;
  waypoints?: Waypoint[];
}

/**
 * Convert GeoJSON route to GPX XML format
 * @param route Route data with GeoJSON geometry
 * @returns GPX XML string
 */
export function convertToGPX(route: RouteData): string {
  const { title, description, geometry, waypoints = [] } = route;
  
  // Build GPX XML
  let gpx = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="Cantra" xmlns="http://www.topografix.com/GPX/1/1">
  <metadata>
    <name>${escapeXml(title)}</name>
    ${description ? `<desc>${escapeXml(description)}</desc>` : ""}
    <time>${new Date().toISOString()}</time>
  </metadata>
`;

  // Add waypoints
  if (waypoints.length > 0) {
    waypoints.forEach((wp) => {
      gpx += `  <wpt lat="${wp.lat}" lon="${wp.lng}">
    <name>${escapeXml(wp.name)}</name>
    ${wp.description ? `<desc>${escapeXml(wp.description)}</desc>` : ""}
  </wpt>
`;
    });
  }

  // Add route track
  gpx += `  <trk>
    <name>${escapeXml(title)}</name>
    ${description ? `<desc>${escapeXml(description)}</desc>` : ""}
    <trkseg>
`;

  // Add track points from GeoJSON coordinates
  geometry.coordinates.forEach((coord) => {
    const [lng, lat] = coord;
    gpx += `      <trkpt lat="${lat}" lon="${lng}"></trkpt>
`;
  });

  gpx += `    </trkseg>
  </trk>
</gpx>`;

  return gpx;
}

/**
 * Parse GPX file to GeoJSON
 * @param gpxString GPX XML string
 * @returns Parsed route data
 */
export function parseGPX(gpxString: string): {
  title: string;
  description?: string;
  geometry: GeoJSONLineString;
  waypoints: Waypoint[];
} {
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(gpxString, "text/xml");

  // Check for parsing errors
  const parserError = xmlDoc.querySelector("parsererror");
  if (parserError) {
    throw new Error("Invalid GPX file");
  }

  // Extract metadata
  const metadata = xmlDoc.querySelector("metadata");
  const title =
    metadata?.querySelector("name")?.textContent || "Imported Route";
  const description = metadata?.querySelector("desc")?.textContent || undefined;

  // Extract waypoints
  const waypoints: Waypoint[] = [];
  const wpts = xmlDoc.querySelectorAll("wpt");
  wpts.forEach((wpt) => {
    const lat = parseFloat(wpt.getAttribute("lat") || "0");
    const lng = parseFloat(wpt.getAttribute("lon") || "0");
    const name = wpt.querySelector("name")?.textContent || "Waypoint";
    const desc = wpt.querySelector("desc")?.textContent || undefined;

    waypoints.push({ lat, lng, name, description: desc });
  });

  // Extract track points (prefer track over route)
  const coordinates: [number, number][] = [];
  
  // Try track points first
  const trkpts = xmlDoc.querySelectorAll("trkpt");
  if (trkpts.length > 0) {
    trkpts.forEach((trkpt) => {
      const lat = parseFloat(trkpt.getAttribute("lat") || "0");
      const lng = parseFloat(trkpt.getAttribute("lon") || "0");
      coordinates.push([lng, lat]); // GeoJSON is [lng, lat]
    });
  } else {
    // Fall back to route points
    const rtepts = xmlDoc.querySelectorAll("rtept");
    rtepts.forEach((rtept) => {
      const lat = parseFloat(rtept.getAttribute("lat") || "0");
      const lng = parseFloat(rtept.getAttribute("lon") || "0");
      coordinates.push([lng, lat]);
    });
  }

  if (coordinates.length < 2) {
    throw new Error("GPX file must contain at least 2 points");
  }

  return {
    title,
    description,
    geometry: {
      type: "LineString",
      coordinates,
    },
    waypoints,
  };
}

/**
 * Escape XML special characters
 */
function escapeXml(unsafe: string): string {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/**
 * Validate GeoJSON LineString geometry
 */
export function validateGeometry(geometry: any): geometry is GeoJSONLineString {
  return (
    geometry &&
    geometry.type === "LineString" &&
    Array.isArray(geometry.coordinates) &&
    geometry.coordinates.length >= 2 &&
    geometry.coordinates.every(
      (coord: any) =>
        Array.isArray(coord) &&
        coord.length === 2 &&
        typeof coord[0] === "number" &&
        typeof coord[1] === "number" &&
        coord[0] >= -180 &&
        coord[0] <= 180 && // lng
        coord[1] >= -90 &&
        coord[1] <= 90 // lat
    )
  );
}

/**
 * Calculate distance from GeoJSON LineString geometry
 * @param geometry GeoJSON LineString
 * @returns Distance in kilometers
 */
export function calculateDistanceFromGeometry(geometry: GeoJSONLineString): number {
  return calculateDistanceKm(geometry.coordinates);
}

