/**
 * Simple KML Importer - No Geocoding
 * Just gets routes into database quickly
 */

require('dotenv').config({ path: '.env.local' });

const fs = require('fs');
const sax = require('sax');
const { createClient } = require('@supabase/supabase-js');

if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const KML_FILE_PATH = process.argv[2] || './augmented.kml';

let totalRoutes = 0;
let successfulRoutes = 0;
let failedRoutes = 0;
let currentPlacemark = null;
let currentText = '';

// Calculate difficulty based on distance and elevation
function calculateDifficulty(distance, elevationGain) {
  if (distance > 20 || elevationGain > 300) return 'hard';
  if (distance > 10 || elevationGain > 150) return 'medium';
  return 'easy';
}

// Calculate route stats
function calculateRouteStats(coordinates) {
  if (!coordinates || coordinates.length < 2) {
    return { distance: 0, elevationGain: 0 };
  }
  
  let totalDistance = 0;
  let elevationGain = 0;
  
  for (let i = 1; i < coordinates.length; i++) {
    const [lon1, lat1, ele1] = coordinates[i - 1];
    const [lon2, lat2, ele2] = coordinates[i];
    
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
      return parts.length >= 2 ? [parts[0], parts[1], parts[2] || 0] : null;
    })
    .filter(coord => coord !== null);
}

// Process a placemark
async function processPlacemark(placemark) {
  totalRoutes++;
  
  try {
    const coordinates = parseCoordinates(placemark.coordinates);
    
    if (coordinates.length < 2) {
      failedRoutes++;
      return;
    }
    
    const stats = calculateRouteStats(coordinates);
    const difficulty = calculateDifficulty(stats.distance, stats.elevationGain);
    
    // Simple name from the placemark name or generic
    const routeName = placemark.name || `Bridleway ${totalRoutes}`;
    
    // Format as GeoJSON LineString
    const geometry = {
      type: 'LineString',
      coordinates: coordinates.map(c => [c[0], c[1]]) // [lng, lat]
    };
    
    const routeData = {
      title: routeName,
      description: `A ${difficulty} ${stats.distance.toFixed(1)}km bridleway with ${Math.round(stats.elevationGain)}m elevation gain`,
      difficulty,
      distance_km: stats.distance,
      terrain_tags: ['bridleway'],
      geometry,
      county: 'Wales', // Update as needed
      is_public: true,
      owner_user_id: null, // System route
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
    
  } catch (error) {
    console.error(`   ❌ Error: ${error.message}`);
    failedRoutes++;
  }
}

// Main function
async function processKML() {
  console.log('🗺️  Starting Simple KML Import...');
  console.log(`📁 File: ${KML_FILE_PATH}\n`);
  
  if (!fs.existsSync(KML_FILE_PATH)) {
    console.error('❌ KML file not found!');
    process.exit(1);
  }
  
  return new Promise((resolve, reject) => {
    const stream = fs.createReadStream(KML_FILE_PATH, { encoding: 'utf8' });
    const parser = sax.createStream(true, { lowercase: true });
    
    parser.on('opentag', (node) => {
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
          // Only process Bridleways
          if (currentPlacemark.styleUrl && currentPlacemark.styleUrl.includes('Bridleway') && currentPlacemark.coordinates) {
            await processPlacemark(currentPlacemark);
            
            if (totalRoutes % 100 === 0) {
              console.log(`\n📊 Progress: ${totalRoutes} routes (${successfulRoutes} ✅, ${failedRoutes} ❌)\n`);
            }
          }
          
          currentPlacemark = null;
        }
      }
      
      currentText = '';
    });
    
    parser.on('end', () => {
      console.log('\n' + '='.repeat(60));
      console.log('🎉 Import Complete!');
      console.log('='.repeat(60));
      console.log(`✅ Successful: ${successfulRoutes} routes`);
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

processKML().catch(console.error);

