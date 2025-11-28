# 🗺️ Routes System Setup Guide

## Overview

The Routes system is now fully built! This guide will help you set it up and start using it.

---

## ✅ **What's Been Built**

### 1. Database Schema
- `routes` table - stores route data, geometry (GeoJSON), metadata
- `route_photos` table - up to 15 photos per route
- `route_waypoints` table - special spots along routes (viewpoint, water, hazard, etc.)
- `route_comments` table - nested discussion threads on routes
- `route_comment_flags` table - auto-moderation for inappropriate content
- `route_reviews` table - star ratings and reviews for routes
- Full RLS (Row Level Security) policies

### 2. API Endpoints (14 total)
- `POST /api/routes/search` - search/filter routes
- `POST /api/routes` - create new route
- `GET /api/routes/[id]` - get route details
- `PATCH /api/routes/[id]` - update route
- `DELETE /api/routes/[id]` - delete route
- `GET /api/routes/[id]/gpx` - download as GPX file
- Photo, waypoint, comment, and review endpoints

### 3. Frontend Components
- **RoutesMap** - Google Maps with KML layers, drawing tools, route rendering
- **RouteCard** - beautiful route preview cards
- **RouteFilters** - comprehensive filtering (county, difficulty, distance, terrain)
- **KMLLayerToggles** - toggle public rights-of-way overlays
- **RouteDetailDrawer** - full route details with tabs (overview, photos, waypoints, comments)
- **NearbyRoutesWidget** - shows routes near properties

### 4. Main Pages
- `/routes` - 3-tab interface:
  - **Explore** - browse all public routes with filters
  - **My Routes** - manage your created routes
  - **Create Route** - draw new routes on map

### 5. Utilities
- Distance calculator (Haversine formula)
- GPX converter (GeoJSON ↔ GPX)
- KML parser (extract routes from KML files)
- Auto-moderation for comments

### 6. Scripts
- `scripts/generate-initial-routes.ts` - auto-generate routes from KML bridleway data

---

## 🚀 **Setup Steps**

### Step 1: Run the Database Migration

```bash
# In Supabase SQL Editor, run:
supabase/migrations/019_routes_system.sql
```

This will create all necessary tables, triggers, and RLS policies.

### Step 2: Create the Storage Bucket

1. Go to **Supabase Dashboard → Storage**
2. Click **"New Bucket"**
3. Name: `route_photos`
4. **Public**: ✅ Yes
5. **File size limit**: 10 MB
6. **Allowed MIME types**: `image/*`

**RLS Policies** (run in SQL Editor):

```sql
-- Allow authenticated users to upload photos
CREATE POLICY "Authenticated users can upload route photos"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'route_photos');

-- Allow anyone to view public route photos
CREATE POLICY "Anyone can view route photos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'route_photos');

-- Allow owners to delete their photos
CREATE POLICY "Route owners can delete photos"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'route_photos' 
    AND auth.uid() IN (
      SELECT owner_user_id FROM routes WHERE id = (storage.foldername(name))::uuid
    )
  );
```

### Step 3: Verify Environment Variables

Make sure `.env.local` contains:

