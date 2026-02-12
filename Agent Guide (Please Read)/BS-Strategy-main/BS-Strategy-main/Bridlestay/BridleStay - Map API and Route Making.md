

## Core Goal of Route Making

We are **not** trying to replicate Google Maps. The map is a **tool to encourage exploration, route creation, and discovery around properties initially**, which in turn drives:

- Longer user sessions
- Account creation
- Better understanding of riding quality around stays
- More host sign-ups
- Ultimately, more stay bookings (which generate revenue)

The map is a **growth and conversion engine**, not a direct paid feature.

Even for those not interested in property, the route exploring and community driven reviews system will allow engagement and therefore constant advertisement of the website and our platform.


## Conceptual Framework

A **rider-first exploration and routing system** that:

- Primarily starts from properties or known locations (Hosts will make multiple routes)
- Encourages intentional exploration rather than generic searching
- Helps riders plan enjoyable, suitable routes for horses
- Surfaces useful stops (pubs, scenic spots, attractions)
- Integrates tightly with stays

This differs fundamentally from Google Maps, which is designed for generic navigation and real-time convenience.


## Google Maps Capabilities (What Is Possible)

### 1. Base Map & Customisation

Using the Google Maps JavaScript API, we can:

- Control zoom and panning (eliminate default map controls)
- Disable or mute Google’s default POIs
- Add custom markers (icons for pubs, scenic spots, etc.)
- Use custom hover or click info bubbles (not Google’s default popups)

The map can look and behave like _our_ product, not Google’s. A simple bubble with basic info, opening times, review score, name and number could open, rather than a confusing scrollable list. Users can always use google maps separately to find information in a deeper and meaningful way, but use ours to control their initial decision making. We ARE NOT competing. 


### 2. Route Creation

Using the Directions / Routes API:

- Routes can be drawn manually or derived from data
- Routes do not need to be Google’s default road routes
- Bridleways can be displayed and used as the core routing network
- Routes are rendered by us, allowing full control

Routes are the **central object** in the experience.


### 3. POI Searching (Pubs, Attractions, Scenic Spots)

Using the Google Places API:

- We can search for pubs, attractions, viewpoints, parks, etc.
- Results can be limited by:
    - Distance
    - Area
    - Route corridor
- Results appear only as symbols on the map
- Hover (after a short delay) can show:
    - Name
    - Rating
    - Review snippets
    - Actions like “add as stop”

No forced zooming, no external Google links, no clutter.



## Two Key POI Use Cases (Both Supported)

### A. Route-Based POI Discovery

After a route is drawn:

- Search for pubs or attractions **along the route**
- Use a narrow corridor (e.g. 500–1000m from the line)
- Results are highly relevant and limited in number

This keeps costs low and relevance high.


### B. Pre-Route Exploration (Before Drawing a Route)

This is intentional and valid.

When a user views a property:

- The map focuses on a fixed exploration radius (e.g. 5–10km riding distance)
- POIs are fetched once per category (pubs, scenic spots, attractions)
- Results are capped and ranked (not infinite)
- No live searching while panning

This answers:

> “What kind of riding experience exists around this property?”

Not:

> “Where is every pub near me?”

This distinction keeps costs down and differentiates the product. Its for exploration, not data driven list making.


### Elevation Is Fully Supported

Using the Google Elevation API:

- Elevation can be retrieved for any route or bridleway
- Works with KML bridleway data
- Elevation is sampled along the route or polyline

From this we can calculate:

- Total ascent/descent
- Gradient severity
- Rolling vs hilly classification
- Horse suitability indicators

Accuracy is more than sufficient for riding use cases. Most situations provide within 1-3m accuracy based on LIDAR and similar resources for any coordinate point on google maps.


### Strategic Use of Elevation

Google provides raw height data only.

Bridlestay adds value by:

- Translating elevation into rider-friendly insights
- Warning about steep or sustained climbs/descents
- Eventually scoring routes for horse suitability

This is a key differentiation point. These only need to be lightly baked in with gentle reminders and notifications. While being a minor part, it's elements like these that show how much the system is scoped towards equestrian primarily, in a way that others aren't.


## Cost & API Usage Strategy

### How Google Maps Pricing Actually Works

Costs are incurred **per API request**, not per user.

Main cost triggers:

- Loading map tiles
- Calculating routes
- Searching POIs
- Fetching elevation data

