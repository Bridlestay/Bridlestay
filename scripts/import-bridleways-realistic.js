/**
 * REALISTIC UK BRIDLEWAY IMPORT
 * 
 * What it does:
 * - Imports bridleways 1km+ from OSM
 * - Difficulty based on distance (no unreliable elevation API)
 * - Uses county-wide photo collections (realistic approach)
 * - Fast, reliable, production-ready
 */

require('dotenv').config({ path: '.env.local' });
const fetch = require('node-fetch');
const { createClient } = require('@supabase/supabase-js');

const THREE_COUNTIES = {
  'Worcestershire': { lat: 52.2, lon: -2.2, radius: 25000 },
  'Herefordshire': { lat: 52.05, lon: -2.7, radius: 30000 },
  'Gloucestershire': { lat: 51.8, lon: -2.2, radius: 35000 }
};

const MIN_ROUTE_LENGTH_KM = 1; // Lowered to 1km
const PEXELS_API_KEY = process.env.PEXELS_API_KEY;

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

let totalRoutes = 0;
let successfulRoutes = 0;
let failedRoutes = 0;

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// County photo cache
const countyPhotos = {};

/**
 * Fetch county-wide photo collection (once per county)
 */
async function fetchCountyPhotos(countyName) {
  if (countyPhotos[countyName]) {
    return countyPhotos[countyName];
  }
  
  if (!PEXELS_API_KEY) {
    console.log('   ⚠️  No Pexels key - skipping photos');
    return [];
  }
  
  try {
    console.log(`   📸 Fetching photo collection for ${countyName}...`);
    
    const response = await fetch(
      `https://api.pexels.com/v1/search?query=${encodeURIComponent(countyName + ' countryside horseback trail')}&per_page=15&orientation=landscape`,
      {
        headers: { 'Authorization': PEXELS_API_KEY }
      }
    );
    
    if (!response.ok) {
      console.log('   ⚠️  Pexels API failed - skipping photos');
      return [];
    }
    
    const data = await response.json();
    const photos = (data.photos || []).map(p => p.src.large);
    
    countyPhotos[countyName] = photos;
    console.log(`   ✅ Fetched ${photos.length} photos for ${countyName}`);
    
    return photos;
  } catch (error) {
    console.log(`   ⚠️  Photo error: ${error.message}`);
    return [];
  }
}

/**
 * Get random photos from county collection
 */
function getRandomPhotos(countyPhotos, count = 3) {
  if (!countyPhotos || countyPhotos.length === 0) return [];
  
  const photos = [];
  for (let i = 0; i < count; i++) {
    const randomIndex = Math.floor(Math.random() * countyPhotos.length);
    photos.push(countyPhotos[randomIndex]);
  }
  return photos;
}

/**
 * Fetch bridleways from OSM
 */
