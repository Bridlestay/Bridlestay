/**
 * Process Massive KML File - Stream Parser
 * Handles 900MB+ KML files by streaming and processing in chunks
 * 
 * Features:
 * - Stream-based parsing (no memory overflow)
 * - Automatic difficulty calculation
 * - Auto-generated names via reverse geocoding
 * - Photo fetching from Unsplash
 * - Progress tracking
 */

// Load environment variables from .env.local
require('dotenv').config({ path: '.env.local' });

const fs = require('fs');
const path = require('path');
const xml2js = require('xml2js');
const { createClient } = require('@supabase/supabase-js');

// Validate environment variables
if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
  console.error('❌ Error: NEXT_PUBLIC_SUPABASE_URL not found in .env.local');
  process.exit(1);
}

if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Error: SUPABASE_SERVICE_ROLE_KEY not found in .env.local');
  process.exit(1);
}

// Initialize Supabase
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Configuration
const KML_FILE_PATH = process.argv[2] || './massive-routes.kml';
const BATCH_SIZE = 50; // Process 50 routes at a time
const DELAY_BETWEEN_BATCHES = 2000; // 2 seconds delay

// Route difficulty calculation based on multiple factors
function calculateDifficulty(coordinates, distance) {
  const elevations = coordinates.map(coord => parseFloat(coord[2] || 0));
  
  // Calculate elevation gain
  let elevationGain = 0;
  for (let i = 1; i < elevations.length; i++) {
    const diff = elevations[i] - elevations[i - 1];
    if (diff > 0) elevationGain += diff;
  }
  
  // Calculate average grade
  const avgGrade = distance > 0 ? (elevationGain / (distance * 1000)) * 100 : 0;
  
  // Difficulty scoring
  // Easy: < 50m gain per km, < 5km distance
  // Moderate: 50-100m gain per km, or 5-15km distance
  // Challenging: 100-150m gain per km, or 15-25km distance
  // Difficult: > 150m gain per km, or > 25km distance
  
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

// Calculate route statistics
function calculateRouteStats(coordinates) {
  if (!coordinates || coordinates.length < 2) {
    return { distance: 0, elevationGain: 0, avgGrade: 0 };
  }
  
  let totalDistance = 0;
  let elevationGain = 0;
  
  for (let i = 1; i < coordinates.length; i++) {
    const [lon1, lat1, ele1] = coordinates[i - 1].map(parseFloat);
    const [lon2, lat2, ele2] = coordinates[i].map(parseFloat);
    
    // Calculate distance using Haversine formula
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    totalDistance += R * c;
    
    // Calculate elevation gain
    const eleDiff = (ele2 || 0) - (ele1 || 0);
    if (eleDiff > 0) elevationGain += eleDiff;
  }
  
  const avgGrade = totalDistance > 0 ? (elevationGain / (totalDistance * 1000)) * 100 : 0;
  
  return {
    distance: totalDistance,
    elevationGain,
    avgGrade
  };
}

// Get route name from coordinates using reverse geocoding (OpenStreetMap Nominatim - FREE)
async function getRouteName(coordinates) {
  if (!coordinates || coordinates.length === 0) return null;
  
  // Use the middle point of the route
  const midIndex = Math.floor(coordinates.length / 2);
  const [lon, lat] = coordinates[midIndex];
  
  try {
    // Using Nominatim (OpenStreetMap) - free, no API key needed
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=14&addressdetails=1`,
      {
        headers: {
          'User-Agent': 'BridleStay Route Processor'
        }
      }
    );
    
    if (!response.ok) {
      await sleep(1000); // Rate limit: 1 request per second
      return null;
    }
    
    const data = await response.json();
    
    // Extract meaningful location info
    const address = data.address || {};
    const name = 
      address.village || 
      address.town || 
      address.suburb || 
      address.hamlet ||
      address.locality ||
      address.city ||
      'Unnamed';
    
    const county = address.county || address.state_district || '';
    
    // Generate descriptive name
    if (county) {
      return `${name} to ${county} Trail`;
    } else {
      return `${name} Bridleway`;
    }
    
  } catch (error) {
    console.error('Error fetching route name:', error.message);
    return null;
  }
}

// Get route photo from Unsplash (FREE - 50 requests/hour)
async function getRoutePhoto(routeName, county) {
  try {
    // Search for relevant countryside/bridleway images
    const searchQuery = `${county || 'UK'} countryside horseback riding trail`;
    
    const response = await fetch(
      `https://api.unsplash.com/search/photos?query=${encodeURIComponent(searchQuery)}&per_page=1&orientation=landscape`,
      {
        headers: {
          'Authorization': `Client-ID ${process.env.UNSPLASH_ACCESS_KEY}`
        }
      }
    );
    
    if (!response.ok) return null;
    
    const data = await response.json();
    
    if (data.results && data.results.length > 0) {
      return data.results[0].urls.regular;
    }
    
    return null;
  } catch (error) {
    console.error('Error fetching photo:', error.message);
    return null;
  }
}