Most of Bridlestay (property search, listings, filters) uses **our own database and costs nothing via Google**. Controlling the actions that are called for in a tight and restrained manner will keep costs down massively and re-use of information will also help to minimise costs. Although we must avoid data scraping, as this can result in misuse.



### Cost-Control Principles (Critical Part)

1. **No Auto-Firing APIs**
    - Searches only happen when a user explicitly asks
    - Routes recalculate searches only when confirmed
2. **Anchored Exploration**
    - POI searches tied to properties or routes
    - No infinite pan/zoom searching, localised searches
3. **Corridor-Based POI Searches**
    - Search near routes, not whole map areas
4. **Capped Results**
    - Limit markers per category, rather than list every one (Can be revised but clean mapping is preferable to a confusing sprawl of information)
5. **Caching**
    - Cache POIs and elevation per area/route
    - Reuse results across users (HUGE savings)
6. **Precomputation**
    - Elevation for bridleways can be calculated once and stored for each map, preventing need to retrigger API calls.

These measures drastically reduce costs.


## Realistic Cost Expectations

### Early Stage

- Tens of users
- Low tens of pounds per month
- Often covered by Google’s free monthly credit

### Moderate Traction

- Hundreds to ~1,000 users
- Low hundreds per month
- Predictable and linear growth

One successful booking offsets many API calls. This will need to be managed carefully though, as costs could spiral if the map was successful adn the booking system not. Hard limits may be able to be set via Google Cloud and API calls will need to be protected so that all calls come strictly from our website and customers logged in.


## Why This Should Remain Free to Users

The map is:

- A **pull mechanism**, not a paid feature
- A reason to create accounts
- A way to explore and understand properties
- A strong host acquisition tool

Charging for it would reduce adoption and weaken the platform.

Instead, the cost is justified by:

- Increased bookings
- Higher host value perception
- Longer and deeper user engagement


## Key Strategic Insight

Bridlestay is not building:

> “Google Maps for horses”

It is building:

> “A riding-first exploration and planning system, anchored to places you can stay”

Google provides:

- Basemap
- POIs
- Elevation

Bridlestay provides:

- Bridleway intelligence
- Horse-aware routing
- Curated exploration
- Meaningful context around stays

This combination is defensible, scalable, and aligned with the business model.



### ITEMS OF NOTE:

- There must be a strong mobile friendly design, working fluently on tablet too. Finger gesture controls must be able to easily and speedily navigate the entire system.

- Working GPS coordinate via laptop, tablet or phone for people to gently navigate the route. HOWEVER we do not need an instruction based system for live navigation from the start, or possibly ever. This would be a drastic alteration and require a lot of thought and a dedicated app.



### KEY QUESTIONS:


## A. Yes — the platform _should_ support routes from anywhere. Not just our properties.


> The map and routing system should serve **all equestrian riding use**, not just stays.

It’s strategically _necessary_ if we want to scale the system.

### Why this is the right approach

If we restrict or mentally bias the system toward “routes from properties”, we:

- Shrink the top of the funnel
- Limit habitual use
- Miss local riders (who could be our most frequent users)

Instead, the correct model is:

> **Best-in-class equestrian routing platform**  
> → which _naturally_ converts some of that usage into stays

That is exactly how these systems work:

- Strava → events & subscriptions
- Komoot → trips & premium
- AllTrails → bookings & partnerships

So we want:

- Routes from homes ✔
- Routes from pubs ✔
- Routes from parking spots, trailheads, yards ✔
- Routes from properties ✔

All should be first-class citizens. It will cost far more in API calls. But increase the platforms worth by just as much.


## B. How can properties still remain central (without being restrictive)

The key is **anchoring, not limiting**.

Properties should be:

- A _privileged anchor_
- Not the _only_ anchor

### Practically, this means:

- Any route can start anywhere we click on the map
- BUT:
    - Routes linked to properties get extra context
    - Properties show:
        - “Routes from here”
        - “Routes ridden by guests”
        - “Popular rides nearby”

So the relationship is:

- Routes ↔ properties
- Not routes → properties only

This preserves openness **and** reinforces bookings. It's about creating an interconnected system whereby each relies on the other for benefits.


## C. How do we avoid duplication?

Without control we’ll get:

- The same route drawn 20 times
- Tiny variations creating clutter
- A messy, untrustworthy system

