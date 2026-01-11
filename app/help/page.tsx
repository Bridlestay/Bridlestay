import { Header } from "@/components/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { HelpCircle, Users, Home, CreditCard, Shield, MessageCircle, AlertCircle } from "lucide-react";

export default function HelpPage() {
  return (
    <>
      <Header />
      <main className="min-h-screen bg-muted/30">
        <div className="container mx-auto px-4 py-12 max-w-5xl">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="font-serif text-5xl font-bold mb-4">Help Center</h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Find answers to common questions about booking, hosting, and using Cantra
            </p>
          </div>

          {/* Quick Links */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
            <Card className="hover:shadow-lg transition-shadow flex flex-col">
              <CardHeader>
                <Users className="h-8 w-8 text-primary mb-2" />
                <CardTitle className="text-lg">For Guests</CardTitle>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col">
                <p className="text-sm text-muted-foreground mb-4 flex-1">
                  Learn how to search, book, and enjoy your stay
                </p>
                <Button variant="outline" asChild className="w-full">
                  <Link href="/how-it-works/guests">Guest Guide →</Link>
                </Button>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow flex flex-col">
              <CardHeader>
                <Home className="h-8 w-8 text-primary mb-2" />
                <CardTitle className="text-lg">For Hosts</CardTitle>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col">
                <p className="text-sm text-muted-foreground mb-4 flex-1">
                  Start hosting and manage your property
                </p>
                <Button variant="outline" asChild className="w-full">
                  <Link href="/how-it-works/hosts">Host Guide →</Link>
                </Button>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow flex flex-col">
              <CardHeader>
                <Shield className="h-8 w-8 text-primary mb-2" />
                <CardTitle className="text-lg">Safety Tips</CardTitle>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col">
                <p className="text-sm text-muted-foreground mb-4 flex-1">
                  Best practices for safe hosting and traveling
                </p>
                <Button variant="outline" asChild className="w-full">
                  <Link href="/safety">Safety Guide →</Link>
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* FAQ Sections */}
          <div className="space-y-8">
            {/* Booking Questions */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <Users className="h-6 w-6 text-primary" />
                  <CardTitle className="text-2xl">Booking & Reservations</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <Accordion type="single" collapsible className="w-full">
                  <AccordionItem value="item-1">
                    <AccordionTrigger>How do I book a property?</AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-2 text-muted-foreground">
                        <p>1. Search for properties using our search filters (location, dates, number of guests/horses)</p>
                        <p>2. Browse listings and click on any property to view details</p>
                        <p>3. Select your check-in and check-out dates</p>
                        <p>4. Enter the number of guests and horses</p>
                        <p>5. Review the pricing breakdown and click "Book Now"</p>
                        <p>6. Complete payment to confirm your reservation</p>
                        <p className="mt-4 text-sm">
                          Some properties offer <Badge className="bg-green-600">⚡ Instant Book</Badge>, which confirms immediately. Others require host approval within 24 hours.
                        </p>
                      </div>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="item-2">
                    <AccordionTrigger>What is Instant Book?</AccordionTrigger>
                    <AccordionContent>
                      <p className="text-muted-foreground">
                        Instant Book allows you to confirm your reservation immediately without waiting for host approval. 
                        Properties with the <Badge className="bg-green-600 mx-1">⚡ Instant Book</Badge> badge can be booked instantly. 
                        Your payment is processed immediately, and you'll receive a confirmation email right away.
                      </p>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="item-3">
                    <AccordionTrigger>Can I modify or cancel my booking?</AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-4 text-muted-foreground">
                        <p>Yes, but cancellation refunds depend on the property's policy. There are three policies:</p>
                        
                        <div className="space-y-3">
                          <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                            <p className="font-semibold text-green-800">🟢 Flexible</p>
                            <ul className="list-disc pl-5 text-sm mt-1 text-green-700">
                              <li>Full refund up to <strong>7 days</strong> before check-in</li>
                              <li>After that: first night non-refundable, rest refundable if rebooked</li>
                            </ul>
                          </div>
                          
                          <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                            <p className="font-semibold text-blue-800">🔵 Standard (Most Common)</p>
                            <ul className="list-disc pl-5 text-sm mt-1 text-blue-700">
                              <li>Full refund up to <strong>14 days</strong> before check-in</li>
                              <li>50% refund between 14-7 days</li>
                              <li>No refund inside 7 days</li>
                            </ul>
                          </div>
                          
                          <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
                            <p className="font-semibold text-amber-800">🟠 Strict</p>
                            <ul className="list-disc pl-5 text-sm mt-1 text-amber-700">
                              <li>Full refund up to <strong>30 days</strong> before check-in</li>
                              <li>50% refund between 30-14 days</li>
                              <li>No refund inside 14 days</li>
                            </ul>
                          </div>
                        </div>
                        
                        <p className="text-sm bg-muted p-2 rounded">
                          <strong>Important:</strong> Service fees are non-refundable. Refunds apply to accommodation costs only. 
                          The specific policy is shown on each property page before you book.
                        </p>
                      </div>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="item-3b">
                    <AccordionTrigger>What if something goes wrong during my stay?</AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-3 text-muted-foreground">
                        <p>
                          If you encounter a <strong>serious issue</strong> with the property after checking in, 
                          you have <strong>48 hours</strong> from check-in to report it through your booking page.
                        </p>
                        <p className="font-medium text-foreground">Valid issues include:</p>
                        <ul className="list-disc pl-6 space-y-1">
                          <li>Property significantly different from the listing</li>
                          <li>Serious cleanliness or safety issues (for you or your horses)</li>
                          <li>Unable to access the property</li>
                          <li>Core advertised amenities missing</li>
                        </ul>
                        <p className="mt-2">
                          Our team will review your report and may offer a partial refund for unused nights. 
                          <strong> Issues reported after 48 hours cannot be considered for refunds.</strong>
                        </p>
                        <p className="text-sm bg-amber-50 text-amber-800 p-2 rounded mt-2">
                          ⚠️ Minor inconveniences (weather, personal preferences, "not what I imagined") 
                          do not qualify for refunds. Please address these with the host directly or in your review.
                        </p>
                      </div>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="item-4">
                    <AccordionTrigger>How many horses can I bring?</AccordionTrigger>
                    <AccordionContent>
                      <p className="text-muted-foreground">
                        Each property specifies its maximum horse capacity. You can filter search results by the number of horses you're bringing. 
                        Make sure to accurately enter the number of horses when booking, as properties charge a per-horse fee and need to prepare adequate facilities.
                      </p>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="item-5">
                    <AccordionTrigger>What if my plans change?</AccordionTrigger>
                    <AccordionContent>
                      <p className="text-muted-foreground">
                        Contact your host as soon as possible through our messaging system. Hosts may be flexible with minor changes. 
                        For date changes or cancellations, review the property's cancellation policy and initiate changes through your booking page.
                      </p>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </CardContent>
            </Card>

            {/* Payment Questions */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <CreditCard className="h-6 w-6 text-primary" />
                  <CardTitle className="text-2xl">Payments & Pricing</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <Accordion type="single" collapsible className="w-full">
                  <AccordionItem value="item-1">
                    <AccordionTrigger>How does pricing work?</AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-3 text-muted-foreground">
                        <p className="font-medium text-foreground">Price Calculation Order:</p>
                        <ol className="list-decimal pl-6 space-y-1">
                          <li><strong>Base nightly rate:</strong> The property's standard price per night</li>
                          <li><strong>Extra guest/horse fees:</strong> Added per night if applicable</li>
                          <li><strong>Discounts applied:</strong> Any automated discounts (length-of-stay, last-minute, etc.)</li>
                          <li><strong>Cleaning fees:</strong> One-time fee (may show house + stable breakdown)</li>
                          <li><strong>Service fee:</strong> Cantra platform fee (15% capped at £150, plus VAT)</li>
                        </ol>
                        <p className="mt-3">
                          <strong>Hosts set all prices</strong> — Cantra remains neutral. You'll always see a complete, 
                          transparent breakdown before booking. No hidden fees, no surprises.
                        </p>
                        <p className="text-sm bg-muted p-2 rounded mt-2">
                          💡 <strong>Tip:</strong> Click on the cleaning fee to see a breakdown (house vs stable cleaning) 
                          if the host has specified separate amounts.
                        </p>
                      </div>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="item-1b">
                    <AccordionTrigger>How do discounts work?</AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-3 text-muted-foreground">
                        <p>Hosts can offer several types of discounts:</p>
                        <ul className="list-disc pl-6 space-y-2 mt-2">
                          <li><strong>Last-minute discounts:</strong> Savings when booking close to check-in date</li>
                          <li><strong>Length-of-stay discounts:</strong> Savings for longer bookings (e.g., 7+ nights)</li>
                          <li><strong>Seasonal discounts:</strong> Special rates during off-peak periods</li>
                          <li><strong>First-time rider discount:</strong> Welcome offer for your first booking on Cantra</li>
                        </ul>
                        <p className="mt-3 font-medium text-foreground">How discounts are applied:</p>
                        <ul className="list-disc pl-6 space-y-1">
                          <li>Discounts apply to <strong>nightly rates only</strong> (not cleaning or service fees)</li>
                          <li>By default, only the <strong>single best discount</strong> applies to your booking</li>
                          <li>The applied discount is clearly shown in your price breakdown</li>
                        </ul>
                        <p className="text-sm bg-green-50 text-green-800 p-2 rounded mt-3">
                          ✓ You'll never be surprised — all discounts are transparent and shown before you book.
                        </p>
                      </div>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="item-2">
                    <AccordionTrigger>When will I be charged?</AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-3 text-muted-foreground">
                        <p className="font-medium text-foreground">Payment timing depends on when you're checking in:</p>
                        
                        <div className="grid gap-3 sm:grid-cols-2">
                          <div className="p-3 bg-muted rounded-lg">
                            <p className="font-semibold text-foreground">Check-in within 60 days</p>
                            <p className="text-sm mt-1">Full payment charged immediately when you book.</p>
                          </div>
                          
                          <div className="p-3 bg-muted rounded-lg">
                            <p className="font-semibold text-foreground">Check-in more than 60 days away</p>
                            <p className="text-sm mt-1">
                              50% deposit now, remaining 50% charged automatically 14 days before check-in. 
                              No action required from you.
                            </p>
                          </div>
                        </div>
                        
                        <p className="text-sm">
                          For properties requiring approval, you're charged only after the host accepts. 
                          If declined or no response within 24 hours, you won't be charged.
                        </p>
                      </div>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="item-3">
                    <AccordionTrigger>What payment methods do you accept?</AccordionTrigger>
                    <AccordionContent>
                      <p className="text-muted-foreground">
                        We accept all major credit and debit cards (Visa, Mastercard, American Express) through our secure payment processor, Stripe. 
                        Your payment information is encrypted and never stored on our servers.
                      </p>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="item-4">
                    <AccordionTrigger>When do hosts receive payment?</AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-3 text-muted-foreground">
                        <p>
                          Hosts receive their payout <strong>48 hours after check-in</strong>, once the resolution window closes.
                        </p>
                        <p className="font-medium text-foreground">Why 48 hours?</p>
                        <ul className="list-disc pl-6 space-y-1">
                          <li>Gives guests time to report any serious issues with the property</li>
                          <li>Protects hosts by confirming the guest has arrived</li>
                          <li>Allows for fair resolution before funds are released</li>
                        </ul>
                        <p className="text-sm bg-muted p-2 rounded mt-2">
                          Once the 48-hour window closes with no issues reported, the payout is automatically released to the host's bank account.
                        </p>
                      </div>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="item-5">
                    <AccordionTrigger>Are refunds possible after the host has been paid?</AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-2 text-muted-foreground">
                        <p>
                          <strong>No.</strong> Once the 48-hour resolution window closes and the host has been paid, 
                          refunds are no longer possible. This provides certainty for hosts and encourages guests 
                          to report any genuine issues promptly.
                        </p>
                        <p>
                          If you have concerns about a property, please report them within the first 48 hours of your stay.
                        </p>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </CardContent>
            </Card>

            {/* Host Questions */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <Home className="h-6 w-6 text-primary" />
                  <CardTitle className="text-2xl">Hosting on Cantra</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <Accordion type="single" collapsible className="w-full">
                  <AccordionItem value="item-1">
                    <AccordionTrigger>How do I become a host?</AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-2 text-muted-foreground">
                        <p>Getting started is easy:</p>
                        <ol className="list-decimal pl-6 space-y-1 mt-2">
                          <li>Sign up for an account and set your role to "Host"</li>
                          <li>Create your listing with photos and detailed descriptions</li>
                          <li>Set your pricing and availability</li>
                          <li>Connect your Stripe account to receive payments</li>
                          <li>Publish your listing and start accepting bookings!</li>
                        </ol>
                        <p className="mt-3">
                          <Link href="/how-it-works/hosts" className="text-primary hover:underline">
                            Read our complete host guide →
                          </Link>
                        </p>
                      </div>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="item-2">
                    <AccordionTrigger>What facilities do I need?</AccordionTrigger>
                    <AccordionContent>
                      <p className="text-muted-foreground">
                        At minimum, you need suitable accommodation for guests and basic facilities for horses (stabling or secure paddock). 
                        Additional amenities like arenas, wash bays, and direct bridleway access make your property more attractive to guests. 
                        Be honest about what you offer—clear communication builds trust.
                      </p>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="item-3">
                    <AccordionTrigger>How much does Cantra charge?</AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-3 text-muted-foreground">
                        <p className="font-semibold text-foreground">Guest Service Fee:</p>
                        <ul className="list-disc list-inside ml-4 space-y-1">
                          <li><strong>12.5%</strong> service fee (capped at £150)</li>
                          <li>Plus VAT (20%) on the service fee</li>
                          <li>Covers payment processing, customer support, and platform maintenance</li>
                        </ul>
                        
                        <p className="font-semibold text-foreground mt-4">Host Fee:</p>
                        <ul className="list-disc list-inside ml-4 space-y-1">
                          <li><strong>2.5%</strong> platform fee</li>
                          <li>Plus VAT (20%) on the platform fee</li>
                          <li>You keep <strong>97.5%</strong> of your listing price</li>
                        </ul>
                        
                        <p className="font-semibold text-foreground mt-4">Instant Payout Fee:</p>
                        <ul className="list-disc list-inside ml-4 space-y-1">
                          <li><strong>£1.99</strong> per instant payout (optional)</li>
                          <li>Standard payouts are free (1-3 business days)</li>
                        </ul>
                        
                        <p className="mt-4 text-sm">
                          <strong>Example:</strong> £200 booking → Guest pays £227.50 (£200 + £25 service fee + £2.50 VAT) → Host receives £194 (£200 - £5 platform fee - £1 VAT)
                        </p>
                        
                        <p className="mt-4 italic">
                          No upfront costs, no monthly subscription fees, no hidden charges. Discount codes and referral rewards may reduce fees at launch!
                        </p>
                      </div>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="item-4">
                    <AccordionTrigger>Can I decline a booking request?</AccordionTrigger>
                    <AccordionContent>
                      <p className="text-muted-foreground">
                        Yes, you can decline booking requests if they don't meet your requirements or if you're unavailable. 
                        However, maintaining a high acceptance rate helps your listing rank higher in search results. 
                        Consider using Instant Book with guest requirements to reduce unwanted requests.
                      </p>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="item-5">
                    <AccordionTrigger>How do I set up discounts?</AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-3 text-muted-foreground">
                        <p>
                          After publishing your listing, you can access <strong>Advanced Pricing</strong> settings 
                          to configure automated discounts:
                        </p>
                        <ul className="list-disc pl-6 space-y-2 mt-2">
                          <li><strong>Last-minute discounts:</strong> Up to 3 tiered rules (e.g., 5% at 14 days, 10% at 7 days, 15% at 3 days)</li>
                          <li><strong>Length-of-stay discounts:</strong> Reward longer bookings (e.g., 10% for 7+ nights)</li>
                          <li><strong>Seasonal discounts:</strong> Set special rates for specific date ranges</li>
                          <li><strong>First-time rider discount:</strong> Welcome new users to the platform</li>
                        </ul>
                        <p className="font-medium text-foreground mt-3">Key safety features:</p>
                        <ul className="list-disc pl-6 space-y-1">
                          <li>All discounts are <strong>off by default</strong> — you must explicitly enable them</li>
                          <li>By default, only the <strong>single best discount</strong> applies (no accidental stacking)</li>
                          <li>A <strong>floor price warning</strong> alerts you if prices drop significantly</li>
                        </ul>
                        <p className="text-sm bg-green-50 text-green-800 p-2 rounded mt-3">
                          ✓ You're always in control. Preview exactly what guests will pay before saving changes.
                        </p>
                      </div>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="item-6">
                    <AccordionTrigger>How do damage claims work for hosts?</AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-3 text-muted-foreground">
                        <p>
                          If a guest causes damage or leaves the property requiring excessive cleaning, 
                          you have <strong>48 hours after checkout</strong> to submit a claim.
                        </p>
                        <p className="font-medium text-foreground mt-2">What you need:</p>
                        <ul className="list-disc pl-6 space-y-1">
                          <li>Clear photos of the damage</li>
                          <li>Description of what happened</li>
                          <li>Amount you're claiming (reasonable and justified)</li>
                        </ul>
                        <p className="mt-2">
                          The guest will be notified and can accept or dispute. If disputed, Cantra reviews 
                          evidence from both sides and makes a fair decision.
                        </p>
                        <p className="text-sm bg-amber-50 text-amber-800 p-2 rounded mt-3">
                          ⚠️ Document your property's condition with photos before each guest arrives — 
                          this helps support any future claims.
                        </p>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </CardContent>
            </Card>

            {/* Damage & Claims */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <AlertCircle className="h-6 w-6 text-primary" />
                  <CardTitle className="text-2xl">Damage & Claims</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <Accordion type="single" collapsible className="w-full">
                  <AccordionItem value="damage-1">
                    <AccordionTrigger>What happens if there's damage to the property?</AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-3 text-muted-foreground">
                        <p>
                          Hosts have <strong>48 hours after checkout</strong> to report damage or excessive cleaning needs. 
                          This shorter window (compared to other platforms) keeps things simple and fair for everyone.
                        </p>
                        <p className="font-medium text-foreground">The process:</p>
                        <ol className="list-decimal pl-6 space-y-1">
                          <li>Host submits claim with photos and description within 48 hours</li>
                          <li>Guest is notified and can accept or dispute the claim</li>
                          <li>If disputed, Cantra reviews evidence from both sides</li>
                          <li>A fair decision is made based on the evidence</li>
                          <li>Approved amounts are charged to the guest's saved payment method</li>
                        </ol>
                        <p className="text-sm bg-blue-50 text-blue-800 p-2 rounded mt-3">
                          ℹ️ By booking, you consent to potential post-stay charges for approved damage claims, 
                          as stated in our Terms of Service.
                        </p>
                      </div>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="damage-2">
                    <AccordionTrigger>How are damage disputes handled?</AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-2 text-muted-foreground">
                        <p>
                          If you dispute a damage claim, Cantra reviews evidence from both sides and makes a final decision. 
                          We remain neutral — our goal is fairness, not siding with hosts or guests.
                        </p>
                        <p className="mt-2">
                          <strong>What we consider:</strong>
                        </p>
                        <ul className="list-disc pl-6 space-y-1">
                          <li>Photos and documentation from both parties</li>
                          <li>Check-in condition reports (if available)</li>
                          <li>Messages between host and guest</li>
                          <li>The nature and extent of the claimed damage</li>
                        </ul>
                        <p className="mt-3 text-sm">
                          We won't attempt repeated silent charges if a payment fails. You'll be notified and asked 
                          to update your payment method if needed.
                        </p>
                      </div>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="damage-3">
                    <AccordionTrigger>How are refunds calculated?</AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-2 text-muted-foreground">
                        <p>
                          Refunds are always calculated based on the <strong>discounted price you actually paid</strong>, 
                          not the original base rate. This ensures fairness regardless of what discounts were applied.
                        </p>
                        <p className="mt-2">
                          <strong>Example:</strong> If you paid £170 after a 15% discount on a £200 booking, 
                          any refund is calculated from the £170 you actually paid.
                        </p>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </CardContent>
            </Card>

            {/* Safety & Support */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <Shield className="h-6 w-6 text-primary" />
                  <CardTitle className="text-2xl">Safety & Support</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <Accordion type="single" collapsible className="w-full">
                  <AccordionItem value="item-1">
                    <AccordionTrigger>How do I report a problem?</AccordionTrigger>
                    <AccordionContent>
                      <p className="text-muted-foreground">
                        If you encounter any issues during your stay or with a guest, contact us immediately through the 
                        <Link href="/feedback" className="text-primary hover:underline mx-1">feedback form</Link>
                        or report the issue through your booking page. We'll investigate and help resolve the situation. 
                        For emergencies, contact local authorities first.
                      </p>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="item-2">
                    <AccordionTrigger>Is my payment information secure?</AccordionTrigger>
                    <AccordionContent>
                      <p className="text-muted-foreground">
                        Absolutely. We use Stripe, an industry-leading payment processor trusted by millions of businesses worldwide. 
                        Your payment information is encrypted and never stored on Cantra servers. We are PCI-DSS compliant and take security seriously.
                      </p>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="item-3">
                    <AccordionTrigger>What if my horse is injured on the property?</AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-2 text-muted-foreground">
                        <p>In case of injury:</p>
                        <ol className="list-decimal pl-6 space-y-1 mt-2">
                          <li>Seek immediate veterinary care</li>
                          <li>Document the injury and circumstances with photos</li>
                          <li>Contact the host to inform them of the situation</li>
                          <li>Report the incident through your booking page</li>
                          <li>Contact your insurance provider</li>
                        </ol>
                        <p className="mt-3">
                          We recommend all guests have appropriate insurance for their horses. Hosts should also carry liability insurance.
                          <Link href="/safety" className="text-primary hover:underline ml-1">Read our safety guidelines →</Link>
                        </p>
                      </div>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="item-4">
                    <AccordionTrigger>How do I contact support?</AccordionTrigger>
                    <AccordionContent>
                      <p className="text-muted-foreground">
                        You can reach us through the 
                        <Link href="/feedback" className="text-primary hover:underline mx-1">feedback form</Link>
                        or message us directly through your dashboard. We typically respond within 24 hours. 
                        For urgent issues related to active bookings, mark your message as urgent.
                      </p>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </CardContent>
            </Card>
          </div>

          {/* Still Have Questions */}
          <Card className="mt-12 bg-primary/5 border-primary/20">
            <CardContent className="pt-8 pb-8 text-center">
              <MessageCircle className="h-12 w-12 text-primary mx-auto mb-4" />
              <h2 className="font-serif text-2xl font-bold mb-2">Still have questions?</h2>
              <p className="text-muted-foreground mb-6 max-w-xl mx-auto">
                Can't find what you're looking for? We're here to help.
              </p>
              <Button asChild size="lg">
                <Link href="/feedback">Contact Support</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </main>
    </>
  );
}

