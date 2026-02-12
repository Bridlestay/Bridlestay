

## Core Design Philosophy

**Principles**

- _Helpful automation, not spreadsheet hell_
- _Simple to start, powerful when ready_
- _Power to hosts, neutrality from the platform_
- _No surprises — ever_
- _We exist to serve an underserved (horse) community_

**Why this matters**

- Hosts are your supply-side lifeblood
- Horse people value clarity, fairness, and control
- Trust beats short-term optimisation
- Preventing mistakes is better than fixing complaints


## 1. Listing Creation Flow (Initial Setup)

### Design

- Guided, step-based flow (cards)
- Focused on activation, not optimisation (get them listed quick)
- Minimal required inputs:
    - Property basics
    - Max guests
    - Max horses
    - Base nightly price
    - Single cleaning fee (initially)
    - Availability
    - Photos

### Why

- Reduces cognitive load
- Prevents abandonment
- Gets listings live quickly
- Reassures hosts they can “fine-tune later”

**Key message shown to hosts**

> “You can adjust pricing and discounts in more detail after publishing.”



## 2. Advanced Pricing & Controls (Post-Publish)

Unlocked after listing is live.

### Includes:

- Extra guest fee (toggle)
- Extra horse fee (toggle)
- Cleaning fee breakdown:
    - House cleaning
    - Stable / yard cleaning
- Discounts & smart pricing
- Availability fine-tuning
- Policies (cancellation, damage acknowledgement)

### Why

- Keeps onboarding simple
- Gives power users depth
- Avoids overwhelming less tech-confident hosts
- Signals platform maturity

We do not charge extra for anymore guests or horses, however because it adds more to the original price we will still be earning more from the fees increasing from overall calculations.


## 3. Horses Treated Like Guests (Conceptual Model)

### Design

- Base price includes X guests and X horses
- Optional extra guest fee
- Optional extra horse fee
- Hosts fully control both

### Why

- Familiar mental model (Airbnb-like)
- Avoids surprise pricing (Avoids support tickets)
- Reinforces host authority
- More horses = more booking value (naturally increases platform revenue)
- Platform remains neutral on “expensive vs cheap”

We want to avoid any moments where people look at the platform for being expensive, rather than at the hosts. All of our fees are simple and transparent, with no song and dance.


## 4. Cleaning Fees (Horse-Specific Reality)

### Design

- Hosts input multiple cleaning fields (House/Stable)
- Guests see:
    - One total cleaning fee
    - Expandable breakdown (dropdown)

### Why

- Horse stays involve higher, justified cleaning costs
- Transparency reduces friction
- Educates non-horse companions
- Prevents disputes


## 5. Smart Discounts System (All Optional, Off by Default)

### Discount Types

- Last-minute discounts
- Length-of-stay discounts
- First-time rider/lodger discount
- Seasonal/date-based discounts

### Controls

- Each discount:
    - Toggle (off by default)
    - Expands into simple sliders / inputs
- No discount is ever “hidden”

### Why

- Hosts expect automation
- Optional toggles prevent accidental use
- Encourages filling gaps without forcing behaviour


## 6. Discount Stacking Logic (Critical Trust Feature)

### Two-Mode System

#### Default Mode (Recommended)

**Only one automated discount applies per booking**

- System applies the _best_ discount for the guest (largest)
- No stacking
- No risk

#### Advanced Mode (Explicit Opt-In)

**Allow stacking up to a maximum discount cap**

- Toggle must be turned on
- Numeric cap (e.g. 20%) required to save
- Impossible to enable accidentally

### Why

- Prevents “cheap nights by mistake”
- Makes host intent explicit
- Removes platform blame
- Balances flexibility with safety

> **When multiple discounts are eligible, the system automatically applies the single highest-value discount unless stacking is enabled.**

Why this matters:

- Removes ambiguity
- Prevents a dev choosing “first matching rule”
- Stops future logic drift


## 7. Tiered Last-Minute Rules (Controlled Complexity)

### Design

- Hosts can add up to **3 rules** e.g.
    - 14 days → 5%
    - 7 days → 10%
    - 3 days → 15%
- Rules auto-ordered and non-overlapping

### Why

- Power feature for experienced hosts
- Hard limit prevents confusion
- Matches real-world pricing behaviour


