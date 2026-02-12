

With only two of us, **the system has to do 90–95% of the work**, and we only step in when judgement or escalation is genuinely required. The trick is to design _friction, visibility, and incentives_ so bad content is rare, obvious, and easy to deal with.


## Core principle: layered, not human-first moderation

We should think in **four layers**, most of which are invisible day-to-day:

1. **Prevent** (structure discourages bad behaviour)
2. **Auto-filter** (rules + AI do first pass)
3. **Community flagging** (trusted users help you)
4. **Human review** (only when genuinely needed)

If any one layer fails, another catches it. 

## 1. Prevention by design (first line of defence)

- Reviews are **structured first** (tags, ratings), with **short, character-limited optional texts**
- Messaging includes a **one-time, dismissible safety banner** in chat, reminding users to keep payments on-platform for their own protection
- Clear but calm community expectations are set through UI and copy, not rule walls

This reduces bad behaviour before moderation is even needed. This is KEY!



## 2. Automated moderation (hands-free, always on)

### Text content (reviews, messages, comments, listings)

- Automatically screened using:
    - Pattern matching (phone numbers, emails, payment terms, “cash”, “WhatsApp”, etc.)
    - Natural Language analysis for:
        - Transactional intent
        - Aggressive or abusive tone
        - Defamatory or risky language
- Each piece of text is given a **risk score**
    

Outcomes:

- Auto-approved
- Soft-flagged (allowed but tagged for later review)
- Blocked (with neutral, safety-focused user messaging)

This is also used to detect **off-platform payment attempts**. It will be cost free and through a tagging system, like we have implemented already. We can develop lists through AI generation for enhanced capture.



### Photo uploads

- All photos are automatically screened on upload using image moderation APIs
- Checks include:
    - NSFW content
    - Violence or gore
    - Hate symbols
    - Privacy risks (faces, children)

Outcomes:

- Approved
- Approved but internally flagged (safety, personal details, faces)
- Rejected with a neutral explanation

No manual photo screening by admins.

Modern image moderation tools can detect:

### 🔴 Hard blockers (auto-reject)

- Pornographic / sexual content
- Explicit nudity
- Extreme violence or gore
- Hate symbols (swastikas, etc.)
- Child sexual content (automatic ban + escalation)

### 🟡 Soft flags (allowed but tagged)

- People’s faces (privacy risk)
- Children present
- Injury
- Risky behaviour
- Weapons (unlikely for you)

### 🟢 Allowed

- Animals
- Landscapes
- Riding shots
- Stables
- Property images

For Bridlestay, we’d **block very little**, and mostly rely on soft flags + community reporting for most.



## 3. Community reporting (lightweight, non-intrusive)

- Every review, photo, and relevant content includes a **small circular red-flag button** (This is clear to everyone and blends in as no distraction)
- Clicking opens a confirmation popup with:
    - Predefined report reasons
    - Optional short (≈50 character) explanation
    - Are you sure you want to report - Yes/No
- Reporting is rate-limited with a cooldown to prevent abuse

Reports:

