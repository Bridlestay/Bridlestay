# Mapbox Migration Guide - Complete Step-by-Step

This guide walks you through migrating from Google Maps to Mapbox for the Routes feature.

---

## 🎯 Overview

**What we're doing:** Replacing Google Maps with Mapbox for better outdoor mapping, smoother animations, and free tier (50K loads/month).

**Time required:** ~30-60 minutes

**Skill level:** Beginner-friendly (copy-paste most steps)

---

## Step 1: Add Your Mapbox Token

### 1.1 Find Your Token
Your Mapbox token is visible in your account dashboard. It starts with `pk.` and looks like:
```
pk.eyJ1IjoieW91cnVzZXJuYW1lIiwiYSI...
```

### 1.2 Add to Environment Variables

Open your `.env.local` file (in the project root folder) and add this line at the bottom:

```bash
# Mapbox (for Routes)
NEXT_PUBLIC_MAPBOX_TOKEN=pk.YOUR_TOKEN_HERE
```

**Replace `pk.YOUR_TOKEN_HERE` with your actual token from the Mapbox dashboard.**

⚠️ **Important:** The token MUST start with `NEXT_PUBLIC_` for it to work in the browser.

### 1.3 Verify the Token
After adding, your `.env.local` should have these map-related lines:
```bash
# Google Maps (keep for now, will remove later)
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=AIza...

# Mapbox (new)
NEXT_PUBLIC_MAPBOX_TOKEN=pk.eyJ1...
```

---

## Step 2: Install Mapbox Packages

Open your terminal in the project folder and run:

```bash
npm install mapbox-gl @mapbox/mapbox-gl-geocoder
```

**What these do:**
- `mapbox-gl` - The main map library (like Google Maps JS API)
- `@mapbox/mapbox-gl-geocoder` - Search/autocomplete for places

### 2.1 Install TypeScript Types (for code hints)

```bash
npm install --save-dev @types/mapbox-gl
```

---

## Step 3: Restart Your Dev Server

After installing packages, restart your development server:

1. Press `Ctrl + C` in the terminal to stop the server
2. Run `npm run dev` again
3. Wait for it to compile

---

## Step 4: Test the New Map

After I create the new map component, you'll be able to test it by:

1. Going to http://localhost:3000/routes
2. The map should load with the "Outdoors" style (shows trails!)
3. You should be able to pan with one finger

---

## Common Issues & Solutions

### "Map not loading"
- Check that your token is correct in `.env.local`
- Make sure you restarted the dev server
- Check browser console for errors (F12 → Console tab)

### "Token invalid" error
- Your token must start with `pk.`
- Copy the full token from Mapbox dashboard
- Don't include any quotes around the token in .env.local

### "Map loads but no tiles"
- Your token might be restricted to certain URLs
- Go to Mapbox dashboard → Tokens → Edit your token
- Add `localhost` and your production domain to allowed URLs

---

## What's Being Migrated

| Feature | Google Maps | Mapbox |
|---------|------------|--------|
| Map display | ✅ Done | 🔄 Migrating |
| Route pins | ✅ Done | 🔄 Migrating |
| Route polylines | ✅ Done | 🔄 Migrating |
| Pin clustering | ✅ Done | 🔄 Migrating |
| Route creation | ✅ Done | 🔄 Migrating |
| Snap to roads | ✅ Done | 🔄 Migrating |
| Static thumbnails | ✅ Done | 🔄 Migrating |
| Route recording | Basic | Better with Mapbox |

---

## After Migration Benefits

1. **Better trail visibility** - Mapbox "Outdoors" style shows bridleways, footpaths
2. **Smoother animations** - 60fps fly-to and pan animations
3. **Cheaper** - 50K free loads vs Google's pay-per-use
4. **Offline support** - Can download map tiles for offline use
5. **Custom styling** - Full control over map appearance

---

*Guide created: 2026-02-02*