async function fetchBridlewaysFromOSM(countyName, config) {
  console.log(`   📡 Querying OpenStreetMap...`);
  
  const query = `
    [out:json][timeout:90];
    (
      way["highway"="bridleway"](around:${config.radius},${config.lat},${config.lon});
    );
    out geom;
  `;
  
  try {
    const response = await fetch('https://overpass-api.de/api/interpreter', {
      method: 'POST',
      body: query,
      headers: { 'Content-Type': 'text/plain' }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    const data = await response.json();
    console.log(`   ✅ Found ${data.elements?.length || 0} bridleways`);
    
    return data.elements || [];
  } catch (error) {
    console.error(`   ❌ OSM error: ${error.message}`);
    return [];
  }
}

/**
 * Calculate route distance
 */
function calculateDistance(coordinates) {
  if (!coordinates || coordinates.length < 2) return 0;
  
  let totalDistance = 0;
  
  for (let i = 1; i < coordinates.length; i++) {
    const coord1 = coordinates[i - 1];
    const coord2 = coordinates[i];
    
    const R = 6371;
    const dLat = (coord2.lat - coord1.lat) * Math.PI / 180;
    const dLon = (coord2.lon - coord1.lon) * Math.PI / 180;
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(coord1.lat * Math.PI / 180) * Math.cos(coord2.lat * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    totalDistance += R * c;
  }
  
  return totalDistance;
}

/**
 * Calculate difficulty from distance only (realistic approach)
 */
function calculateDifficulty(distanceKm) {
  if (distanceKm >= 12) return 'hard';
  if (distanceKm >= 6) return 'medium';
  return 'easy';
}

/**
 * Get route name
 */
function getRouteName(way, countyName, index) {
  if (way.tags?.name) return way.tags.name;
  if (way.tags?.ref) return `${countyName} Bridleway ${way.tags.ref}`;
  return `${countyName} Bridleway ${index}`;
}

/**
 * Process a single bridleway
 */
async function processRoute(way, countyName, index, countyPhotoCollection) {
  totalRoutes++;
  
  try {
    const coordinates = way.geometry.map(point => ({
      lat: point.lat,
      lon: point.lon
    }));
    
    if (coordinates.length < 2) {
      failedRoutes++;
      return;
    }
    
    const distance = calculateDistance(coordinates);
    
    // Filter short routes
    if (distance < MIN_ROUTE_LENGTH_KM) {
      failedRoutes++;
      return;
    }
    
    const difficulty = calculateDifficulty(distance);
    const routeName = getRouteName(way, countyName, index);
    
    const geometry = {
      type: 'LineString',
      coordinates: coordinates.map(c => [c.lon, c.lat])
    };
    
    // Insert route
    const { data: insertedRoute, error: insertError } = await supabase
      .from('routes')
      .insert({
        title: routeName,
        description: `A ${difficulty} ${distance.toFixed(1)}km bridleway in ${countyName}`,
        difficulty,
        distance_km: distance,
        terrain_tags: ['bridleway'],
        geometry,
        county: countyName,
        is_public: true,
        owner_user_id: null,
      })
      .select()
      .single();
    
    if (insertError) {
      failedRoutes++;
      return;
    }
    
    // Add random photos from county collection
    const photos = getRandomPhotos(countyPhotoCollection, 3);
    
    if (photos.length > 0 && insertedRoute) {
      for (let i = 0; i < photos.length; i++) {
        await supabase
          .from('route_photos')
          .insert({
            route_id: insertedRoute.id,
            url: photos[i],
            order_index: i
          });
      }
    }
    
    console.log(`   ✅ ${routeName} (${difficulty}, ${distance.toFixed(1)}km, ${photos.length} photos)`);
    successfulRoutes++;
    
  } catch (error) {
    console.error(`   ❌ Error: ${error.message}`);
    failedRoutes++;
  }
}

/**
 * Main import
 */
async function importBridleways() {
  console.log('🗺️  REALISTIC UK BRIDLEWAY IMPORT');
  console.log('='.repeat(60));
  console.log(`📍 Three Counties: Worcestershire, Herefordshire, Gloucestershire`);
  console.log(`📏 Minimum route length: ${MIN_ROUTE_LENGTH_KM}km`);
  console.log(`📸 Photos: County-wide collections (realistic)`);
  console.log(`⚡ Difficulty: Distance-based (fast & reliable)`);
  console.log('='.repeat(60));
  
  for (const [countyName, config] of Object.entries(THREE_COUNTIES)) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`📍 Processing ${countyName}`);
    console.log('='.repeat(60));
    
    // Fetch county photo collection once
    const photoCollection = await fetchCountyPhotos(countyName);
    await sleep(2000);
    
    // Fetch bridleways
    const ways = await fetchBridlewaysFromOSM(countyName, config);
    
    if (ways.length === 0) {
      console.log(`   ⚠️  No bridleways found for ${countyName}`);
      continue;
    }
    
    console.log(`\n🔄 Processing ${ways.length} bridleways...`);
    
    let countyIndex = 1;
    for (const way of ways) {
      await processRoute(way, countyName, countyIndex, photoCollection);
      countyIndex++;
      
      if (totalRoutes % 50 === 0) {
        console.log(`\n📊 Progress: ${totalRoutes} processed (${successfulRoutes} ✅, ${failedRoutes} ❌)\n`);
      }
      
      await sleep(50); // Small delay
    }
    
    console.log(`\n✅ ${countyName} complete: ${successfulRoutes} routes imported`);
    console.log(`⏸️  Pausing 10s before next county...`);
    await sleep(10000);
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('🎉 IMPORT COMPLETE!');
  console.log('='.repeat(60));
  console.log(`✅ Successful: ${successfulRoutes} routes`);
  console.log(`❌ Failed: ${failedRoutes} routes`);
  console.log(`📊 Total processed: ${totalRoutes} routes`);
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
    
    console.log('\n📊 Final Statistics:');
    console.log(`   Total routes: ${routes.length}`);
    console.log(`   Easy: ${diffCounts.easy}`);
    console.log(`   Medium: ${diffCounts.medium}`);
    console.log(`   Hard: ${diffCounts.hard}`);
  }
}

importBridleways().catch(console.error);