## 8. Sticky Preview Pane (Live Pricing Workbench)

### What It Is

A floating preview panel that:
- Always stays visible while setting discounts
- Automatically uses the host’s real nightly base price

### Displays:

- Guest nightly price (large, primary)
- Interactive sliders:
    - Nights stayed
    - Days before check-in
- Applied discount(s)
- Discount stacking status
- Maximum possible discount
- Expandable price breakdown
- Cleaning fees
- Platform fee
- **Estimated host payout** (Estimated word is important)
- Reset button (returns to typical booking)

### Why

- Shows money, not percentages
- Encourages safe experimentation
- Prevents misunderstandings
- Acts as a simulator without changing settings
- Dramatically reduces support tickets


## 9. Discount Transparency Rules

### System Rules

- Discounts apply to **nightly rates only**
- Never apply to:
    - Cleaning fees
    - Platform fees
- Only one discount applies unless stacking is explicitly enabled
- All applied discounts shown clearly in previews

### Why

- Predictability
- Fairness
- Legal defensibility
- User confidence


## 10. Floor Price Warning (Non-Negotiable)

### Design

- Inline warning in preview pane
- Triggered when discounted nightly rate falls significantly below base e.g. 50%
- Calm, non-blocking language

Example:

> ⚠️ Low nightly rate  
> This booking would be priced at £68, significantly lower than your base rate of £115.

### Why

- Prevents obvious mistakes
- Protects hosts from themselves
- Reduces “I didn’t realise” complaints
- Maintains goodwill


## 11. Founding Hosts & Early Adopters

### Design

- Founding Host / Rider badge
- Soft language only
- No hard promises
- Possible future benefits teased:
    - Preferential terms
    - Discounts on their own stays
    - Early access to features

### Why

- Rewards early trust
- Builds emotional loyalty
- Encourages signups through curiosity
- Keeps future options open


## 12. Damage & Excessive Cleaning Claims

### Time Window

- 48 hours post-checkout (Airbnb has 14 days, we keep everything 48hrs for ease.)

### Process

- Host submits claim with evidence
- Guest notified
- Guest can accept or dispute
- Platform mediates
- Decision made transparently

### Stripe Handling

- Payment method saved at booking
- Guest consents in T&Cs to post-stay charges (Must be policy stated at time of booking), clickable action to open new tab with FAQ or Terms and Conditions with soft scroll down to area.
- Approved claims charged via off-session PaymentIntent

### Why

- Industry-standard (Airbnb model)
- Legally defensible in the UK
- Fair to both sides
- Avoids upfront deposits
- Reinforces trust


## 13. Platform Tone & Positioning

### Messaging Focus

- Hosts set prices — not the platform
- Fees are low and transparent
- Discounts are host-controlled
- Platform exists to support, not extract

### Why

- Prevents “greedy platform” perception
- Reinforces neutrality
- Builds community goodwill
- Aligns with niche-first strategy


## 14. Strategic Decisions Explicitly Deferred

- Price comparison search when setting prices
- Competitive pricing nudges
- Aggressive optimisation tools

### Why

- Not required for MVP
- Can encourage race-to-the-bottom pricing
- Better added once inventory and behaviour patterns exist



### Final titbits:

- **Hosts should never be surprised by the price a guest pays**
- **Always show money, never just percentages**
- **Default to safety — require intent for risk**
- **Transparency beats cleverness**
- **Understanding the niche _is_ the product**


**Price calculation order**

1. Base nightly rate
2. Extra guest / horse fees (per night)
3. Automated discount(s) applied to nightly total
4. Cleaning fees added (flat)
5. Platform fee calculated
6. Estimated host payout shown


### Add a single rule across the board:

> Refunds are calculated based on the **discounted price actually paid**, not the original base rate.

Why this matters:

- Prevents host confusion
- Avoids refund disputes
- Aligns with industry norms


### Clarifying disputes:

> If a guest disputes a damage or excessive cleaning claim, the platform reviews evidence submitted from both sides and makes a final decision. (This means the messaging app having a system in place for discussing with guests and also the ability to submit photos through it.)

Why this matters:

- Reinforces neutrality
- Prevents “platform sides with hosts” fears
- Builds partner confidence in fairness

