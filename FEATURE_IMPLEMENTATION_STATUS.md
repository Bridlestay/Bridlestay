# Feature Implementation Status

## ✅ COMPLETED

### 1. Messages Page Scrolling Issue
**Status:** FIXED
- Updated auto-scroll behavior to only trigger on new messages
- Fixed scroll position to show newest messages at bottom
- **Files Changed:**
  - `components/messaging/messages-inbox.tsx`

### 2. Pending Questions Visibility
**Status:** IMPLEMENTED
- Only asker and host can see unanswered questions
- Public users only see answered questions
- **Files Changed:**
  - `app/api/questions/[propertyId]/route.ts`

### 3. Delete Functionality for Property Questions
**Status:** ALREADY EXISTS
- Hosts can delete questions on their properties
- **Files:** 
  - `app/api/questions/delete/route.ts` (already working)
  - `components/property-qa.tsx` (delete UI already present)

### 4. Question & Answer Moderation
**Status:** IMPLEMENTED
- Questions and answers are moderated for inappropriate content
- Flagged questions stored in `flagged_questions` table
- **Files Changed:**
  - `supabase/migrations/014_question_moderation.sql` (NEW)
  - `app/api/questions/ask/route.ts`
  - `app/api/questions/answer/route.ts`
  - `app/api/admin/moderation/flagged-questions/route.ts` (NEW)
  - `app/api/admin/moderation/review-question/route.ts` (NEW)

---

## 🚧 IN PROGRESS

### 5. Admin View Flagged Questions in Dashboard
**Status:** API routes ready, UI pending
- **Next Step:** Add "Questions" tab to `components/admin/moderation-dashboard.tsx`

---

## 📋 TODO (Prioritized)

### HIGH PRIORITY

#### 6. Booking Creates Chat Conversation
**Description:** When a booking is made, automatically create a conversation between guest and host
**Files to Modify:**
- `app/api/booking/request/route.ts` - Add message creation after booking
- Create initial system message

#### 7. System Messages (Admin Actions & Welcome)
**Description:** 
- Welcome message on signup
- Admin action notifications (ban, softban, etc.)
- Messages appear at top of inbox
**Database Changes Needed:**
- Add `message_type` column to `messages` table (enum: 'user', 'system', 'admin_action')
- Add `system_priority` boolean

### MEDIUM PRIORITY

#### 8. Admin Ban/Softban/Remove Property
**Description:** Admin can take actions against users and properties with reasons
**Files to Create:**
- `app/api/admin/actions/ban-user/route.ts`
- `app/api/admin/actions/softban-user/route.ts`
- `app/api/admin/actions/remove-property/route.ts`
**Database Changes:**
- Add `banned`, `softbanned`, `ban_reason`, `banned_at` to `users` table
- Add `removed`, `removal_reason` to `properties` table

#### 9. Admin View Proposed Listings
**Description:** Admins can see unpublished properties for verification
**Files to Create:**
- Add tab in admin dashboard for pending properties
- Filter properties by `published = false`

#### 10. Soft Delete Moderation Reviews
**Description:** Reviews can be "deleted" but kept in system
**Database Changes:**
- Add `deleted` boolean to `flagged_messages` and `flagged_questions`

#### 11. Admin View Full Chat from Review
**Description:** Click on flagged message to see entire conversation
**Implementation:**
- Add link/button in moderation dashboard
- Create modal or redirect to messages page with conversation pre-selected

### LOW PRIORITY

#### 12. Profile Pictures Clickable → Public Profiles
**Description:** Click avatar to view user profile (verified users only)
**Files to Create:**
- `app/profile/[userId]/page.tsx` - Public profile view
- Add RLS check for verified users

#### 13. Verify Listing Updates Work
**Description:** Test that host can edit listing and changes reflect for guests
**Action:** Manual testing + potential bug fixes if issues found

---

## 📊 COMPLETION STATS
- **Completed:** 4/12 (33%)
- **In Progress:** 1/12 (8%)
- **Pending:** 7/12 (58%)

---

## 🔄 NEXT STEPS

1. **Finish moderation dashboard** - Add Questions tab
2. **Booking → Chat** - High impact feature
3. **System messages** - Required for admin actions
4. **Admin actions** - Core admin functionality
5. **Polish features** - Profile clicks, public profiles, etc.



