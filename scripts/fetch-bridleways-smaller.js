/**
 * Fetch real bridleway data with SMALLER bounding boxes to avoid timeouts
 * Run with: node scripts/fetch-bridleways-smaller.js
 */

const fs = require("fs");
const path = require("path");

// Smaller bounding boxes - split each county into smaller areas
const AREAS = {
  // Worcestershire - split into 4 quadrants
  "Worcestershire North-West": [52.25, -2.7, 52.5, -2.25],
  "Worcestershire North-East": [52.25, -2.25, 52.5, -1.8],
  "Worcestershire South-West": [52.0, -2.7, 52.25, -2.25],
  "Worcestershire South-East": [52.0, -2.25, 52.25, -1.8],
  
  // Herefordshire - split into 4 quadrants
  "Herefordshire North-West": [52.05, -3.2, 52.3, -2.75],
  "Herefordshire North-East": [52.05, -2.75, 52.3, -2.3],
  "Herefordshire South-West": [51.8, -3.2, 52.05, -2.75],
  "Herefordshire South-East": [51.8, -2.75, 52.05, -2.3],
  
  // Gloucestershire - split into 4 quadrants
  "Gloucestershire North-West": [51.85, -2.7, 52.2, -2.3],
  "Gloucestershire North-East": [51.85, -2.3, 52.2, -1.9],
  "Gloucestershire South-West": [51.5, -2.7, 51.85, -2.3],
  "Gloucestershire South-East": [51.5, -2.3, 51.85, -1.9],
};

const OVERPASS_API = "https://overpass-api.de/api/interpreter";

async function fetchBridleways(areaName, bbox) {
  console.log(`\n📡 Fetching ${areaName}...`);

  // Simpler query - just bridleways first
  const query = `
    [out:json][timeout:60];
    (
      way["highway"="bridleway"](${bbox[0]},${bbox[1]},${bbox[2]},${bbox[3]});
    );
    out geom;
  `;

  try {
    const response = await fetch(OVERPASS_API, {
      method: "POST",
      body: query,
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    console.log(`   ✅ Found ${data.elements.length} bridleways`);
    return data.elements;
  } catch (error) {
    console.error(`   ❌ Error: ${error.message}`);
    return [];
  }
}

function waysToKML(ways, countyName) {
  let kml = `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>${countyName} Bridleways - OpenStreetMap Data</name>
    <description>Real bridleway data from OpenStreetMap</description>
    
    <Style id="bridleway">
      <LineStyle>
        <color>ff0000ff</color>
        <width>3</width>
      </LineStyle>
    </Style>
`;

  for (const way of ways) {
    const tags = way.tags || {};
    const name = tags.name || tags.ref || `Bridleway ${way.id}`;
    const description = tags.surface ? `Surface: ${tags.surface}` : "Bridleway";

    const coordinates = [];
    if (way.geometry) {
      for (const point of way.geometry) {
        coordinates.push(`${point.lon},${point.lat},0`);
      }
    }

    if (coordinates.length < 2) continue;

    kml += `
    <Placemark>
      <name>${escapeXML(name)}</name>
      <description>${escapeXML(description)}</description>
      <styleUrl>#bridleway</styleUrl>
      <LineString>
        <tessellate>1</tessellate>
        <coordinates>
          ${coordinates.join("\n          ")}
        </coordinates>
      </LineString>
    </Placemark>
`;
  }

  kml += `
  </Document>
</kml>`;
  return kml;
}

function escapeXML(str) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

async function main() {
  console.log("🚀 Fetching bridleway data (smaller areas to avoid timeouts)...\n");
  console.log("⏱️  ~5 seconds per area, 12 areas total (~1 minute)\n");

  const allWays = [];
  let areaCount = 0;

  for (const [areaName, bbox] of Object.entries(AREAS)) {
    areaCount++;
    const ways = await fetchBridleways(areaName, bbox);
    allWays.push(...ways);

    // Wait 5 seconds between requests
    if (areaCount < Object.keys(AREAS).length) {
      console.log("   ⏳ Waiting 5 seconds...");
      await new Promise((resolve) => setTimeout(resolve, 5000));
    }
  }

  console.log(`\n📊 Total bridleways found: ${allWays.length}`);

  if (allWays.length === 0) {
    console.log("\n❌ No data fetched. Possible issues:");
    console.log("   1. Overpass API is down");
    console.log("   2. Network connectivity issue");
    console.log("   3. Try again in a few minutes");
    return;
  }

  console.log("\n📝 Converting to KML...");

  // Group by county for individual files
  const worcestershire = allWays.filter((w) => {
    const geo = w.geometry?.[0];
    return geo && geo.lat >= 52.0 && geo.lat <= 52.5 && geo.lon >= -2.7 && geo.lon <= -1.8;
  });

  const herefordshire = allWays.filter((w) => {
    const geo = w.geometry?.[0];
    return geo && geo.lat >= 51.8 && geo.lat <= 52.3 && geo.lon >= -3.2 && geo.lon <= -2.3;
  });

  const gloucestershire = allWays.filter((w) => {
    const geo = w.geometry?.[0];
    return geo && geo.lat >= 51.5 && geo.lat <= 52.2 && geo.lon >= -2.7 && geo.lon <= -1.9;
  });

  // Save files
  const kmlDir = path.join(process.cwd(), "public", "kml");

  if (worcestershire.length > 0) {
    const kml = waysToKML(worcestershire, "Worcestershire");
    fs.writeFileSync(path.join(kmlDir, "worcestershire_bridleways_real.kml"), kml);
    console.log(`   ✅ Worcestershire: ${worcestershire.length} routes`);
  }

  if (herefordshire.length > 0) {
    const kml = waysToKML(herefordshire, "Herefordshire");
    fs.writeFileSync(path.join(kmlDir, "herefordshire_bridleways_real.kml"), kml);
    console.log(`   ✅ Herefordshire: ${herefordshire.length} routes`);
  }

  if (gloucestershire.length > 0) {
    const kml = waysToKML(gloucestershire, "Gloucestershire");
    fs.writeFileSync(path.join(kmlDir, "gloucestershire_bridleways_real.kml"), kml);
    console.log(`   ✅ Gloucestershire: ${gloucestershire.length} routes`);
  }

  // Combined file
  const combinedKML = waysToKML(allWays, "All Counties");
  fs.writeFileSync(path.join(kmlDir, "bridleways_real.kml"), combinedKML);
  console.log(`   ✅ Combined: ${allWays.length} routes`);

  // Empty boats file for now (can add later)
  const boatsKML = waysToKML([], "BOATs");
  fs.writeFileSync(path.join(kmlDir, "boats_real.kml"), boatsKML);

  console.log("\n✅ Files created:");
  console.log("   - public/kml/bridleways_real.kml");
  console.log("   - public/kml/worcestershire_bridleways_real.kml");
  console.log("   - public/kml/herefordshire_bridleways_real.kml");
  console.log("   - public/kml/gloucestershire_bridleways_real.kml");
  console.log("   - public/kml/boats_real.kml");

  console.log("\n🎉 Success! Now run:");
  console.log("   1. Replace old files (see instructions)");
  console.log("   2. Run: npx ts-node --project tsconfig.json scripts/generate-initial-routes.ts");
}

main()
  .then(() => {
    console.log("\n✅ Done!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Error:", error);
    process.exit(1);
  });

