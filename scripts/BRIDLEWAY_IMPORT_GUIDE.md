# 🗺️ COMPLETE UK BRIDLEWAY IMPORT - Setup Guide

## 🎯 What This System Does:

✅ **Fetches real bridleways** from OpenStreetMap (FREE)  
✅ **Gets elevation data** from Open-Elevation API (FREE)  
✅ **Calculates accurate difficulty** based on distance + elevation gain  
✅ **Auto-generates names** from OSM tags or location  
✅ **Adds 5 professional photos per route** from Pexels (FREE)  
✅ **Filters for routes 3km+** (not tiny segments)  
✅ **Three Counties**: Worcestershire, Herefordshire, Gloucestershire  

---

## ⚡ Quick Setup (5 minutes)

### Step 1: Clear Old Routes (Optional)

If you want to start fresh and remove the 1,000 segment routes:

```sql
-- In Supabase SQL Editor:
DELETE FROM routes WHERE owner_user_id IS NULL;
```

Or keep them! They won't conflict.

---

### Step 2: Get Pexels API Key (2 minutes)

**Pexels is BETTER than Unsplash:**
- ✅ 200 requests/hour (vs Unsplash's 50)
- ✅ Higher quality countryside photos
- ✅ No attribution required

**Get your key:**
1. Go to: https://www.pexels.com/api/
2. Click "Get Started" (free)
3. Sign up with email
4. Create an API key
5. Copy it

**Add to `.env.local`:**
```bash
PEXELS_API_KEY=your_pexels_api_key_here
```

**Or skip photos:** Don't add the key - routes will still import with difficulty/names!

---

### Step 3: Run the Script

```bash
node scripts/import-uk-bridleways-complete.js
```

---

## 📊 What You'll Get:

### **Expected Results:**
- **Worcestershire**: ~150-300 routes
- **Herefordshire**: ~200-400 routes  
- **Gloucestershire**: ~250-500 routes
- **Total**: ~600-1,200 full bridleway routes

### **Each Route Will Have:**
- ✅ Accurate difficulty (easy/medium/hard)
- ✅ Real elevation gain (from API)
- ✅ Distance in km
- ✅ Descriptive name (from OSM or generated)
- ✅ County location
- ✅ 5 professional photos (if Pexels key added)
- ✅ GeoJSON geometry for map display

---

## ⏱️ Processing Time:

| Component | Time per Route | Total Time |
|-----------|---------------|------------|
| OSM data fetch | N/A | 2-3 min per county |
| Elevation API | 0.2s | ~3-5 min |
| Pexels photos | 0.1s | ~2 min |
| Database insert | 0.1s | ~1 min |
| **TOTAL** | **~0.5s** | **~30-40 minutes for all 3 counties** |

---

## 🎯 Difficulty Calculation:

### **With Real Elevation Data:**

| Difficulty | Criteria |
|-----------|----------|
| **Easy** | < 10km, < 200m gain, < 5% avg grade |
| **Medium** | 10-20km, 200-400m gain, 5-8% avg grade |
| **Hard** | > 20km, > 400m gain, > 8% avg grade |

This matches real equestrian difficulty standards! 🐴

---

## 📸 Photos System:

For each route, gets 5 photos from Pexels using:
- County name
- "countryside"
- "horseback riding"
- "trail bridleway"

Example searches:
- "Worcestershire countryside horseback riding trail"
- "Herefordshire bridleway countryside"
- "Gloucestershire horseback countryside"

---

## 🧪 Example Output:

```
🗺️  COMPLETE UK BRIDLEWAY IMPORT SYSTEM
============================================================
📍 Importing bridleways from Three Counties
📏 Minimum route length: 3km
📸 Photos per route: 5
============================================================

============================================================
📍 Processing Worcestershire
============================================================

📡 Fetching bridleways for Worcestershire...
   ✅ Found 287 bridleways

🔄 Processing 287 bridleways...

   ✅ Malvern Hills Bridleway (hard, 15.2km, 387m gain, 5 photos)
   ✅ Broadway to Evesham Trail (medium, 8.7km, 156m gain, 5 photos)
   ✅ Worcestershire Way Section (medium, 12.4km, 234m gain, 5 photos)
   ...

📊 Progress: 20 processed (18 ✅, 2 ❌)

   ✅ Pershore Country Loop (easy, 4.2km, 45m gain, 5 photos)
   ...

⏸️  Pausing 10s before next county...

============================================================
📍 Processing Herefordshire
============================================================
...
```

---

## 🚀 After Import:

### Check your routes:

```sql
-- Total routes
SELECT COUNT(*) FROM routes;

-- By difficulty
SELECT difficulty, COUNT(*) FROM routes GROUP BY difficulty;

-- With photos
SELECT COUNT(*) FROM routes WHERE photos_count > 0;

-- Average stats
SELECT 
  AVG(distance_km) as avg_distance,
  AVG(elevation_gain_m) as avg_elevation
FROM routes;
```

### View on your site:
1. Go to `http://localhost:3000/routes`
2. You should see all routes on the map
3. Filter by difficulty
4. Click to see details + photos

---

## 💡 Pro Tips:

### 1. **Run Overnight**
Processing 1,000+ routes takes time. Let it run overnight!

### 2. **Monitor Progress**
```bash
# Run in background and save log:
node scripts/import-uk-bridleways-complete.js > import.log 2>&1 &

# Watch progress:
tail -f import.log
```

### 3. **Restart if Crashes**
Script is safe to re-run - database prevents duplicates.

### 4. **Adjust Filters**
Edit line 20 to change minimum distance:
```javascript
const MIN_ROUTE_LENGTH_KM = 5; // Only routes 5km+ 
```

---

## 🔧 API Keys Needed:

| API | Purpose | Cost | Limit | Required? |
|-----|---------|------|-------|-----------|
| Pexels | Photos | FREE | 200/hour | Optional |
| OpenStreetMap | Route data | FREE | Unlimited | Auto ✅ |
| Open-Elevation | Elevation | FREE | 1000/day | Auto ✅ |

Only Pexels requires manual setup - other APIs work out of the box!

---

## ⚠️ Known Limitations:

1. **Segments vs Full Routes**: OSM bridleways are often in segments. The script filters for 3km+ minimum to avoid tiny sections.

2. **Name Quality**: Some routes have official names in OSM, others will be generic ("Worcestershire Bridleway").

3. **Photo Variety**: All routes get similar countryside photos. This is intentional for consistency.

4. **Processing Time**: ~30-60 minutes for all three counties due to API rate limits.

---

## 🎉 Ready to Run?

1. **Optional**: Add `PEXELS_API_KEY` to `.env.local`
2. **Run**: `node scripts/import-uk-bridleways-complete.js`
3. **Wait**: 30-60 minutes
4. **Check**: Visit `/routes` to see your bridleways!

---

## 🆘 Troubleshooting:

### "504 Gateway Timeout" from OSM
**Fix**: Reduce search radius in the script (line 15)

### "Rate limit exceeded" from Pexels
**Fix**: Script will skip photos and continue

### "Out of memory"
**Fix**: Run with more memory:
```bash
node --max-old-space-size=4096 scripts/import-uk-bridleways-complete.js
```

---

**This will give you REAL, USABLE bridleway routes with difficulty, photos, and elevation!** 🐴🗺️

