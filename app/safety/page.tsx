import { Header } from "@/components/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Shield, AlertTriangle, Users, Home, Heart, Phone, FileText, Lock } from "lucide-react";

export default function SafetyPage() {
  return (
    <>
      <Header />
      <main className="min-h-screen bg-muted/30">
        <div className="container mx-auto px-4 py-12 max-w-5xl">
          {/* Hero Section */}
          <div className="text-center mb-12">
            <Shield className="h-16 w-16 text-primary mx-auto mb-4" />
            <h1 className="font-serif text-5xl font-bold mb-4">Safety & Security</h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Best practices to ensure safe hosting and traveling experiences for everyone
            </p>
          </div>

          {/* Emergency Banner */}
          <Card className="mb-12 border-2 border-red-500 bg-red-50 dark:bg-red-950/20">
            <CardContent className="pt-6 pb-6">
              <div className="flex items-start gap-4">
                <AlertTriangle className="h-8 w-8 text-red-600 flex-shrink-0" />
                <div>
                  <h2 className="text-xl font-bold mb-2 text-red-900 dark:text-red-100">In Case of Emergency</h2>
                  <p className="text-red-800 dark:text-red-200 mb-4">
                    If you're experiencing an emergency (fire, injury, theft, etc.), contact local authorities immediately:
                  </p>
                  <div className="flex flex-wrap gap-4 text-lg font-semibold">
                    <div className="flex items-center gap-2">
                      <Phone className="h-5 w-5" />
                      <span>Emergency: 999</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Phone className="h-5 w-5" />
                      <span>Non-Emergency: 101</span>
                    </div>
                  </div>
                  <p className="text-sm text-red-700 dark:text-red-300 mt-3">
                    After ensuring everyone's safety, report the incident through your Bridlestay booking page.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Safety Sections */}
          <div className="space-y-8">
            {/* For Guests */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <Users className="h-6 w-6 text-primary" />
                  <CardTitle className="text-2xl">Safety Tips for Guests</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Before Booking */}
                <div>
                  <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                    <span className="text-primary">1.</span> Before Booking
                  </h3>
                  <div className="space-y-2 text-muted-foreground pl-6">
                    <div className="flex items-start gap-2">
                      <span className="text-green-600 mt-1">✓</span>
                      <span>Read property descriptions, reviews, and house rules carefully</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-green-600 mt-1">✓</span>
                      <span>Look for <Badge className="bg-blue-600 text-white mx-1">Verified Property</Badge> badges</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-green-600 mt-1">✓</span>
                      <span>Message the host with questions about facilities and safety measures</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-green-600 mt-1">✓</span>
                      <span>Check the host's response time and ratings</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-green-600 mt-1">✓</span>
                      <span>Verify your horse insurance is valid and adequate</span>
                    </div>
                  </div>
                </div>

                {/* During Your Stay */}
                <div>
                  <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                    <span className="text-primary">2.</span> During Your Stay
                  </h3>
                  <div className="space-y-2 text-muted-foreground pl-6">
                    <div className="flex items-start gap-2">
                      <span className="text-green-600 mt-1">✓</span>
                      <span>Inspect stables and facilities before settling your horses</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-green-600 mt-1">✓</span>
                      <span>Report any hazards or safety concerns immediately</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-green-600 mt-1">✓</span>
                      <span>Keep emergency contact numbers (vet, farrier) accessible</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-green-600 mt-1">✓</span>
                      <span>Follow all property rules and biosecurity measures</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-green-600 mt-1">✓</span>
                      <span>Keep valuables secure (tack, equipment) and lock vehicles</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-green-600 mt-1">✓</span>
                      <span>Stay in communication with your host</span>
                    </div>
                  </div>
                </div>

                {/* Horse Safety */}
                <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
                  <h4 className="font-semibold mb-2 flex items-center gap-2">
                    <Heart className="h-4 w-4" />
                    Horse Safety Essentials
                  </h4>
                  <ul className="space-y-1 text-sm text-muted-foreground">
                    <li>• Bring up-to-date vaccination records and horse passport</li>
                    <li>• Check fencing and gates are secure before turnout</li>
                    <li>• Supervise first turnout in new paddocks</li>
                    <li>• Keep horses separated if they don't know each other</li>
                    <li>• Bring your own tack and avoid sharing equipment</li>
                    <li>• Have contact details for local emergency vet</li>
                  </ul>
                </div>
              </CardContent>
            </Card>

            {/* For Hosts */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <Home className="h-6 w-6 text-primary" />
                  <CardTitle className="text-2xl">Safety Tips for Hosts</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Property Preparation */}
                <div>
                  <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                    <span className="text-primary">1.</span> Property Preparation
                  </h3>
                  <div className="space-y-2 text-muted-foreground pl-6">
                    <div className="flex items-start gap-2">
                      <span className="text-green-600 mt-1">✓</span>
                      <span>Install working smoke alarms and carbon monoxide detectors</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-green-600 mt-1">✓</span>
                      <span>Provide fire extinguisher and first aid kit (human & equine)</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-green-600 mt-1">✓</span>
                      <span>Ensure all electrical installations are safe and certified</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-green-600 mt-1">✓</span>
                      <span>Maintain secure fencing with no protruding nails or sharp edges</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-green-600 mt-1">✓</span>
                      <span>Regular maintenance of stables, gates, and facilities</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-green-600 mt-1">✓</span>
                      <span>Provide clear emergency exit routes</span>
                    </div>
                  </div>
                </div>

                {/* Guest Screening */}
                <div>
                  <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                    <span className="text-primary">2.</span> Guest Screening
                  </h3>
                  <div className="space-y-2 text-muted-foreground pl-6">
                    <div className="flex items-start gap-2">
                      <span className="text-green-600 mt-1">✓</span>
                      <span>Review guest profiles and previous host reviews</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-green-600 mt-1">✓</span>
                      <span>Communicate clearly about house rules before accepting bookings</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-green-600 mt-1">✓</span>
                      <span>Request horse vaccination records and passports</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-green-600 mt-1">✓</span>
                      <span>Confirm guest's experience level with horses</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-green-600 mt-1">✓</span>
                      <span>Trust your instincts - decline if something feels wrong</span>
                    </div>
                  </div>
                </div>

                {/* During Guest Stay */}
                <div>
                  <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                    <span className="text-primary">3.</span> During Guest Stay
                  </h3>
                  <div className="space-y-2 text-muted-foreground pl-6">
                    <div className="flex items-start gap-2">
                      <span className="text-green-600 mt-1">✓</span>
                      <span>Meet guests on arrival and show them around</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-green-600 mt-1">✓</span>
                      <span>Explain emergency procedures and contact numbers</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-green-600 mt-1">✓</span>
                      <span>Check horses are settled and facilities are adequate</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-green-600 mt-1">✓</span>
                      <span>Be available for questions and concerns</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-green-600 mt-1">✓</span>
                      <span>Document property condition before and after stays (photos)</span>
                    </div>
                  </div>
                </div>

                {/* Insurance */}
                <div className="p-4 bg-yellow-50 dark:bg-yellow-950 rounded-lg border border-yellow-200 dark:border-yellow-800">
                  <h4 className="font-semibold mb-2 flex items-center gap-2">
                    <Shield className="h-4 w-4" />
                    Insurance Requirements
                  </h4>
                  <p className="text-sm text-muted-foreground mb-2">
                    <strong>Strongly Recommended:</strong>
                  </p>
                  <ul className="space-y-1 text-sm text-muted-foreground">
                    <li>• Public liability insurance (minimum £2-5 million coverage)</li>
                    <li>• Property insurance covering guest stays</li>
                    <li>• Business insurance if hosting regularly</li>
                    <li>• Consult your insurer about hosting activities</li>
                  </ul>
                </div>
              </CardContent>
            </Card>

            {/* Payment Safety */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <Lock className="h-6 w-6 text-primary" />
                  <CardTitle className="text-2xl">Payment & Communication Safety</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h3 className="font-semibold mb-2">Always use Bridlestay's platform</h3>
                  <p className="text-muted-foreground mb-3">
                    For your protection, always book and communicate through Bridlestay. Never arrange payment outside the platform.
                  </p>
                  <div className="space-y-2">
                    <div className="flex items-start gap-2 text-sm">
                      <span className="text-red-600 mt-1">✗</span>
                      <span className="text-muted-foreground">Don't share personal phone numbers or addresses before booking</span>
                    </div>
                    <div className="flex items-start gap-2 text-sm">
                      <span className="text-red-600 mt-1">✗</span>
                      <span className="text-muted-foreground">Don't accept wire transfers, cash, or checks</span>
                    </div>
                    <div className="flex items-start gap-2 text-sm">
                      <span className="text-red-600 mt-1">✗</span>
                      <span className="text-muted-foreground">Don't communicate or pay outside Bridlestay</span>
                    </div>
                    <div className="flex items-start gap-2 text-sm">
                      <span className="text-red-600 mt-1">✗</span>
                      <span className="text-muted-foreground">Don't share your login credentials with anyone</span>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-green-50 dark:bg-green-950 rounded-lg border border-green-200 dark:border-green-800">
                  <h4 className="font-semibold mb-2">Why use our platform?</h4>
                  <ul className="space-y-1 text-sm text-muted-foreground">
                    <li>✓ Secure payment processing through Stripe</li>
                    <li>✓ Payment protection for both parties</li>
                    <li>✓ Documented communication history</li>
                    <li>✓ Support team can help resolve disputes</li>
                    <li>✓ Review system builds trust and accountability</li>
                  </ul>
                </div>
              </CardContent>
            </Card>

            {/* Reporting Issues */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <AlertTriangle className="h-6 w-6 text-primary" />
                  <CardTitle className="text-2xl">Reporting Issues</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-muted-foreground">
                  If you experience any safety concerns, violations of house rules, or suspicious behavior:
                </p>
                
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <span className="text-primary font-semibold">1</span>
                    </div>
                    <div>
                      <p className="font-medium">Ensure immediate safety</p>
                      <p className="text-sm text-muted-foreground">If there's imminent danger, contact emergency services (999) first</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <span className="text-primary font-semibold">2</span>
                    </div>
                    <div>
                      <p className="font-medium">Document the issue</p>
                      <p className="text-sm text-muted-foreground">Take photos, save messages, and note details</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <span className="text-primary font-semibold">3</span>
                    </div>
                    <div>
                      <p className="font-medium">Report through Bridlestay</p>
                      <p className="text-sm text-muted-foreground">Use the feedback form or report option on your booking page</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <span className="text-primary font-semibold">4</span>
                    </div>
                    <div>
                      <p className="font-medium">Follow up</p>
                      <p className="text-sm text-muted-foreground">Our team will investigate and take appropriate action</p>
                    </div>
                  </div>
                </div>

                <div className="mt-6 text-center">
                  <Button size="lg" asChild>
                    <Link href="/feedback">Report an Issue</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Additional Resources */}
            <Card className="border-primary/20">
              <CardContent className="pt-8 pb-8">
                <div className="text-center">
                  <FileText className="h-12 w-12 text-primary mx-auto mb-4" />
                  <h2 className="font-serif text-2xl font-bold mb-2">Additional Resources</h2>
                  <p className="text-muted-foreground mb-6 max-w-xl mx-auto">
                    Learn more about staying safe on Bridlestay
                  </p>
                  <div className="flex flex-wrap gap-4 justify-center">
                    <Button variant="outline" asChild>
                      <Link href="/help">Help Center</Link>
                    </Button>
                    <Button variant="outline" asChild>
                      <Link href="/how-it-works/guests">Guest Guide</Link>
                    </Button>
                    <Button variant="outline" asChild>
                      <Link href="/how-it-works/hosts">Host Guide</Link>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </>
  );
}

