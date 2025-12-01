# BridleStay News & Blog System

## Overview
Complete news/blog system similar to Airbnb, allowing admins to publish updates, announcements, and community stories.

---

## Features

### Public-Facing
✅ Beautiful news listing page (`/news`)
✅ Featured post hero section
✅ Individual post view with related posts
✅ Category badges (Announcement, Feature, Update, Community, Tips, Event)
✅ View count tracking
✅ Responsive grid layout
✅ SEO-optimized with metadata
✅ Author information display
✅ Tags system
✅ Share functionality
✅ Related posts

### Admin Dashboard
✅ Create, edit, delete news posts
✅ Rich text content (HTML supported)
✅ Draft/Published/Archived status
✅ Featured post toggle
✅ Cover image support
✅ Category selection
✅ Tags management
✅ SEO description
✅ View count analytics
✅ Auto-generated URL slugs

---

## Setup

### 1. Run Migration
```bash
supabase db push
```

This will create:
- `news_posts` table with all fields
- Auto-slug generation function
- Auto-publish date trigger
- View count increment function
- RLS policies (public can view published, admins can manage all)

### 2. Access Admin Panel
1. Log in as admin
2. Go to Dashboard
3. Click "News" tab
4. Click "New Post" button

---

## Database Schema

```sql
news_posts {
  id: UUID (primary key)
  title: TEXT (required)
  slug: TEXT (unique, auto-generated)
  excerpt: TEXT (required, for list view)
  content: TEXT (required, full HTML content)
  cover_image_url: TEXT (optional)
  author_id: UUID (references users)
  category: TEXT (announcement|feature|update|community|tips|event)
  status: TEXT (draft|published|archived)
  published_at: TIMESTAMPTZ (auto-set when status = published)
  views_count: INTEGER (default 0)
  featured: BOOLEAN (default false)
  tags: TEXT[] (array of strings)
  seo_description: TEXT (optional)
  created_at: TIMESTAMPTZ
  updated_at: TIMESTAMPTZ
}
```

---

## How to Use

### Creating a News Post

1. **Navigate to Admin Dashboard**
   - Login as admin
   - Go to `/dashboard`
   - Click "News" tab

2. **Click "New Post"**

3. **Fill in the Form:**
   - **Title*** - Main headline (e.g., "Introducing Photo Verification")
   - **Category*** - Select from dropdown
   - **Status*** - Draft (not visible) or Published (live)
   - **Excerpt*** - Brief summary (shows on news list)
   - **Content*** - Full article (HTML supported for formatting)
   - **Cover Image URL** - Optional hero image
   - **Tags** - Comma-separated (e.g., "feature, hosts, verification")
   - **Featured** - Checkbox (shows as hero on /news page)

4. **Click "Create Post"**

### Editing a Post

1. Find the post in the admin list
2. Click the edit icon (pencil)
3. Make changes
4. Click "Update Post"

### Deleting a Post

1. Click the trash icon
2. Confirm deletion
3. Post is permanently removed

---

## Content Formatting

### HTML is Supported

You can use HTML in the content field:

```html
<h2>Subheading</h2>
<p>Paragraph text with <strong>bold</strong> and <em>italic</em>.</p>

<ul>
  <li>List item 1</li>
  <li>List item 2</li>
</ul>

<img src="https://example.com/image.jpg" alt="Description" />

<blockquote>Important quote</blockquote>
```

### Styling

The content uses `prose` classes from Tailwind for beautiful typography:
- Automatic heading styling
- Proper link colors
- List formatting
- Quote blocks
- Code blocks
- Responsive images

---

## Categories & Use Cases

### 📢 Announcement
- Platform updates
- Policy changes
- Service announcements

### ✨ Feature
- New feature launches
- Product updates
- Tool introductions

### 🔄 Update
- Bug fixes
- Performance improvements
- Minor changes

### 👥 Community
- User success stories
- Community highlights
- Member spotlights

### 💡 Tips
- How-to guides
- Best practices
- Expert advice

### 🎉 Event
- Upcoming events
- Webinars
- Community meetups

---

## SEO & Discoverability

### Auto-Generated Elements

