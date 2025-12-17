import { Header } from "@/components/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { HelpCircle, Users, Home, CreditCard, Shield, MessageCircle } from "lucide-react";

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
              Find answers to common questions about booking, hosting, and using Bridlestay
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
                      <div className="space-y-3 text-muted-foreground">
                        <p>Yes, cancellation policies vary by property. There are three types:</p>
                        <ul className="list-disc pl-6 space-y-2">
                          <li><strong>Flexible:</strong> Full refund if cancelled 24+ hours before check-in</li>
                          <li><strong>Moderate:</strong> Full refund if cancelled 5+ days before check-in</li>
                          <li><strong>Strict:</strong> 50% refund if cancelled 7+ days before check-in</li>
                        </ul>
                        <p className="mt-3">The specific policy is shown on each property page before booking. To cancel, go to your Bookings page and select "Cancel Booking".</p>
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
                      <div className="space-y-2 text-muted-foreground">
                        <p>The total price typically includes:</p>
                        <ul className="list-disc pl-6 space-y-1 mt-2">
                          <li><strong>Nightly rate:</strong> Base price per night</li>
                          <li><strong>Per-horse fee:</strong> Additional charge per horse per night (if applicable)</li>
                          <li><strong>Cleaning fee:</strong> One-time fee (if applicable)</li>
                          <li><strong>Service fee (12.5%):</strong> Bridlestay platform fee (capped at £150)</li>
                          <li><strong>VAT (20%):</strong> Applied to service fee only</li>
                        </ul>
                        <p className="mt-3">You'll see a complete, transparent breakdown before confirming your booking.</p>
                      </div>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="item-2">
                    <AccordionTrigger>When will I be charged?</AccordionTrigger>
                    <AccordionContent>
                      <p className="text-muted-foreground">
                        For Instant Book properties, you're charged immediately upon booking. For properties requiring approval, 
                        you're charged only after the host accepts your request. If a host doesn't respond within 24 hours or declines, 
                        you won't be charged.
                      </p>
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
                      <p className="text-muted-foreground">
                        Hosts receive payment 24 hours after the guest checks in. This policy protects both guests and hosts, 
                        ensuring the property matches the listing and the guest shows up as expected.
                      </p>
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
                  <CardTitle className="text-2xl">Hosting on Bridlestay</CardTitle>
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
                    <AccordionTrigger>How much does Bridlestay charge?</AccordionTrigger>
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
                        Your payment information is encrypted and never stored on Bridlestay servers. We are PCI-DSS compliant and take security seriously.
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

