import { Header } from "@/components/header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { Search, Heart, Calendar, CreditCard, MessageCircle, MapPin, Star, Home } from "lucide-react";

export default function GuestsGuidePage() {
  return (
    <>
      <Header />
      <main className="min-h-screen bg-muted/30">
        <div className="container mx-auto px-4 py-12 max-w-5xl">
          {/* Hero Section */}
          <div className="text-center mb-16">
            <Badge className="mb-4 text-base px-4 py-1">For Guests</Badge>
            <h1 className="font-serif text-5xl font-bold mb-4">
              How BridleStay Works for Guests
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Book unique equestrian accommodation across the UK in 5 simple steps
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
                  <Search className="h-6 w-6 text-primary" />
                  <h2 className="font-serif text-3xl font-bold">Search for Properties</h2>
                </div>
                <p className="text-muted-foreground text-lg mb-4">
                  Find the perfect property for you and your horses using our powerful search filters.
                </p>
                <Card>
                  <CardContent className="pt-6">
                    <h3 className="font-semibold mb-3">Filter by:</h3>
                    <ul className="space-y-2 text-muted-foreground">
                      <li className="flex items-start gap-2">
                        <span className="text-primary mt-1">✓</span>
                        <span><strong>Location:</strong> Search by county (Worcestershire, Herefordshire, Gloucestershire)</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-primary mt-1">✓</span>
                        <span><strong>Dates:</strong> Check availability for your travel dates</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-primary mt-1">✓</span>
                        <span><strong>Capacity:</strong> Number of guests and horses</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-primary mt-1">✓</span>
                        <span><strong>Price:</strong> Set your budget range</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-primary mt-1">✓</span>
                        <span><strong>Amenities:</strong> WiFi, kitchen, heating, etc.</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-primary mt-1">✓</span>
                        <span><strong>Horse Facilities:</strong> Arena, paddock, wash bay, bridleway access, etc.</span>
                      </li>
                    </ul>
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
                  <Home className="h-6 w-6 text-primary" />
                  <h2 className="font-serif text-3xl font-bold">Browse & Compare</h2>
                </div>
                <p className="text-muted-foreground text-lg mb-4">
                  Review property details, photos, amenities, and reviews to find your ideal stay.
                </p>
                <Card>
                  <CardContent className="pt-6">
                    <h3 className="font-semibold mb-3">Look for:</h3>
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <h4 className="font-medium mb-2 flex items-center gap-2">
                          <Star className="h-4 w-4 text-yellow-500" />
                          Quality Indicators
                        </h4>
                        <ul className="space-y-1 text-sm text-muted-foreground">
                          <li>• Guest reviews and ratings</li>
                          <li>• Host response time</li>
                          <li>• <Badge className="bg-blue-600 text-white text-xs">Verified Property</Badge> badge</li>
                          <li>• <Badge className="bg-green-600 text-white text-xs">⚡ Instant Book</Badge> availability</li>
                        </ul>
                      </div>
                      <div>
                        <h4 className="font-medium mb-2 flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-primary" />
                          Important Details
                        </h4>
                        <ul className="space-y-1 text-sm text-muted-foreground">
                          <li>• Check-in/check-out times</li>
                          <li>• Minimum/maximum stay</li>
                          <li>• House rules</li>
                          <li>• Cancellation policy</li>
                        </ul>
                      </div>
                    </div>
                    <div className="mt-4 p-4 bg-muted rounded-lg">
                      <p className="text-sm text-muted-foreground">
                        <strong>Pro tip:</strong> Use the <Heart className="inline h-4 w-4 mx-1" /> favorite button to save properties you love and compare them later!
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
                  <MessageCircle className="h-6 w-6 text-primary" />
                  <h2 className="font-serif text-3xl font-bold">Contact the Host (Optional)</h2>
                </div>
                <p className="text-muted-foreground text-lg mb-4">
                  Have questions? Message the host before booking to ensure the property meets your needs.
                </p>
                <Card>
                  <CardContent className="pt-6">
                    <h3 className="font-semibold mb-3">Good questions to ask:</h3>
                    <ul className="space-y-2 text-muted-foreground">
                      <li className="flex items-start gap-2">
                        <span className="text-primary mt-1">?</span>
                        <span>Are there any specific requirements for my horses (vaccinations, passports)?</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-primary mt-1">?</span>
                        <span>What type of bedding/forage is provided?</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-primary mt-1">?</span>
                        <span>Are there local riding routes you recommend?</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-primary mt-1">?</span>
                        <span>Is there a local vet and farrier you work with?</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-primary mt-1">?</span>
                        <span>What's the best way to access the property with a trailer/lorry?</span>
                      </li>
                    </ul>
                    <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
                      <p className="text-sm">
                        <strong>Response time matters:</strong> Hosts typically respond within a few hours. Fast, helpful responses are a good sign of attentive hosting!
                      </p>
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
                  <h2 className="font-serif text-3xl font-bold">Book & Pay Securely</h2>
                </div>
                <p className="text-muted-foreground text-lg mb-4">
                  Select your dates, enter guest and horse details, and complete your secure payment.
                </p>
                <Card>
                  <CardContent className="pt-6 space-y-4">
                    <div>
                      <h3 className="font-semibold mb-3">Your booking includes:</h3>
                      <ul className="space-y-2 text-muted-foreground">
                        <li className="flex items-start gap-2">
                          <span className="text-green-600 mt-1">✓</span>
                          <span>Clear pricing breakdown (no hidden fees)</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-green-600 mt-1">✓</span>
                          <span>Secure payment through Stripe</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-green-600 mt-1">✓</span>
                          <span>Instant confirmation email</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-green-600 mt-1">✓</span>
                          <span>Host contact information</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-green-600 mt-1">✓</span>
                          <span>Clear cancellation terms</span>
                        </li>
                      </ul>
                    </div>

                    <div className="grid md:grid-cols-2 gap-4 mt-4">
                      <div className="p-4 border rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge className="bg-green-600 text-white">⚡ Instant Book</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Your reservation is confirmed immediately. Payment is processed right away, and you'll get instant confirmation.
                        </p>
                      </div>
                      <div className="p-4 border rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <Calendar className="h-4 w-4 text-primary" />
                          <span className="font-medium">Request to Book</span>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Host has 24 hours to respond. You're only charged if they accept your request.
                        </p>
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
                  <span className="text-4xl">🐴</span>
                  <h2 className="font-serif text-3xl font-bold">Enjoy Your Stay!</h2>
                </div>
                <p className="text-muted-foreground text-lg mb-4">
                  Arrive, settle in with your horses, and enjoy your equestrian adventure.
                </p>
                <Card>
                  <CardContent className="pt-6">
                    <div className="space-y-4">
                      <div>
                        <h3 className="font-semibold mb-2">Before you arrive:</h3>
                        <ul className="space-y-1 text-muted-foreground text-sm">
                          <li>• Confirm arrival time with your host</li>
                          <li>• Bring horse passports and vaccination records</li>
                          <li>• Review property rules and directions</li>
                          <li>• Save host contact information</li>
                        </ul>
                      </div>

                      <div>
                        <h3 className="font-semibold mb-2">During your stay:</h3>
                        <ul className="space-y-1 text-muted-foreground text-sm">
                          <li>• Treat the property with respect</li>
                          <li>• Follow house rules and stable management guidelines</li>
                          <li>• Communicate with your host about any issues</li>
                          <li>• Explore local bridleways using the Routes feature</li>
                        </ul>
                      </div>

                      <div>
                        <h3 className="font-semibold mb-2">After your stay:</h3>
                        <ul className="space-y-1 text-muted-foreground text-sm">
                          <li>• Leave the property clean and tidy</li>
                          <li>• Leave a review (within 14 days)</li>
                          <li>• Read the host's review of you</li>
                          <li>• Save the property as a favorite for next time!</li>
                        </ul>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>

          {/* CTA Section */}
          <Card className="bg-primary text-primary-foreground">
            <CardContent className="pt-12 pb-12 text-center">
              <h2 className="font-serif text-3xl font-bold mb-4">
                Ready to start your adventure?
              </h2>
              <p className="text-lg mb-8 opacity-90 max-w-2xl mx-auto">
                Browse unique equestrian properties across Worcestershire, Herefordshire, and Gloucestershire
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button size="lg" variant="secondary" asChild>
                  <Link href="/search">Search Properties</Link>
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

