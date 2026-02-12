
# **Features, Functions, Business practice and General Site Layout**


### Part A: **Payments, Cancellations and Refund Policies**

## 1. Core principles (the guardrails)

- Stripe **Connect** marketplace model
- **Immediate capture when appropriate**, never long authorisations (Risk of account freezing.)
- **Application fees** taken automatically at charge time
- **Host payouts delayed**, not guest charging (Held in account balance - separate from bank accounts.)
- **Limited policy templates**, not free-form rules (Host can choose from 3 select processes to suit them.)
- **Stripe-friendly fund holding windows** (≤60 days, risk of account freezing if longer.)
- **24–48h post check-in resolution window** (To select a period and lock it in as policy.)

## 2. Account structure

### Platform

- **One Stripe platform account** (Bridlestay)
- Holds:
	- Customer service fee 
	- Host commission
	- Host fee
- No escrow accounts
- No need for multiple accounts
- No bank accounts

### Hosts

- Each host has a **Stripe Connected Account** (Control identification)
    - Express (likely best early on)
- Hosts receive payouts automatically
- Hosts never handle guest payments directly

## 3. Booking & payment timing rules

### Rule A — Check-in ≤ 60 days away

**Charge immediately at booking**

### Rule B — Check-in > 60 days away

**Split payment system**

- Deposit charged at booking (If taking one)
- Balance automatically set to charge **14 days before check-in** (Stripe provides this service and is covered in UK law on agreements with delayed payments)

This avoids Stripe fund-holding risk with account freezing and matches industry norms to the likes of AirBnB and similar.


## 4. Payment flow (example)

### At booking (all cases)

1. Guest selects dates & confirms booking
2. Stripe **Payment Intent** is created and automatically signed (Backend)
3. Card details collected (SCA-compliant)
4. **Application fees calculated immediately**
    - Guest fee
    - Host fee
5. Payment is **captured**
6. Funds split automatically and via our logic by Stripe:
    - Our fees → platform balance (Stripe balance)
    - Host share → host’s pending balance
7. **No payout yet**

## 5. Split-payment logic (for bookings over 60 days)

### At booking (>60 days out)

- Deposit charged immediately
- Payment method stored for off-session use

### 14 days before check-in

- Stripe automatically charges remaining balance
- No guest action required in most cases (Prevents need to input details at a later time)
- Guest notified if re-authentication is needed


## 6. Cancellation handling (pre check-in)

- Booking follows one of **3 fixed cancellation policies** (selected by the host when listing properties)
- Refunds are:
    - Automatic where policy allows
    - Reflected instantly in Stripe
- Our fees refunded only if our policy dictates so
- Host payouts cancelled if not yet released

## 7. Check-in & resolution window

### On check-in day

- Stay begins
- Host payout **still withheld**

### First 24–48 hours after check-in

- Guest can report serious issues
- We manually review (low volume edge cases)
- Possible outcomes:
    - No action
    - Partial refund
    - Refund of unused nights
    - Cancelled payout


## 8. Host payout release

### After 24–48 hours post check-in

- If no unresolved issues:
    - Stripe automatically triggers payout
    - Host receives funds to their bank
- Our platform fees remain with our stripe account
- Stripe pays out processed funds from our account our bank account

**Stripe is not a bank account. Funds in the account balance don't mean we have that money. It's up to us to set up a payment schedule that benefits us accordingly with our payment processes.**

**Money in our actual bank account is the real profit, and therefore revenue funding for operating costs, salaries and consumables. Anything else set aside is capital to play with, regarding growth of the company.**


## 9. Refunds after check-in (edge cases)

Handled manually by you:

- Adjust transfer amount from stripe balance
- Refund unused nights if they've stayed
- Cancel or claw back entire payout if required


## 10. Stripe objects (for dev)

- `PaymentIntent` – guest charge
- `application_fee_amount` – your cut
- `Connected Account` – host
- `Transfer` – delayed payout
- `Payout` – money to host bank

## 11. What money looks like on our side

