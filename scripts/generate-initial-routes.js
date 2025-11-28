/**
 * Script to auto-generate initial routes from KML bridleway data
 * Run with: node scripts/generate-initial-routes.js
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");
const path = require("path");
const xml2js = require("xml2js");

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("❌ Missing Supabase credentials in .env.local");
  console.error("   NEXT_PUBLIC_SUPABASE_URL:", SUPABASE_URL ? "✅" : "❌");
  console.error("   SUPABASE_SERVICE_ROLE_KEY:", SUPABASE_SERVICE_ROLE_KEY ? "✅" : "❌");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// Parse KML file
function parseKML(kmlContent) {
  const routes = [];
  const parser = new xml2js.Parser();
  
  parser.parseString(kmlContent, (err, result) => {
    if (err) throw err;
    
    const placemarks = result?.kml?.Document?.[0]?.Placemark || [];
    
    for (const placemark of placemarks) {
      const name = placemark.name?.[0] || "Unnamed Route";
      const description = placemark.description?.[0] || "";
      const coordString = placemark.LineString?.[0]?.coordinates?.[0] || "";
      
      if (!coordString.trim()) continue;
      
      const coordinates = coordString
        .trim()
        .split(/\s+/)
        .map(coord => {
          const [lng, lat, alt] = coord.split(',').map(Number);
          return [lng, lat];
        })
        .filter(coord => !isNaN(coord[0]) && !isNaN(coord[1]));
      
      if (coordinates.length >= 2) {
        routes.push({ name, description, coordinates });
      }
    }
  });
  
  return routes;
}

// Calculate distance using Haversine formula
function calculateDistanceKm(coordinates) {
  let totalDistance = 0;
  
  for (let i = 0; i < coordinates.length - 1; i++) {
    const [lon1, lat1] = coordinates[i];
    const [lon2, lat2] = coordinates[i + 1];
    
    const R = 6371; // Earth radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    totalDistance += R * c;
  }
  
  return totalDistance;
}

// Guess county from coordinates
function guessCountyFromCoordinates(coordinates) {
  if (!coordinates || coordinates.length === 0) return "Unknown";
  
  const [lng, lat] = coordinates[0];
  
  // Worcestershire: roughly 52.0-52.5N, -2.7 to -1.8W
  if (lat >= 52.0 && lat <= 52.5 && lng >= -2.7 && lng <= -1.8) {
    return "Worcestershire";
  }
  
  // Herefordshire: roughly 51.8-52.3N, -3.2 to -2.3W
  if (lat >= 51.8 && lat <= 52.3 && lng >= -3.2 && lng <= -2.3) {
    return "Herefordshire";
  }
  
  // Gloucestershire: roughly 51.5-52.2N, -2.7 to -1.9W
  if (lat >= 51.5 && lat <= 52.2 && lng >= -2.7 && lng <= -1.9) {
    return "Gloucestershire";
  }
  
  return "Unknown";
}

// Guess terrain tags
function guessTerrainTags(name, description) {
  const text = `${name} ${description}`.toLowerCase();
  const tags = [];
  
  if (text.includes("hill") || text.includes("ridge")) tags.push("hill");
  if (text.includes("forest") || text.includes("woodland")) tags.push("forest");
  if (text.includes("valley")) tags.push("valley");
  if (text.includes("river") || text.includes("water")) tags.push("riverside");
  if (text.includes("moor")) tags.push("moorland");
  if (text.includes("coast")) tags.push("coastal");
  if (text.includes("village") || text.includes("town")) tags.push("village");
  if (text.includes("country")) tags.push("countryside");
  
  if (tags.length === 0) tags.push("bridleway");
  
  return tags;
}

// Guess difficulty
function guessDifficulty(distanceKm, name) {
  const text = name.toLowerCase();
  
  // Check for difficulty hints in name
  if (text.includes("easy") || text.includes("flat") || text.includes("gentle")) {
    return "easy";
  }
  if (text.includes("hard") || text.includes("challenging") || text.includes("steep")) {
    return "hard";
  }
  
  // Base on distance
  if (distanceKm < 5) return "easy";
  if (distanceKm < 15) return "medium";
  return "hard";
}

async function generateInitialRoutes() {
  console.log("🚀 Starting route generation from KML files...\n");

  const kmlFiles = ["bridleways.kml", "boats.kml"];
  let totalRoutes = 0;

  for (const file of kmlFiles) {
    console.log(`📂 Processing ${file}...`);

    try {
      // Read KML file
      const kmlPath = path.join(process.cwd(), "public", "kml", file);
      const kmlContent = fs.readFileSync(kmlPath, "utf-8");

      // Parse KML
      const parsedRoutes = parseKML(kmlContent);
      console.log(`   Found ${parsedRoutes.length} routes in ${file}`);

      if (parsedRoutes.length === 0) {
        console.log(`   ⚠️  No routes found, skipping...`);
        continue;
      }

      // Convert to database format
      const routes = parsedRoutes.map((route) => {
        const geometry = {
          type: "LineString",
          coordinates: route.coordinates,
        };

        const distanceKm = calculateDistanceKm(route.coordinates);
        const county = guessCountyFromCoordinates(route.coordinates);
        const terrainTags = guessTerrainTags(route.name, route.description);
        const difficulty = guessDifficulty(distanceKm, route.name);

        // Calculate estimated duration (average 4 km/h on horseback)
        const estimatedDurationMinutes = Math.round((distanceKm / 4) * 60);

        return {
          title: route.name,
          description: route.description || `A ${difficulty} bridleway route in ${county}`,
          county,
          distance_km: distanceKm,
          terrain_tags: terrainTags,
          difficulty,
          surface: "mixed",
          geometry,
          is_public: true,
          featured: false,
          owner_user_id: null,
          estimated_duration_minutes: estimatedDurationMinutes,
          condition: "good",
        };
      });

      // Insert routes in batches of 100
      const batchSize = 100;
      for (let i = 0; i < routes.length; i += batchSize) {
        const batch = routes.slice(i, i + batchSize);

        const { error } = await supabase.from("routes").insert(batch);

        if (error) {
          console.error(`   ❌ Error inserting batch: ${error.message}`);
        } else {
          console.log(`   ✅ Inserted ${batch.length} routes (Total so far: ${totalRoutes + batch.length})`);
          totalRoutes += batch.length;
        }
      }
    } catch (error) {
      console.error(`   ❌ Error processing ${file}:`, error.message);
    }

    console.log();
  }

  console.log(`\n🎉 Generation complete! Created ${totalRoutes} routes.\n`);
}

// Run the script
generateInitialRoutes()
  .then(() => {
    console.log("✅ Done!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Fatal error:", error);
    process.exit(1);
  });

