import { Header } from "@/components/header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { PlusCircle, Camera, Tag, CreditCard, Calendar, MessageCircle, TrendingUp, Shield } from "lucide-react";

export default function HostsGuidePage() {
  return (
    <>
      <Header />
      <main className="min-h-screen bg-muted/30">
        <div className="container mx-auto px-4 py-8 md:py-12 max-w-5xl">
          {/* Hero Section */}
          <div className="text-center mb-10 md:mb-16">
            <Badge className="mb-4 text-base px-4 py-1 bg-green-600">For Hosts</Badge>
            <h1 className="font-serif text-3xl md:text-5xl font-bold mb-4">
              How padoq Works for Hosts
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
              Turn your equestrian property into a successful hospitality business in 6 simple steps
            </p>
          </div>

          {/* Steps */}
          <div className="space-y-12 mb-16">
            {/* Step 1 */}
            <div className="flex flex-col md:flex-row gap-8 items-start">
              <div className="flex-shrink-0">
                <div className="w-16 h-16 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-2xl font-bold">
                  1
                </div>
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-3">
                  <PlusCircle className="h-6 w-6 text-primary" />
                  <h2 className="font-serif text-2xl md:text-3xl font-bold">Create Your Listing</h2>
                </div>
                <p className="text-muted-foreground text-lg mb-4">
                  Sign up as a host and create a detailed listing for your property.
                </p>
                <Card>
                  <CardContent className="pt-6">
                    <h3 className="font-semibold mb-3">What you'll need to provide:</h3>
                    <div className="space-y-4">
                      <div>
                        <h4 className="font-medium mb-2">📋 Basic Information</h4>
                        <ul className="space-y-1 text-sm text-muted-foreground pl-4">
                          <li>• Property name and detailed description (min 200 characters)</li>
                          <li>• Property type (B&B, cottage, farm stay, etc.)</li>
                          <li>• Location (address, county, postcode)</li>
                          <li>• Guest capacity (bedrooms, beds, bathrooms)</li>
                          <li>• Check-in/check-out times</li>
                          <li>• House rules and policies</li>
                        </ul>
                      </div>

                      <div>
                        <h4 className="font-medium mb-2">🏠 Human Amenities</h4>
                        <ul className="space-y-1 text-sm text-muted-foreground pl-4">
                          <li>• WiFi, heating, kitchen facilities</li>
                          <li>• Parking, accessibility features</li>
                          <li>• Safety equipment (smoke alarms, first aid)</li>
                        </ul>
                      </div>

                      <div>
                        <h4 className="font-medium mb-2">🐴 Horse Facilities</h4>
                        <ul className="space-y-1 text-sm text-muted-foreground pl-4">
                          <li>• Maximum horse capacity and stable count</li>
                          <li>• Stable dimensions and type</li>
                          <li>• Bedding, forage, and feed options</li>
                          <li>• Paddock size and fencing type</li>
                          <li>• Riding arenas (indoor/outdoor)</li>
                          <li>• Facilities (wash bay, tack room, etc.)</li>
                          <li>• Bridleway access information</li>
                        </ul>
                      </div>
                    </div>
                    <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
                      <p className="text-sm">
                        <strong>Pro tip:</strong> Detailed, accurate listings get booked more often. Be honest about what you offer!
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Step 2 */}
            <div className="flex flex-col md:flex-row gap-8 items-start">
              <div className="flex-shrink-0">
                <div className="w-16 h-16 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-2xl font-bold">
                  2
                </div>
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-3">
                  <Camera className="h-6 w-6 text-primary" />
                  <h2 className="font-serif text-2xl md:text-3xl font-bold">Add High-Quality Photos</h2>
                </div>
                <p className="text-muted-foreground text-lg mb-4">
                  Great photos are essential for attracting guests. Show off what makes your property special.
                </p>
                <Card>
                  <CardContent className="pt-6">
                    <h3 className="font-semibold mb-3">Photography tips:</h3>
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <h4 className="font-medium mb-2 text-sm">📸 What to photograph:</h4>
                        <ul className="space-y-1 text-sm text-muted-foreground">
                          <li>• Guest accommodation (all rooms)</li>
                          <li>• Stables and horse facilities</li>
                          <li>• Paddocks and outdoor spaces</li>
                          <li>• Riding arenas (if available)</li>
                          <li>• Nearby bridleways and views</li>
                          <li>• Parking and access areas</li>
                        </ul>
                      </div>
                      <div>
                        <h4 className="font-medium mb-2 text-sm">✨ Best practices:</h4>
                        <ul className="space-y-1 text-sm text-muted-foreground">
                          <li>• Use natural daylight</li>
                          <li>• Keep spaces tidy and clean</li>
                          <li>• Show scale and dimensions</li>
                          <li>• Include multiple angles</li>
                          <li>• Upload at least 5-10 photos</li>
                          <li>• Set your best photo as cover</li>
                        </ul>
                      </div>
                    </div>
                    <div className="mt-4 p-4 bg-muted rounded-lg">
                      <p className="text-sm">
                        <strong>Impact:</strong> Listings with 8+ high-quality photos receive 3x more bookings on average!
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Step 3 */}
            <div className="flex flex-col md:flex-row gap-8 items-start">
              <div className="flex-shrink-0">
                <div className="w-16 h-16 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-2xl font-bold">
                  3
                </div>
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-3">
                  <Tag className="h-6 w-6 text-primary" />
                  <h2 className="font-serif text-2xl md:text-3xl font-bold">Set Your Pricing & Rules</h2>
                </div>
                <p className="text-muted-foreground text-lg mb-4">
                  Define your nightly rates, fees, and booking requirements to maximize your earnings.
                </p>
                <Card>
                  <CardContent className="pt-6 space-y-4">
                    <div>
                      <h3 className="font-semibold mb-3">Pricing options:</h3>
                      <ul className="space-y-2 text-muted-foreground">
                        <li className="flex items-start gap-2">
                          <span className="text-primary mt-1">£</span>
                          <span><strong>Base nightly rate:</strong> Your standard price per night</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-primary mt-1">£</span>
                          <span><strong>Per-horse fee:</strong> Additional charge per horse per night</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-primary mt-1">£</span>
                          <span><strong>Cleaning fee:</strong> One-time charge (optional)</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-primary mt-1">£</span>
                          <span><strong>Extra services:</strong> Arena hire, bedding, forage (optional)</span>
                        </li>
                      </ul>
                    </div>

                    <div>
                      <h3 className="font-semibold mb-3">Booking rules:</h3>
                      <div className="grid md:grid-cols-2 gap-4">
                        <div className="p-4 border rounded-lg">
                          <h4 className="font-medium mb-2">📅 Stay Requirements</h4>
                          <ul className="space-y-1 text-sm text-muted-foreground">
                            <li>• Minimum nights (e.g., 2-night minimum)</li>
                            <li>• Maximum nights (optional)</li>
                            <li>• Check-in/out times</li>
                          </ul>
                        </div>
                        <div className="p-4 border rounded-lg">
                          <h4 className="font-medium mb-2">⚡ Instant Book</h4>
                          <ul className="space-y-1 text-sm text-muted-foreground">
                            <li>• Auto-accept bookings</li>
                            <li>• Faster bookings = more income</li>
                            <li>• Higher search ranking</li>
                          </ul>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h3 className="font-semibold mb-3">Cancellation policies:</h3>
                      <div className="space-y-2 text-sm">
                        <div className="flex items-start gap-2">
                          <Badge variant="outline">Flexible</Badge>
                          <span className="text-muted-foreground">Full refund 24+ hours before check-in</span>
                        </div>
                        <div className="flex items-start gap-2">
                          <Badge variant="outline">Moderate</Badge>
                          <span className="text-muted-foreground">Full refund 5+ days before check-in</span>
                        </div>
                        <div className="flex items-start gap-2">
                          <Badge variant="outline">Strict</Badge>
                          <span className="text-muted-foreground">50% refund 7+ days before check-in</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Step 4 */}
            <div className="flex flex-col md:flex-row gap-8 items-start">
              <div className="flex-shrink-0">
                <div className="w-16 h-16 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-2xl font-bold">
                  4
                </div>
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-3">
                  <CreditCard className="h-6 w-6 text-primary" />
                  <h2 className="font-serif text-2xl md:text-3xl font-bold">Connect Your Bank Account</h2>
                </div>
                <p className="text-muted-foreground text-lg mb-4">
                  Set up Stripe Connect to receive payouts securely and automatically.
                </p>
                <Card>
                  <CardContent className="pt-6">
                    <div className="space-y-4">
                      <div>
                        <h3 className="font-semibold mb-2">How payments work:</h3>
                        <ol className="list-decimal pl-6 space-y-2 text-muted-foreground">
                          <li>Guest books and pays through padoq</li>
                          <li>Payment is held securely by Stripe</li>
                          <li>24 hours after guest check-in, funds are released</li>
                          <li>You receive automatic payout to your bank account</li>
                        </ol>
                      </div>

                      <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
                        <h4 className="font-semibold mb-2">💰 Transparent Fees</h4>
                        <ul className="space-y-1 text-sm text-muted-foreground">
                          <li><strong>You keep 97.5%</strong> of your listing price</li>
                          <li>padoq charges just <strong>2.5%</strong> + VAT to maintain the platform</li>
                          <li><strong>Standard payouts:</strong> Free (1-3 business days)</li>
                          <li><strong>Instant payouts:</strong> £1.99 per transfer (optional, same day)</li>
                          <li><strong>No hidden fees</strong> - no monthly costs, no listing fees</li>
                        </ul>
                        <p className="text-xs mt-2 italic">
                          Example: £200 booking → You receive £194 after 2.5% platform fee + VAT
                        </p>
                      </div>

                      <div className="p-4 bg-green-50 dark:bg-green-950 rounded-lg border border-green-200 dark:border-green-800">
                        <h4 className="font-semibold mb-2 flex items-center gap-2">
                          <Shield className="h-4 w-4" />
                          Secure & Protected
                        </h4>
                        <p className="text-sm text-muted-foreground">
                          Stripe is used by millions of businesses worldwide. Your banking information is encrypted and secure. 
                          padoq never sees or stores your bank details.
                        </p>
                      </div>

                      <div>
                        <h4 className="font-semibold mb-2">What you'll need:</h4>
                        <ul className="space-y-1 text-sm text-muted-foreground pl-4">
                          <li>• Bank account details</li>
                          <li>• Personal ID (for verification)</li>
                          <li>• Business details (if applicable)</li>
                        </ul>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Step 5 */}
            <div className="flex flex-col md:flex-row gap-8 items-start">
              <div className="flex-shrink-0">
                <div className="w-16 h-16 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-2xl font-bold">
                  5
                </div>
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-3">
                  <Calendar className="h-6 w-6 text-primary" />
                  <h2 className="font-serif text-2xl md:text-3xl font-bold">Manage Your Calendar</h2>
                </div>
                <p className="text-muted-foreground text-lg mb-4">
                  Keep your availability up to date to avoid double bookings and maximize occupancy.
                </p>
                <Card>
                  <CardContent className="pt-6">
                    <h3 className="font-semibold mb-3">Calendar features:</h3>
                    <div className="space-y-3">
                      <div className="flex items-start gap-3">
                        <span className="text-green-600 mt-1">✓</span>
                        <div>
                          <p className="font-medium">Block specific dates</p>
                          <p className="text-sm text-muted-foreground">Mark dates unavailable for personal use or maintenance</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <span className="text-green-600 mt-1">✓</span>
                        <div>
                          <p className="font-medium">Recurring availability rules</p>
                          <p className="text-sm text-muted-foreground">Block every Monday for weekly maintenance, etc.</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <span className="text-green-600 mt-1">✓</span>
                        <div>
                          <p className="font-medium">Dynamic pricing</p>
                          <p className="text-sm text-muted-foreground">Set weekend rates, seasonal pricing, and long-stay discounts</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <span className="text-green-600 mt-1">✓</span>
                        <div>
                          <p className="font-medium">Automatic updates</p>
                          <p className="text-sm text-muted-foreground">Bookings automatically block your calendar</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Step 6 */}
            <div className="flex flex-col md:flex-row gap-8 items-start">
              <div className="flex-shrink-0">
                <div className="w-16 h-16 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-2xl font-bold">
                  6
                </div>
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-3">
                  <MessageCircle className="h-6 w-6 text-primary" />
                  <h2 className="font-serif text-2xl md:text-3xl font-bold">Welcome Your Guests</h2>
                </div>
                <p className="text-muted-foreground text-lg mb-4">
                  Provide excellent hospitality to earn great reviews and build your reputation.
                </p>
                <Card>
                  <CardContent className="pt-6">
                    <div className="space-y-4">
                      <div>
                        <h3 className="font-semibold mb-2">Before arrival:</h3>
                        <ul className="space-y-1 text-sm text-muted-foreground pl-4">
                          <li>• Respond quickly to booking inquiries</li>
                          <li>• Send welcome message with arrival instructions</li>
                          <li>• Confirm check-in time and any special requests</li>
                          <li>• Prepare stables and guest accommodation</li>
                        </ul>
                      </div>

                      <div>
                        <h3 className="font-semibold mb-2">During the stay:</h3>
                        <ul className="space-y-1 text-sm text-muted-foreground pl-4">
                          <li>• Greet guests on arrival and show them around</li>
                          <li>• Be available for questions and support</li>
                          <li>• Check horses have everything they need</li>
                          <li>• Respect guest privacy while being accessible</li>
                        </ul>
                      </div>

                      <div>
                        <h3 className="font-semibold mb-2">After departure:</h3>
                        <ul className="space-y-1 text-sm text-muted-foreground pl-4">
                          <li>• Inspect property and stables</li>
                          <li>• Leave an honest review for the guest</li>
                          <li>• Address any damages through proper channels</li>
                          <li>• Thank guests for their stay</li>
                        </ul>
                      </div>

                      <div className="p-4 bg-yellow-50 dark:bg-yellow-950 rounded-lg border border-yellow-200 dark:border-yellow-800">
                        <h4 className="font-semibold mb-1">⭐ Reviews = Success</h4>
                        <p className="text-sm text-muted-foreground">
                          Great reviews lead to more bookings and higher rankings. Be responsive, clean, and welcoming!
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>

          {/* Success Tips */}
          <Card className="mb-12 border-2 border-primary/20">
            <CardContent className="pt-8 pb-8">
              <div className="flex items-start gap-4">
                <TrendingUp className="h-8 w-8 text-primary flex-shrink-0 mt-1" />
                <div>
                  <h2 className="font-serif text-2xl font-bold mb-4">Tips for Success</h2>
                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <h3 className="font-semibold mb-2">📈 Boost Your Bookings</h3>
                      <ul className="space-y-1 text-sm text-muted-foreground">
                        <li>• Enable Instant Book for higher visibility</li>
                        <li>• Respond to inquiries within 1 hour</li>
                        <li>• Keep your calendar updated</li>
                        <li>• Offer competitive pricing</li>
                        <li>• Maintain a high acceptance rate</li>
                      </ul>
                    </div>
                    <div>
                      <h3 className="font-semibold mb-2">⭐ Earn Great Reviews</h3>
                      <ul className="space-y-1 text-sm text-muted-foreground">
                        <li>• Communicate clearly and promptly</li>
                        <li>• Keep facilities clean and well-maintained</li>
                        <li>• Provide accurate listing descriptions</li>
                        <li>• Go above and beyond for guests</li>
                        <li>• Handle issues professionally</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* CTA Section */}
          <Card className="bg-primary text-primary-foreground">
            <CardContent className="pt-12 pb-12 text-center">
              <h2 className="font-serif text-3xl font-bold mb-4">
                Ready to start hosting?
              </h2>
              <p className="text-lg mb-8 opacity-90 max-w-2xl mx-auto">
                Join padoq and turn your equestrian property into a thriving hospitality business
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button size="lg" variant="secondary" asChild>
                  <Link href="/host/property/new">Create Your Listing</Link>
                </Button>
                <Button size="lg" variant="outline" className="bg-transparent hover:bg-primary-foreground/10" asChild>
                  <Link href="/help">Visit Help Center</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </>
  );
}

