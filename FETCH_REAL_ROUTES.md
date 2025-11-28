# 🚀 Quick Start: Get Real Bridleway Data

## Run These Commands in Order:

### 1. Fetch Real Data from OpenStreetMap
```bash
npx ts-node --project tsconfig.json scripts/fetch-real-bridleways.ts
```
⏱️ Takes ~2-3 minutes (waits between API calls)

### 2. Replace Mock Files
```powershell
# Backup old files
cd public/kml
mv bridleways.kml bridleways_mock_backup.kml
mv boats.kml boats_mock_backup.kml

# Use real data
mv bridleways_real.kml bridleways.kml
mv boats_real.kml boats.kml

cd ../..
```

### 3. Populate Database
```bash
npx ts-node --project tsconfig.json scripts/generate-initial-routes.ts
```

## ✅ Done!

You now have **700-1000+ real bridleway routes** from OpenStreetMap covering:
- Worcestershire
- Herefordshire  
- Gloucestershire

---

## 📊 What You'll Get:

- ✅ Real bridleway GPS coordinates
- ✅ BOATs (Byways Open to All Traffic)
- ✅ Restricted byways
- ✅ Route names (where available)
- ✅ Surface types (where tagged)
- ✅ Access information

## ⚖️ Attribution Required:

Add to your footer:
```
Route data © OpenStreetMap contributors
```

---

**Full documentation:** See `scripts/REAL_BRIDLEWAY_DATA_GUIDE.md`

