/**
 * BRIDLEWAY IMPORT - V2
 * With better progress tracking
 */

require('dotenv').config({ path: '.env.local' });
const fs = require('fs');
const sax = require('sax');
const { createClient } = require('@supabase/supabase-js');

const KML_FILE = process.argv[2] || './augmented.kml';
const MIN_DISTANCE_KM = 0.1;
const BATCH_SIZE = 100; // Insert in batches

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

let totalProcessed = 0;
let successfulRoutes = 0;
let filteredOut = 0;
let batchRoutes = [];

// State
let inPlacemark = false;
let currentPlacemark = null;
let currentElement = null;
let textBuffer = '';

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

function getDifficulty(distanceKm) {
  if (distanceKm >= 12) return 'hard';
  if (distanceKm >= 5) return 'medium';
  return 'easy';
}

function detectCounty(name) {
  const n = (name || '').toLowerCase();
  if (n.includes('worcester')) return 'Worcestershire';
  if (n.includes('hereford')) return 'Herefordshire';
  if (n.includes('glouc')) return 'Gloucestershire';
  if (n.includes('powys') || n.includes('brecon')) return 'Powys';
  return 'Wales';
}

function parseCoordinates(coordString) {
  if (!coordString) return [];
  
  const lines = coordString.trim().split(/[\r\n]+/);
  const coords = [];
  
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    
    const parts = trimmed.split(',');
    if (parts.length >= 2) {
      const lon = parseFloat(parts[0]);
      const lat = parseFloat(parts[1]);
      if (!isNaN(lon) && !isNaN(lat)) {
        coords.push([lon, lat]);
      }
    }
  }
  
  return coords;
}

async function insertBatch() {
  if (batchRoutes.length === 0) return;
  
  try {
    const { error } = await supabase
      .from('routes')
      .insert(batchRoutes);
    
    if (error) {
      console.error(`Batch insert error: ${error.message}`);
      filteredOut += batchRoutes.length;
    } else {
      successfulRoutes += batchRoutes.length;
    }
  } catch (error) {
    console.error(`Batch error: ${error.message}`);
    filteredOut += batchRoutes.length;
  }
  
  batchRoutes = [];
  
  // Progress update
  console.log(`📊 Processed: ${totalProcessed} | ✅ Imported: ${successfulRoutes} | ❌ Filtered: ${filteredOut}`);
}

async function processPlacemark(placemark) {
  totalProcessed++;
  
  try {
    // Check if it's a bridleway
    if (!placemark.styleUrl || !placemark.styleUrl.includes('Bridleway')) {
      filteredOut++;
      return;
    }
    
    const coords = parseCoordinates(placemark.coordinates);
    
    if (coords.length < 2) {
      filteredOut++;
      return;
    }
    
    const distance = calculateDistance(coords);
    
    if (distance < MIN_DISTANCE_KM) {
      filteredOut++;
      return;
    }
    
    const name = placemark.name || `Bridleway ${totalProcessed}`;
    const difficulty = getDifficulty(distance);
    const county = detectCounty(name);
    
    const geometry = {
      type: 'LineString',
      coordinates: coords
    };
    
    // Add to batch
    batchRoutes.push({
      title: name,
      description: `A ${difficulty} ${distance.toFixed(2)}km bridleway in ${county}`,
      difficulty,
      distance_km: distance,
      terrain_tags: ['bridleway'],
      geometry,
      county,
      is_public: true,
      owner_user_id: null,
    });
    
    // Insert batch when full
    if (batchRoutes.length >= BATCH_SIZE) {
      await insertBatch();
    }
  } catch (error) {
    console.error(`Process error: ${error.message}`);
    filteredOut++;
  }
}

async function importRoutes() {
  console.log('\n🗺️  BRIDLEWAY IMPORT - V2');
  console.log('='.repeat(60));
  console.log(`📍 File: ${KML_FILE}`);
  console.log(`📏 Min distance: ${MIN_DISTANCE_KM}km`);
  console.log(`📦 Batch size: ${BATCH_SIZE} routes`);
  console.log('='.repeat(60));
  
  if (!fs.existsSync(KML_FILE)) {
    console.error(`❌ File not found: ${KML_FILE}`);
    process.exit(1);
  }
  
  return new Promise((resolve) => {
    const stream = fs.createReadStream(KML_FILE, { encoding: 'utf8' });
    const parser = sax.createStream(true, { trim: true });
    
    parser.on('opentag', (node) => {
      if (node.name === 'Placemark') {
        inPlacemark = true;
        currentPlacemark = { name: '', styleUrl: '', coordinates: '' };
        currentElement = null;
      } else if (inPlacemark) {
        currentElement = node.name;
        textBuffer = '';
      }
    });
    
    parser.on('text', (text) => {
      if (inPlacemark && currentElement) {
        textBuffer += text;
      }
    });
    
    parser.on('closetag', async (tagName) => {
      if (!inPlacemark || !currentPlacemark) return;
      
      if (tagName === 'name') {
        currentPlacemark.name = textBuffer;
        currentElement = null;
      } else if (tagName === 'styleUrl') {
        currentPlacemark.styleUrl = textBuffer;
        currentElement = null;
      } else if (tagName === 'coordinates') {
        currentPlacemark.coordinates = textBuffer;
        currentElement = null;
      } else if (tagName === 'Placemark') {
        const placemarkToProcess = currentPlacemark;
        inPlacemark = false;
        currentPlacemark = null;
        await processPlacemark(placemarkToProcess);
      }
    });
    
    parser.on('error', (error) => {
      console.error(`\n❌ Parser error: ${error.message}`);
      resolve();
    });
    
    parser.on('end', async () => {
      // Insert remaining batch
      await insertBatch();
      
      console.log('\n' + '='.repeat(60));
      console.log('🎉 IMPORT COMPLETE!');
      console.log('='.repeat(60));
      console.log(`✅ Imported: ${successfulRoutes} routes`);
      console.log(`❌ Filtered: ${filteredOut} routes`);
      console.log(`📊 Total: ${totalProcessed} placemarks`);
      console.log('='.repeat(60));
      
      resolve();
    });
    
    stream.pipe(parser);
  });
}

importRoutes()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('\n❌ Fatal error:', error);
    process.exit(1);
  });

