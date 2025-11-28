/**
 * Script to add placeholder photos to routes
 * Run with: node scripts/add-route-photos.js
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

// High-quality placeholder images from Unsplash (horse riding & countryside themed)
const PLACEHOLDER_IMAGES = [
  "https://images.unsplash.com/photo-1553284966-19b8815c7817?w=1200&q=80", // Horse on trail
  "https://images.unsplash.com/photo-1472214103451-9374bd1c798e?w=1200&q=80", // Country path
  "https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=1200&q=80", // Green fields
  "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1200&q=80", // Mountain landscape
  "https://images.unsplash.com/photo-1511497584788-876760111969?w=1200&q=80", // Forest path
  "https://images.unsplash.com/photo-1542273917363-3b1817f69a2d?w=1200&q=80", // Woodland trail
  "https://images.unsplash.com/photo-1500534623283-312aade485b7?w=1200&q=80", // Lake view
  "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=1200&q=80", // Forest hills
  "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=1200&q=80", // Rolling hills
  "https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=1200&q=80", // Moorland
];

function getRandomImage() {
  return PLACEHOLDER_IMAGES[Math.floor(Math.random() * PLACEHOLDER_IMAGES.length)];
}

async function addRoutePhotos() {
  console.log("🖼️  Adding placeholder photos to routes...\n");

  try {
    // Fetch all system routes
    const { data: routes, error } = await supabase
      .from("routes")
      .select("id, title, county")
      .is("owner_user_id", null)
      .order("created_at", { ascending: true });

    if (error) throw error;

    console.log(`Found ${routes.length} system routes`);

    let added = 0;
    let skipped = 0;
    const batchSize = 50;

    for (let i = 0; i < routes.length; i += batchSize) {
      const batch = routes.slice(i, i + batchSize);
      const photos = [];

      for (const route of batch) {
        // Check if route already has photos
        const { data: existing } = await supabase
          .from("route_photos")
          .select("id")
          .eq("route_id", route.id)
          .limit(1);

        if (existing && existing.length > 0) {
          skipped++;
          continue;
        }

        // Add a placeholder photo
        photos.push({
          route_id: route.id,
          url: getRandomImage(),
          caption: `Scenic ${route.county || 'countryside'} bridleway`,
          order_index: 0,
        });
      }

      if (photos.length > 0) {
        const { error: photoError } = await supabase
          .from("route_photos")
          .insert(photos);

        if (photoError) {
          console.error(`❌ Error inserting batch: ${photoError.message}`);
        } else {
          added += photos.length;
          console.log(`✅ Added ${photos.length} photos (Total: ${added})`);
        }
      }
    }

    console.log(`\n🎉 Complete!`);
    console.log(`   ✅ ${added} photos added`);
    console.log(`   ⏭️  ${skipped} routes already had photos`);
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
}

// Run the script
addRoutePhotos()
  .then(() => {
    console.log("\n✅ Done!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Fatal error:", error);
    process.exit(1);
  });

