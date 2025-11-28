# 🗺️ Fetching Real Bridleway Data from OpenStreetMap

This guide will help you replace the mock KML data with **real bridleway data** from OpenStreetMap for Worcestershire, Herefordshire, and Gloucestershire.

---

## 🚀 Quick Start

### Step 1: Fetch the Real Data

Run this command:

```bash
npx ts-node --project tsconfig.json scripts/fetch-real-bridleways.ts
```

**What this does:**
- Queries OpenStreetMap's Overpass API for all bridleways, BOATs, and restricted byways
- Covers all 3 counties: Worcestershire, Herefordshire, Gloucestershire
- Converts the data to KML format
- Saves individual county files + combined files

**Time:** ~2-3 minutes (API has rate limits, script waits between requests)

**Expected Output:**
```
🚀 Starting OpenStreetMap bridleway data fetch...

📡 Fetching bridleways for Worcestershire...
   ✅ Found 245 ways
   ⏳ Waiting 10 seconds before next request...

📡 Fetching bridleways for Herefordshire...
   ✅ Found 189 ways
   ⏳ Waiting 10 seconds before next request...

📡 Fetching bridleways for Gloucestershire...
   ✅ Found 312 ways

📝 Converting to KML format...

   ✅ Saved 245 ways to worcestershire_bridleways_real.kml
   ✅ Saved 189 ways to herefordshire_bridleways_real.kml
   ✅ Saved 312 ways to gloucestershire_bridleways_real.kml
   ✅ Saved combined 746 ways to bridleways_real.kml
   ✅ Saved 87 BOATs/Restricted Byways to boats_real.kml

🎉 Done! Real bridleway data fetched and saved.
```

### Step 2: Replace Mock Files with Real Data

The script creates files with `_real.kml` suffix to avoid overwriting your mocks. To use them:

**Option A: Rename files (recommended)**
```bash
# Windows PowerShell
cd public/kml
mv bridleways.kml bridleways_mock_backup.kml
mv bridleways_real.kml bridleways.kml
mv boats.kml boats_mock_backup.kml
mv boats_real.kml boats.kml
```

**Option B: Delete old and rename**
```bash
# Windows PowerShell
cd public/kml
del bridleways.kml
del boats.kml
mv bridleways_real.kml bridleways.kml
mv boats_real.kml boats.kml
```

### Step 3: Populate Database

Now populate your database with the real routes:

```bash
npx ts-node --project tsconfig.json scripts/generate-initial-routes.ts
```

**Expected:** 700-1000+ routes created (depending on data availability)

---

## 📊 What Data Gets Fetched?

### **Bridleways** (highway=bridleway)
- Legal horse riding paths
- Usually unpaved trails
- Right of way for horses, bikes, and walkers
- **Color in KML:** Red

### **BOATs** (Byways Open to All Traffic)
- Open to all vehicles including motor vehicles
- Often historic routes
- Great for horse riding
- **Color in KML:** Green

### **Restricted Byways**
- Closed to motor vehicles
- Open to horses, bikes, walkers
- Created under CROW Act 2000
- **Color in KML:** Yellow

---

## 🗺️ Coverage Areas

### Worcestershire
- **Bounding Box:** 52.0°N to 52.5°N, -2.7°W to -1.8°W
- **Includes:** Malvern Hills, Bredon Hill, Wyre Forest, Worcester city area
- **Expected Routes:** ~200-300

### Herefordshire
- **Bounding Box:** 51.8°N to 52.3°N, -3.2°W to -2.3°W
- **Includes:** Hereford, Ross-on-Wye, Ledbury, Welsh Borders
- **Expected Routes:** ~150-250

### Gloucestershire
- **Bounding Box:** 51.5°N to 52.2°N, -2.7°W to -1.9°W
- **Includes:** Cotswolds, Forest of Dean, Gloucester, Cheltenham
- **Expected Routes:** ~250-400

---

## 📁 Files Created

After running the script, you'll have:

