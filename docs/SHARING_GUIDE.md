# 📤 Sharing BridleStay Project Guide

## 🎯 **Best Option: Git + GitHub (Recommended)**

This allows your partner to:
- ✅ Clone the code
- ✅ Make changes
- ✅ Test locally
- ✅ Push updates
- ✅ Review changes together

### **Step 1: Create GitHub Repository**

1. Go to [GitHub.com](https://github.com) and sign in
2. Click **"New repository"** (green button)
3. Name it: `BridleStay` (or whatever you prefer)
4. Set to **Private** (recommended for now)
5. **Don't** initialize with README, .gitignore, or license (we already have these)
6. Click **"Create repository"**

### **Step 2: Initialize Git (if not already done)**

```bash
# In your project folder
git init
git add .
git commit -m "Initial commit - BridleStay routes system"
```

### **Step 3: Connect to GitHub**

```bash
# Replace YOUR_USERNAME with your GitHub username
git remote add origin https://github.com/YOUR_USERNAME/BridleStay.git
git branch -M main
git push -u origin main
```

### **Step 4: Share with Partner**

1. Go to your GitHub repository
2. Click **Settings** → **Collaborators**
3. Click **"Add people"**
4. Enter your partner's GitHub username or email
5. They'll receive an invitation email

### **Step 5: Partner Setup**

Your partner needs to:

```bash
# Clone the repository
git clone https://github.com/YOUR_USERNAME/BridleStay.git
cd BridleStay

# Install dependencies
npm install

# Create .env.local file (you'll need to share env vars - see below)
# Copy .env.local.example or create new file

# Run dev server
npm run dev
```

---

## 🔐 **Sharing Environment Variables**

**IMPORTANT:** Never commit `.env.local` to Git! It contains secrets.

### **Option A: Share via Secure Channel**

1. Create a `.env.local.example` file (template without real keys):
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url_here
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
   NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_google_maps_key_here
   NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=your_stripe_key_here
   NEXT_PUBLIC_APP_URL=http://localhost:3000
   ```

2. Share the **actual values** via:
   - **Password manager** (1Password, LastPass, Bitwarden)
   - **Encrypted message** (Signal, WhatsApp with encryption)
   - **Secure document** (Google Drive with restricted access)
   - **In person** (safest)

### **Option B: Use Supabase Team Access**

1. Go to **Supabase Dashboard** → **Settings** → **Team**
2. Invite your partner by email
3. They'll get their own access to the database
4. They can see the connection strings in their dashboard

---

## 🗄️ **Database Access**

### **Option 1: Shared Supabase Project (Easiest)**

- Both use the same Supabase project
- Real-time collaboration on data
- **Warning:** Changes affect both of you

### **Option 2: Separate Supabase Projects**

- Partner creates their own Supabase project
- They run migrations on their own database
- No conflicts, but separate data

**Recommendation:** Start with shared project, move to separate if needed.

---

## 🚀 **Deployment Options (For Testing Together)**

### **Option A: Vercel (Recommended - Free)**

1. Push code to GitHub
2. Go to [Vercel.com](https://vercel.com)
3. Sign in with GitHub
4. Click **"New Project"**
5. Import your `BridleStay` repository
6. Add environment variables in Vercel dashboard
7. Deploy!

**Benefits:**
- ✅ Free tier available
- ✅ Automatic deployments on git push
- ✅ Preview URLs for testing
- ✅ Easy to share with partner

### **Option B: Netlify**

Similar to Vercel, also free tier available.

### **Option C: Railway / Render**

Paid options with more control.

---

## 📋 **Quick Setup Checklist for Partner**

Your partner needs:

- [ ] **Node.js** installed (v18 or higher)
- [ ] **Git** installed
- [ ] **Code editor** (VS Code recommended)
- [ ] **GitHub account** (for collaboration)
- [ ] **Access to:**
  - [ ] GitHub repository (invited as collaborator)
  - [ ] `.env.local` file with all keys
  - [ ] Supabase project (if sharing database)

---

## 🔒 **Security Best Practices**

1. ✅ **Never commit `.env.local`** - Add to `.gitignore`
2. ✅ **Use `.env.local.example`** - Template without secrets
3. ✅ **Rotate keys** if accidentally committed
4. ✅ **Use private repositories** for now
5. ✅ **Share keys securely** - Not via email/chat

---

## 🛠️ **Troubleshooting**

### **Partner can't connect to Supabase**
- Check `.env.local` has correct keys
- Verify Supabase project is accessible
- Check RLS policies allow their user

### **Partner can't see routes**
- Ensure they've run all SQL migrations
- Check `route_photos` bucket exists
- Verify Google Maps API key is set

### **Git conflicts**
- Use `git pull` before making changes
- Communicate who's working on what
- Use feature branches for big changes

---

## 📝 **Recommended Workflow**

1. **Main branch** = stable/production code
2. **Feature branches** = new features (`git checkout -b feature-name`)
3. **Pull requests** = review before merging
4. **Daily sync** = `git pull` before starting work

---

## 🎯 **Quick Start Commands**

```bash
# Clone repository
git clone https://github.com/YOUR_USERNAME/BridleStay.git
cd BridleStay

# Install dependencies
npm install

# Create .env.local (copy from partner or .env.local.example)
# Add all environment variables

# Run migrations in Supabase SQL Editor
# (All files in supabase/migrations/)

# Start dev server
npm run dev

# Open http://localhost:3000
```

---

## 💡 **Pro Tips**

1. **Use VS Code Live Share** for pair programming
2. **Set up Supabase branching** for database changes
3. **Use Vercel preview deployments** for testing
4. **Document changes** in PR descriptions
5. **Test on deployed URL** before merging

---

**Need help setting any of this up? Let me know!** 🚀



