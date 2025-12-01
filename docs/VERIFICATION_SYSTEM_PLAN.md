# Verification System Implementation Plan

## Overview
Comprehensive verification system for BridleStay to ensure trust and safety for all users.

---

## 1. Identity Verification (ID Upload)

### Option A: Stripe Identity (RECOMMENDED)
**Pros:**
- ✅ Already integrated with Stripe payments
- ✅ AI-powered ID verification
- ✅ Supports 33+ countries
- ✅ Liveness checks (selfie verification)
- ✅ Automatic fraud detection
- ✅ PCI compliant & secure
- ✅ £1.50 per verification (pay as you go)

**Cons:**
- ❌ Requires Stripe Connect setup
- ❌ Cost per verification

### Option B: Manual Upload + Admin Review
**Pros:**
- ✅ Free (besides storage)
- ✅ Full control
- ✅ Can customize requirements

**Cons:**
- ❌ Manual work required
- ❌ Slower verification times
- ❌ Legal compliance complexity
- ❌ Need secure document storage

### **RECOMMENDED: Hybrid Approach**
1. Use **Stripe Identity** for hosts (who earn money)
2. Use **optional manual upload** for guests (lower risk)

---

## 2. Implementation Roadmap

### Phase 1: Database Schema (Week 1)

```sql
-- Add verification tables
CREATE TABLE user_verifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  verification_type TEXT NOT NULL, -- 'identity', 'phone', 'email'
  status TEXT NOT NULL DEFAULT 'pending', -- pending, verified, failed, expired
  verification_method TEXT, -- 'stripe_identity', 'manual', 'auto'
  stripe_verification_session_id TEXT,
  verified_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE property_verifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  property_id UUID REFERENCES properties(id) ON DELETE CASCADE,
  verification_type TEXT NOT NULL, -- 'address', 'photos', 'facilities', 'in_person'
  status TEXT NOT NULL DEFAULT 'pending',
  verified_by UUID REFERENCES users(id), -- admin who verified
  proof_photos TEXT[], -- URLs to proof photos
  notes TEXT,
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE emergency_contacts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  relationship TEXT,
  phone TEXT NOT NULL,
  email TEXT,
  is_primary BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add verification badges to users table
ALTER TABLE users
ADD COLUMN identity_verified BOOLEAN DEFAULT FALSE,
ADD COLUMN identity_verified_at TIMESTAMPTZ,
ADD COLUMN phone_verified BOOLEAN DEFAULT FALSE,
ADD COLUMN phone_verified_at TIMESTAMPTZ,
ADD COLUMN email_verified BOOLEAN DEFAULT FALSE,
ADD COLUMN email_verified_at TIMESTAMPTZ;

-- Add verification to properties
ALTER TABLE properties
ADD COLUMN address_verified BOOLEAN DEFAULT FALSE,
ADD COLUMN address_verified_at TIMESTAMPTZ,
ADD COLUMN photos_verified BOOLEAN DEFAULT FALSE,
ADD COLUMN photos_verified_at TIMESTAMPTZ,
ADD COLUMN facilities_verified BOOLEAN DEFAULT FALSE,
ADD COLUMN facilities_verified_at TIMESTAMPTZ,
ADD COLUMN admin_verified BOOLEAN DEFAULT FALSE,
ADD COLUMN admin_verified_at TIMESTAMPTZ,
ADD COLUMN verification_notes TEXT;
```

### Phase 2: Stripe Identity Integration (Week 2-3)

#### Setup Steps:
1. **Enable Stripe Identity** in Dashboard
2. **Create Verification Session API**:

```typescript
// app/api/verification/create-session/route.ts
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(request: Request) {
  const { userId } = await request.json();
  
  const verificationSession = await stripe.identity.verificationSessions.create({
    type: 'document',
    metadata: { user_id: userId },
    options: {
      document: {
        allowed_types: ['driving_license', 'passport', 'id_card'],
        require_live_capture: true,
        require_matching_selfie: true,
      },
    },
    return_url: `${process.env.NEXT_PUBLIC_URL}/verify/complete`,
  });

  // Store session ID in database
  await supabase
    .from('user_verifications')
    .insert({
      user_id: userId,
      verification_type: 'identity',
      status: 'pending',
      verification_method: 'stripe_identity',
      stripe_verification_session_id: verificationSession.id,
    });

  return Response.json({ 
    client_secret: verificationSession.client_secret 
  });
}
```

