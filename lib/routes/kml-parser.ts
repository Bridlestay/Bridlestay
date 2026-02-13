/**
 * KML Parser - Extract routes from KML files
 * Used to auto-generate initial routes from bridleway KML data
 */

export interface ParsedKMLRoute {
  name: string;
  description: string;
  coordinates: [number, number, number?][]; // [lng, lat, altitude?]
}

/**
 * Parse KML file and extract LineString/Path geometries
 * @param kmlString KML XML string
 * @returns Array of parsed routes
 */
export function parseKML(kmlString: string): ParsedKMLRoute[] {
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(kmlString, "text/xml");

  // Check for parsing errors
  const parserError = xmlDoc.querySelector("parsererror");
  if (parserError) {
    throw new Error("Invalid KML file");
  }

  const routes: ParsedKMLRoute[] = [];
  
  // Find all Placemark elements (these contain the routes)
  const placemarks = xmlDoc.querySelectorAll("Placemark");
  
  placemarks.forEach((placemark) => {
    // Extract name and description
    const name = placemark.querySelector("name")?.textContent || "Unnamed Route";
    const description = placemark.querySelector("description")?.textContent || "";
    
    // Extract coordinates from LineString
    const lineString = placemark.querySelector("LineString coordinates");
    
    if (lineString && lineString.textContent) {
      const coordinates = parseCoordinates(lineString.textContent);
      
      if (coordinates.length >= 2) {
        routes.push({
          name,
          description,
          coordinates,
        });
      }
    }
  });

  return routes;
}

/**
 * Parse KML coordinate string to array of [lng, lat, altitude?] tuples
 * KML format: "lng,lat,alt lng,lat,alt ..."
 */
function parseCoordinates(coordString: string): [number, number, number?][] {
  return coordString
    .trim()
    .split(/\s+/)
    .map((coord) => {
      const parts = coord.split(",").map(parseFloat);
      const [lng, lat, alt] = parts;
      if (alt !== undefined && !isNaN(alt)) {
        return [lng, lat, alt] as [number, number, number];
      }
      return [lng, lat] as [number, number];
    })
    .filter((c) => !isNaN(c[0]) && !isNaN(c[1]));
}

/**
 * Load and parse KML file from URL
 * @param url URL to KML file
 * @returns Parsed routes
 */
export async function loadKMLFromURL(url: string): Promise<ParsedKMLRoute[]> {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to load KML: ${response.statusText}`);
    }
    
    const kmlString = await response.text();
    return parseKML(kmlString);
  } catch (error) {
    console.error("Error loading KML:", error);
    return [];
  }
}

/**
 * Determine county from coordinates (simple heuristic for UK)
 * @param coordinates Route coordinates
 * @returns Likely county name
 */
export function guessCountyFromCoordinates(
  coordinates: [number, number][]
): string {
  if (coordinates.length === 0) return "Unknown";
  
  // Get center point of route
  const avgLng = coordinates.reduce((sum, c) => sum + c[0], 0) / coordinates.length;
  const avgLat = coordinates.reduce((sum, c) => sum + c[1], 0) / coordinates.length;
  
  // Simple bounding box heuristics for the 3 counties
  // Worcestershire: roughly -2.4 to -1.8 lng, 51.9 to 52.4 lat
  // Herefordshire: roughly -3.1 to -2.3 lng, 51.8 to 52.4 lat
  // Gloucestershire: roughly -2.7 to -1.5 lng, 51.5 to 52.1 lat
  
  if (avgLng >= -2.4 && avgLng <= -1.8 && avgLat >= 51.9 && avgLat <= 52.4) {
    return "Worcestershire";
  } else if (avgLng >= -3.1 && avgLng <= -2.3 && avgLat >= 51.8 && avgLat <= 52.4) {
    return "Herefordshire";
  } else if (avgLng >= -2.7 && avgLng <= -1.5 && avgLat >= 51.5 && avgLat <= 52.1) {
    return "Gloucestershire";
  }
  
  return "Unknown";
}

/**
 * Determine terrain tags from route name/description
 * @param name Route name
 * @param description Route description
 * @returns Array of terrain tags
 */
export function guessTerrainTags(name: string, description: string): string[] {
  const text = `${name} ${description}`.toLowerCase();
  const tags: string[] = [];
  
  if (text.includes("forest") || text.includes("woodland")) tags.push("forest");
  if (text.includes("hill") || text.includes("ridge")) tags.push("hill");
  if (text.includes("valley") || text.includes("vale")) tags.push("valley");
  if (text.includes("river") || text.includes("stream")) tags.push("riverside");
  if (text.includes("moor") || text.includes("moorland")) tags.push("moorland");
  if (text.includes("coast") || text.includes("beach")) tags.push("coastal");
  if (text.includes("park") || text.includes("estate")) tags.push("parkland");
  if (text.includes("village") || text.includes("town")) tags.push("village");
  
  return tags.length > 0 ? tags : ["countryside"];
}

/**
 * Determine difficulty from distance and name
 * @param distanceKm Route distance in km
 * @param name Route name
 * @returns Difficulty level
 */
export function guessDifficulty(distanceKm: number, name: string): "easy" | "medium" | "hard" {
  const nameLower = name.toLowerCase();
  
  // Check for difficulty hints in name
  if (nameLower.includes("easy") || nameLower.includes("gentle")) return "easy";
  if (nameLower.includes("challenging") || nameLower.includes("difficult")) return "hard";
  if (nameLower.includes("steep") || nameLower.includes("mountain")) return "hard";
  
  // Heuristic based on distance
  if (distanceKm < 5) return "easy";
  if (distanceKm < 15) return "medium";
  return "hard";
}



