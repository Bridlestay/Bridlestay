# 🔐 Admin Setup Guide

## Where to Run SQL Commands

You run SQL commands in the **Supabase Dashboard**:

### Step 1: Go to Supabase SQL Editor
1. Open your browser and go to: https://supabase.com
2. Sign in to your account
3. Select your **BridleStay** project
4. Click **"SQL Editor"** in the left sidebar (it has a `</>` icon)
5. Click **"New query"** button (top right)

### Step 2: Run the Migration
1. Open the file: `supabase/migrations/006_arena_fields_and_verification.sql`
2. **Copy ALL the contents** of that file
3. Paste it into the SQL Editor in Supabase
4. Click the **"Run"** button (or press Ctrl+Enter / Cmd+Enter)
5. You should see: ✅ "Success. No rows returned"

### Step 3: Make Yourself Admin
1. First, find your User ID:
   - In Supabase Dashboard, click **"Authentication"** in the left sidebar
   - Click **"Users"** tab
   - Find your account (the one you want to make admin)
   - **Copy the UUID** (it looks like: `a1b2c3d4-e5f6-7890-abcd-ef1234567890`)

2. Go back to **SQL Editor** → **New query**

3. Paste this query (replace `YOUR-USER-ID-HERE` with the UUID you copied):
   ```sql
   UPDATE users 
   SET role = 'admin', admin_verified = TRUE 
   WHERE id = 'YOUR-USER-ID-HERE';
   ```

4. Click **"Run"**

5. You should see: ✅ "Success. 1 rows affected"

### Step 4: Verify All Existing Users (Optional)
If you have test accounts that should be verified:

```sql
-- Verify all existing users
UPDATE users 
SET admin_verified = TRUE 
WHERE created_at < NOW();
```

Or verify specific users by email:
```sql
-- Verify specific user
UPDATE users 
SET admin_verified = TRUE 
WHERE email = 'user@example.com';
```

---

## ✅ Testing Your Admin Account

1. **Refresh your browser** on localhost:3000
2. Click your profile picture (top right)
3. You should now see: **"Admin Dashboard"** in the dropdown menu
4. Click it to go to `/admin`
5. You should see two tabs:
   - **Unverified Users** - List of accounts waiting for approval
   - **Unverified Properties** - List of published properties waiting for verification

---

## 🎖️ Verification Badges

### Where Badges Appear:

**For Properties:**
- ✅ Property cards on homepage (top right corner)
- ✅ Property detail page (next to property name)
- ✅ "My Listings" page (next to each property name)

**For Users:**
- ✅ Profile page (next to user name)
- ✅ Account settings page (next to page title)

### What Badges Look Like:
- **Blue badge** with a checkmark icon
- Text: "Verified Property" or "Verified Account"
- Only shows when `admin_verified = TRUE`

---

## 🔒 How Verification Works

### For New Users:
1. User signs up → `admin_verified = FALSE` (default)
2. User can browse properties ✅
3. User **cannot** book properties ❌
4. They see: *"Your account must be verified before you can make bookings"*
5. Admin verifies them → `admin_verified = TRUE`
6. User can now book properties ✅
7. Blue "Verified Account" badge appears on their profile

### For New Properties:
1. Host creates and publishes property → `admin_verified = FALSE` (default)
2. Property appears on homepage ✅
3. Admin reviews property on admin dashboard
4. Admin clicks "Verify" → `admin_verified = TRUE`
5. Blue "Verified Property" badge appears on the listing

---

## 🚨 Troubleshooting

### "I don't see Admin Dashboard in my menu"
- Make sure you ran the UPDATE query with YOUR user ID
- Log out and log back in
- Check in Supabase Authentication → Users → verify role = 'admin'

### "Migration failed with syntax error"
- Make sure you copied the ENTIRE migration file
- Check that the file is: `006_arena_fields_and_verification.sql`
- The error in your screenshot was because the query path had `supabase/` at the start - just paste the file contents, not the filename

### "Badges don't show up"
- Make sure the migration ran successfully
- Check that `admin_verified` column exists:
  ```sql
  SELECT id, name, admin_verified FROM users LIMIT 5;
  SELECT id, name, admin_verified FROM properties LIMIT 5;
  ```
- Refresh the page (Ctrl+R / Cmd+R)

### "I can't verify users/properties"
- Make sure you're logged in as an admin
- Check browser console (F12) for errors
- Make sure the API routes were created correctly

---

## 📝 Quick Reference

### Admin Dashboard URL:
```
http://localhost:3000/admin
```

### Verify User Manually:
```sql
UPDATE users 
SET admin_verified = TRUE, verified_at = NOW(), verified_by = 'YOUR-ADMIN-ID'
WHERE email = 'user@example.com';
```

### Verify Property Manually:
```sql
UPDATE properties 
SET admin_verified = TRUE, verified_at = NOW(), verified_by = 'YOUR-ADMIN-ID'
WHERE id = 'PROPERTY-ID';
```

### Check Who's Verified:
```sql
-- Verified users
SELECT name, email, role, admin_verified FROM users WHERE admin_verified = TRUE;

-- Verified properties
SELECT name, city, county, admin_verified FROM properties WHERE admin_verified = TRUE;
```

---

## 🎉 You're All Set!

Once you've:
1. ✅ Run the migration
2. ✅ Made yourself admin
3. ✅ Refreshed your browser

You can now:
- Access the admin dashboard
- Verify new users
- Verify published properties
- See blue verification badges throughout the site

---

**Need help?** Check the browser console (F12) and Supabase logs for error messages.



