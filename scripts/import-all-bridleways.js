/**
 * STREAMLINED BRIDLEWAY IMPORT
 * 
 * - No photos (users will add them after launch)
 * - Distance-based difficulty (fast & reliable)
 * - Routes from 0.1km+ (comprehensive coverage)
 * - Processes entire KML file quickly
 */

require('dotenv').config({ path: '.env.local' });
const fs = require('fs');
const sax = require('sax');
const { createClient } = require('@supabase/supabase-js');

const KML_FILE_PATH = process.argv[2] || './augmented.kml';
const MIN_ROUTE_LENGTH_KM = 0.1; // 100m minimum

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

let totalProcessed = 0;
let successfulRoutes = 0;
let filteredOut = 0;
let currentPlacemark = null;
let currentText = '';

// Detect county from route name/location
function detectCounty(routeName, coordinates) {
  const name = routeName.toLowerCase();
  
  // Check name first
  if (name.includes('worcester')) return 'Worcestershire';
  if (name.includes('hereford')) return 'Herefordshire';
  if (name.includes('glouc')) return 'Gloucestershire';
  if (name.includes('powys') || name.includes('brecon')) return 'Powys';
  if (name.includes('monmouth')) return 'Monmouthshire';
  if (name.includes('cardiff') || name.includes('caerdydd')) return 'Cardiff';
  if (name.includes('swansea') || name.includes('abertawe')) return 'Swansea';
  
  // Use coordinates to detect region
  if (coordinates && coordinates.length > 0) {
    const [lon, lat] = coordinates[0];
    
    // Rough boundaries
    if (lat > 51.5 && lat < 52.5) {
      if (lon > -2.5 && lon < -1.9) return 'Worcestershire';
      if (lon > -3.1 && lon < -2.4) return 'Herefordshire';
      if (lon > -2.5 && lon < -1.5) return 'Gloucestershire';
    }
    
    // Wales
    if (lon < -3.0) return 'Wales';
  }
  
  return 'England'; // Default
}

