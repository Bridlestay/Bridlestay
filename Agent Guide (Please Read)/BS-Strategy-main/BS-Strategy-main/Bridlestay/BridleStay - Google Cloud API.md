

### API Strategy, Google Cloud Consolidation & Mapping Integration


*NOTE: All API calls need to carefully coded to reduce actionable trigger. If API calls are charged on actions, then reduction of these will save TONS of money while keeping the exact same functionality of the website. Internal cache and users browser cache will allow for repeat actions without new triggers.*


## 1. Architectural principle: single-platform, event-driven

Bridlestay is intentionally built on **Google Cloud as the primary infrastructure platform**.  
The goal is to minimise operational overhead, reduce vendor sprawl, and ensure all core systems speak the same language.

Key principles:

- One cloud provider for **identity, data, automation, moderation, and mapping**
- Event-driven logic rather than long-running servers
- APIs used where they provide maturity and safety faster than custom builds
- External providers used only where Google is not fit-for-purpose (payments, email)

This approach is chosen specifically to support our **two-founder team** and to scale without re-architecture.


## 2. Core Google Cloud services (foundational layer)

These services underpin _everything_ else.

### Firebase Authentication (Identity layer)

Used for:

- Email/password login
- Social login (Google, Apple)
- Account verification
- Session management

Why it matters:

- Reduces fake and burner accounts
- Improves moderation and trust scoring
- Simplifies account recovery and support
- Provides a consistent identity object across all services

Social login is encouraged (trust signal), not mandatory.



### Firestore (Primary data store)

Used for:

- Users & trust scores
- Properties and stays
- Routes and route metadata
- Reviews, tags, flags
- Messages and conversations
- Moderation records

Why Firestore:

- Real-time updates
- Scales automatically
- Works cleanly with event-driven logic
- Ideal for moderation queues and activity feeds

Firestore is the **single source of truth** for platform state.


### Cloud Functions / Cloud Run (Automation layer)

Used for:

- Responding to events rather than polling
- Enforcing moderation rules
- Running API checks
- Updating trust scores
- Handling reports

Examples:

- Image uploaded → run Vision API → store result → decide outcome
- Message sent → run NLP + regex → allow or block
- Content flagged → adjust visibility → notify admin queue

This keeps the application logic clean and avoids server management.


## 3. Content moderation & safety APIs

These APIs protect platform quality and reduce admin burden.

### Cloud Vision API (Image moderation)

Used for:

- Screening all uploaded photos before publication
- Detecting:
    - NSFW content
    - Violence or gore
    - Hate symbols
    - Faces / children (privacy flagging)

Integration:

- Part of the image upload pipeline
- Automatically classifies images
- Drives allow / flag / reject decisions

This applies to:

- Property photos
- Route photos
- Review photos
- User uploads in messages


### Cloud Natural Language API (Text analysis)

Used for:

- Reviews
- Messages
- Comments
- User-generated descriptions

Primary purposes:

- Detect abusive or aggressive language
- Identify defamatory risk
- Screen for off-platform payment attempts
- Classify transactional intent
- Auto-tag sentiment and entities (optional)

This API **does not act alone** — it feeds into our hybrid system.


### Hybrid NLP screening approach

Moderation decisions are based on three layers:

1. **Rule-based detection**
    - Phone numbers
    - Emails
    - “WhatsApp”, “DM me”
    - “Cash”, “bank transfer”, “pay on arrival”

2. **NLP intent & entity scoring**
    - Transactional intent
    - Payment language
    - External contact attempts
    
3. **Context & trust weighting**
    - User trust level
    - Account age
    - Past behaviour
    - Booking stage

This prevents false positives while still stopping circumvention early. This will save us overall TIME.


## 4. Mapping & route system APIs (core product)

The mapping system is not a bolt-on — it is a **first-class platform feature** tightly integrated with moderation, discovery, and user behaviour.


### Google Maps JavaScript API

Used for:

- Interactive map interface
- Custom-styled maps (non-Google look)
- Drawing, editing, and saving routes
- Overlaying bridleways and custom layers
- Interactive markers (gates, hazards, pubs)

The map UI is intentionally designed to:

- Encourage exploration
- Highlight equestrian-specific data
- Feel distinct from standard Google Maps navigation


### Places API

Used for:

- Discovering nearby:
    - Pubs
    - Cafés
    - Parking
    - Viewpoints
- Letting users tag:
    - Horse-friendly stops
    - Trailer parking
    - Water access

Places data is:

- Supplementary, not dominant
- Curated via user tags and trust signals
- Linked to routes and stays


### (Optional, later) Distance Matrix API

Potential future use:

- Estimating route duration
- Displaying approximate ride time at walk/trot
- Supporting route difficulty classification

Not essential at our launch, but aligned with the route system.



## 5. Moderation, reporting & trust as shared infrastructure

All systems feed into moderation and trust.

- Routes can be flagged
- Photos on routes can be flagged
- Reviews on routes can be flagged
- Map markers can be flagged as outdated or unsafe

The **red-flag reporting system**:

- Exists across the platform
- Feeds into Firestore
- Triggers Cloud Functions
- Uses trust weighting to prioritise admin review

This creates a consistent moderation model across:

- Content
- Messaging
- Mapping
- Reviews


## 6. Abuse prevention & platform integrity APIs

### reCAPTCHA Enterprise

Used for:

- Signup protection
- Report abuse prevention
- Bot detection
- Trust scoring inputs

Operates invisibly where possible.


## 7. External services (deliberate exceptions)

These are intentionally kept outside our Google Cloud:

- **Stripe** – payments, refunds, compliance
- **Email provider (e.g. SendGrid)** – transactional emails (Its free for two people and handles professionally)

They integrate cleanly but do not control platform logic.


## 8. Migration & single-platform mindset

### What “migration” means here

- All moderation logic moves into Cloud Functions
- All content lives in Firestore
- All uploads pass through the same moderation pipeline
- All route and mapping logic integrates with Google Maps APIs
- All trust and enforcement decisions reference the same user model

### Why this matters

- One billing account
- One permissions model
- One mental model of the system
- Easier debugging
- Easier onboarding
- Easier scaling

This avoids future rewrites and keeps technical debt low. It might be a complicated setup - but once it's there, we've got it sorted for the rest of the long game.


## 9. Outcome

This architecture:

- Treats moderation, mapping, messaging, and trust as **one system**
- Prevents bad behaviour through design and automation
- Scales cleanly without additional staff
- Keeps Bridlestay’s core product — routes, stays, and exploration — tightly integrated
- Allows us to neatly manage costs and workload
