/**
 * Convert Worcestershire KML to GeoJSON
 * Run with: node scripts/convert-worcestershire-kml.js
 */

const fs = require("fs");
const path = require("path");

const inputPath = path.join(__dirname, "..", "authorities", "Worcestershire", "original.kml");
const outputDir = path.join(__dirname, "..", "public", "kml", "worcestershire");

// Ensure output directory exists
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

console.log("Reading KML file...");
const kmlContent = fs.readFileSync(inputPath, "utf-8");

// Parse placemarks with their types
const placemarkRegex = /<Placemark>([\s\S]*?)<\/Placemark>/g;
const typeRegex = /<SimpleData name="Type">([^<]*)<\/SimpleData>/;
const parishRegex = /<SimpleData name="Parish_Nam">([^<]*)<\/SimpleData>/;
const districtRegex = /<SimpleData name="District">([^<]*)<\/SimpleData>/;
const pathNumRegex = /<SimpleData name="Path_Numbe">([^<]*)<\/SimpleData>/;
const coordsRegex = /<coordinates>([^<]*)<\/coordinates>/;

const features = {
  bridleway: [],
  footpath: [],
  restricted_byway: [],
  byway: [],
  other: [],
};

let count = 0;
let match;

console.log("Parsing placemarks...");

while ((match = placemarkRegex.exec(kmlContent)) !== null) {
  const placemark = match[1];

  // Extract data
  const typeMatch = placemark.match(typeRegex);
  const parishMatch = placemark.match(parishRegex);
  const districtMatch = placemark.match(districtRegex);
  const pathNumMatch = placemark.match(pathNumRegex);
  const coordsMatch = placemark.match(coordsRegex);

  if (!coordsMatch) continue;

  const pathType = typeMatch ? typeMatch[1].toLowerCase().replace(/\s+/g, "_") : "other";
  const parish = parishMatch ? parishMatch[1] : "";
  const district = districtMatch ? districtMatch[1] : "";
  const pathNumber = pathNumMatch ? pathNumMatch[1] : "";

  // Parse coordinates (format: "lng,lat lng,lat lng,lat")
  const coordsStr = coordsMatch[1].trim();
  const coordinates = coordsStr.split(/\s+/).map((coord) => {
    const [lng, lat] = coord.split(",").map(Number);
    return [lng, lat];
  }).filter(c => !isNaN(c[0]) && !isNaN(c[1]));

  if (coordinates.length < 2) continue;

  const feature = {
    type: "Feature",
    properties: {
      type: pathType,
      parish,
      district,
      pathNumber,
      name: `${pathNumber} - ${parish}`,
    },
    geometry: {
      type: "LineString",
      coordinates,
    },
  };

  // Categorize
  if (pathType === "bridleway") {
    features.bridleway.push(feature);
  } else if (pathType === "footpath") {
    features.footpath.push(feature);
  } else if (pathType.includes("restricted")) {
    features.restricted_byway.push(feature);
  } else if (pathType.includes("byway")) {
    features.byway.push(feature);
  } else {
    features.other.push(feature);
  }

  count++;
  if (count % 1000 === 0) {
    console.log(`  Processed ${count} paths...`);
  }
}

console.log(`\nTotal paths found: ${count}`);
console.log(`  Bridleways: ${features.bridleway.length}`);
console.log(`  Footpaths: ${features.footpath.length}`);
console.log(`  Restricted Byways: ${features.restricted_byway.length}`);
console.log(`  Byways: ${features.byway.length}`);
console.log(`  Other: ${features.other.length}`);

// Write separate files for each type
const writeGeoJSON = (name, featureList) => {
  if (featureList.length === 0) return;

  const geojson = {
    type: "FeatureCollection",
    name: `Worcestershire ${name}`,
    features: featureList,
  };

  const filename = `${name.toLowerCase().replace(/\s+/g, "_")}.json`;
  const filepath = path.join(outputDir, filename);

  fs.writeFileSync(filepath, JSON.stringify(geojson));
  console.log(`Written: ${filepath} (${featureList.length} features)`);
};

writeGeoJSON("bridleways", features.bridleway);
writeGeoJSON("footpaths", features.footpath);
writeGeoJSON("restricted_byways", features.restricted_byway);
writeGeoJSON("byways", features.byway);
writeGeoJSON("other", features.other);

// Also write a combined file with just bridleways for smaller testing
const bridlewaysOnly = {
  type: "FeatureCollection",
  name: "Worcestershire Bridleways",
  features: features.bridleway,
};
const combinedPath = path.join(outputDir, "all_paths.json");
fs.writeFileSync(combinedPath, JSON.stringify({
  type: "FeatureCollection",
  name: "Worcestershire Public Rights of Way",
  features: [
    ...features.bridleway,
    ...features.footpath,
    ...features.restricted_byway,
    ...features.byway,
    ...features.other,
  ],
}));
console.log(`\nWritten combined file: ${combinedPath}`);

console.log("\nConversion complete!");
console.log("\nNext steps:");
console.log("1. The JSON files are in public/kml/worcestershire/");
console.log("2. The map will automatically load these files");