- We **never touch host funds**
- Our Stripe balance:
    - Accrues only fees
    - Handles movement of funds automatically
- Large balances shown ≠ your revenue
- Accounting is clean and defensible
- Easily legible process


## 12. Why this works (avoiding frozen accounts)

- No long authorisations
- No excessive fund holding
- No commingling
- No off-platform payments
- Clear consumer protections
- Familiar to Stripe risk teams

We are aiming for Stripe to see this and think:

> “Standard holiday marketplace. Low risk. Nice horse mate.”


## 13. To summarize (the mental model)

> **Guests pay only once (or twice for long bookings, but automatically split so they are unaware).  
> Stripe splits fees instantly.  
> Hosts are paid after the stay starts.  
> You arbitrate only when needed.**

Simples.




### Part B: **Refunds**

## 1. High-level philosophy

**Bridlestay**
- Fair, predictable, conservative
- Protects hosts first, guests when genuinely wronged (Hosts are our bread and butter and we dare not offend them at the start, or we've no business)
- Minimal discretion, clear rules
- Designed for a 2-person ops small team

**Airbnb**
- Guest-protection-led
- Broader discretion
- High tolerance for complexity
- Large support workforce


## 2. Pre-check-in cancellations (guest changes plans)

| Area                     | Bridlestay        | Airbnb             |
| ------------------------ | ----------------- | ------------------ |
| Cancellation policies    | 3 fixed templates | 4+ fixed templates |
| Custom host terms        | ❌ Not allowed     | ❌ Not allowed      |
| Free cancellation window | Shorter           | Often longer       |
| Auto-handled             | ✅ Yes             | ✅ Yes              |
| Emotional exceptions     | ❌ No              | ⚠️ Sometimes       |

### What we ARE doing

- Limited, standardised cancellation policies
- Automatic refunds where policy allows
- Refunds processed directly via Stripe
- No manual intervention needed in all but edge cases

### What we ARE NOT doing

- No free-form host-written rules
- No “please can I cancel because plans changed” exceptions
- No policy bending due to pressure or sentiment
- 
We make the rules clear, we make them concise and we stick to them.


## 3. Post-check-in issues (property problems)

This is the **only area with manual judgment** for us as a small team.

| Area                   | Bridlestay         | Airbnb          |
| ---------------------- | ------------------ | --------------- |
| Issue reporting window | 24-48 hours        | 24 hours        |
| Evidence required      | Yes                | Yes             |
| Rebooking              | ❌ No               | ✅ Often         |
| Refund scope           | Unused nights only | Partial or full |
| Platform discretion    | Narrow             | Broad           |

### What we ARE doing

- 48/24-hour post-check-in issue reporting window
- Manual review by us
- Refunds only for:
    - Material misrepresentation
    - Serious cleanliness/safety issues (Including for horses)
    - No access/host failure
    - Missing core amenities 
- Partial or unused-night refunds only
- Host payout delayed until window passes (All payment processes will not trigger until after this window passes)
    

### What we ARE NOT doing

- No refunds for:
    - Weather (It's out of our control)
    - Personal preferences (That's why we offer choice of stays)
    - Minor inconveniences (That's what reviews are for)
    - “It wasn’t what I imagined” (Again, review that son)
- No refunds reported after 48/24 hours window (Made clear in rules)
- No rebooking guests elsewhere (It's not our job to handle resettling guests, we stipulate this clearly too.)
- No compensation beyond refunding nights (It's our discretion in extreme cases, but it's in our favour to stick to a predefined rulebook)


## 4. After the resolution window

|Area|Bridlestay|Airbnb|
|---|---|---|
|Host payout released|24–48h post check-in|~24h post check-in|
|Retroactive refunds|❌ No|⚠️ Rare but possible|
|Disputes after payout|❌ No|⚠️ Sometimes|

### What we ARE doing

- Clear cutoff after resolution window
- Automatic host payout once window closes
- Finality for hosts and guests

### What we ARE NOT doing

- No refunds once payout is released (We can't access those funds anyway, it's out of our scope at this point)
- No reopening resolved stays (always moving forwards!)
- No long-tail disputes weeks later (everything is dealt with quick, and efficiently so we aren't snowed under)

We are **stricter than Airbnb** and intentionally so. It benefits us from the get go to be laser focused on a ruleset and apply it each time, for both management, fairness and brand reflection.


## 5. Platform-initiated overrides (rare exceptions)

|Area|Bridlestay|Airbnb|
|---|---|---|
|Host cancels last-minute|Full refund|Full refund|
|Property unavailable|Full refund|Full refund|
|Safety issues|Full refund|Full refund|

Here we **match Airbnb**.

we must or trust collapses otherwise. It would be business suicide.


## 6. Financial handling differences (important)

| Area          | Bridlestay                                       | Airbnb           |
| ------------- | ------------------------------------------------ | ---------------- |
| Charge timing | Booking or T-14 (**within 14 days of check-in**) | Booking or T-14  |
| Hold funds    | Yes (short)                                      | Yes              |
| Escrow        | ❌ No                                             | ❌ No             |
| Refund source | Stripe platform (Never leaves)                   | Airbnb           |
| Fees refunded | Policy-dependent                                 | Policy-dependent |

## 7. Why this works for our teeny tiny team

- 90%+ of cancellations are auto-handled
- Only genuine problems reach you (edge cases)
- No rebooking logistics to manage
- No emotional arbitration
- Decisions are policy-anchored. All of them. (Our super power will be referring people to where it says our stance - "Actually Geoff, if you read the terms and conditions you will see...")

Airbnb’s complexity exists because of:

- Scale (They are friggin' huuuuge)
- International regulation (Operating internationally)
- PR risk (They have a reputation to defend, whereas we are building ours for the first time.)


## 8. One-paragraph positioning summary (internal GPT bull)

> Bridlestay offers clear, standardised cancellation policies and fair protection against serious issues. Refunds are automatic where rules allow and manually reviewed only when something has genuinely gone wrong. We do not offer refunds for changes of mind, minor inconveniences, or issues reported late. This keeps expectations clear for guests and provides certainty for hosts.


## 9. The key strategic difference vs Airbnb

**Airbnb optimises for guest trust at massive scale.**  
**Bridlestay optimises for host confidence and operational sanity of mind. Our minds.**

Counterintuitively:
> **We should be slightly stricter than Airbnb**

Why?

- Protects hosts (supply is fragile early)
- Reduces opportunistic refunds
- Builds trust with property owners
- Fewer edge cases for us to adjudicate

It's correct for:

- A niche, trust-based market
- High-value stays
- Early-stage supply building

We can always soften later. We should _not_ start softer. It's much harder to tighten the reins than to loosen (Horse wisdom.)

Horse people value:

- Fairness
- Clarity
- Consistency

If both guest and host can read the policy and say:

> “That’s reasonable.” Then we've done the right thing.

---

------ What we should probably copy vs simplify ------

### Copy directly

✅ Limited number of cancellation policy templates  
✅ 24-hour post check-in issue reporting window  
✅ Delayed host payout  
✅ Platform override for serious issues

### Simplify deliberately

✂️ Fewer policy types  
✂️ Shorter refund windows  
✂️ More conservative refunds (early-stage brand protection)

We do **not** need Airbnb’s full complexity.

Given:
- Horse owners
- High trust, conservative audience
- You handling disputes personally
- Low initial volume

I’d recommend **three policies max**.

---

### 1. Flexible (good for new hosts and shorter stays)

- Full refund up to **7 days before check-in**
- After that:
    - First night non-refundable
    - Remaining nights refundable if rebooked

---

### 2. Standard (likely the default)

- Full refund up to **14 days before check-in**
- 50% refund up to **7 days**
- No refund inside 7 days

This aligns well with:

- 14-day payment capture
- Lower Stripe risk
- Lower cancellations

---

### 3. Strict (for premium / high-demand stays)

- Full refund up to **30 days**
- 50% refund up to **14 days**
- No refund after that

Used sparingly, hopefully. (its an unattractive sale)