3. **Webhook Handler** for verification results:

```typescript
// app/api/webhooks/stripe-identity/route.ts
export async function POST(request: Request) {
  const sig = request.headers.get('stripe-signature');
  const body = await request.text();
  
  const event = stripe.webhooks.constructEvent(
    body,
    sig,
    process.env.STRIPE_IDENTITY_WEBHOOK_SECRET!
  );

  if (event.type === 'identity.verification_session.verified') {
    const session = event.data.object;
    const userId = session.metadata.user_id;

    // Update user verification status
    await supabase
      .from('users')
      .update({
        identity_verified: true,
        identity_verified_at: new Date().toISOString(),
      })
      .eq('id', userId);

    await supabase
      .from('user_verifications')
      .update({
        status: 'verified',
        verified_at: new Date().toISOString(),
      })
      .eq('stripe_verification_session_id', session.id);

    // Send confirmation email
    await sendVerificationConfirmationEmail(userId);
  }

  return Response.json({ received: true });
}
```

4. **Frontend Component**:

```typescript
// components/verification/identity-verification-button.tsx
'use client';

import { loadStripeIdentity } from '@stripe/stripe-js/identity';
import { Button } from '@/components/ui/button';

export function IdentityVerificationButton() {
  const handleVerify = async () => {
    const response = await fetch('/api/verification/create-session', {
      method: 'POST',
    });
    const { client_secret } = await response.json();

    const stripe = await loadStripeIdentity(
      process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!
    );

    const { error } = await stripe.verifyIdentity(client_secret);
    
    if (error) {
      console.error(error);
    }
  };

  return (
    <Button onClick={handleVerify}>
      Verify Your Identity
    </Button>
  );
}
```

### Phase 3: Property Verification (Week 3-4)

#### Address Verification Options:
1. **Google Places API** - Validate address exists
2. **Royal Mail Postcode Lookup** - Confirm UK addresses
3. **Admin manual review** - Final check

#### Photo Verification:
- Hosts upload proof photos (exterior, interior, facilities)
- Admin reviews and approves
- Geolocation data from photos (optional)

```typescript
// app/api/properties/[id]/submit-verification/route.ts
export async function POST(request: Request) {
  const { propertyId, proofPhotos, addressProof } = await request.json();

  // Upload photos to Supabase Storage
  const photoUrls = await uploadVerificationPhotos(proofPhotos);

  // Create verification request
  await supabase
    .from('property_verifications')
    .insert({
      property_id: propertyId,
      verification_type: 'photos',
      status: 'pending',
      proof_photos: photoUrls,
    });

  // Notify admins
  await notifyAdminsOfVerificationRequest(propertyId);

  return Response.json({ success: true });
}
```

### Phase 4: Emergency Contacts (Week 4)

```typescript
// components/profile/emergency-contacts.tsx
export function EmergencyContactsManager() {
  const [contacts, setContacts] = useState([]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Emergency Contacts</CardTitle>
        <CardDescription>
          Add trusted contacts who can be reached in case of emergency
        </CardDescription>
      </CardHeader>
      <CardContent>
        {contacts.map(contact => (
          <div key={contact.id} className="border-b py-3">
            <p className="font-medium">{contact.name}</p>
            <p className="text-sm text-muted-foreground">
              {contact.relationship} • {contact.phone}
            </p>
          </div>
        ))}
        <Button onClick={() => setShowAddDialog(true)}>
          Add Emergency Contact
        </Button>
      </CardContent>
    </Card>
  );
}
```

### Phase 5: Verification Badges & Trust Score (Week 5)

```typescript
// components/verification-badges.tsx
export function VerificationBadges({ user }: { user: User }) {
  return (
    <div className="flex flex-wrap gap-2">
      {user.identity_verified && (
        <Badge className="bg-blue-600">
          <CheckCircle2 className="h-3 w-3 mr-1" />
          ID Verified
        </Badge>
      )}
      {user.phone_verified && (
        <Badge variant="outline">
          <Phone className="h-3 w-3 mr-1" />
          Phone
        </Badge>
      )}
      {user.email_verified && (
        <Badge variant="outline">
          <Mail className="h-3 w-3 mr-1" />
          Email
        </Badge>
      )}
    </div>
  );
}
```

---

## 3. Costs & Pricing

### Stripe Identity Pricing:
- £1.50 per successful verification
- No setup fees
- Only pay for completed verifications

