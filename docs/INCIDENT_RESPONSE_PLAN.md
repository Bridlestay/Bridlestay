# Cantra Incident Response Plan

## Overview
This document outlines procedures for handling service disruptions, security incidents, and other emergencies.

---

## Severity Levels

### P1 - Critical (Complete Outage)
- Site is completely down
- Users cannot make bookings
- Payment processing failing
- Data breach suspected

**Response Time:** Immediate (within 15 minutes)

### P2 - Major (Significant Degradation)
- Key features broken (search, booking, messaging)
- Performance severely degraded
- Some users affected

**Response Time:** Within 1 hour

### P3 - Minor (Limited Impact)
- Non-critical feature broken
- UI/cosmetic issues
- Performance slightly degraded

**Response Time:** Within 24 hours

### P4 - Low (Minimal Impact)
- Minor bugs
- Documentation updates needed
- Feature requests

**Response Time:** Next business day

---

## Contact Information

### Primary Contacts
| Role | Name | Contact |
|------|------|---------|
| Technical Lead | [Your Name] | [Email/Phone] |
| Business Owner | [Partner Name] | [Email/Phone] |

### External Services
| Service | Support URL | Status Page |
|---------|-------------|-------------|
| Supabase | support.supabase.com | status.supabase.com |
| Stripe | support.stripe.com | status.stripe.com |
| Vercel | vercel.com/support | vercel-status.com |
| Resend | resend.com/support | - |

---

## Response Procedures

### 1. Site Down (P1)

**Immediate Actions:**
1. Check Vercel status page
2. Check Supabase status page
3. Check domain DNS (is cantra.app resolving?)
4. Review recent deployments (rollback if needed)

**Vercel Rollback:**
```bash
# In Vercel dashboard:
# Deployments → Find last working → ... → Promote to Production
```

**Communication:**
- Update status page (if you have one)
- Post on social media
- Email affected users (if bookings impacted)

---

### 2. Database Issues (P1/P2)

**Symptoms:**
- 500 errors on all pages
- "Connection refused" errors
- Slow queries

**Actions:**
1. Check Supabase dashboard for:
   - Database health
   - Connection pool status
   - Active queries
2. If connection pool exhausted:
   - Restart the database from Supabase dashboard
   - Check for query leaks in code
3. If disk full:
   - Contact Supabase support
   - Consider upgrading plan

**Emergency Read-Only Mode:**
- Disable new bookings
- Disable property creation
- Keep search/browse working

---

### 3. Payment Failures (P1)

**Symptoms:**
- Stripe webhook errors
- Users can't complete bookings
- Hosts not receiving payouts

**Actions:**
1. Check Stripe dashboard:
   - API status
   - Webhook delivery status
   - Recent failed payments
2. Verify webhook secret is correct
3. Check for Stripe API key rotation
4. Test with Stripe CLI:
   ```bash
   stripe listen --forward-to localhost:3000/api/stripe/webhook
   ```

**Communication:**
- Notify affected users
- Offer alternative payment method if possible
- Document all failed transactions for manual processing

---

### 4. Security Incident (P1)

**Symptoms:**
- Unauthorized access detected
- Unusual database queries
- User reports account compromise

**Immediate Actions:**
1. **Preserve Evidence**
   - Screenshot any suspicious activity
   - Export relevant logs
   - Note timestamps

2. **Contain the Threat**
   - Rotate all API keys/secrets
   - Invalidate all sessions (Supabase Auth → Sign out all users)
   - If specific user compromised: ban account immediately

3. **Assess Impact**
   - What data was accessed?
   - How many users affected?
   - Was payment data exposed? (likely not - Stripe handles this)

4. **Notify**
   - Affected users (within 72 hours if personal data - GDPR)
   - ICO if UK personal data breach
   - Stripe if payment-related

5. **Remediate**
   - Patch vulnerability
   - Review similar code paths
   - Update security practices

---

### 5. Email Delivery Failure (P2)

**Symptoms:**
- Users not receiving booking confirmations
- Password reset emails not arriving

**Actions:**
1. Check Resend dashboard:
   - Email delivery status
   - Bounce rates
   - API status
2. Verify domain DNS (SPF, DKIM, DMARC)
3. Check for rate limiting
4. Review email templates for spam triggers

**Temporary Workaround:**
- Add in-app notifications as backup
- Manual email if critical (booking confirmations)

---

## Recovery Checklist

After any P1/P2 incident:

- [ ] Root cause identified
- [ ] Fix deployed and verified
- [ ] Affected users notified
- [ ] Incident documented (date, cause, impact, fix)
- [ ] Preventive measures identified
- [ ] Monitoring improved (if needed)
- [ ] Post-mortem meeting scheduled (for P1)

---

## Monitoring Checklist

**Daily:**
- [ ] Check Vercel analytics for errors
- [ ] Review Supabase dashboard
- [ ] Check Stripe webhook logs

**Weekly:**
- [ ] Review user feedback for recurring issues
- [ ] Check database size/performance
- [ ] Review email delivery rates

**Monthly:**
- [ ] Security audit (check for unused API keys, etc.)
- [ ] Dependency updates
- [ ] Backup verification

---

## Useful Commands

**Check if site is up:**
```bash
curl -I https://cantra.app
```

**Check DNS:**
```bash
nslookup cantra.app
```

**View recent Vercel logs:**
```bash
vercel logs cantra.app --follow
```

**Supabase connection test:**
```bash
# In Supabase dashboard → SQL Editor:
SELECT NOW();
```

---

## Post-Incident Template

```markdown
## Incident Report: [Title]

**Date:** YYYY-MM-DD
**Severity:** P1/P2/P3
**Duration:** X hours Y minutes
**Affected Users:** ~N users

### Summary
Brief description of what happened.

### Timeline
- HH:MM - Issue detected
- HH:MM - Investigation started
- HH:MM - Root cause identified
- HH:MM - Fix deployed
- HH:MM - Verified resolved

### Root Cause
Technical explanation of why this happened.

### Impact
- X bookings affected
- Y users unable to access site
- £Z revenue impact (if any)

### Resolution
What was done to fix it.

### Prevention
What we'll do to prevent this in the future.
```

---

## Emergency Contacts

### Supabase
- Support: support@supabase.io
- Status: status.supabase.com

### Stripe
- Support: stripe.com/support
- Status: status.stripe.com
- Phone: Available in dashboard for urgent issues

### Vercel
- Support: vercel.com/support
- Status: vercel-status.com

### Domain Registrar
- [Your registrar support contact]

---

*Last Updated: January 2026*

