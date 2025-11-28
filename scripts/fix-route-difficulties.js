/**
 * Fix route difficulties based on distance only (no elevation data available)
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function fixDifficulties() {
  console.log('🔧 Recalculating route difficulties...\n');
  
  // Get all routes
  const { data: routes, error } = await supabase
    .from('routes')
    .select('id, distance_km, title');
  
  if (error) {
    console.error('Error fetching routes:', error);
    return;
  }
  
  console.log(`Found ${routes.length} routes\n`);
  
  let updated = 0;
  
  for (const route of routes) {
    const distance = parseFloat(route.distance_km) || 0;
    
    // Calculate difficulty based on distance only
    let difficulty;
    if (distance > 15) {
      difficulty = 'hard';
    } else if (distance > 7) {
      difficulty = 'medium';
    } else {
      difficulty = 'easy';
    }
    
    // Update if different
    const { error: updateError } = await supabase
      .from('routes')
      .update({ difficulty })
      .eq('id', route.id);
    
    if (!updateError) {
      updated++;
      if (updated % 100 === 0) {
        console.log(`✅ Updated ${updated} routes...`);
      }
    }
  }
  
  console.log(`\n🎉 Done! Updated ${updated} routes`);
  
  // Show new distribution
  const { data: distribution } = await supabase
    .from('routes')
    .select('difficulty');
  
  const counts = {};
  distribution.forEach(r => {
    counts[r.difficulty] = (counts[r.difficulty] || 0) + 1;
  });
  
  console.log('\n📊 New difficulty distribution:');
  console.log(`   Easy (< 7km): ${counts.easy || 0}`);
  console.log(`   Medium (7-15km): ${counts.medium || 0}`);
  console.log(`   Hard (> 15km): ${counts.hard || 0}`);
}

fixDifficulties().catch(console.error);

