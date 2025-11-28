# 🚀 Quick Start - Process augmented.kml

## What This Script Does:
✅ Reads your 900MB KML file  
✅ Calculates difficulty automatically (easy/moderate/challenging/difficult)  
✅ Auto-generates route names from location data (FREE)  
✅ Fetches photos from Unsplash (optional)  
✅ Inserts everything into your database  

---

## Step 1: (Optional) Get Unsplash API Key for Photos

**If you want automatic photos:**
1. Go to https://unsplash.com/developers
2. Sign up (free)
3. Create a new app (30 seconds)
4. Copy your "Access Key"
5. Add to `.env.local`:
   ```bash
   UNSPLASH_ACCESS_KEY=your_access_key_here
   ```

**To skip photos:** Just don't add the key - script will work fine without it!

---

## Step 2: Run the Script

Open PowerShell/Terminal in your project folder and run:

```bash
node scripts/process-massive-kml.js augmented.kml
```

---

## What You'll See:

```
🗺️  Starting KML Processing...
📁 File: augmented.kml
📊 Batch size: 50 routes

📖 Reading KML file... (this may take a while)
🔍 Parsing XML...
✅ Found 1,245 routes in KML file

📦 Processing batch 1/25
   Routes 1 to 50
   ✅ Broadway to Worcestershire Trail (moderate, 8.2km)
   ✅ Malvern Hills Bridleway (challenging, 15.4km)
   ...
```

---

## Expected Processing Time:

| Routes | Estimated Time |
|--------|---------------|
| 1,000 | ~30 minutes |
| 2,000 | ~1 hour |
| 5,000 | ~2.5 hours |

**Why so slow?**  
We're making 1 API request per route (free geocoding) with 1-second rate limits to be respectful.

**Pro Tip:** Let it run in the background, go make some tea! ☕

---

## If Something Goes Wrong:

### "File not found"
Make sure `augmented.kml` is in the project root folder.

### "Out of memory"
Run with more memory:
```bash
node --max-old-space-size=4096 scripts/process-massive-kml.js augmented.kml
```

### Script crashes mid-way
**Don't worry!** Just run it again. The database prevents duplicates, so it'll skip routes already processed and continue where it left off.

---

## After Processing:

Check your routes in the database:
```sql
SELECT COUNT(*) FROM routes WHERE is_system_route = true;
SELECT difficulty, COUNT(*) FROM routes GROUP BY difficulty;
```

Or visit: `http://localhost:3000/routes`

---

## Ready? Run This Now:

```bash
node scripts/process-massive-kml.js augmented.kml
```

🎉 Let it cook and you'll have hundreds/thousands of routes with difficulty, names, and photos!

