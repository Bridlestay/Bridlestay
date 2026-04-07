# Routes System Extraction Guide

This document lists all files needed to recreate the routes system as a standalone webapp.

## 📁 File Structure Overview

```
routes-webapp/
├── app/
│   ├── routes/
│   │   └── page.tsx                    # Main routes page
│   └── api/
│       └── routes/                     # All API endpoints
├── components/
│   └── routes/                         # All route components
├── lib/
│   └── routes/                         # Utility functions
├── public/
│   └── kml/                            # Path data files
└── supabase/
    └── migrations/                     # Database schema
```

---

## 🗂️ FILES TO COPY

### 1. Main Page
```
app/routes/page.tsx
```

### 2. Components (copy entire folder)
```
components/routes/
├── confirm-dialog.tsx          # Confirmation dialogs
├── kml-layer-toggles.tsx       # Path layer toggles (bridleways, boats, etc.)
├── nearby-property-card.tsx    # Property cards on map
├── nearby-routes-widget.tsx    # Widget for nearby routes
├── route-card.tsx              # Route display card
├── route-completion.tsx        # Route completion tracking
├── route-creator.tsx           # Route creation form + toolbar
├── route-detail-drawer.tsx     # Route detail side panel
├── route-filters.tsx           # Search/filter controls
├── route-point-comment.tsx     # Comments on route points
├── routes-map-v2.tsx           # Main Mapbox map component
├── routes-map.tsx              # Legacy map (backup)
└── waypoint-card.tsx           # Waypoint display card
```

### 3. API Routes (copy entire folder)
```
app/api/routes/
├── route.ts                    # GET all routes, POST create route
├── search/
│   └── route.ts                # POST search/filter routes
├── map-routes/
│   └── route.ts                # GET routes for map display
├── comments/
│   └── route.ts                # GET/POST route comments
└── [id]/
    ├── route.ts                # GET/PUT/DELETE single route
    ├── gpx/
    │   └── route.ts            # GET export route as GPX
    ├── complete/
    │   └── route.ts            # POST mark route completed
    ├── nearby-properties/
    │   └── route.ts            # GET properties near route
    ├── photos/
    │   ├── route.ts            # GET/POST route photos
    │   └── [photoId]/
    │       └── route.ts        # DELETE photo
    ├── reviews/
    │   └── route.ts            # GET/POST route reviews
    ├── waypoints/
    │   ├── route.ts            # GET/POST waypoints
    │   └── [waypointId]/
    │       └── route.ts        # PUT/DELETE waypoint
    └── comments/
        ├── route.ts            # GET/POST comments
        └── [commentId]/
            └── route.ts        # DELETE comment
```

### 4. Library Functions (copy entire folder)
```
lib/routes/
├── distance-calculator.ts      # Calculate route distances
├── gpx-converter.ts            # Convert routes to GPX format
├── kml-parser.ts               # Parse KML/GeoJSON path data
└── moderation.ts               # Route content moderation
```

### 5. Public Assets (copy entire folder)
```
public/kml/
├── bridleways.json             # UK bridleway paths
├── boats.json                  # Byways Open to All Traffic
├── footpaths.json              # Public footpaths
├── permissive.json             # Permissive paths
├── augmented.kml               # Additional path data
└── processed/                  # Pre-processed chunks
    ├── footpath_1.json
    ├── footpath_2.json
    ├── footpath_3.json
    └── summary.json
```

### 6. Database Migrations (in order)
```
supabase/migrations/
├── 019_routes_system_CLEANUP.sql       # Cleanup (run first if needed)
├── 019_routes_system.sql               # Main routes schema
├── 020_route_enhancements.sql          # Additional fields
├── 020_fix_routes_foreign_key.sql      # FK fixes
├── 030_route_user_photos.sql           # User photo uploads
└── 037_public_paths_and_route_rework.sql # Public paths & visibility
```

---

## 🔧 DEPENDENCIES NEEDED

### package.json additions:
```json
{
  "dependencies": {
    "mapbox-gl": "^3.8.0",
    "date-fns": "^4.1.0",
    "lucide-react": "^0.454.0",
    "sonner": "^2.0.7"
  }
}
```

### Environment Variables:
```env
NEXT_PUBLIC_MAPBOX_TOKEN=your_mapbox_token
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
```

---

## 🗄️ DATABASE TABLES

The routes system uses these tables:

1. **routes** - Main route data with GeoJSON geometry
2. **route_photos** - Photos uploaded to routes
3. **route_waypoints** - Points of interest along routes
4. **route_comments** - User comments/discussion
5. **route_comment_flags** - Moderation flags
6. **route_reviews** - Star ratings & reviews

---

## 🔗 INTEGRATION POINTS

When embedding back into Cantra:

1. **User Authentication** - Uses Supabase Auth (`auth.uid()`)
2. **Property Links** - `near_property_id` links routes to properties
3. **User Profiles** - References `users` table for avatars/names

---

## 📋 QUICK COPY COMMANDS

Windows PowerShell:
```powershell
# Create destination folders
mkdir routes-webapp\app\routes
mkdir routes-webapp\app\api\routes
mkdir routes-webapp\components\routes
mkdir routes-webapp\lib\routes
mkdir routes-webapp\public\kml
mkdir routes-webapp\supabase\migrations

# Copy files
Copy-Item "app\routes\*" "routes-webapp\app\routes\" -Recurse
Copy-Item "app\api\routes\*" "routes-webapp\app\api\routes\" -Recurse
Copy-Item "components\routes\*" "routes-webapp\components\routes\" -Recurse
Copy-Item "lib\routes\*" "routes-webapp\lib\routes\" -Recurse
Copy-Item "public\kml\*" "routes-webapp\public\kml\" -Recurse

# Copy specific migrations
Copy-Item "supabase\migrations\019_routes_system_CLEANUP.sql" "routes-webapp\supabase\migrations\"
Copy-Item "supabase\migrations\019_routes_system.sql" "routes-webapp\supabase\migrations\"
Copy-Item "supabase\migrations\020_route_enhancements.sql" "routes-webapp\supabase\migrations\"
Copy-Item "supabase\migrations\020_fix_routes_foreign_key.sql" "routes-webapp\supabase\migrations\"
Copy-Item "supabase\migrations\030_route_user_photos.sql" "routes-webapp\supabase\migrations\"
Copy-Item "supabase\migrations\037_public_paths_and_route_rework.sql" "routes-webapp\supabase\migrations\"
```

---

## ⚠️ NOTES

1. The routes system uses **Mapbox GL** for mapping - requires API token
2. Path data (bridleways, etc.) is loaded from `/public/kml/` JSON files
3. Routes are stored as **GeoJSON LineString** geometry
4. Reviews and comments have moderation features built-in
5. GPX export allows users to download routes for GPS devices


