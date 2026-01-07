import { Header } from "@/components/header";
import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle, Shield, Home, Coins } from "lucide-react";

export default function HostAgreementPage() {
  return (
    <>
      <Header />
      <main className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-12 max-w-4xl">
          <h1 className="font-serif text-4xl font-bold mb-4">Host Agreement</h1>
          <p className="text-muted-foreground mb-8">
            Last updated: {new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
          </p>

          <Card className="mb-8 border-green-200 bg-green-50 dark:bg-green-950">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <Home className="h-6 w-6 text-green-600 flex-shrink-0 mt-1" />
                <div>
                  <h3 className="font-semibold text-green-900 dark:text-green-100 mb-2">
                    For Hosts Only
                  </h3>
                  <p className="text-sm text-green-900 dark:text-green-100">
                    This agreement supplements our Terms of Service and outlines specific responsibilities, 
                    liabilities, and requirements for property hosts on Cantra.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="prose prose-lg max-w-none space-y-8">
            <section>
              <h2 className="font-serif text-3xl font-bold mb-4">1. Host Responsibilities</h2>
              
              <h3 className="font-semibold text-xl mt-4 mb-2">1.1 Accurate Listings</h3>
              <p>As a Host, you agree to:</p>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li>Provide truthful, accurate, and current information about your property</li>
                <li>Update photos and descriptions to reflect the current state</li>
                <li>Disclose all known defects, hazards, or limitations</li>
                <li>Accurately represent horse facilities, stabling, and amenities</li>
                <li>Inform guests of any ongoing construction or disturbances</li>
              </ul>

              <h3 className="font-semibold text-xl mt-4 mb-2">1.2 Property Standards</h3>
              <p>Your property must meet the following minimum standards:</p>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li><strong>Safety:</strong> Smoke alarms, carbon monoxide detectors, fire extinguishers, first aid kit</li>
                <li><strong>Cleanliness:</strong> Property must be clean, sanitary, and free from pests</li>
                <li><strong>Functionality:</strong> All advertised amenities must work properly</li>
                <li><strong>Horse Facilities:</strong> Stables, fencing, and paddocks must be safe and well-maintained</li>
                <li><strong>Access:</strong> Clear check-in instructions and safe property access</li>
              </ul>

              <h3 className="font-semibold text-xl mt-4 mb-2">1.3 Legal Compliance</h3>
              <p>You are solely responsible for:</p>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li>Obtaining all necessary permits, licenses, and approvals</li>
                <li>Complying with local zoning, planning, and tourism regulations</li>
                <li>Meeting health and safety requirements</li>
                <li>Paying all applicable taxes (income tax, VAT, council tax, business rates)</li>
                <li>Reporting income to HMRC as required</li>
              </ul>
            </section>

            <section>
              <h2 className="font-serif text-3xl font-bold mb-4">2. Horse Facility Requirements</h2>
              
              <Card className="my-4 border-yellow-200 bg-yellow-50 dark:bg-yellow-950">
                <CardContent className="pt-6">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-1" />
                    <div className="text-sm text-yellow-900 dark:text-yellow-100">
                      <p className="font-semibold mb-2">Equine Safety is Critical</p>
                      <p>
                        Hosts are responsible for ensuring horse facilities meet reasonable safety standards. 
                        Failure to maintain safe facilities may result in liability for injuries.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <h3 className="font-semibold text-xl mt-4 mb-2">2.1 Stables & Shelters</h3>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li>Adequate ventilation and lighting</li>
                <li>Secure doors and latches</li>
                <li>No sharp edges, protruding nails, or hazards</li>
                <li>Clean, dry, and free from mold</li>
                <li>Sufficient space for horse comfort</li>
              </ul>

              <h3 className="font-semibold text-xl mt-4 mb-2">2.2 Paddocks & Turnout Areas</h3>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li>Safe, secure fencing in good repair</li>
                <li>Free from poisonous plants</li>
                <li>Access to clean water</li>
                <li>Gates that close and latch properly</li>
                <li>Free from hazards (holes, debris, barbed wire)</li>
              </ul>

              <h3 className="font-semibold text-xl mt-4 mb-2">2.3 Riding Facilities</h3>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li>Arenas: Safe surface, clear of obstacles</li>
                <li>Bridleway access: Clear directions and safe routes</li>
                <li>Wash bay: Proper drainage and safe footing</li>
              </ul>
            </section>

            <section>
              <h2 className="font-serif text-3xl font-bold mb-4">3. Insurance Requirements</h2>
              
              <h3 className="font-semibold text-xl mt-4 mb-2">3.1 Strongly Recommended</h3>
              <p>We strongly recommend all Hosts maintain:</p>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li><strong>Public Liability Insurance:</strong> £2-5 million coverage minimum</li>
                <li><strong>Property Insurance:</strong> Covering building and contents</li>
                <li><strong>Business Insurance:</strong> If operating as a business</li>
                <li><strong>Equine Liability Insurance:</strong> For horse-related activities</li>
              </ul>

              <h3 className="font-semibold text-xl mt-4 mb-2">3.2 Cantra's Insurance</h3>
              <p className="text-sm italic bg-muted p-4 rounded-lg">
                <strong>Important:</strong> Cantra does not provide property damage, public liability, or 
                contents insurance for hosts. You are solely responsible for insuring your property and operations.
              </p>
            </section>

            <section>
              <h2 className="font-serif text-3xl font-bold mb-4">4. Liability & Indemnification</h2>
              
              <h3 className="font-semibold text-xl mt-4 mb-2">4.1 Host Liability</h3>
              <p>As a Host, you are liable for:</p>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li>Guest injuries caused by property defects or negligence</li>
                <li>Horse injuries due to unsafe facilities</li>
                <li>Property damage caused by your actions or omissions</li>
                <li>Violations of applicable laws or regulations</li>
              </ul>

              <h3 className="font-semibold text-xl mt-4 mb-2">4.2 Indemnification</h3>
              <p>
                You agree to indemnify and hold harmless Cantra from any claims, damages, or expenses 
                (including legal fees) arising from:
              </p>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li>Guest injuries or property damage at your property</li>
                <li>Horse injuries or death due to your facilities</li>
                <li>Your breach of this agreement or the Terms of Service</li>
                <li>Your violation of laws or third-party rights</li>
              </ul>
            </section>

            <section>
              <h2 className="font-serif text-3xl font-bold mb-4">5. Payments & Payouts</h2>
              
              <Card className="my-4 border-blue-200 bg-blue-50 dark:bg-blue-950">
                <CardContent className="pt-6">
                  <div className="flex items-start gap-3">
                    <Coins className="h-6 w-6 text-blue-600 flex-shrink-0 mt-1" />
                    <div className="text-sm text-blue-900 dark:text-blue-100">
                      <h4 className="font-semibold mb-2">How You Get Paid</h4>
                      <ol className="list-decimal pl-5 space-y-1">
                        <li>Guest pays at booking (payment held by Stripe)</li>
                        <li>24 hours after check-in, funds are released</li>
                        <li>You receive 97.5% of your listing price (minus 2.5% platform fee + VAT)</li>
                        <li>Automatic payout to your bank account (1-3 days standard, or instant for £1.99)</li>
                      </ol>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <h3 className="font-semibold text-xl mt-4 mb-2">5.1 Platform Fees</h3>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li><strong>Host Fee:</strong> 2.5% of booking subtotal</li>
                <li><strong>VAT:</strong> 20% applied to the platform fee</li>
                <li><strong>Instant Payout Fee:</strong> £1.99 (optional, same-day transfer)</li>
              </ul>

              <h3 className="font-semibold text-xl mt-4 mb-2">5.2 Payment Holds</h3>
              <p>Cantra may withhold payouts if:</p>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li>There is a dispute or claim against you</li>
                <li>We suspect fraud or policy violations</li>
                <li>Your account is under investigation</li>
                <li>Required by law or court order</li>
              </ul>

              <h3 className="font-semibold text-xl mt-4 mb-2">5.3 Tax Obligations</h3>
              <p>
                You are responsible for reporting and paying all applicable taxes on your rental income. 
                This may include income tax, VAT (if above the threshold), council tax, and business rates.
              </p>
            </section>

            <section>
              <h2 className="font-serif text-3xl font-bold mb-4">6. Booking Management</h2>
              
              <h3 className="font-semibold text-xl mt-4 mb-2">6.1 Responding to Requests</h3>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li>Respond to booking requests within 24 hours</li>
                <li>Be clear and professional in all communications</li>
                <li>Only accept bookings you can honor</li>
              </ul>

              <h3 className="font-semibold text-xl mt-4 mb-2">6.2 Calendar Accuracy</h3>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li>Keep your availability calendar up to date</li>
                <li>Block dates when property is unavailable</li>
                <li>Update pricing for peak seasons</li>
              </ul>

              <h3 className="font-semibold text-xl mt-4 mb-2">6.3 Cancellations by Host</h3>
              <p>
                Cancelling confirmed bookings damages guest trust and the platform. Consequences include:
              </p>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li><strong>Penalties:</strong> £50-500 depending on cancellation timing</li>
                <li><strong>Review Impact:</strong> Automatic negative review</li>
                <li><strong>Listing Suspension:</strong> Temporary or permanent removal</li>
                <li><strong>Lower Search Ranking:</strong> Reduced visibility</li>
              </ul>
              <p className="mt-3 text-sm italic bg-muted p-3 rounded-lg">
                <strong>Exceptions:</strong> Cancellations due to emergencies (family emergency, property damage, guest policy violations) 
                may be waived at Cantra's discretion.
              </p>
            </section>

            <section>
              <h2 className="font-serif text-3xl font-bold mb-4">7. Guest Property Damage</h2>
              
              <h3 className="font-semibold text-xl mt-4 mb-2">7.1 Reporting Damage</h3>
              <p>If a guest damages your property:</p>
              <ol className="list-decimal pl-6 space-y-2">
                <li>Document the damage with photos and descriptions</li>
                <li>Report it to Cantra within 48 hours of checkout</li>
                <li>Provide evidence (photos, receipts, repair quotes)</li>
                <li>Submit a claim through the platform</li>
              </ol>

              <h3 className="font-semibold text-xl mt-4 mb-2">7.2 Security Deposits</h3>
              <p>
                You may collect a security deposit through our platform. Deposits are held and released based on 
                property condition after checkout.
              </p>
            </section>

            <section>
              <h2 className="font-serif text-3xl font-bold mb-4">8. Prohibited Activities</h2>
              <p>As a Host, you may NOT:</p>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li>Request or accept payment outside the platform</li>
                <li>Discriminate against guests based on protected characteristics</li>
                <li>Harass, threaten, or abuse guests</li>
                <li>Post false or misleading listings</li>
                <li>Encourage guests to leave fake reviews</li>
                <li>List properties you don't own without permission</li>
                <li>Violate local short-term rental laws</li>
              </ul>
            </section>

            <section>
              <h2 className="font-serif text-3xl font-bold mb-4">9. Account Termination</h2>
              <p>Cantra may suspend or terminate your Host account for:</p>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li>Repeated policy violations</li>
                <li>Fraudulent activity or misrepresentation</li>
                <li>Poor reviews or frequent complaints</li>
                <li>Failure to meet minimum standards</li>
                <li>Legal violations</li>
              </ul>
            </section>

            <section>
              <h2 className="font-serif text-3xl font-bold mb-4">10. Contact & Support</h2>
              <p>For questions about this agreement or host support:</p>
              <div className="bg-muted p-4 rounded-lg mt-3 space-y-1 text-sm">
                <p><strong>Email:</strong> hosts@cantra.app</p>
                <p><strong>Support:</strong> support@cantra.app</p>
                <p><strong>Phone:</strong> [Support Number]</p>
              </div>
            </section>

            <section className="border-t pt-6 mt-8">
              <p className="text-sm text-muted-foreground italic">
                This Host Agreement was last updated on {new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}. 
                By listing your property on Cantra, you acknowledge that you have read, understood, and agree to be bound by this agreement.
              </p>
            </section>
          </div>
        </div>
      </main>
    </>
  );
}