1. **URL Slug**
   - Auto-created from title
   - Format: "introducing-new-features"
   - Ensured unique

2. **Meta Tags**
   - Title: Post title + " | BridleStay News"
   - Description: Uses `seo_description` or falls back to `excerpt`
   - Open Graph images for social sharing

3. **Published Date**
   - Auto-set when status changes to "published"
   - Displayed in human-readable format

### View Tracking

- Incremented each time a post is viewed
- Visible in admin dashboard
- Helps identify popular content

---

## Featured Posts

**What is a Featured Post?**
- Displayed as a large hero section at the top of `/news`
- Only ONE post should be featured at a time
- Gets maximum visibility
- Great for major announcements

**How to Feature:**
1. Check the "Featured" checkbox when creating/editing
2. Uncheck previous featured post (or they'll both show, most recent first)

---

## Footer Link

The "BridleStay News" link has been added to the footer under "Discover":
- Desktop: Visible in footer navigation
- Mobile: Accessible via footer menu
- Direct link: `/news`

---

## URLs & Routes

- **News List**: `/news`
- **Individual Post**: `/news/[slug]`
  - Example: `/news/introducing-photo-verification`
- **Admin Manager**: `/dashboard` → "News" tab

---

## Example Posts

### Announcement Example
```
Title: Important Platform Update - June 2024
Category: Announcement
Excerpt: We're making important changes to our booking policies...
Tags: policy, update, important
Featured: Yes
```

### Feature Example
```
Title: Introducing Real-Time Availability Calendar
Category: Feature
Excerpt: Hosts can now see instant booking updates...
Tags: feature, hosts, calendar
Featured: Yes
```

### Community Example
```
Title: Host Spotlight: Sarah's Equestrian Paradise
Category: Community
Excerpt: Meet Sarah, who turned her property into a 5-star destination...
Tags: community, spotlight, hosts
Featured: No
```

---

## Best Practices

### Writing Posts

1. **Clear Headlines** - Be specific and engaging
2. **Strong Excerpts** - Hook readers in 1-2 sentences
3. **Structured Content** - Use headings, lists, short paragraphs
4. **Visual Content** - Always include a cover image
5. **Call to Action** - End with next steps or links

### Timing

- Publish major features/updates during peak hours (9am-5pm GMT)
- Schedule community stories for weekends
- Space out posts (don't publish multiple on same day)

### Images

- **Recommended size**: 1200x630px (optimal for social sharing)
- **Format**: JPG or PNG
- **Upload to**: Supabase Storage or use CDN URL
- **Alt text**: Include in HTML if using in content

---

## Admin Tips

### Draft Workflow
1. Create post as "Draft"
2. Preview on staging
3. Make edits
4. Change to "Published" when ready

### SEO Optimization
- Write compelling titles (50-60 characters)
- Create unique excerpts (150-160 characters)
- Use descriptive slugs
- Add relevant tags
- Fill in SEO description field

### Analytics
- Monitor view counts in admin
- Feature posts with high engagement
- Archive outdated content

---

## Troubleshooting

### Post Not Showing?
- Check status is "Published"
- Verify published_at date is set
- Clear browser cache
- Check RLS policies

### Slug Conflicts?
- System auto-generates unique slugs
- If you manually set slug, ensure it's unique
- Format: lowercase, hyphens, no special chars

### Images Not Loading?
- Verify URL is publicly accessible
- Check CORS settings if using external CDN
- Use HTTPS URLs

---

## Future Enhancements

Potential additions:
- [ ] Rich text editor (WYSIWYG)
- [ ] Image upload directly in admin
- [ ] Draft preview mode
- [ ] Scheduled publishing
- [ ] Comments system
- [ ] Newsletter integration
- [ ] RSS feed
- [ ] Search functionality
- [ ] Category filtering on /news page

---

## Summary

The BridleStay News system is now fully operational! Admins can create beautiful blog posts with rich content, and users can stay informed about platform updates and community stories.

**Quick Start:**
1. Run migration: `supabase db push`
2. Login as admin
3. Go to Dashboard → News tab
4. Click "New Post"
5. Create your first post!

🎉 **Happy Blogging!**

