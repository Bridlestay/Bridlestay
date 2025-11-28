/**
 * Process Massive KML File - STREAMING VERSION
 * Handles 900MB+ KML files without loading into memory
 * 
 * Uses SAX streaming parser for memory efficiency
 */

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const fs = require('fs');
const sax = require('sax');
const { createClient } = require('@supabase/supabase-js');

// Validate environment variables
if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Error: Supabase credentials not found in .env.local');
  process.exit(1);
}

// Initialize Supabase
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Configuration
const KML_FILE_PATH = process.argv[2] || './augmented.kml';
const BATCH_SIZE = 10; // Process 10 routes at a time
const DELAY_BETWEEN_ROUTES = 1100; // 1.1 second delay (Nominatim rate limit)

// Stats
let totalRoutes = 0;
let successfulRoutes = 0;
let failedRoutes = 0;
let currentBatch = [];

// Current parsing state
let currentPlacemark = null;
let currentTag = '';
let currentText = '';

// Calculate difficulty
function calculateDifficulty(coordinates, distance) {
  const elevations = coordinates.map(coord => parseFloat(coord[2] || 0));
  
  let elevationGain = 0;
  for (let i = 1; i < elevations.length; i++) {
    const diff = elevations[i] - elevations[i - 1];
    if (diff > 0) elevationGain += diff;
  }
  
  const avgGrade = distance > 0 ? (elevationGain / (distance * 1000)) * 100 : 0;
  
  if (distance > 25 || avgGrade > 15 || elevationGain > 300) {
    return 'difficult';
  } else if (distance > 15 || avgGrade > 10 || elevationGain > 200) {
    return 'challenging';
  } else if (distance > 5 || avgGrade > 5 || elevationGain > 100) {
    return 'moderate';
  } else {
    return 'easy';
  }
}

// Calculate route stats
function calculateRouteStats(coordinates) {
  if (!coordinates || coordinates.length < 2) {
    return { distance: 0, elevationGain: 0 };
  }
  
  let totalDistance = 0;
  let elevationGain = 0;
  
  for (let i = 1; i < coordinates.length; i++) {
    const [lon1, lat1, ele1] = coordinates[i - 1].map(parseFloat);
    const [lon2, lat2, ele2] = coordinates[i].map(parseFloat);
    
    // Haversine formula
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    totalDistance += R * c;
    
    const eleDiff = (ele2 || 0) - (ele1 || 0);
    if (eleDiff > 0) elevationGain += eleDiff;
  }
  
  return { distance: totalDistance, elevationGain };
}

