# How to Clear Cache and See Latest Deployment

Your browser is showing the OLD version of the app. Follow these steps:

## Option 1: Hard Refresh (Fastest)

**Chrome/Edge:**
1. Open your deployed site
2. Press `Ctrl + Shift + Delete`
3. Select "Cached images and files"
4. Click "Clear data"
5. Press `Ctrl + Shift + R` (hard refresh)

**Or just:** `Ctrl + F5` (Windows) or `Cmd + Shift + R` (Mac)

---

## Option 2: Incognito/Private Window

1. Open a new Incognito/Private window
2. Navigate to your deployed site
3. This bypasses all cache

---

## Option 3: Clear Specific Site Data (Most Thorough)

**Chrome/Edge:**
1. Open DevTools (F12)
2. Go to "Application" tab
3. Click "Clear storage" in left sidebar
4. Check "Cache storage" and "Cached images and files"
5. Click "Clear site data"
6. Refresh page

---

## What You Should See After Clearing Cache

### Waypoints Tab (activeInfoTab === "waypoints")
**Currently showing (OLD):**
- ❌ List of waypoints (Start, Test, cool spot, Finish)
- ❌ "View all" link

**Should show (NEW):**
- ✅ Elevation chart ONLY
- ✅ Floating numbered markers on the chart (S, 1, 2, F)
- ✅ No waypoint list in this tab

### Full Waypoints Panel (Click "View all")
**Should show:**
- ✅ "Click map to add waypoints" text (if you're the owner)
- ✅ Amber "Pending Suggestions" section (if any exist)
- ✅ Full waypoint list with edit/delete buttons
- ✅ Approve/Reject buttons for suggestions

---

## Verifying Deployment is Latest

1. Check your Vercel dashboard - deployment `a17f4b4` should be "Current"
2. In browser DevTools → Network tab, check the `_buildManifest.js` timestamp
3. Look at the HTML source - search for "Click map to add waypoints" in the JS bundle

---

## If Still Seeing Old Version After Cache Clear

**Possible causes:**
1. Vercel is still serving old build (check Vercel dashboard)
2. CDN cache hasn't updated (wait 5-10 minutes)
3. Service worker is caching (disable in DevTools → Application → Service Workers)

**Nuclear option:**
```bash
# In DevTools Console:
navigator.serviceWorker.getRegistrations().then(function(registrations) {
  for(let registration of registrations) {
    registration.unregister()
  }
})
```
Then hard refresh.