This is _not_ a UI problem — it’s a **data model problem**. 

### The correct mental model for routes

A route should be thought of as having two layers:

### 1. **Canonical Route (the “idea”)**

- Geometry (polyline)
	- Direction (loop or out-and-back/point-to-point)
- Core attributes:
    - Distance
    - Elevation
    - Difficulty

This is what is **publicly discoverable**.

### 2. **User Variants (the “usage”)**

- Different start points
- Small detours
- Personal tweaks
- Private notes

These are:

- Linked to the canonical route
- Usually private or semi-private
- Not polluting the public index

This mirrors:

- GitHub (repo vs forks)
- Spotify (song vs playlists)
- Strava (segment vs activity)

### How to detect “same route”

We don’t need perfection — just a “good enough” system:

- Simplify geometry
- Compare overlap percentages
- If ~80–90% identical → treat as same base route

From there:

- New routes either:
    - Become a new canonical route
    - Or a variant/remix of an existing one

This keeps the system **clean and scalable**. This could be handled with a dropdown, to view variations of the canonical version or simply hidden from view unless private/semi-private (shared with friends).

## 4. “Remix route” button is essential trick

### Why remixing is powerful

- Reduces friction
- Encourages contribution
- Prevents duplication
- Preserves quality
- Forces alterations from the correct place

Instead of:

> “Start from scratch”

You get:

> “This looks good — I’ll tweak it”

This is how people will _actually_ behave. It will keep them within the rules and confines we set them most of the time. Why create a new route and map the same as one that already exists and that you can find easily?


### How this should work conceptually for us

- User views a route
- Clicks **“Use this route”** / **“Remix”**
- A copy opens in the editor
- They can:
    - Adjust start/end
    - Add a pub stop
    - Shorten or lengthen
    - drag points around to recalculate
- They save it as:
    - Private (default)
    - Shared with friends (Unique URL)
    - Or publish as a variant (For dropdown and a short description of changes for quick glance)


Critically:

- The original route remains unchanged
- The system knows this is a derivative

### Public visibility (to avoid us making a mess)

**Best approach:**

- Only canonical routes appear in public search
- Variants are:
    - Collapsed under the parent
    - Or hidden unless explicitly expanded
    - Or private by default (Toggle when saving)

This keeps discovery:

- Clean
- Trustworthy
- Non-overwhelming


## 5. Clean, tight, non-cluttered: how this all fits together


> _The system needs to be as tight as possible, functional and clean_

That means making **opinionated decisions**.

### Key principles to enforce

- No infinite route lists
- No near-duplicates in public view
- No “everything everywhere” maps
- No global free-text chaos

Instead:

- Intentional creation
- Anchored exploration
- Clear hierarchies:
    - Area → Route → Variant

This also keeps:

- Cognitive load low
- Costs predictable
- Quality high

People tend to thrive more when they know the constraints they work within. The same rule applies here, obvious and transparent parameters.


## 6. Strategic conclusion

This is the _correct_ platform shape:

> **Become the default place equestrian riders plan routes**  
> → then naturally convert some of that usage into stays

Trying to force everything through properties too early would:

- Limit growth
- Feel artificial
- Reduce trust

By contrast, an open, excellent routing system:

- Builds habit
- Builds authority
- Builds SEO
- Builds community data

…and properties benefit from all of it.


## D. How does cache work when saving costs?


## The core answer.

**You cache the results yourself on your servers; Google does not cache for you across users, and this is not scraping if done correctly.**

## 1. Does Google cache POIs or elevation for you?

**No.**

- Every API request you make to Google:
    - Is billable
    - Is independent
- Google does **not** reuse results between users
- Two users searching the same place = **two charges**  
    _unless you intervene_

## 2. Where caching actually happens (the correct way)

### We cache on **our own backend**

Not:

- In the user’s browser only (that helps UX but not cost)
- Not via scraping Google Maps

Instead:

- Our server stores results from legitimate API calls
- Subsequent users reuse **our stored result**

This is standard, allowed practice.


## 3. POI caching (allowed, with rules)

### How it works

1. User requests POIs (e.g. pubs near X)
2. Backend checks:
    - “Do we already have POIs for this area + category?”
3. If yes:
    - Serve cached results → **£0**
4. If no:
    - Call Google Places API
    - Store a **derived dataset**
    - Serve results

