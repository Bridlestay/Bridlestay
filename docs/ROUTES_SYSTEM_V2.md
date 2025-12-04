# Routes System V2 - User-Created Routes

## Overview

The routes system has been completely reworked to match the OS Maps route creator design. Routes are now **user-created only** - there are no pre-loaded routes. The map displays public rights of way (bridleways, BOATs, footpaths, permissive paths) as toggleable layers that users can snap their routes to.

## Key Features

### 1. Route Creation (Like OS Maps)

The route creator allows users to:

- **Activity Type**: Choose between Linear (A to B) or Circular (loop) routes
- **Plot waypoints**: Click on the map to add waypoints
- **Snap to paths**: Automatically snap waypoints to bridleways, footpaths, etc.
- **Drag waypoints**: Adjust route by dragging waypoint markers
- **Undo/Redo**: Undo last action with history support
- **Reverse route**: Flip the direction of the entire route
- **Clear route**: Remove all waypoints and start over

### 2. Route Details

- **Route name**: Up to 100 characters
- **Description**: Up to 5000 characters
- **Visibility**:
  - Private: Only you can see
  - Anyone with Link: Share via unique URL
  - Public: Visible to all users
- **Difficulty**: Unrated, Easy, Moderate, Difficult, Severe

### 3. Path Layer Toggles

Toggle visibility of public rights of way:
- **Bridleways** (brown) - Horse riding permitted
- **BOATs** (green) - Byways Open to All Traffic
- **Footpaths** (orange) - Walking only
- **Permissive Paths** (purple) - Landowner permitted

### 4. Map Toolbar

Located top-right of the map:
- **Plot** (pencil) - Toggle plotting mode
- **Snap** (magnet) - Toggle snap-to-path
- **Undo** - Undo last waypoint
- **Remove** (trash) - Clear all waypoints
- **Reverse** - Flip route direction

### 5. Route Statistics

Real-time calculation of:
- **Route time**: Estimated riding time (10 km/h average)
- **Route distance**: Total distance in km or miles
- **Unit toggle**: Switch between Kilometres and Miles

## Database Schema

### Routes Table Updates

```sql
-- New columns added to routes table
route_type: 'circular' | 'linear'
visibility: 'private' | 'link' | 'public'
share_token: unique token for 'link' visibility
estimated_time_minutes: calculated ride time
```

### New Tables

#### public_paths
Stores public rights of way data:
- Bridleways, BOATs, footpaths, permissive paths
- GeoJSON geometry for rendering
- Source attribution (OS OpenData, etc.)

#### route_point_comments
Comments at specific locations on routes:
- Lat/lng coordinates
- Comment text
- Optional photo
- User attribution

#### route_recordings
For future GPS tracking feature:
- Recorded GPS tracks
- Start/end timestamps
- Duration and distance

## API Endpoints

### Routes
- `POST /api/routes` - Create new route
- `GET /api/routes/search` - Search public routes
- `GET /api/routes/map-routes` - Get routes for map display
- `DELETE /api/routes/[id]` - Delete user's route

### Path Data
- `GET /api/paths/[type]` - Get path GeoJSON (bridleways, boats, footpaths, permissive)

### Comments
- `GET /api/routes/comments?routeId=` - Get route comments
- `POST /api/routes/comments` - Add comment at point
- `DELETE /api/routes/comments?commentId=` - Delete own comment

## Future Enhancements

1. **GPS Route Recording**
   - Start/pause/stop recording
   - Real-time location tracking
   - Save recorded routes

2. **Route Navigation**
   - Turn-by-turn directions
   - Voice guidance
   - Off-route alerts

3. **Nearby Properties**
   - Show properties near route
   - Distance to each property
   - Property cards on map

4. **Route Sharing**
   - Generate shareable links
   - Embed routes on external sites
   - Social media sharing

5. **Route Import/Export**
   - Import GPX files
   - Export to GPX/KML
   - Print route maps

