# Supabase Email Configuration Guide

## Password Reset Emails

Supabase handles password reset emails automatically. To configure them for your `bridlestay.com` domain:

### Step 1: Configure Email Settings in Supabase Dashboard

1. Go to **Supabase Dashboard** → Your Project
2. Navigate to **Authentication** → **Email Templates**
3. Click on **"Reset Password"** template

### Step 2: Customize the Email Template (Optional)

You can customize the default template with BridleStay branding:

```html
<h2>Reset Your BridleStay Password</h2>

<p>Hi there,</p>

<p>We received a request to reset your password for your BridleStay account. If you didn't make this request, you can safely ignore this email.</p>

<p>To reset your password, click the button below:</p>

<a href="{{ .ConfirmationURL }}" style="display: inline-block; padding: 12px 24px; background-color: #2d5016; color: white; text-decoration: none; border-radius: 6px; font-weight: 600;">
  Reset Password
</a>

<p>Or copy and paste this link into your browser:</p>
<p>{{ .ConfirmationURL }}</p>

<p>This link will expire in 60 minutes.</p>

<p>Best regards,<br/>
The BridleStay Team</p>

<hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;"/>

<p style="font-size: 12px; color: #6b7280;">
  © 2025 BridleStay. All rights reserved.<br/>
  <a href="https://bridlestay.com/help" style="color: #2d5016;">Help Center</a> | 
  <a href="https://bridlestay.com/privacy" style="color: #2d5016;">Privacy Policy</a>
</p>
```

### Step 3: Configure Email Provider

1. In **Authentication** → **Email** settings
2. Set **"From" Email Address** to: `noreply@bridlestay.com`
3. Set **"From" Name** to: `BridleStay`

### Step 4: Set Redirect URL

1. Go to **Authentication** → **URL Configuration**
2. Set **Site URL** to: `https://bridlestay.com`
3. Add **Redirect URLs**: 
   - `https://bridlestay.com/auth/callback`
   - `https://bridlestay.com/reset-password`
   - `http://localhost:3000/auth/callback` (for local development)
   - `http://localhost:3000/reset-password` (for local development)

### Step 5: Test Password Reset

1. Go to your login page
2. Click "Forgot Password"
3. Enter your email
4. Check your inbox for the password reset email

---

## Other Supabase Email Templates to Customize

### Confirm Signup (Email Verification)

Template location: **Authentication** → **Email Templates** → **Confirm Signup**

```html
<h2>Welcome to BridleStay! 🐴</h2>

<p>Hi {{ .Email }},</p>

<p>Thank you for signing up! We're excited to have you join the BridleStay community.</p>

<p>Please confirm your email address by clicking the button below:</p>

<a href="{{ .ConfirmationURL }}" style="display: inline-block; padding: 12px 24px; background-color: #2d5016; color: white; text-decoration: none; border-radius: 6px; font-weight: 600;">
  Confirm Your Email
</a>

<p>Or copy and paste this link into your browser:</p>
<p>{{ .ConfirmationURL }}</p>

<p>This link will expire in 24 hours.</p>

<p>Ready to explore? Here's what you can do next:</p>
<ul>
  <li>Complete your profile</li>
  <li>Add your horses to your account</li>
  <li>Search for equestrian-friendly properties</li>
</ul>

<p>Happy trails!<br/>
The BridleStay Team</p>
```

### Magic Link (Passwordless Login)

Template location: **Authentication** → **Email Templates** → **Magic Link**

```html
<h2>Your BridleStay Login Link</h2>

<p>Hi,</p>

<p>Click the button below to log in to your BridleStay account:</p>

<a href="{{ .ConfirmationURL }}" style="display: inline-block; padding: 12px 24px; background-color: #2d5016; color: white; text-decoration: none; border-radius: 6px; font-weight: 600;">
  Log In to BridleStay
</a>

<p>Or copy and paste this link into your browser:</p>
<p>{{ .ConfirmationURL }}</p>

<p>This link will expire in 60 minutes.</p>

<p>If you didn't request this, please ignore this email.</p>

<p>Best regards,<br/>
The BridleStay Team</p>
```

---

## Custom SMTP Server (Optional - For Production)

For better deliverability, consider using a custom SMTP server like Resend:

1. Go to **Project Settings** → **Auth** → **SMTP Settings**
2. Enable **"Use Custom SMTP Server"**
3. Configure:
   - **Host**: `smtp.resend.com`
   - **Port**: `465` (SSL) or `587` (TLS)
   - **Username**: `resend`
   - **Password**: Your Resend API Key
   - **Sender Email**: `noreply@bridlestay.com`
   - **Sender Name**: `BridleStay`

This will route all Supabase auth emails through Resend for better deliverability and tracking.

---

## Testing Checklist

- [ ] Password reset emails working
- [ ] Email verification working (signup)
- [ ] Magic link login working (if enabled)
- [ ] Emails coming from `noreply@bridlestay.com`
- [ ] Links redirect to correct URLs
- [ ] Branding looks professional
- [ ] Mobile responsive