```env
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_actual_google_maps_key_here
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### Step 4: Restart Dev Server

```bash
npm run dev
```

### Step 5: Generate Initial Routes (Optional)

To auto-populate the database with routes from the KML bridleway data:

```bash
npx ts-node --project tsconfig.json scripts/generate-initial-routes.ts
```

This will:
- Parse `bridleways.kml` and `boats.kml`
- Extract route geometries
- Calculate distances, guess counties, terrain tags, difficulty
- Insert into the `routes` table

**Note**: This script uses the `SUPABASE_SERVICE_ROLE_KEY` to bypass RLS.

---

## 🎯 **How to Use**

### As a Guest (Browse Routes)

1. Go to `/routes`
2. Click **"Explore"** tab
3. Use filters: county, difficulty, distance, terrain
4. Toggle KML layers (bridleways, BOATs, footpaths, permissive paths)
5. Click a route card or polyline on map to see details
6. Download GPX file for GPS devices

### As a Host (Create & Manage Routes)

1. Go to `/routes`
2. Click **"Create Route"** tab
3. Click **"Start Drawing Route"**
4. Click on map to draw your route
5. Fill in details (title, description, county, difficulty, surface)
6. Click **"Save Route"**
7. Your route appears in **"My Routes"** tab
8. You can edit, delete, or mark as "Featured"

### Linking Routes to Properties

When creating a route:
- Set `near_property_id` to link it to a property
- It will show up in the **"Nearby Routes"** widget on that property's page

### Host "Featured" Routes

Hosts can mark their suggested routes as **"Featured"** - these get a badge and priority display.

---

## 🔧 **Advanced Features**

### Photo Uploads

Users can upload up to **15 photos** per route:
- From the route detail drawer
- From comments (future enhancement)
- Photos stored in `route_photos` bucket

### Waypoints (Special Spots)

Mark interesting points along routes:
- Viewpoint, Water, Hazard, Parking, Pub, Gate, Rest, Historic, Wildlife, Other
- Add name, description, photo, icon type
- Display order preserved

### Comments & Discussions

- Nested comment threads on each route
- Auto-moderation for inappropriate content
- Flag/block system (admins review)
- Users can delete their own comments

### Reviews & Ratings

- 1-5 star ratings
- Written reviews
- Average rating and count displayed on cards
- Trigger automatically updates route stats

### GPX Export

Routes can be downloaded as GPX files:
- Click "Download GPX" in route detail drawer
- Compatible with GPS devices, Strava, Komoot, etc.

### KML Layers

Toggle public rights-of-way overlays:
- **Bridleways** - legal horse riding paths
- **BOATs** - Byways Open to All Traffic
- **Footpaths** - walking only (reference)
- **Permissive** - landowner-permitted paths

---

## 🔒 **Security & Permissions**

### RLS Policies

- **Public routes**: Anyone can view
- **Private routes**: Only owner can view
- **Create/Edit/Delete**: Only owner
- **Reviews**: Authenticated users, one per route
- **Comments**: Authenticated users
- **Photos**: Authenticated to upload, public to view

### Auto-Moderation

Comments are scanned for:
- Inappropriate language
- Payment bypass attempts
- Safety concerns
- Spam

Flagged content goes to admin moderation dashboard.

---

## 📊 **Database Triggers**

### `update_route_photos_count`
Automatically updates `routes.photos_count` when photos are added/removed.

### `update_route_comments_count`
Automatically updates `routes.comments_count` when comments are added/removed.

### `update_route_review_stats`
Automatically recalculates `avg_rating` and `review_count` when reviews are added.

---

## 🎨 **Customization**

### Difficulty Colors

```typescript
easy: "bg-green-100 text-green-800"
medium: "bg-amber-100 text-amber-800"
hard: "bg-red-100 text-red-800"
```

### Map Center & Zoom

Default center: `{ lat: 52.0, lng: -2.2 }` (center of 3 counties)
Default zoom: `9`

Adjust in `components/routes/routes-map.tsx`.

### Terrain Tags

Current tags: bridleway, forest, hill, valley, riverside, moorland, coastal, parkland, village, countryside

Add more in `components/routes/route-filters.tsx`.

---

## 🐛 **Troubleshooting**

### "Failed to load map"
- Check `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` is set correctly
- Verify APIs are enabled in Google Cloud Console:
  - Maps JavaScript API
  - Places API
  - Geocoding API
  - Directions API

### KML layers not showing
- Check files exist in `public/kml/`
- KML must be valid XML
- Try serving from a public URL if local doesn't work

### "Failed to create route"
- Ensure you've drawn at least 2 points on the map
- Check Supabase service is running
- Verify `route_photos` bucket exists

### GPX download fails
- Route geometry must be a valid GeoJSON LineString
- Check browser console for errors

---

## 📈 **Future Enhancements** (Stretch Goals)

- [ ] GPX import (upload existing routes)
- [ ] Route sharing (social media)
- [ ] Route collections/playlists
- [ ] Turn-by-turn navigation
- [ ] Offline mode (PWA)
- [ ] Route statistics (elevation gain, surface analysis)
- [ ] Community challenges
- [ ] Route recommendations (ML-based)

---

## ✅ **You're All Set!**

The Routes system is fully functional and ready to use. Visit `/routes` to start exploring and creating routes!

**Questions?** Check the code comments or API route implementations for detailed behavior.

**Have fun riding! 🐴**



