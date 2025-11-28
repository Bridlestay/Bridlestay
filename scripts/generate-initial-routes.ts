/**
 * Script to auto-generate initial routes from KML bridleway data
 * Run with: npx ts-node --project tsconfig.json scripts/generate-initial-routes.ts
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { join } from "path";
import {
  parseKML,
  guessCountyFromCoordinates,
  guessTerrainTags,
  guessDifficulty,
} from "../lib/routes/kml-parser";
import { calculateDistanceKm } from "../lib/routes/distance-calculator";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("❌ Missing Supabase credentials in environment");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function generateInitialRoutes() {
  console.log("🚀 Starting route generation from KML files...\n");

  const kmlFiles = [
    "bridleways.kml",
    "boats.kml",
    // "footpaths.kml", // Skip footpaths for initial generation
    // "permissive.kml", // Skip permissive for initial generation
  ];

  let totalRoutes = 0;

  for (const file of kmlFiles) {
    console.log(`📂 Processing ${file}...`);

    try {
      // Read KML file
      const kmlPath = join(process.cwd(), "public", "kml", file);
      const kmlContent = readFileSync(kmlPath, "utf-8");

      // Parse KML
      const parsedRoutes = parseKML(kmlContent);
      console.log(`   Found ${parsedRoutes.length} routes in ${file}`);

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
          owner_user_id: null, // System-generated
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
          console.log(`   ✅ Inserted ${batch.length} routes`);
          totalRoutes += batch.length;
        }
      }
    } catch (error: any) {
      console.error(`   ❌ Error processing ${file}:`, error.message);
    }

    console.log();
  }

  console.log(`\n✅ Generation complete! Created ${totalRoutes} routes.\n`);
}

// Run the script
generateInitialRoutes()
  .then(() => {
    console.log("Done!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
  });



