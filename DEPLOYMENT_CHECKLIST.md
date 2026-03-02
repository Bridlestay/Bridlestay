# Waypoint Suggestion System - Deployment Checklist

## ✅ Code Deployment Status
- [x] All code committed and pushed to GitHub (commit c88f622)
- [x] Vercel build succeeded (build completes successfully)
- [x] API routes deployed:
  - `/api/routes/[id]/waypoint-suggestions` (GET + POST)
  - `/api/routes/[id]/waypoint-suggestions/[suggestionId]` (PATCH + DELETE)
  - `/api/routes/[id]/waypoint-suggestions/notify` (POST)

## ⚠️ DATABASE MIGRATIONS - **ACTION REQUIRED**

**CRITICAL:** You must run these migrations in your production Supabase database:

### Migration 072: Waypoint Improvements
```bash
# Run in Supabase SQL Editor:
supabase/migrations/072_waypoint_improvements.sql
```

**What it does:**
- Adds `tag` column to route_waypoints (poi/instruction/caution/note)
- Adds `created_by_user_id` column to track who created waypoints
- Backfills creator IDs from route owners

### Migration 073: Waypoint Suggestions Table
```bash
# Run in Supabase SQL Editor:
supabase/migrations/073_waypoint_suggestions.sql
```

**What it does:**
- Creates `waypoint_suggestions` table for community contributions
- Sets up RLS policies (public can suggest, owners can approve/reject)
- Adds approval workflow (pending → approved/rejected)

## 🔍 How to Verify Deployment

### 1. Check Database Schema
In Supabase SQL Editor, run:
```sql
-- Check if waypoint_suggestions table exists
SELECT EXISTS (
  SELECT FROM information_schema.tables
  WHERE table_name = 'waypoint_suggestions'
);

-- Check if route_waypoints has new columns
SELECT column_name
FROM information_schema.columns
WHERE table_name = 'route_waypoints'
  AND column_name IN ('tag', 'created_by_user_id');
```

### 2. Test API Endpoints
```bash
# Test suggestion creation endpoint (should return 200 or 401, not 404)
curl https://yourapp.vercel.app/api/routes/[some-route-id]/waypoint-suggestions

# Should return:
# - 200 with suggestions list (if authenticated and route exists)
# - 401 if not authenticated
# - 404 if route doesn't exist
# NOT a 404 for the API route itself
```

### 3. Visual Changes to Expect

**For route owners:**
- In route waypoints panel: "Click map to add waypoints" text (instead of "Add" button)
- If suggestions exist: Amber "Pending Suggestions" section appears
- Each suggestion has "Approve" and "Reject" buttons

**For community users:**
- SuggestWaypointDialog opens when adding waypoints (GPS verification)
- Shows "within 500m of route" requirement
- Form fields: name, tag, icon type, description

## 🐛 Troubleshooting

### If you see: "Cannot read properties of undefined"
**Cause:** Migrations not run - code expects `tag` column but it doesn't exist
**Fix:** Run migrations 072 and 073

### If you see: "relation 'waypoint_suggestions' does not exist"
**Cause:** Migration 073 not run
**Fix:** Run migration 073

### If approve/reject buttons don't work
**Check:** Browser console for errors
**Common issue:** RLS policies not applied (migration 073 handles this)

## ✉️ Email Notifications

When a community member suggests a waypoint, the route owner receives an email via Resend:
- Template: `lib/email/templates/waypoint-suggestion.tsx`
- Sends to route owner's email address
- Contains: suggester name, waypoint details, approve/reject links (future enhancement)

## 📊 What Data to Check

**In Supabase:**
```sql
-- Check for any suggestions
SELECT * FROM waypoint_suggestions ORDER BY created_at DESC LIMIT 10;

-- Check waypoint creators
SELECT id, name, created_by_user_id FROM route_waypoints WHERE created_by_user_id IS NOT NULL;

-- Check waypoint tags
SELECT id, name, tag FROM route_waypoints WHERE tag IS NOT NULL;
```

---

## ❌ Common Misunderstanding

**Those "errors" in Vercel build logs ARE NOT FAILURES!**

Next.js prints `console.error()` for routes that can't be statically pre-rendered (API routes using auth). This is NORMAL.

✅ **Successful build looks like:**
```
✓ Compiled successfully
✓ Generating static pages (130/130)
✓ Finalizing page optimization
```

❌ **Actual failure looks like:**
```
✗ Failed to compile
Error: [actual error message]
```

---

## 🎯 Next Steps

1. **Run migrations 072 and 073 in Supabase** (if not already done)
2. **Check your deployed Vercel app** - open a route detail drawer as a route owner
3. **Look for "Pending Suggestions" section** - this confirms the UI is deployed
4. **Test suggestion workflow**:
   - Create a test route
   - As a different user, suggest a waypoint (must be within 500m of route)
   - Check route owner's email
   - As route owner, approve/reject the suggestion

If you don't see the "Pending Suggestions" section, the code IS deployed but migrations are NOT run.
