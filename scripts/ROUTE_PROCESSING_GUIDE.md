# 🗺️ Massive KML Processing Guide

## Overview
This script processes your 900MB KML file and automatically:
- ✅ Calculates route difficulty (easy/moderate/challenging/difficult)
- ✅ Auto-generates route names from location data (FREE)
- ✅ Fetches photos from Unsplash (FREE - optional)
- ✅ Handles 900MB+ files without memory issues
- ✅ Processes routes in batches with progress tracking

---

## 🚀 Quick Start

### 1. Install Dependencies
```bash
npm install xml2js
```

### 2. Get Unsplash API Key (Optional - for photos)
1. Go to https://unsplash.com/developers
2. Create a free account
3. Create a new app (takes 30 seconds)
4. Copy your "Access Key"
5. Add to `.env.local`:
   ```bash
   UNSPLASH_ACCESS_KEY=your_access_key_here
   ```

**Note:** Free tier = 50 requests/hour (plenty for batched processing)

### 3. Place Your KML File
Put your KML file in the project root or note its path:
```
/path/to/massive-routes.kml
```

### 4. Run the Script
```bash
node scripts/process-massive-kml.js path/to/your-file.kml
```

Or if in project root:
```bash
node scripts/process-massive-kml.js massive-routes.kml
```

---

## 🎯 How It Works

### **Automatic Difficulty Calculation**

Based on scientific metrics:

| Difficulty | Criteria |
|-----------|----------|
| **Easy** | < 5km, < 50m gain/km, < 5% grade |
| **Moderate** | 5-15km, 50-100m gain/km, 5-10% grade |
| **Challenging** | 15-25km, 100-150m gain/km, 10-15% grade |
| **Difficult** | > 25km, > 150m gain/km, > 15% grade |

### **Automatic Route Naming**

Uses **OpenStreetMap Nominatim** (FREE, no API key):
- Reverse geocodes the route's midpoint
- Extracts village/town/county names
- Generates descriptive names like:
  - "Broadway to Worcestershire Trail"
  - "Malvern Hills Bridleway"
  - "Cotswolds Loop"

### **Automatic Photo Fetching**

Uses **Unsplash API** (FREE):
- Searches for relevant countryside images
- Uses county + "countryside horseback riding trail"
- Falls back to generic UK countryside if no county
- Rate limited to stay within free tier

---

## 📊 Processing Details

### Batch Processing
- Processes **50 routes at a time**
- 2-second pause between batches
- 1-second pause per route (Nominatim rate limit)
- Progress tracking in real-time

### Memory Efficient
- Streams large files
- Processes in chunks
- Won't crash on 900MB+ files

### Example Output
```
🗺️  Starting KML Processing...
📁 File: massive-routes.kml
📊 Batch size: 50 routes

📖 Reading KML file... (this may take a while)
🔍 Parsing XML...
✅ Found 1,245 routes in KML file

📦 Processing batch 1/25
   Routes 1 to 50
   ✅ Broadway to Worcestershire Trail (moderate, 8.2km)
   ✅ Malvern Hills Bridleway (challenging, 15.4km)
   ✅ Cotswolds Loop (easy, 4.1km)
   ...

⏸️  Pausing 2s before next batch...

============================================================
🎉 Processing Complete!
============================================================
✅ Successfully processed: 1,200 routes
❌ Failed: 45 routes
📊 Total: 1,245 routes
============================================================
```

---

## ⚙️ Configuration Options

### Adjust Batch Size
Edit line 17 in `process-massive-kml.js`:
```javascript
const BATCH_SIZE = 50; // Change to 25 or 100
```

### Adjust Delay Between Batches
Edit line 18:
```javascript
const DELAY_BETWEEN_BATCHES = 2000; // 2 seconds (2000ms)
```

### Change Default County
Edit line 262:
```javascript
county: 'Worcestershire', // Change to your region
```

---

## 🎨 Photo Sources (Alternatives)

### Option 1: Unsplash (Recommended)
- ✅ Free (50 requests/hour)
- ✅ High quality
- ✅ No attribution required in emails
- 📸 1 million+ photos

