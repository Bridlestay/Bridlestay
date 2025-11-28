/**
 * FINAL KML IMPORT - REALISTIC & PRODUCTION READY
 * 
 * Imports your augmented.kml with:
 * - Distance-based difficulty (reliable)
 * - County photo pools (realistic)
 * - All routes 0.5km+ (comprehensive coverage)
 * - Fast processing
 */

require('dotenv').config({ path: '.env.local' });
const fs = require('fs');
const sax = require('sax');
const fetch = require('node-fetch');
const { createClient } = require('@supabase/supabase-js');

const KML_FILE_PATH = process.argv[2] || './augmented.kml';
const MIN_ROUTE_LENGTH_KM = 0.5; // Import routes 500m+
const PEXELS_API_KEY = process.env.PEXELS_API_KEY;

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

let totalRoutes = 0;
let successfulRoutes = 0;
let failedRoutes = 0;
let currentPlacemark = null;
let currentText = '';

// County detection from route name
function detectCounty(routeName) {
  const name = routeName.toLowerCase();
  if (name.includes('powys') || name.includes('brecon')) return 'Powys';
  if (name.includes('monmouth')) return 'Monmouthshire';
  if (name.includes('hereford')) return 'Herefordshire';
  if (name.includes('glouc')) return 'Gloucestershire';
  if (name.includes('worcester')) return 'Worcestershire';
  return 'Wales'; // Default for Brecon Beacons
}

// Photo pool by county
const photoCache = {};

async function getCountyPhotos(countyName) {
  if (photoCache[countyName]) return photoCache[countyName];
  
  if (!PEXELS_API_KEY) return [];
  
  try {
    const response = await fetch(
      `https://api.pexels.com/v1/search?query=${encodeURIComponent(countyName + ' countryside trail')}&per_page=15&orientation=landscape`,
      { headers: { 'Authorization': PEXELS_API_KEY } }
    );
    
    if (response.ok) {
      const data = await response.json();
      photoCache[countyName] = (data.photos || []).map(p => p.src.large);
      console.log(`   📸 Fetched ${photoCache[countyName].length} photos for ${countyName}`);
      return photoCache[countyName];
    }
  } catch (error) {
    console.log(`   ⚠️  Photo error for ${countyName}`);
  }
  
  return [];
}

function getRandomPhotos(pool, count = 3) {
  if (!pool || pool.length === 0) return [];
  const photos = [];
  for (let i = 0; i < count; i++) {
    photos.push(pool[Math.floor(Math.random() * pool.length)]);
  }
  return photos;
}

// Calculate distance
function calculateDistance(coordinates) {
  if (!coordinates || coordinates.length < 2) return 0;
  
  let total = 0;
  for (let i = 1; i < coordinates.length; i++) {
    const [lon1, lat1] = coordinates[i - 1];
    const [lon2, lat2] = coordinates[i];
    
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

// Calculate difficulty
function calculateDifficulty(distanceKm) {
  if (distanceKm >= 10) return 'hard';
  if (distanceKm >= 5) return 'medium';
  return 'easy';
}

// Parse coordinates
function parseCoordinates(coordString) {
  if (!coordString) return [];
  
  return coordString
    .trim()
    .split(/[\r\n]+/)
    .map(line => {
      const coord = line.trim();
      if (!coord) return null;
      const parts = coord.split(',').map(parseFloat);
      return parts.length >= 2 ? [parts[0], parts[1]] : null;
    })
    .filter(coord => coord !== null);
}

// Process placemark
async function processPlacemark(placemark) {
  totalRoutes++;
  
  try {
    const coordinates = parseCoordinates(placemark.coordinates);
    
    if (coordinates.length < 2) {
      failedRoutes++;
      return;
    }
    
    const distance = calculateDistance(coordinates);
    
    if (distance < MIN_ROUTE_LENGTH_KM) {
      failedRoutes++;
      return;
    }
    
    const routeName = placemark.name || `Bridleway ${totalRoutes}`;
    const county = detectCounty(routeName);
    const difficulty = calculateDifficulty(distance);
    
    // Get photos for this county (cached)
    if (!photoCache[county]) {
      await getCountyPhotos(county);
    }
    
    const geometry = {
      type: 'LineString',
      coordinates: coordinates
    };
    
    const { data: route, error } = await supabase
      .from('routes')
      .insert({
        title: routeName,
        description: `A ${difficulty} ${distance.toFixed(1)}km bridleway in ${county}`,
        difficulty,
        distance_km: distance,
        terrain_tags: ['bridleway'],
        geometry,
        county,
        is_public: true,
        owner_user_id: null,
      })
      .select()
      .single();
    
    if (error) {
      failedRoutes++;
      return;
    }
    
    // Add photos
    const photos = getRandomPhotos(photoCache[county], 3);
    if (photos.length > 0) {
      for (let i = 0; i < photos.length; i++) {
        await supabase.from('route_photos').insert({
          route_id: route.id,
          url: photos[i],
          order_index: i
        });
      }
    }
    
    console.log(`   ✅ ${routeName.substring(0, 40)} (${difficulty}, ${distance.toFixed(1)}km)`);
    successfulRoutes++;
    
  } catch (error) {
    failedRoutes++;
  }
}

// Main streaming parser
async function processKML() {
  console.log('\n📖 Parsing KML file...\n');
  
  if (!fs.existsSync(KML_FILE_PATH)) {
    console.error('❌ File not found!');
    process.exit(1);
  }
  
  return new Promise((resolve) => {
    const stream = fs.createReadStream(KML_FILE_PATH, { encoding: 'utf8' });
    const parser = sax.createStream(true);
    
    parser.on('opentag', (node) => {
      if (node.name === 'Placemark') {
        currentPlacemark = {};
      }
    });
    
    parser.on('text', (text) => {
      currentText += text;
    });
    
    parser.on('closetag', async (tagName) => {
      if (currentPlacemark) {
        if (tagName === 'coordinates') {
          currentPlacemark.coordinates = currentText.trim();
        } else if (tagName === 'name') {
          currentPlacemark.name = currentText.trim();
        } else if (tagName === 'styleUrl') {
          currentPlacemark.styleUrl = currentText.trim();
        } else if (tagName === 'Placemark') {
          // Only Bridleways
          if (currentPlacemark.styleUrl?.includes('Bridleway') && currentPlacemark.coordinates) {
            await processPlacemark(currentPlacemark);
            
            if (totalRoutes % 100 === 0) {
              console.log(`\n📊 ${totalRoutes} processed (${successfulRoutes} ✅, ${failedRoutes} ❌)\n`);
            }
          }
          currentPlacemark = null;
        }
      }
      currentText = '';
    });
    
    parser.on('end', () => {
      console.log('\n' + '='.repeat(60));
      console.log('🎉 COMPLETE!');
      console.log('='.repeat(60));
      console.log(`✅ Successful: ${successfulRoutes} routes`);
      console.log(`❌ Failed/filtered: ${failedRoutes} routes`);
      console.log(`📊 Total processed: ${totalRoutes} bridleways`);
      console.log('='.repeat(60));
      resolve();
    });
    
    stream.pipe(parser);
  });
}

processKML().catch(console.error);