// Calculate distance
function calculateDistance(coordinates) {
  if (!coordinates || coordinates.length < 2) return 0;
  
  let total = 0;
  for (let i = 1; i < coordinates.length; i++) {
    const [lon1, lat1] = coordinates[i - 1];
    const [lon2, lat2] = coordinates[i];
    
    const R = 6371; // Earth radius in km
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

// Calculate difficulty from distance only
function calculateDifficulty(distanceKm) {
  if (distanceKm >= 12) return 'hard';    // 12km+ = hard
  if (distanceKm >= 5) return 'medium';   // 5-12km = medium
  return 'easy';                          // <5km = easy
}

// Parse coordinates from KML
function parseCoordinates(coordString) {
  if (!coordString) return [];
  
  return coordString
    .trim()
    .split(/[\r\n\s]+/)
    .map(line => {
      const coord = line.trim();
      if (!coord) return null;
      const parts = coord.split(',').map(parseFloat);
      if (parts.length >= 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
        return [parts[0], parts[1]]; // [lon, lat]
      }
      return null;
    })
    .filter(coord => coord !== null);
}

// Process placemark and insert into database
async function processPlacemark(placemark) {
  totalProcessed++;
  
  try {
    const coordinates = parseCoordinates(placemark.coordinates);
    
    if (coordinates.length < 2) {
      filteredOut++;
      return;
    }
    
    const distance = calculateDistance(coordinates);
    
    // Filter by minimum distance
    if (distance < MIN_ROUTE_LENGTH_KM) {
      filteredOut++;
      return;
    }
    
    const routeName = placemark.name || `Bridleway ${totalProcessed}`;
    const county = detectCounty(routeName, coordinates);
    const difficulty = calculateDifficulty(distance);
    
    // Format as GeoJSON
    const geometry = {
      type: 'LineString',
      coordinates: coordinates
    };
    
    // Insert into database
    const { error } = await supabase
      .from('routes')
      .insert({
        title: routeName,
        description: `A ${difficulty} ${distance.toFixed(2)}km bridleway in ${county}. Users can add photos and reviews after completing this route.`,
        difficulty,
        distance_km: distance,
        terrain_tags: ['bridleway', 'countryside'],
        geometry,
        county,
        is_public: true,
        owner_user_id: null,
      });
    
    if (error) {
      console.error(`   ❌ ${routeName}: ${error.message}`);
      filteredOut++;
      return;
    }
    
    successfulRoutes++;
    
    // Progress logging
    if (totalProcessed % 100 === 0) {
      console.log(`📊 Progress: ${totalProcessed} processed | ✅ ${successfulRoutes} imported | ❌ ${filteredOut} filtered`);
    }
    
  } catch (error) {
    console.error(`   ❌ Error: ${error.message}`);
    filteredOut++;
  }
}

// Main streaming parser
async function importBridleways() {
  console.log('\n🗺️  BRIDLEWAY IMPORT - STREAMLINED VERSION');
  console.log('='.repeat(70));
  console.log('📍 Importing ALL bridleways from KML');
  console.log(`📏 Minimum route length: ${MIN_ROUTE_LENGTH_KM}km`);
  console.log('⚡ Difficulty: Distance-based (easy < 5km, medium 5-12km, hard 12km+)');
  console.log('📸 Photos: Users will add after launch');
  console.log('='.repeat(70));
  
  if (!fs.existsSync(KML_FILE_PATH)) {
    console.error(`\n❌ File not found: ${KML_FILE_PATH}`);
    console.log('Usage: node scripts/import-all-bridleways.js <path-to-kml-file>');
    process.exit(1);
  }
  
  console.log(`\n📖 Reading: ${KML_FILE_PATH}`);
  console.log('⏳ Processing... (this may take 15-30 minutes)\n');
  
  return new Promise((resolve) => {
    const stream = fs.createReadStream(KML_FILE_PATH, { encoding: 'utf8' });
    const parser = sax.createStream(true, { trim: true, normalize: true });
    
    let inPlacemark = false;
    let inName = false;
    let inStyleUrl = false;
    let inCoordinates = false;
    
    parser.on('opentag', (node) => {
      if (node.name === 'Placemark') {
        inPlacemark = true;
        inName = false;
        inStyleUrl = false;
        inCoordinates = false;
        currentPlacemark = { name: '', styleUrl: '', coordinates: '' };
      } else if (inPlacemark && currentPlacemark) {
        if (node.name === 'name') inName = true;
        if (node.name === 'styleUrl') inStyleUrl = true;
        if (node.name === 'coordinates') inCoordinates = true;
      }
    });
    
    parser.on('text', (text) => {
      if (!currentPlacemark || !inPlacemark) return;
      
      if (inName) {
        currentPlacemark.name += text;
      } else if (inStyleUrl) {
        currentPlacemark.styleUrl += text;
      } else if (inCoordinates) {
        currentPlacemark.coordinates += text;
      }
    });
    
    parser.on('closetag', async (tagName) => {
      if (tagName === 'name') inName = false;
      if (tagName === 'styleUrl') inStyleUrl = false;
      if (tagName === 'coordinates') inCoordinates = false;
      
      if (tagName === 'Placemark' && inPlacemark) {
        inPlacemark = false;
        
        // Safety check for currentPlacemark
        if (!currentPlacemark) {
          return;
        }
        
        // Only process Bridleways
        if (currentPlacemark.styleUrl?.includes('Bridleway') && currentPlacemark.coordinates) {
          await processPlacemark(currentPlacemark);
        } else {
          totalProcessed++;
          filteredOut++;
        }
        
        currentPlacemark = null;
      }
    });
    
    parser.on('error', (error) => {
      console.error(`\n❌ Parser error: ${error.message}`);
      resolve();
    });
    
    parser.on('end', async () => {
      console.log('\n' + '='.repeat(70));
      console.log('🎉 IMPORT COMPLETE!');
      console.log('='.repeat(70));
      console.log(`✅ Successfully imported: ${successfulRoutes} routes`);
      console.log(`❌ Filtered out: ${filteredOut} (too short or invalid)`);
      console.log(`📊 Total processed: ${totalProcessed} placemarks`);
      console.log('='.repeat(70));
      
      // Get final statistics
      console.log('\n📊 Fetching database statistics...\n');
      
      const { data: routes, error } = await supabase
        .from('routes')
        .select('difficulty, distance_km, county')
        .is('owner_user_id', null);
      
      if (error) {
        console.error('Error fetching stats:', error.message);
      } else if (routes && routes.length > 0) {
        const diffCounts = { easy: 0, medium: 0, hard: 0 };
        const countyCounts = {};
        let totalDistance = 0;
        let minDistance = Infinity;
        let maxDistance = 0;
        
        routes.forEach(r => {
          diffCounts[r.difficulty] = (diffCounts[r.difficulty] || 0) + 1;
          countyCounts[r.county] = (countyCounts[r.county] || 0) + 1;
          
          const dist = parseFloat(r.distance_km) || 0;
          totalDistance += dist;
          minDistance = Math.min(minDistance, dist);
          maxDistance = Math.max(maxDistance, dist);
        });
        
        console.log('📈 Final Database Statistics:');
        console.log(`   Total routes: ${routes.length}`);
        console.log(`   Total distance: ${totalDistance.toFixed(1)}km`);
        console.log(`   Average distance: ${(totalDistance / routes.length).toFixed(2)}km`);
        console.log(`   Shortest route: ${minDistance.toFixed(2)}km`);
        console.log(`   Longest route: ${maxDistance.toFixed(2)}km`);
        console.log('');
        console.log('🎯 By Difficulty:');
        console.log(`   Easy (< 5km): ${diffCounts.easy}`);
        console.log(`   Medium (5-12km): ${diffCounts.medium}`);
        console.log(`   Hard (12km+): ${diffCounts.hard}`);
        console.log('');
        console.log('📍 By County:');
        Object.entries(countyCounts)
          .sort((a, b) => b[1] - a[1])
          .forEach(([county, count]) => {
            console.log(`   ${county}: ${count}`);
          });
        console.log('');
      }
      
      console.log('='.repeat(70));
      console.log('🚀 Your routes are ready!');
      console.log('   Visit http://localhost:3000/routes to see them');
      console.log('   Users can now add photos after completing routes');
      console.log('='.repeat(70));
      
      resolve();
    });
    
    stream.pipe(parser);
  });
}

// Run import
importBridleways()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('\n❌ Fatal error:', error);
    process.exit(1);
  });

