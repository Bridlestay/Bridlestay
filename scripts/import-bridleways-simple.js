/**
 * SIMPLE BRIDLEWAY IMPORT
 * No complex streaming, just straightforward parsing
 */

require('dotenv').config({ path: '.env.local' });
const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

const KML_FILE = './augmented.kml';
const MIN_DISTANCE_KM = 0.1;

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

let imported = 0;
let skipped = 0;

// Calculate distance
function calculateDistance(coords) {
  if (!coords || coords.length < 2) return 0;
  
  let total = 0;
  for (let i = 1; i < coords.length; i++) {
    const [lon1, lat1] = coords[i - 1];
    const [lon2, lat2] = coords[i];
    
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    total += R * c;
  }
  return total;
}

// Get difficulty
function getDifficulty(distanceKm) {
  if (distanceKm >= 12) return 'hard';
  if (distanceKm >= 5) return 'medium';
  return 'easy';
}

// Detect county
function detectCounty(name) {
  const n = name.toLowerCase();
  if (n.includes('worcester')) return 'Worcestershire';
  if (n.includes('hereford')) return 'Herefordshire';
  if (n.includes('glouc')) return 'Gloucestershire';
  if (n.includes('powys') || n.includes('brecon')) return 'Powys';
  return 'Wales';
}

// Process route
async function processRoute(name, coordsText) {
  try {
    // Parse coordinates
    const lines = coordsText.trim().split('\n');
    const coords = [];
    
    for (const line of lines) {
      const parts = line.trim().split(',');
      if (parts.length >= 2) {
        const lon = parseFloat(parts[0]);
        const lat = parseFloat(parts[1]);
        if (!isNaN(lon) && !isNaN(lat)) {
          coords.push([lon, lat]);
        }
      }
    }
    
    if (coords.length < 2) {
      skipped++;
      return;
    }
    
    const distance = calculateDistance(coords);
    
    if (distance < MIN_DISTANCE_KM) {
      skipped++;
      return;
    }
    
    const difficulty = getDifficulty(distance);
    const county = detectCounty(name);
    
    const geometry = {
      type: 'LineString',
      coordinates: coords
    };
    
    const { error } = await supabase
      .from('routes')
      .insert({
        title: name || `Bridleway ${imported + 1}`,
        description: `A ${difficulty} ${distance.toFixed(2)}km bridleway in ${county}`,
        difficulty,
        distance_km: distance,
        terrain_tags: ['bridleway'],
        geometry,
        county,
        is_public: true,
        owner_user_id: null,
      });
    
    if (error) {
      console.error(`Error: ${error.message}`);
      skipped++;
      return;
    }
    
    imported++;
    
    if (imported % 50 === 0) {
      console.log(`✅ Imported: ${imported} | ❌ Skipped: ${skipped}`);
    }
  } catch (error) {
    console.error(`Process error: ${error.message}`);
    skipped++;
  }
}

// Main function
async function importRoutes() {
  console.log('\n🗺️  SIMPLE BRIDLEWAY IMPORT');
  console.log('='.repeat(60));
  
  if (!fs.existsSync(KML_FILE)) {
    console.error(`❌ File not found: ${KML_FILE}`);
    process.exit(1);
  }
  
  console.log('📖 Reading KML file...\n');
  const kml = fs.readFileSync(KML_FILE, 'utf8');
  
  console.log('🔍 Extracting bridleways...\n');
  
  // Simple regex to extract Placemarks with Bridleway styleUrl
  const placemarkRegex = /<Placemark>(.*?)<\/Placemark>/gs;
  const nameRegex = /<name>(.*?)<\/name>/s;
  const styleRegex = /<styleUrl>(.*?)<\/styleUrl>/s;
  const coordsRegex = /<coordinates>(.*?)<\/coordinates>/s;
  
  const matches = kml.matchAll(placemarkRegex);
  
  for (const match of matches) {
    const placemark = match[1];
    
    // Check if it's a Bridleway
    const styleMatch = placemark.match(styleRegex);
    if (!styleMatch || !styleMatch[1].includes('Bridleway')) {
      skipped++;
      continue;
    }
    
    // Extract name
    const nameMatch = placemark.match(nameRegex);
    const name = nameMatch ? nameMatch[1].trim() : 'Unnamed Bridleway';
    
    // Extract coordinates
    const coordsMatch = placemark.match(coordsRegex);
    if (!coordsMatch) {
      skipped++;
      continue;
    }
    
    await processRoute(name, coordsMatch[1]);
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('🎉 IMPORT COMPLETE!');
  console.log('='.repeat(60));
  console.log(`✅ Imported: ${imported} routes`);
  console.log(`❌ Skipped: ${skipped} routes`);
  console.log('='.repeat(60));
  
  // Final stats
  const { data: routes } = await supabase
    .from('routes')
    .select('difficulty, distance_km');
  
  if (routes) {
    const diffCounts = { easy: 0, medium: 0, hard: 0 };
    routes.forEach(r => {
      diffCounts[r.difficulty] = (diffCounts[r.difficulty] || 0) + 1;
    });
    
    console.log('\n📊 Database Statistics:');
    console.log(`   Total: ${routes.length} routes`);
    console.log(`   Easy: ${diffCounts.easy}`);
    console.log(`   Medium: ${diffCounts.medium}`);
    console.log(`   Hard: ${diffCounts.hard}`);
  }
  
  console.log('\n✅ Done!\n');
}

importRoutes()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('\n❌ Fatal error:', error);
    process.exit(1);
  });