### Option 2: Skip Photos
Don't set `UNSPLASH_ACCESS_KEY` - script will skip photos
You can add them manually later

### Option 3: Pexels API
Similar to Unsplash, also free:
```javascript
// Replace Unsplash fetch with:
const response = await fetch(
  `https://api.pexels.com/v1/search?query=${searchQuery}&per_page=1`,
  {
    headers: {
      'Authorization': process.env.PEXELS_API_KEY
    }
  }
);
```

---

## 🔧 Troubleshooting

### "No routes found in KML file"
**Issue:** KML structure not recognized

**Fix:** Check your KML structure. Update lines 100-102:
```javascript
const placemarks = result.kml?.Document?.[0]?.Placemark || 
                   result.kml?.Folder?.[0]?.Placemark ||
                   result.kml?.Document?.[0]?.Folder?.[0]?.Placemark || // Add if nested
                   [];
```

### "Memory overflow" or "JavaScript heap out of memory"
**Fix:** Increase Node.js memory:
```bash
node --max-old-space-size=4096 scripts/process-massive-kml.js your-file.kml
```

### "Rate limit exceeded" (Nominatim)
**Issue:** Too many requests to OSM

**Fix:** Increase delay (line 213):
```javascript
await sleep(2000); // Change from 1000 to 2000 (2 seconds)
```

### Routes have generic names
**Issue:** Reverse geocoding not finding location

**Options:**
1. Use route description from KML if available
2. Use sequential numbering: "Worcestershire Route 1", "Worcestershire Route 2"
3. Manually add names later in admin dashboard

---

## 📈 Performance Estimates

For **900MB KML** with ~1,000-2,000 routes:

| Task | Time per Route | Total Time |
|------|----------------|------------|
| Parse KML | N/A | 1-2 minutes |
| Calculate difficulty | 0.1s | Instant |
| Get route name (Nominatim) | 1s | ~30 minutes |
| Fetch photo (Unsplash) | 0.1s | ~3 minutes |
| **Total** | **~1s** | **~30-40 minutes** |

### Tips to Speed Up:
1. **Skip photos initially** - Add them later in batches
2. **Increase batch size** to 100 routes
3. **Use multiple API keys** (if you have them)
4. **Run overnight** if processing 5,000+ routes

---

## 🎯 After Processing

### Verify Routes
```sql
-- Check total routes
SELECT COUNT(*) FROM routes WHERE is_system_route = true;

-- Check difficulty distribution
SELECT difficulty, COUNT(*) FROM routes GROUP BY difficulty;

-- Check routes with photos
SELECT COUNT(*) FROM routes WHERE photo_url IS NOT NULL;

-- Check average distance
SELECT AVG(distance_km) FROM routes;
```

### Update Missing Data
If some routes failed or have generic names:

1. **Admin Dashboard** → Routes section
2. Bulk edit routes
3. Add manual names/photos as needed

---

## 💡 Pro Tips

1. **Test with small file first**: Extract 50 routes from your KML to test
2. **Run in background**: Use `screen` or `tmux` on Linux/Mac
3. **Save progress**: Script auto-saves to database as it goes
4. **Monitor logs**: Redirect output to file for later review
   ```bash
   node scripts/process-massive-kml.js your-file.kml > processing.log 2>&1
   ```

---

## 🆘 Need Help?

1. Check the console output for specific errors
2. Look for the last successfully processed route
3. Script is safe to restart - won't duplicate routes
4. Database has unique constraints to prevent duplicates

---

## ✅ Success Checklist

- [ ] Install `xml2js`: `npm install xml2js`
- [ ] (Optional) Get Unsplash API key
- [ ] Add API key to `.env.local`
- [ ] Place KML file in accessible location
- [ ] Run script: `node scripts/process-massive-kml.js path-to-kml`
- [ ] Monitor progress (30-60 minutes expected)
- [ ] Verify routes in database
- [ ] Check routes on map
- [ ] Celebrate! 🎉

---

**Your routes will have:**
- ✅ Accurate difficulty ratings
- ✅ Descriptive location-based names
- ✅ Professional photos (if Unsplash enabled)
- ✅ Elevation data and statistics
- ✅ Estimated durations
- ✅ Ready to display on the map!

