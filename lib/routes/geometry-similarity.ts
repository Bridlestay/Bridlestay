/**
 * Geometry similarity calculator for route variants.
 * Compares two route geometries and returns a similarity percentage (0-100).
 *
 * Algorithm: Sample points along both routes, then check what percentage
 * of points from Route B are within a tolerance distance of any segment
 * on Route A (and vice versa). The final score is the average of both
 * directional overlaps.
 */

// Haversine distance in metres between two points
function haversineM(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Point-to-segment distance (approximate, works for short segments)
function pointToSegmentDistance(
  px: number,
  py: number,
  ax: number,
  ay: number,
  bx: number,
  by: number
): number {
  const dx = bx - ax;
  const dy = by - ay;
  const lenSq = dx * dx + dy * dy;

  if (lenSq === 0) return haversineM(px, py, ax, ay);

  let t = ((px - ax) * dx + (py - ay) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));

  const projLat = ax + t * dx;
  const projLng = ay + t * dy;

  return haversineM(px, py, projLat, projLng);
}

// Sample N evenly-spaced points along a coordinate array
function samplePoints(
  coords: [number, number][],
  maxSamples: number
): [number, number][] {
  if (coords.length <= maxSamples) return coords;

  const result: [number, number][] = [coords[0]];
  const step = (coords.length - 1) / (maxSamples - 1);
  for (let i = 1; i < maxSamples - 1; i++) {
    result.push(coords[Math.round(i * step)]);
  }
  result.push(coords[coords.length - 1]);
  return result;
}

/**
 * Calculate what percentage of points from `testCoords` are within
 * `toleranceM` metres of any segment in `refCoords`.
 */
function directionalOverlap(
  testCoords: [number, number][],
  refCoords: [number, number][],
  toleranceM: number
): number {
  if (testCoords.length === 0) return 0;

  let matchCount = 0;

  for (const [tLng, tLat] of testCoords) {
    let minDist = Infinity;

    // Check against each segment of the reference route
    for (let i = 0; i < refCoords.length - 1; i++) {
      const [aLng, aLat] = refCoords[i];
      const [bLng, bLat] = refCoords[i + 1];

      const dist = pointToSegmentDistance(tLat, tLng, aLat, aLng, bLat, bLng);
      if (dist < minDist) {
        minDist = dist;
        if (dist <= toleranceM) break; // Early exit — already within tolerance
      }
    }

    if (minDist <= toleranceM) {
      matchCount++;
    }
  }

  return matchCount / testCoords.length;
}

/**
 * Calculate similarity between two route geometries.
 *
 * @param geometryA - GeoJSON LineString geometry { coordinates: [[lng, lat], ...] }
 * @param geometryB - GeoJSON LineString geometry { coordinates: [[lng, lat], ...] }
 * @param toleranceM - Distance tolerance in metres (default 50m)
 * @param maxSamples - Max points to sample per route (default 100)
 * @returns Similarity score 0-100 (percentage)
 */
export function calculateGeometrySimilarity(
  geometryA: { coordinates: [number, number][] },
  geometryB: { coordinates: [number, number][] },
  toleranceM = 50,
  maxSamples = 100
): number {
  const coordsA = geometryA?.coordinates || [];
  const coordsB = geometryB?.coordinates || [];

  if (coordsA.length < 2 || coordsB.length < 2) return 0;

  // Sample points for efficiency
  const sampledA = samplePoints(coordsA, maxSamples);
  const sampledB = samplePoints(coordsB, maxSamples);

  // Calculate bidirectional overlap
  const overlapAtoB = directionalOverlap(sampledA, coordsB, toleranceM);
  const overlapBtoA = directionalOverlap(sampledB, coordsA, toleranceM);

  // Average of both directions
  const similarity = ((overlapAtoB + overlapBtoA) / 2) * 100;

  return Math.round(similarity);
}

/**
 * Quick pre-filter: check if two routes' bounding boxes overlap.
 * Used to skip expensive similarity calculations for distant routes.
 */
export function boundingBoxesOverlap(
  geometryA: { coordinates: [number, number][] },
  geometryB: { coordinates: [number, number][] },
  bufferKm = 2
): boolean {
  const coordsA = geometryA?.coordinates || [];
  const coordsB = geometryB?.coordinates || [];

  if (coordsA.length === 0 || coordsB.length === 0) return false;

  const buffer = bufferKm / 111; // Rough degrees per km

  const boundsA = getBounds(coordsA);
  const boundsB = getBounds(coordsB);

  return !(
    boundsA.maxLng + buffer < boundsB.minLng - buffer ||
    boundsA.minLng - buffer > boundsB.maxLng + buffer ||
    boundsA.maxLat + buffer < boundsB.minLat - buffer ||
    boundsA.minLat - buffer > boundsB.maxLat + buffer
  );
}

function getBounds(coords: [number, number][]) {
  let minLng = Infinity,
    maxLng = -Infinity,
    minLat = Infinity,
    maxLat = -Infinity;

  for (const [lng, lat] of coords) {
    if (lng < minLng) minLng = lng;
    if (lng > maxLng) maxLng = lng;
    if (lat < minLat) minLat = lat;
    if (lat > maxLat) maxLat = lat;
  }

  return { minLng, maxLng, minLat, maxLat };
}