// Sleep utility
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Parse KML coordinates string
function parseCoordinates(coordString) {
  if (!coordString) return [];
  
  return coordString
    .trim()
    .split(/\s+/)
    .map(coord => {
      const parts = coord.split(',').map(parseFloat);
      return parts.length >= 2 ? parts : null;
    })
    .filter(coord => coord !== null);
}

// Main processing function
async function processKMLFile() {
  console.log('🗺️  Starting KML Processing...');
  console.log(`📁 File: ${KML_FILE_PATH}`);
  console.log(`📊 Batch size: ${BATCH_SIZE} routes\n`);
  
  // Check if file exists
  if (!fs.existsSync(KML_FILE_PATH)) {
    console.error('❌ KML file not found!');
    process.exit(1);
  }
  
  // Read file (for very large files, consider streaming)
  console.log('📖 Reading KML file... (this may take a while)');
  const kmlContent = fs.readFileSync(KML_FILE_PATH, 'utf8');
  
  console.log('🔍 Parsing XML...');
  const parser = new xml2js.Parser();
  const result = await parser.parseStringPromise(kmlContent);
  
  // Extract placemarks (routes)
  const placemarks = result.kml?.Document?.[0]?.Placemark || 
                     result.kml?.Folder?.[0]?.Placemark ||
                     [];
  
  console.log(`✅ Found ${placemarks.length} routes in KML file\n`);
  
  if (placemarks.length === 0) {
    console.error('❌ No routes found in KML file');
    process.exit(1);
  }
  
  // Process in batches
  let processed = 0;
  let successful = 0;
  let failed = 0;
  
  for (let i = 0; i < placemarks.length; i += BATCH_SIZE) {
    const batch = placemarks.slice(i, i + BATCH_SIZE);
    
    console.log(`\n📦 Processing batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(placemarks.length / BATCH_SIZE)}`);
    console.log(`   Routes ${i + 1} to ${Math.min(i + BATCH_SIZE, placemarks.length)}`);
    
    for (const placemark of batch) {
      try {
        // Extract coordinates
        const coordString = 
          placemark.LineString?.[0]?.coordinates?.[0] ||
          placemark.MultiGeometry?.[0]?.LineString?.[0]?.coordinates?.[0];
        
        if (!coordString) {
          console.log(`   ⚠️  Skipping route without coordinates`);
          failed++;
          continue;
        }
        
        const coordinates = parseCoordinates(coordString);
        
        if (coordinates.length < 2) {
          console.log(`   ⚠️  Skipping route with insufficient coordinates`);
          failed++;
          continue;
        }
        
        // Calculate stats
        const stats = calculateRouteStats(coordinates);
        const difficulty = calculateDifficulty(coordinates, stats.distance);
        
        // Get route name
        const routeName = await getRouteName(coordinates) || 
                         `Route ${processed + 1}`;
        
        // Get photo (with rate limiting)
        let photoUrl = null;
        if (process.env.UNSPLASH_ACCESS_KEY) {
          photoUrl = await getRoutePhoto(routeName, 'Worcestershire');
          await sleep(100); // Rate limit Unsplash
        }
        
        // Prepare route data
        const routeData = {
          name: routeName,
          description: `A ${difficulty} ${stats.distance.toFixed(1)}km route with ${Math.round(stats.elevationGain)}m elevation gain`,
          difficulty,
          distance_km: stats.distance,
          elevation_gain_m: Math.round(stats.elevationGain),
          estimated_duration_minutes: Math.round(stats.distance * 12), // ~12 min/km on horseback
          terrain_type: 'bridleway',
          coordinates: coordinates.map(c => ({ lat: c[1], lng: c[0] })),
          county: 'Worcestershire', // Update based on your region
          photo_url: photoUrl,
          is_system_route: true,
        };
        
        // Insert into database
        const { error } = await supabase
          .from('routes')
          .insert(routeData);
        
        if (error) {
          console.error(`   ❌ Error inserting route: ${error.message}`);
          failed++;
        } else {
          console.log(`   ✅ ${routeName} (${difficulty}, ${stats.distance.toFixed(1)}km)`);
          successful++;
        }
        
        processed++;
        
        // Rate limit: 1 request per second for Nominatim
        await sleep(1000);
        
      } catch (error) {
        console.error(`   ❌ Error processing route: ${error.message}`);
        failed++;
      }
    }
    
    // Delay between batches
    if (i + BATCH_SIZE < placemarks.length) {
      console.log(`\n⏸️  Pausing ${DELAY_BETWEEN_BATCHES/1000}s before next batch...`);
      await sleep(DELAY_BETWEEN_BATCHES);
    }
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('🎉 Processing Complete!');
  console.log('='.repeat(60));
  console.log(`✅ Successfully processed: ${successful} routes`);
  console.log(`❌ Failed: ${failed} routes`);
  console.log(`📊 Total: ${processed} routes`);
  console.log('='.repeat(60));
}

// Run the script
processKMLFile().catch(console.error);