### Recommended Strategy:
- **Hosts**: Required ID verification (you cover cost or pass 50% to host)
- **Guests**: Optional ID verification (they pay or get booking discount)
- **Properties**: Free admin review

### Annual Estimate (1000 hosts, 500 guests verify):
- 1000 hosts × £1.50 = £1,500/year
- 500 guests × £1.50 = £750/year
- **Total**: ~£2,250/year

---

## 4. Legal Considerations

### GDPR Compliance:
✅ Clear consent required
✅ Data retention policies (delete after X years)
✅ Right to be forgotten
✅ Secure encrypted storage
✅ Privacy policy updates

### Data Protection:
- Use Stripe's secure storage (recommended)
- Never store raw ID images yourself
- Only store verification status & metadata

---

## 5. User Experience Flow

### Host Verification Flow:
1. Host creates account → Prompt to verify
2. Click "Verify Identity" → Redirect to Stripe
3. Upload ID + Take selfie (2-3 minutes)
4. Get verified within seconds
5. Verification badge appears on profile
6. Can now publish listings

### Guest Verification Flow:
1. Optional prompt after signup
2. Incentive: "Get verified for priority bookings"
3. Same Stripe flow
4. Instant verification
5. Badge shows on profile & booking requests

### Property Verification Flow:
1. Host submits listing
2. Upload 5-10 verification photos
3. Admin reviews within 24-48 hours
4. Property gets "Verified" badge
5. Ranks higher in search results

---

## 6. Admin Dashboard

```typescript
// components/admin/verification-queue.tsx
export function VerificationQueue() {
  return (
    <Tabs defaultValue="identity">
      <TabsList>
        <TabsTrigger value="identity">ID Verifications</TabsTrigger>
        <TabsTrigger value="properties">Properties</TabsTrigger>
      </TabsList>
      
      <TabsContent value="identity">
        {/* List of pending ID verifications */}
      </TabsContent>
      
      <TabsContent value="properties">
        {/* Property verification queue */}
        {pendingVerifications.map(verification => (
          <Card key={verification.id}>
            <CardHeader>
              <CardTitle>{verification.property.name}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-2">
                {verification.proof_photos.map(photo => (
                  <img src={photo} alt="Verification" />
                ))}
              </div>
              <div className="flex gap-2 mt-4">
                <Button onClick={() => approve(verification.id)}>
                  Approve
                </Button>
                <Button variant="destructive" onClick={() => reject(verification.id)}>
                  Reject
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </TabsContent>
    </Tabs>
  );
}
```

---

## 7. Priority & Implementation Order

### Must Have (Launch Critical):
1. ✅ Email verification (already have)
2. 🔴 **ID verification for hosts** (Stripe Identity)
3. 🔴 **Property photo verification** (manual admin review)
4. 🟡 Phone verification (SMS codes)

### Should Have (Post-Launch):
5. 🟡 Guest ID verification (optional)
6. 🟡 Emergency contacts
7. 🟡 Address verification (Google Places API)
8. 🟡 Trust score system

### Nice to Have (Future):
9. ⚪ Background checks (DBS for hosts)
10. ⚪ In-person property inspections
11. ⚪ Video verification calls
12. ⚪ Social media verification

---

## 8. Next Steps

### Week 1: Setup
- [ ] Enable Stripe Identity in dashboard
- [ ] Create database migrations
- [ ] Set up webhook endpoints

### Week 2: Core Implementation
- [ ] Build Stripe Identity integration
- [ ] Create verification UI components
- [ ] Test verification flow

### Week 3: Property Verification
- [ ] Build property verification submission
- [ ] Create admin review interface
- [ ] Implement photo upload system

### Week 4: Polish
- [ ] Add verification badges everywhere
- [ ] Update search rankings
- [ ] Create email notifications
- [ ] Write help documentation

### Week 5: Testing & Launch
- [ ] End-to-end testing
- [ ] Security audit
- [ ] Soft launch to beta users
- [ ] Monitor and iterate

---

## Conclusion

**Verification is crucial for trust and safety.** The hybrid approach (Stripe Identity for hosts + manual review for properties) provides the best balance of:
- ✅ Automated, fast ID verification
- ✅ Cost-effective solution
- ✅ Human oversight for property quality
- ✅ GDPR compliant
- ✅ Scales as you grow

**Estimated Time**: 4-5 weeks for full implementation
**Estimated Cost**: £2,250/year for 1,500 verifications
**ROI**: Massive increase in trust = more bookings = worth it! 🚀