### Important Google rule

You **must not** permanently store raw Google Places data _as a substitute for Google_.

But you **may** store:

- Place ID
- Coordinates
- Category
- Rating summary
- Your own annotations

And you may cache results **temporarily** (Google allows caching for performance and cost control).

This is **not scraping**. But we must check for how long we can sensibly store the data. Currently I think it gives us 30 calender days before data must be deleted and recalled, before being stored again.


## 4. Elevation caching (much simpler)

Elevation data is:

- Numeric
- Non-identifying
- Static

### Best practice

- Fetch elevation once per route / bridleway segment
- Store:
    - Elevation samples
    - Total ascent/descent
    - Gradient stats

Google explicitly allows this.

Once stored:

- Every user reuses it
- **No repeat cost**s

## 5. Local (per-user) caching — what it’s good for

Browser caching helps:

- Speed
- Smooth UX

But:

- It does **not** meaningfully reduce our Google bill
- It resets across users and devices and can't be relied on

Backend caching is what saves us money.


## 6. What would count as scraping (we don’t do this)

❌ Pulling POIs from the Google Maps website  
❌ Mass-harvesting Places without user intent  
❌ Rebuilding a general POI database from Google

We are **not** doing this.

We are:

- Responding to user actions
- Caching results to avoid repeat calls
- Using Google as a source, not a product

That is fully compliant with their terms and conditions.

## 7. One-line mental model

> **Google = live data source**  
> **Bridlestay = intelligent cache + equestrian context**


## E. GPS / live location: what’s possible and what does it cost?

### Is GPS “free”?

**Yes.**  
Using the user’s GPS location is **free** from a mapping cost perspective.

- Location comes from:
    - Device GPS (phone/tablet)
    - Browser geolocation (laptop)
- No Google API cost is incurred for:
    - Reading position
    - Updating a dot on the map
    - Showing heading/direction

The only “cost” is:

- Some engineering time
- Battery usage on the device used (not our issue!)

### Permissions & behaviour

- The app requests **location permission**
- On desktop:
    - Location updates are slower and less precise
- On phone/tablet:
    - High-frequency updates
    - Compass/heading available

This is all handled by standard browser APIs.

## The _right_ v1 approach: live dot + facing direction

### What to include

- A live position dot
- An arrow or cone showing facing direction
- Optional accuracy circle
- “Re-centre on me” button

This allows riders to:

- Follow a pre-drawn route
- Zoom in and out
- Self-navigate visually

This is **extremely effective**, especially at riding speeds.

Many outdoor apps started here and never needed more for most users. We might need to ever move past this point in terms of use.

### What this avoids

- No turn-by-turn instructions
- No voice prompts
- No recalculating routes
- No “you are off route” logic (May be ways to implement this later in a free method, such as a start button that simply manages logic for distance from the route line and a small alert)

That keeps:

- Complexity low
- Costs at zero
- Reliability high

## Will people be able to find their way like this?

**Yes — absolutely**, for your use case.

Reasons:

- Horse riding is slow and deliberate
- Users already expect to interpret paths visually
- Bridleways are not dense urban grids
- The route line + live dot is intuitive

This works particularly well if:

- The route line is clearly styled
- Off-route deviation is visually obvious
- Zooming is easy with one hand

For equestrian use, this is **far more natural** than turn-by-turn.

## How much work would full “directions” involve?

A lot — and it’s the wrong place to start.

### To do real directions you would need:

- Route snapping and segmentation smoothly
- Instruction generation (“turn left in 50m”)
- Off-route detection
- Re-routing logic
- Voice / accessibility handling
- Mobile-first UX
- Likely a native app

Especially difficult because:

- You’re using **KML bridleways**, not Google’s routable network
- Bridleways often:
    - Don’t have formal intersections
    - Don’t align cleanly with road logic (This may be problematic in our route generation system, a possible locate nearest part of path and jump to logic may be helpful as a workaround)
    - Lack direction metadata

This is **orders of magnitude more work** than a live dot.

## How GPS works with KML overlays

This is a strength, not a weakness.

- GPS gives you a lat/lng
- Your KML route is just a polyline
- You simply draw both on the same map

No routing engine is required.

Optional later enhancements (not v1 for us):

- Highlight nearest point on route
- Show distance to route line
- Simple “you are X metres off route” indicator

Still no directions required.