1. **worcestershire_bridleways_real.kml** - Worcestershire only
2. **herefordshire_bridleways_real.kml** - Herefordshire only
3. **gloucestershire_bridleways_real.kml** - Gloucestershire only
4. **bridleways_real.kml** - All counties combined
5. **boats_real.kml** - Just BOATs and Restricted Byways

---

## 🔍 Data Quality

### What's Included:
- ✅ Official bridleways from OpenStreetMap
- ✅ Names (if available in OSM)
- ✅ Route references (e.g., "WR123")
- ✅ Surface type (if tagged)
- ✅ Access restrictions (if any)
- ✅ Precise GPS coordinates

### Possible Issues:
- ⚠️ Some routes may not have names (script generates them)
- ⚠️ Quality depends on OSM contributor data
- ⚠️ Some rural routes might be missing
- ⚠️ Overpass API might timeout on large queries (script handles this)

---

## 🛠️ Troubleshooting

### "Overpass API timeout"
**Solution:** Script has 90-second timeout. If it fails:
1. Run again (Overpass has cache)
2. Or adjust bounding boxes to smaller areas

### "Failed to fetch data"
**Solution:**
1. Check internet connection
2. Overpass API might be down - check: https://overpass-api.de/api/status
3. Wait a few minutes and retry

### "No data found"
**Solution:**
1. Check bounding box coordinates
2. OpenStreetMap might have limited data for that area
3. Try a different county or larger area

### "Script crashes"
**Solution:**
1. Ensure Node.js and TypeScript are installed
2. Run: `npm install` to ensure dependencies
3. Check console error message

---

## 🎨 Viewing the Data

### In Google Maps:
1. Go to Google My Maps: https://www.google.com/maps/d/
2. Create new map
3. Import KML file
4. View the bridleways overlaid on the map

### In QGIS (for advanced users):
1. Download QGIS: https://qgis.org/
2. Add KML layer
3. Style and analyze the data

### In Your App:
1. The KML files are already in `public/kml/`
2. The map component (`routes-map.tsx`) will load them automatically
3. Toggle layers using the KML Layer Toggles component

---

## 📈 After Populating Database

Once you run `generate-initial-routes.ts`, your database will have:

- **Routes table:** 700-1000+ real routes
- **Geometry:** Actual GPS coordinates
- **Metadata:** Auto-calculated distances, difficulties, terrain
- **Counties:** Properly tagged
- **Map Display:** Routes show on the map immediately

---

## 🔄 Updating Data

OpenStreetMap data changes as contributors update it. To refresh:

1. Delete old KML files
2. Run `fetch-real-bridleways.ts` again
3. Re-run `generate-initial-routes.ts`

**Frequency:** Every 3-6 months is sufficient

---

## ⚖️ Legal & Attribution

### OpenStreetMap License:
- Data is © OpenStreetMap contributors
- Licensed under ODbL (Open Database License)
- You must attribute OpenStreetMap

### Required Attribution:
Add this to your app footer or routes page:

```html
Route data © OpenStreetMap contributors, ODbL
```

Or:

```html
Map data © OpenStreetMap contributors
```

**Link:** https://www.openstreetmap.org/copyright

---

## 🤝 Contributing Back to OSM

If you find errors in the data:
1. Create free OpenStreetMap account
2. Edit the map: https://www.openstreetmap.org/edit
3. Fix bridleway routes, add names, update surfaces
4. Your changes help everyone!

---

## ✅ Checklist

- [ ] Run `fetch-real-bridleways.ts`
- [ ] Verify files created in `public/kml/`
- [ ] Check file sizes (should be >100KB each)
- [ ] Backup old mock files
- [ ] Rename `_real.kml` files to replace mocks
- [ ] Run `generate-initial-routes.ts`
- [ ] Check database has routes (600-1000+)
- [ ] Test map display in app
- [ ] Add OpenStreetMap attribution to footer

---

## 🐴 You're All Set!

Real bridleway data from OpenStreetMap is now powering your routes system!

**Questions?** Check the script output for detailed logs.

**Data issues?** Remember: OSM data quality varies by area. Consider contributing improvements back to OSM!

---

**Built with 🗺️ and OpenStreetMap data**

