import { NextRequest, NextResponse } from "next/server";
import * as fs from "fs";
import * as path from "path";

// Cache for loaded path data
const pathCache: Map<string, ParsedPath[]> = new Map();
let cacheTimestamp: number = 0;
const CACHE_DURATION = 60 * 60 * 1000; // 1 hour

interface ParsedPath {
  id: string;
  name: string;
  type: "bridleway" | "footpath" | "boat" | "restricted_byway" | "unknown";
  coordinates: [number, number][]; // [lng, lat]
  bounds: {
    minLat: number;
    maxLat: number;
    minLng: number;
    maxLng: number;
  };
}

// Find all files for a given type (handles split files like footpath_1.json, footpath_2.json)
function findFilesForType(processedDir: string, type: string): string[] {
  const files: string[] = [];
  
  // Check for single file (e.g., bridleway.json)
  const singleFile = path.join(processedDir, `${type}.json`);
  if (fs.existsSync(singleFile)) {
    files.push(singleFile);
    return files;
  }
  
  // Check for split files (e.g., footpath_1.json, footpath_2.json, ...)
  let i = 1;
  while (true) {
    const splitFile = path.join(processedDir, `${type}_${i}.json`);
    if (fs.existsSync(splitFile)) {
      files.push(splitFile);
      i++;
    } else {
      break;
    }
  }
  
  return files;
}

// Load paths from pre-processed JSON files
async function loadPaths(types: string[]): Promise<ParsedPath[]> {
  const processedDir = path.join(process.cwd(), "public", "kml", "processed");
  const allPaths: ParsedPath[] = [];

  // Check if cache is valid
  const now = Date.now();
  const cacheExpired = now - cacheTimestamp > CACHE_DURATION;

  for (const type of types) {
    // Check cache first
    if (!cacheExpired && pathCache.has(type)) {
      allPaths.push(...pathCache.get(type)!);
      continue;
    }

    // Find all files for this type (handles split files)
    const files = findFilesForType(processedDir, type);
    
    if (files.length === 0) {
      console.log(`No path files found for type: ${type}`);
      continue;
    }

    const typePaths: ParsedPath[] = [];
    
    for (const filePath of files) {
      try {
        console.log(`Loading ${path.basename(filePath)}...`);
        const startTime = Date.now();
        const fileContent = fs.readFileSync(filePath, "utf-8");
        const data = JSON.parse(fileContent);
        
        if (data.features && Array.isArray(data.features)) {
          typePaths.push(...data.features);
          console.log(`Loaded ${data.features.length} paths from ${path.basename(filePath)} in ${Date.now() - startTime}ms`);
        }
      } catch (error) {
        console.error(`Error loading ${filePath}:`, error);
      }
    }
    
    if (typePaths.length > 0) {
      pathCache.set(type, typePaths);
      allPaths.push(...typePaths);
      console.log(`Total ${type} paths loaded: ${typePaths.length}`);
    }
  }

  cacheTimestamp = now;
  return allPaths;
}

// Check if path intersects with viewport
function pathIntersectsViewport(
  pathBounds: ParsedPath["bounds"],
  viewport: { north: number; south: number; east: number; west: number }
): boolean {
  return !(
    pathBounds.maxLat < viewport.south ||
    pathBounds.minLat > viewport.north ||
    pathBounds.maxLng < viewport.west ||
    pathBounds.minLng > viewport.east
  );
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    
    // Get viewport bounds
    const north = parseFloat(searchParams.get("north") || "90");
    const south = parseFloat(searchParams.get("south") || "-90");
    const east = parseFloat(searchParams.get("east") || "180");
    const west = parseFloat(searchParams.get("west") || "-180");
    
    // Get path type filter - map permissive to restricted_byway
    const typeParam = searchParams.get("type") || "";
    const requestedTypes = typeParam.split(",").filter(Boolean);
    
    // Map UI types to file types
    const typeMapping: Record<string, string> = {
      bridleway: "bridleway",
      boat: "boat",
      footpath: "footpath",
      restricted_byway: "unknown", // We don't have restricted_byway, use unknown
    };
    
    const typesToLoad = requestedTypes.length > 0 
      ? requestedTypes.map(t => typeMapping[t] || t)
      : ["bridleway", "boat", "footpath", "unknown"];
    
    // Load paths from pre-processed files
    const allPaths = await loadPaths([...new Set(typesToLoad)]);
    
    const viewport = { north, south, east, west };
    
    // Filter paths by viewport
    let filteredPaths = allPaths.filter((p) =>
      pathIntersectsViewport(p.bounds, viewport)
    );
    
    // Limit number of paths returned for performance
    const maxPaths = parseInt(searchParams.get("limit") || "2000");
    if (filteredPaths.length > maxPaths) {
      filteredPaths = filteredPaths.slice(0, maxPaths);
    }
    
    // Convert to simplified format for the client
    const features = filteredPaths.map((p) => ({
      id: p.id,
      type: p.type,
      name: p.name,
      coordinates: p.coordinates,
    }));
    
    return NextResponse.json({
      success: true,
      count: features.length,
      totalAvailable: allPaths.length,
      features,
    });
  } catch (error) {
    console.error("Error loading paths:", error);
    return NextResponse.json(
      { success: false, error: "Failed to load path data" },
      { status: 500 }
    );
  }
}

// Endpoint to get summary stats
export async function POST() {
  try {
    const processedDir = path.join(process.cwd(), "public", "kml", "processed");
    const summaryPath = path.join(processedDir, "summary.json");
    
    if (!fs.existsSync(summaryPath)) {
      return NextResponse.json({
        success: false,
        error: "Summary file not found. Run 'node scripts/process-kml.js' first.",
      }, { status: 404 });
    }
    
    const summary = JSON.parse(fs.readFileSync(summaryPath, "utf-8"));
    
    return NextResponse.json({
      success: true,
      ...summary,
    });
  } catch (error) {
    console.error("Error getting path stats:", error);
    return NextResponse.json(
      { success: false, error: "Failed to get stats" },
      { status: 500 }
    );
  }
}

