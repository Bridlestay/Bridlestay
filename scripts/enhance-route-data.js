/**
 * Script to enhance route data with better names and placeholder images
 * Run with: node scripts/enhance-route-data.js
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require("@supabase/supabase-js");

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("❌ Missing Supabase credentials");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// Terrain-specific placeholder images from Unsplash
const PLACEHOLDER_IMAGES = {
  hill: [
    "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80", // Mountain hills
    "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=800&q=80", // Rolling hills
    "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80",
  ],
  forest: [
    "https://images.unsplash.com/photo-1511497584788-876760111969?w=800&q=80", // Forest path
    "https://images.unsplash.com/photo-1542273917363-3b1817f69a2d?w=800&q=80", // Woodland
    "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=800&q=80",
  ],
  riverside: [
    "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80", // River valley
    "https://images.unsplash.com/photo-1500534623283-312aade485b7?w=800&q=80", // Lake
  ],
  countryside: [
    "https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=800&q=80", // Green fields
    "https://images.unsplash.com/photo-1472214103451-9374bd1c798e?w=800&q=80", // Rolling countryside
  ],
  moorland: [
    "https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=800&q=80", // Moorland
    "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80",
  ],
  bridleway: [
    "https://images.unsplash.com/photo-1553284966-19b8815c7817?w=800&q=80", // Horse riding path
    "https://images.unsplash.com/photo-1472214103451-9374bd1c798e?w=800&q=80", // Trail
    "https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=800&q=80",
  ],
};

// Generate better route names based on location and characteristics
function generateRouteName(route) {
  const { county, distance_km, difficulty, terrain_tags } = route;
  
  // Get primary terrain
  const primaryTerrain = terrain_tags?.[0] || "bridleway";
  
  // Calculate approximate number to make names feel official
  const routeNumber = Math.floor(Math.random() * 999) + 100;
  
  // Generate descriptive name
  const terrainDescriptors = {
    hill: ["Hills", "Ridge", "Summit"],
    forest: ["Woods", "Forest", "Woodland"],
    riverside: ["River", "Waterside", "Creek"],
    countryside: ["Fields", "Meadows", "Parkland"],
    moorland: ["Moor", "Heath", "Commons"],
    valley: ["Valley", "Dale", "Glen"],
    village: ["Village", "Green", "Square"],
    bridleway: ["Trail", "Path", "Route"],
  };
  
  const descriptor = terrainDescriptors[primaryTerrain]?.[Math.floor(Math.random() * 3)] || "Trail";
  
  // Distance-based length descriptor
  const lengthDesc = distance_km < 5 ? "Short" : distance_km < 10 ? "Scenic" : distance_km < 20 ? "Long" : "Extended";
  
  // Combine to make official-sounding name
  const names = [
    `${county} ${descriptor} ${routeNumber}`,
    `${lengthDesc} ${county} ${descriptor}`,
    `${county} ${descriptor} Loop`,
    `${county} Bridleway ${routeNumber}`,
  ];
  
  return names[Math.floor(Math.random() * names.length)];
}

// Get placeholder image based on terrain
function getPlaceholderImage(terrainTags) {
  if (!terrainTags || terrainTags.length === 0) {
    terrainTags = ["bridleway"];
  }
  
  const primaryTerrain = terrainTags[0];
  const images = PLACEHOLDER_IMAGES[primaryTerrain] || PLACEHOLDER_IMAGES.bridleway;
  
  return images[Math.floor(Math.random() * images.length)];
}

async function enhanceRouteData() {
  console.log("🚀 Enhancing route data with better names and images...\n");

  try {
    // Fetch all routes that need enhancement
    const { data: routes, error } = await supabase
      .from("routes")
      .select("*")
      .is("owner_user_id", null) // Only system routes
      .order("created_at", { ascending: true });

    if (error) throw error;

    console.log(`Found ${routes.length} system routes to enhance`);

    let updated = 0;
    let photosAdded = 0;

    // Process each route
    for (const route of routes) {
      const updates = {};
      
      // Generate better name if needed
      if (!route.title || route.title.includes("Unnamed") || route.title.match(/^(Route|Bridleway) \d+$/)) {
        updates.title = generateRouteName(route);
      }
      
      // Update route if needed
      if (Object.keys(updates).length > 0) {
        const { error: updateError } = await supabase
          .from("routes")
          .update(updates)
          .eq("id", route.id);
        
        if (!updateError) {
          updated++;
          console.log(`✅ Updated: ${updates.title || route.title}`);
        }
      }
      
      // Check if route already has photos
      const { data: existingPhotos } = await supabase
        .from("route_photos")
        .select("id")
        .eq("route_id", route.id);
      
      // Add placeholder image if none exists
      if (!existingPhotos || existingPhotos.length === 0) {
        const placeholderUrl = getPlaceholderImage(route.terrain_tags);
        
        const { error: photoError } = await supabase
          .from("route_photos")
          .insert({
            route_id: route.id,
            url: placeholderUrl,
            caption: `${route.county || 'Local'} bridleway scenery`,
            order_index: 0,
            is_main: true,
          });
        
        if (!photoError) {
          photosAdded++;
        }
      }
    }

    console.log(`\n🎉 Enhancement complete!`);
    console.log(`   📝 ${updated} routes renamed`);
    console.log(`   🖼️  ${photosAdded} placeholder photos added`);
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
}

// Run the script
enhanceRouteData()
  .then(() => {
    console.log("\n✅ Done!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Fatal error:", error);
    process.exit(1);
  });