> If a post-stay charge fails through stripe or bounces, the guest is notified and asked to update their payment method. The platform will not attempt repeated silent charges. However as long as the policy is clearly stated on booking payment before confirmation, then the guest is legally obliged to comply.

Why this matters:

- Ethical positioning
- Legal comfort
- Support process clarity


### Add a simple statement about discounts:

> Discounted pricing does not automatically affect search ranking (initially if later implemented).

Why this matters:

- Prevents future arguments
- Stops someone “helpfully” adding hidden incentives
- Keeps pricing fair


### Post Booking:

> Hosts can see which discount was applied in the booking summary and payout breakdown. Transparency of their controls and actions.

Why this matters:

- Reinforces trust
- Prevents “why was this cheaper?” emails


### REMEMBER:

This system is designed primarily for:

- Rural, non-technical hosts
- Horse owners familiar with real-world costs
- Users who value fairness over aggressive optimisation


# To Reiterate On Automated Discount Types — Purpose & Rationale

All automated discounts are **optional**, **off by default**, and **host-controlled.**  
They exist to help hosts manage real-world booking behaviour without manual micromanagement.

## 1. Last-Minute Booking Discounts

**What it is**  
A percentage reduction applied to bookings made within a defined number of days before check-in (e.g. 14, 7, or 3 days).

**Optional enhancements**

- Tiered rules (up to 3)
- Increasing discount closer to check-in

**Why it’s important**

- Helps fill otherwise empty nights
- Reflects real-world hosting behaviour
- Especially useful for rural / horse stays where demand can be unpredictable
- Prevents revenue loss from unused availability

**Design intent**

- Automation replaces manual price drops
- Hosts remain in control of how aggressive the discount is


## 2. Length-of-Stay Discounts

**What it is**  
A discount applied when a guest books beyond a minimum number of nights (e.g. 4+ nights, 7+ nights).

**Why it’s important**

- Encourages longer stays
- Reduces turnover and cleaning effort
- More efficient for hosts managing stables and land
- Often results in higher total booking value even with a discount

**Design intent**

- Reward commitment, not impulse
- Align pricing with operational reality


## 3. Seasonal / Date-Based Discounts

**What it is**  
A host-defined sale price or percentage discount applied to selected date ranges.

**Common use cases**

- Off-season months
- Quiet periods
- Local events
- Weather-dependent demand

**Why it’s important**

- Horse travel is seasonal and weather-sensitive
- Gives hosts a way to respond to known demand patterns
- Avoids constant manual repricing

**Design intent**

- Calendar-based, visual, intentional pricing
- Makes “quiet periods” productive rather than dead time


## 4. First-Time Rider Discount

**What it is**  
A one-time discount shown only to guests booking on the platform for the first time.

**Why it’s important**

- Lowers friction for new users
- Encourages trial of a new platform
- Helps build early marketplace liquidity
- Makes the platform feel welcoming, not extractive

**Design intent**

- Growth lever without permanent price reduction
- Discount is contextual and limited
- Prevents abuse through platform-level tracking


## 5. Platform-Wide or Founding Period Discounts (Temporary)

**What it is**  
A time-limited discount applied during early launch or promotional periods (e.g. founding phase).

**Why it’s important**

- Accelerates early adoption
- Rewards early trust from hosts and riders
- Creates momentum while the platform matures

**Design intent**

- Clearly shown as temporary
- Original price always visible (strikethrough)
- Prevents long-term price anchoring


## 6. Controlled Discount Stacking (Meta-Rule)

**What it is**  
A governing rule that determines how multiple eligible discounts interact.

**Options**

- Default: only the single best discount applies
- Advanced: allow stacking up to a defined maximum cap

**Why it’s important**

- Prevents accidental underpricing
- Protects hosts from complex interactions
- Makes discount behaviour predictable

**Design intent**

- Safety first
- Flexibility only when explicitly chosen


## Summary Principle

> **Each discount type exists to solve a real hosting problem — not to manipulate pricing or encourage a race to the bottom.**

Together, these discounts:

- Reduce manual effort
- Improve occupancy
- Preserve host trust
- Align pricing with the realities of horse-based stays

They are tools — not incentives — and their value comes from being **clear, optional, and predictable**. They are not immediately active and reward power users with finite control, should they need it.