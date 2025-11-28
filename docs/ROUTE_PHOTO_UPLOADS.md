# 📸 Route Photo Upload System

## Overview

Users can now upload their own photos to routes they've completed, building a community-driven photo library!

---

## ✅ How It Works:

### 1. **Mark Route as Complete**
- Users click "Mark as Completed" on any route detail page
- Optional: Add notes and a 1-5 star rating
- This unlocks photo upload capability

### 2. **Upload Photos**
- After completing a route, users see an "Upload Photo" button
- Click to select a photo from their device
- Photos are validated (type, size) and uploaded to Supabase Storage
- Photos appear instantly in the "Community Photos" section

### 3. **View Community Photos**
- All users can see photos uploaded by the community
- Photos show the username of the uploader
- Users can delete their own photos anytime

---

## 🔒 Security & Validation:

### **File Validation:**
- ✅ Max file size: 10MB
- ✅ Allowed types: JPG, PNG, WebP, HEIC/HEIF
- ✅ MIME type checking
- ✅ File extension validation

### **Permissions:**
- ✅ Only users who've completed a route can upload photos
- ✅ Users can only delete their own photos
- ✅ All photos are public (anyone can view)
- ✅ RLS policies enforce all rules at database level

---

## 🗂️ Database Schema:

### **route_completions**
Tracks which users have completed which routes.

```sql
route_id (UUID)         -- References routes table
user_id (UUID)          -- References users table
completed_at (TIMESTAMP)
notes (TEXT)           -- Optional completion notes
rating (INTEGER)       -- 1-5 star rating
```

### **route_user_photos**
Stores user-uploaded photos.

```sql
route_id (UUID)        -- References routes table
user_id (UUID)         -- References users table
url (TEXT)            -- Supabase Storage URL
caption (TEXT)        -- Optional caption
uploaded_at (TIMESTAMP)
order_index (INTEGER)
```

---

## 📁 Storage:

### **Bucket: `route-photos`**
- Public read access
- Authenticated users can upload
- Path structure: `{userId}/{timestamp}.{ext}`
- Users can only update/delete their own photos

---

## 🎨 UI Components:

### **RouteCompletion Component**
Location: `components/routes/route-completion.tsx`

Features:
- Mark route as complete dialog
- Star rating system
- Notes input
- Photo upload button
- Photo gallery (user's photos + community photos)
- Delete photo functionality

### **Integration**
Added to: `components/routes/route-detail-drawer.tsx`
- Appears in the "Photos" tab
- Shows completion status
- Displays upload interface for completed routes
- Shows community photos from other users

---

## 🚀 API Endpoints:

### **POST `/api/routes/[id]/complete`**
Mark a route as completed
- Body: `{ notes?, rating? }`
- Returns: Completion record

### **GET `/api/routes/[id]/complete`**
Check if user has completed a route
- Returns: `{ completed: boolean, completion? }`

### **DELETE `/api/routes/[id]/complete`**
Remove completion (unmark as complete)

### **POST `/api/routes/[id]/photos`**
Upload a photo to a completed route
- Body: FormData with `file` and optional `caption`
- Validates user has completed route
- Returns: Photo record with uploader info

### **GET `/api/routes/[id]/photos`**
Get all photos for a route
- Returns: `{ userPhotos: [], stockPhotos: [] }`
- Includes uploader usernames and avatars

### **DELETE `/api/routes/[id]/photos?photoId=[id]`**
Delete a user's own photo

---

## 💡 Benefits:

1. **Community-Driven**: Users build the photo library together
2. **Authentic**: Real photos from people who've actually traveled the routes
3. **Engagement**: Encourages users to complete routes and share
4. **Social Proof**: Shows route popularity through completion count
5. **Trust**: Real photos build trust vs. stock imagery

---

## 🎯 Future Enhancements (Ideas):

- Photo moderation system (flag inappropriate photos)
- Photo likes/reactions
- Photo comments
- Featured photo of the week
- Download high-res versions
- Photo captions required (not optional)
- Photo contests/challenges

---

## 📊 Stats to Track:

- Total completed routes per user
- Total photos uploaded per user
- Most photographed routes
- Routes with no photos yet (opportunities)
- Average rating per route
- Completion rate (views vs completions)

---

This system turns your routes from static data into living, community-driven content! 🎉