- Tag content for admin review
- De-prioritise or temporarily hide content if multiple users flag the same item over and over
- Are weighted by the reporter’s trust level (Weaponize users without the knowing to do our work for us. Thanks Karen's)
    


## 4. Trust levels & behaviour weighting (Backend)

Users build trust passively based on:

- Account age
- Bookings and activity
- Quality of reviews
- Accuracy of past reports
- Social login verification (This is an important aspect to implement)

Trust affects:

- Weight of reports
- Tolerance thresholds before enforcement
- Automatic screening and hiding of content for top tier moderators (Not that they know it. Can be revoked easily. Can be handled with priority system for our own moderation instead if this is too powerful.)
- Access to certain features?

This allows reliable users to help moderate naturally. It helps naturally police the environment and keep community engagement flowing.



## 5. Messaging & off-platform payment prevention

- A **one-time, dismissible banner** appears for new users in messages OR with each new message chain starting:
    - Safety-framed
    - Non-accusatory
    - Not persistent
- Messages are automatically scanned for off-platform payment attempts (Google Cloud has language API too)
- First offences result in:
    - Message blocking
    - Clear explanation framed around user protection (Possibly the banner simply reappearing and the message being blocked)
- Repeat or deliberate attempts escalate for moderation, reduce background trust score and possibly implement restrictions

This protects users and platform integrity without aggressive policing action and a hands on approach from us.



## 6. Admin moderation (only where it's needed)

Admins see a **single moderation queue** containing:

- Auto-flagged content caught by our systems
- Content reported by multiple users
- Repeat or high-risk behaviours

Each item includes:

- Content type
- Reason for flagging
- Users trust score
- Suggested action (Might be harder to implement)

Admin actions are simple. We simply:

- Approve
- Hide
- Tag
- Send template warning
- Escalate situation (rare)

No manual scanning of general content from us. Queue allows us to filter through important information and keep a handle on everything coming through.



## 7. Enforcement approach

- First response is always **educational and calm**. We don't ban people outright.
- Enforcement escalates gradually:
    - Warning → restriction → suspension
- Focus is on protecting safety, fairness, and community tone, not punishment



## Outcome

- ~90% of content requires **no human involvement**
- Automation handles obvious issues
- Community catches contextual issues
- Admins handle only edge cases and repeat abusers

This keeps moderation **scalable, calm, and culturally appropriate** for our small team and a trust-based equestrian community. Hopefully.




## EXTRAS:


## A. Messaging safety banner (off-platform payment prevention)

### Purpose

To **prevent accidental or casual attempts** to take payments off-platform by informing users early, calmly, and in their own interest.

### How it functions

- A **small, non-intrusive, dismissible banner** appears inside the messaging interface (within the chat, up top)
- Shown:
    - Once, when a user sends their **first message**
    - Or their **first booking-related message to a new host**
- After dismissal, it **never reappears** unless explicitly triggered later by risky behaviour (optional, later-stage feature for us)

### Tone & framing

- Safety-focused, not rule-focused
- Emphasises:
    - Refund protection
    - Platform support
    - Inability to help if payments happen elsewhere
- No mention of fees or enforcement

We frame it as being within their best interests, not ours.

### Why it works

- Sets expectations before problems arise
- Makes later enforcement feel fair and predictable
- Reduces moderation load by stopping issues at source
- Feels advisory, not controlling


## B. Social logins (trust, accessibility, moderation leverage)

### What’s supported

- Email/password (always available)
- Social login via:
    - Google
    - Apple (especially important for iOS users)
    - No Facebook (Horsey people have mixed feelings for it)

### Why social login matters (beyond convenience)

- Reduces fake and burner accounts
- Improves user behaviour through implied real-world identity
- Makes account recovery and support simpler
- Provides an additional **trust signal** for moderation

### How it’s used

- Socially verified accounts:
    - Gain higher trust weighting
    - Have more influence when reporting content
    - Face slightly higher behavioural expectations
- Email-only accounts remain usable but may have lower initial trust

Social login is **encouraged, not forced**. We want them if possible. Its more delicious data.


## Google Cloud–centred architecture (single-platform strategy)

### Goal

Keep infrastructure **centralised, scalable, and mentally manageable** for a two-person team.

### Core components

- **Firebase Auth** – authentication + social login
- **Firestore** – user data, reviews, routes, flags, trust scores
- **Cloud Functions / Cloud Run** – event-driven logic:
    - Image uploads
    - Text submissions
    - Reports
    - Trust score updates
- **Cloud Vision API** – image moderation
- **Cloud Natural Language API** – text analysis & intent detection
- **Maps + Places APIs** – route drawing, nearby amenities
- **reCAPTCHA Enterprise** – bot and abuse prevention

### Benefits

- One billing account
- Consistent APIs
- Predictable scaling
- Minimal ops overhead
- Easier debugging and iteration

Payments (Stripe) and email (e.g. SendGrid) remain external by design.



## NLP screening: hybrid detection approach

### Why hybrid is essential

No single method reliably detects off-platform payment attempts or bad behaviour on its own. And there is always an aspect of our human error too. Mistakes will always be made. But it's about minimizing them.

### The three layers

#### 1. Rule-based pattern matching

Fast, cheap, highly effective:

- Phone numbers
- Email addresses
- “WhatsApp”, “DM me”
- “Cash”, “bank transfer”, “pay on arrival”

Catches the majority of cases immediately.


#### 2. NLP intent & entity analysis

Used to:

- Detect transactional intent
- Identify payment-related language
- Flag external contact attempts
- Assess tone (aggressive, manipulative, risky)

Each message or review receives a **risk score**.


#### 3. Context & trust weighting

Final behaviour depends on:

- User trust level
- Account age
- Past warnings or violations
- Stage of interaction (pre-booking vs post-booking)

This prevents over-enforcement and false positives.


### Outcomes

- Message allowed
- Message soft-blocked with explanation
- Message blocked entirely
- Trust score adjusted
- Admin review triggered (rare)

All user-facing messaging is calm and safety-framed.