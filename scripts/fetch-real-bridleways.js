/**
 * Fetch real bridleway data from OpenStreetMap Overpass API
 * Run with: node scripts/fetch-real-bridleways.js
 */

const fs = require("fs");
const path = require("path");

// County bounding boxes (format: [south, west, north, east])
const COUNTIES = {
  Worcestershire: [52.0, -2.7, 52.5, -1.8],
  Herefordshire: [51.8, -3.2, 52.3, -2.3],
  Gloucestershire: [51.5, -2.7, 52.2, -1.9],
};

// Overpass API endpoint
const OVERPASS_API = "https://overpass-api.de/api/interpreter";

async function fetchBridleways(countyName, bbox) {
  console.log(`\n📡 Fetching bridleways for ${countyName}...`);

  // Overpass QL query for bridleways, BOATs, and restricted byways
  const query = `
    [out:json][timeout:90];
    (
      way["highway"="bridleway"](${bbox[0]},${bbox[1]},${bbox[2]},${bbox[3]});
      way["highway"="byway_open_to_all_traffic"](${bbox[0]},${bbox[1]},${bbox[2]},${bbox[3]});
      way["highway"="restricted_byway"](${bbox[0]},${bbox[1]},${bbox[2]},${bbox[3]});
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
    console.log(`   ✅ Found ${data.elements.length} ways`);

    return data.elements;
  } catch (error) {
    console.error(`   ❌ Error fetching data: ${error.message}`);
    return [];
  }
}

function waysToKML(ways, countyName) {
  let kml = `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>${countyName} Bridleways - Real Data from OpenStreetMap</name>
    <description>Bridleways, BOATs, and Restricted Byways in ${countyName} extracted from OpenStreetMap</description>
    
    <Style id="bridleway">
      <LineStyle>
        <color>ff0000ff</color>
        <width>3</width>
      </LineStyle>
    </Style>
    
    <Style id="boat">
      <LineStyle>
        <color>ff00ff00</color>
        <width>3</width>
      </LineStyle>
    </Style>
    
    <Style id="restricted">
      <LineStyle>
        <color>ffffff00</color>
        <width>3</width>
      </LineStyle>
    </Style>
`;

  for (const way of ways) {
    if (!way.nodes || way.nodes.length < 2) continue;

    const tags = way.tags || {};
    const name =
      tags.name ||
      tags.ref ||
      `${countyName} ${tags.highway || "bridleway"} ${way.id}`;
    
    const description = [
      tags.highway ? `Type: ${tags.highway}` : "",
      tags.surface ? `Surface: ${tags.surface}` : "",
      tags.access ? `Access: ${tags.access}` : "",
      tags.description || "",
    ]
      .filter(Boolean)
      .join(" | ");

    const styleUrl =
      tags.highway === "byway_open_to_all_traffic"
        ? "#boat"
        : tags.highway === "restricted_byway"
        ? "#restricted"
        : "#bridleway";

    // Extract coordinates from nodes (Overpass "out geom" includes coordinates)
    const coordinates = [];
    
    // For ways with geometry, nodes contain lat/lon
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
      <styleUrl>${styleUrl}</styleUrl>
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
  console.log("🚀 Starting OpenStreetMap bridleway data fetch...\n");
  console.log("Counties: Worcestershire, Herefordshire, Gloucestershire");
  console.log("Data types: Bridleways, BOATs, Restricted Byways");
  console.log("\n⏱️  This may take 2-3 minutes per county (Overpass API rate limits)...\n");

  const allWays = [];

  for (const [countyName, bbox] of Object.entries(COUNTIES)) {
    const ways = await fetchBridleways(countyName, bbox);
    allWays.push({ county: countyName, ways });

    // Be nice to the Overpass API - wait 10 seconds between requests
    if (countyName !== "Gloucestershire") {
      console.log("   ⏳ Waiting 10 seconds before next request...");
      await new Promise((resolve) => setTimeout(resolve, 10000));
    }
  }

  console.log("\n📝 Converting to KML format...\n");

  // Save individual county KML files
  for (const { county, ways } of allWays) {
    if (ways.length === 0) {
      console.log(`   ⚠️  No data for ${county}, skipping...`);
      continue;
    }

    const kml = waysToKML(ways, county);
    const filename = `${county.toLowerCase()}_bridleways_real.kml`;
    const filepath = path.join(process.cwd(), "public", "kml", filename);

    fs.writeFileSync(filepath, kml, "utf-8");
    console.log(`   ✅ Saved ${ways.length} ways to ${filename}`);
  }

  // Create combined bridleways.kml file
  const allCombinedWays = allWays.flatMap((item) => item.ways);
  if (allCombinedWays.length > 0) {
    const combinedKML = waysToKML(allCombinedWays, "All Counties");
    const combinedPath = path.join(process.cwd(), "public", "kml", "bridleways_real.kml");
    fs.writeFileSync(combinedPath, combinedKML, "utf-8");
    console.log(`\n   ✅ Saved combined ${allCombinedWays.length} ways to bridleways_real.kml`);
  }

  // Create separate BOATs file (just the BOATs from all data)
  const boats = allCombinedWays.filter(
    (w) =>
      w.tags?.highway === "byway_open_to_all_traffic" ||
      w.tags?.highway === "restricted_byway"
  );
  if (boats.length > 0) {
    const boatsKML = waysToKML(boats, "BOATs and Restricted Byways");
    const boatsPath = path.join(process.cwd(), "public", "kml", "boats_real.kml");
    fs.writeFileSync(boatsPath, boatsKML, "utf-8");
    console.log(`   ✅ Saved ${boats.length} BOATs/Restricted Byways to boats_real.kml`);
  }

  console.log("\n🎉 Done! Real bridleway data fetched and saved.");
  console.log("\n📊 Summary:");
  console.log(`   Total ways: ${allCombinedWays.length}`);
  console.log(`   Bridleways: ${allCombinedWays.filter((w) => w.tags?.highway === "bridleway").length}`);
  console.log(`   BOATs: ${allCombinedWays.filter((w) => w.tags?.highway === "byway_open_to_all_traffic").length}`);
  console.log(`   Restricted Byways: ${allCombinedWays.filter((w) => w.tags?.highway === "restricted_byway").length}`);
  
  console.log("\n📁 Files created:");
  console.log("   - public/kml/worcestershire_bridleways_real.kml");
  console.log("   - public/kml/herefordshire_bridleways_real.kml");
  console.log("   - public/kml/gloucestershire_bridleways_real.kml");
  console.log("   - public/kml/bridleways_real.kml (combined)");
  console.log("   - public/kml/boats_real.kml");
  
  console.log("\n✅ Next steps:");
  console.log("   1. Rename bridleways_real.kml to bridleways.kml (replace the mock file)");
  console.log("   2. Rename boats_real.kml to boats.kml (replace the mock file)");
  console.log("   3. Run: npx ts-node --project tsconfig.json scripts/generate-initial-routes.ts");
  console.log("\n🐴 Happy riding!");
}

main()
  .then(() => {
    console.log("\n✅ Script completed successfully!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Fatal error:", error);
    process.exit(1);
  });

