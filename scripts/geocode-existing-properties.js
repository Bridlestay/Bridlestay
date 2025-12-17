/**
 * Script to geocode existing properties that don't have coordinates
 * Run with: node scripts/geocode-existing-properties.js
 * 
 * Requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables
 */

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function geocodePostcode(postcode) {
  try {
    const cleanPostcode = postcode.replace(/\s+/g, '').toUpperCase();
    const response = await fetch(`https://api.postcodes.io/postcodes/${encodeURIComponent(cleanPostcode)}`);
    
    if (!response.ok) {
      console.log(`  Failed to geocode ${postcode}: ${response.status}`);
      return null;
    }
    
    const data = await response.json();
    
    if (data.status !== 200 || !data.result) {
      console.log(`  Invalid postcode: ${postcode}`);
      return null;
    }
    
    // Add privacy offset (roughly 500m - 1km)
    const latOffset = (Math.random() - 0.5) * 0.015;
    const lngOffset = (Math.random() - 0.5) * 0.02;
    
    return {
      lat: Math.round((data.result.latitude + latOffset) * 10000) / 10000,
      lng: Math.round((data.result.longitude + lngOffset) * 10000) / 10000,
    };
  } catch (error) {
    console.error(`  Error geocoding ${postcode}:`, error.message);
    return null;
  }
}

async function main() {
  console.log('Fetching properties without coordinates...');
  
  // Get properties without lat/lng
  const { data: properties, error } = await supabase
    .from('properties')
    .select('id, name, postcode, lat, lng')
    .or('lat.is.null,lng.is.null');
  
  if (error) {
    console.error('Error fetching properties:', error);
    process.exit(1);
  }
  
  console.log(`Found ${properties.length} properties without coordinates`);
  
  let updated = 0;
  let failed = 0;
  
  for (const property of properties) {
    if (!property.postcode) {
      console.log(`Skipping ${property.name}: No postcode`);
      failed++;
      continue;
    }
    
    console.log(`Geocoding: ${property.name} (${property.postcode})`);
    
    const coords = await geocodePostcode(property.postcode);
    
    if (coords) {
      const { error: updateError } = await supabase
        .from('properties')
        .update({ lat: coords.lat, lng: coords.lng })
        .eq('id', property.id);
      
      if (updateError) {
        console.log(`  Failed to update: ${updateError.message}`);
        failed++;
      } else {
        console.log(`  Updated: ${coords.lat}, ${coords.lng}`);
        updated++;
      }
    } else {
      failed++;
    }
    
    // Rate limit: 1 request per second
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  console.log(`\nDone! Updated: ${updated}, Failed: ${failed}`);
}

main().catch(console.error);