// Get route name via reverse geocoding
async function getRouteName(coordinates) {
  if (!coordinates || coordinates.length === 0) return null;
  
  const midIndex = Math.floor(coordinates.length / 2);
  const [lon, lat] = coordinates[midIndex];
  
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=14&addressdetails=1`,
      { headers: { 'User-Agent': 'BridleStay Route Processor' } }
    );
    
    if (!response.ok) return null;
    
    const data = await response.json();
    const address = data.address || {};
    
    const name = address.village || address.town || address.suburb || 
                 address.hamlet || address.locality || address.city || 'Unnamed';
    const county = address.county || address.state_district || '';
    
    if (county) {
      return `${name} to ${county} Trail`;
    } else {
      return `${name} Bridleway`;
    }
  } catch (error) {
    console.error('   ⚠️  Geocoding error:', error.message);
    return null;
  }
}

// Parse coordinates string
function parseCoordinates(coordString) {
  if (!coordString) return [];
  
  // Split by newlines for this KML format (one coordinate per line)
  return coordString
    .trim()
    .split(/[\r\n]+/)
    .map(line => {
      const coord = line.trim();
      if (!coord) return null;
      const parts = coord.split(',').map(parseFloat);
      // Add elevation as 0 if not present: [lon, lat, elevation]
      return parts.length >= 2 ? [parts[0], parts[1], parts[2] || 0] : null;
    })
    .filter(coord => coord !== null);
}

// Sleep utility
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Process a completed placemark
async function processPlacemark(placemark) {
  totalRoutes++;
  
  try {
    const coordinates = parseCoordinates(placemark.coordinates);
    
    if (coordinates.length < 2) {
      console.log(`   ⚠️  Route ${totalRoutes}: Insufficient coordinates`);
      failedRoutes++;
      return;
    }
    
    const stats = calculateRouteStats(coordinates);
    const difficulty = calculateDifficulty(coordinates, stats.distance);
    
    // Get route name with rate limiting
    const routeName = await getRouteName(coordinates) || `Route ${totalRoutes}`;
    
    const routeData = {
      name: routeName,
      description: `A ${difficulty} ${stats.distance.toFixed(1)}km route with ${Math.round(stats.elevationGain)}m elevation gain`,
      difficulty,
      distance_km: stats.distance,
      elevation_gain_m: Math.round(stats.elevationGain),
      estimated_duration_minutes: Math.round(stats.distance * 12),
      terrain_type: 'bridleway',
      coordinates: coordinates.map(c => ({ lat: c[1], lng: c[0] })),
      county: 'Worcestershire',
      is_system_route: true,
    };
    
    const { error } = await supabase
      .from('routes')
      .insert(routeData);
    
    if (error) {
      console.log(`   ❌ ${routeName}: ${error.message}`);
      failedRoutes++;
    } else {
      console.log(`   ✅ ${routeName} (${difficulty}, ${stats.distance.toFixed(1)}km)`);
      successfulRoutes++;
    }
    
    // Rate limit for Nominatim
    await sleep(DELAY_BETWEEN_ROUTES);
    
  } catch (error) {
    console.error(`   ❌ Error processing route ${totalRoutes}:`, error.message);
    failedRoutes++;
  }
}

// Main streaming parser
async function processKMLStream() {
  console.log('🗺️  Starting KML Streaming Processing...');
  console.log(`📁 File: ${KML_FILE_PATH}`);
  console.log(`⚡ Memory-efficient streaming mode\n`);
  
  if (!fs.existsSync(KML_FILE_PATH)) {
    console.error('❌ KML file not found!');
    process.exit(1);
  }
  
  return new Promise((resolve, reject) => {
    const stream = fs.createReadStream(KML_FILE_PATH, { encoding: 'utf8' });
    const parser = sax.createStream(true, { lowercase: true });
    
    parser.on('opentag', (node) => {
      currentTag = node.name.toLowerCase();
      
      if (node.name.toLowerCase() === 'placemark') {
        currentPlacemark = {};
      }
    });
    
    parser.on('text', (text) => {
      currentText += text;
    });
    
    parser.on('closetag', async (tagName) => {
      const lowerTag = tagName.toLowerCase();
      
      if (currentPlacemark) {
        if (lowerTag === 'coordinates') {
          currentPlacemark.coordinates = currentText.trim();
        } else if (lowerTag === 'name') {
          currentPlacemark.name = currentText.trim();
        } else if (lowerTag === 'styleurl') {
          currentPlacemark.styleUrl = currentText.trim();
        } else if (lowerTag === 'placemark') {
          // Only process Bridleways (skip footpaths, BOATs, etc.)
          if (currentPlacemark.styleUrl && currentPlacemark.styleUrl.includes('Bridleway') && currentPlacemark.coordinates) {
            await processPlacemark(currentPlacemark);
            
            if (totalRoutes % 50 === 0) {
              console.log(`\n📊 Progress: ${totalRoutes} routes processed (${successfulRoutes} successful, ${failedRoutes} failed)\n`);
            }
          }
          
          currentPlacemark = null;
        }
      }
      
      currentText = '';
    });
    
    parser.on('end', () => {
      console.log('\n' + '='.repeat(60));
      console.log('🎉 Processing Complete!');
      console.log('='.repeat(60));
      console.log(`✅ Successfully processed: ${successfulRoutes} routes`);
      console.log(`❌ Failed: ${failedRoutes} routes`);
      console.log(`📊 Total: ${totalRoutes} routes`);
      console.log('='.repeat(60));
      resolve();
    });
    
    parser.on('error', (error) => {
      console.error('❌ Parsing error:', error);
      reject(error);
    });
    
    stream.pipe(parser);
  });
}

// Run
processKMLStream().catch(console.error);

