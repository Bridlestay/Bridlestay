import { Header } from "@/components/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, Shield, AlertTriangle } from "lucide-react";

export default function TermsPage() {
  return (
    <>
      <Header />
      <main className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-12 max-w-4xl">
          <h1 className="font-serif text-4xl font-bold mb-4">Terms of Service</h1>
          <p className="text-muted-foreground mb-8">
            Last updated: {new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
          </p>

          <div className="prose prose-lg max-w-none space-y-8">
            {/* Key Safety Alert */}
            <Card className="border-amber-200 bg-amber-50 dark:bg-amber-950">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-amber-900 dark:text-amber-100">
                  <AlertTriangle className="h-5 w-5" />
                  Important: Safety & Platform Guidelines
                </CardTitle>
              </CardHeader>
              <CardContent className="text-amber-900 dark:text-amber-100">
                <p className="font-semibold mb-3">
                  To maintain a safe and trusted community, the following actions may result in account suspension:
                </p>
                <ul className="list-disc list-inside space-y-2 ml-4 text-sm">
                  <li>
                    <strong>Off-Platform Payments:</strong> All payments must be processed through Bridlestay to ensure protection for both guests and hosts
                  </li>
                  <li>
                    <strong>Respectful Communication:</strong> Harassment, discrimination, or abusive language is not tolerated
                  </li>
                  <li>
                    <strong>Honest Listings:</strong> Property information must be accurate and truthful
                  </li>
                  <li>
                    <strong>Genuine Engagement:</strong> Fake reviews, spam, or fraudulent activity undermines our community
                  </li>
                </ul>
                <p className="mt-4 text-sm font-medium">
                  💡 Our automated systems help keep the platform safe. If you have concerns, please contact our support team.
                </p>
              </CardContent>
            </Card>

            <section>
              <h2 className="font-serif text-3xl font-bold mb-4">1. Agreement to Terms</h2>
              <p>
                By accessing or using Bridlestay ("Platform," "Service," "we," "us"), you agree to be bound by these Terms of Service ("Terms"). 
                If you disagree with any part of these Terms, you may not access the Service.
              </p>
              <p className="mt-3">
                These Terms apply to all users, including Guests, Hosts, and visitors.
              </p>
            </section>

            <section>
              <h2 className="font-serif text-3xl font-bold mb-4">2. Eligibility</h2>
              <p>You must:</p>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li>Be at least 18 years old</li>
                <li>Provide accurate, current, and complete information</li>
                <li>Maintain the security of your account</li>
                <li>Not have been previously banned from Bridlestay</li>
                <li>Comply with all applicable laws in your jurisdiction</li>
              </ul>
            </section>

            <section>
              <h2 className="font-serif text-3xl font-bold mb-4">3. Account Responsibilities</h2>
              
              <h3 className="font-semibold text-xl mt-4 mb-2">3.1 Account Security</h3>
              <p>You are responsible for:</p>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li>Maintaining the confidentiality of your password</li>
                <li>All activities that occur under your account</li>
                <li>Notifying us immediately of any unauthorized access</li>
              </ul>

              <h3 className="font-semibold text-xl mt-4 mb-2">3.2 Verification</h3>
              <p>
                Bridlestay requires admin verification before you can make bookings or accept reservations. 
                We may require additional identification or documentation at any time.
              </p>

              <h3 className="font-semibold text-xl mt-4 mb-2">3.3 Accurate Information</h3>
              <p>
                You must provide truthful, accurate, and up-to-date information. Misrepresentation of identity, 
                property details, or qualifications may result in account termination.
              </p>
            </section>

            <section>
              <h2 className="font-serif text-3xl font-bold mb-4">4. Host Obligations</h2>
              
              <h3 className="font-semibold text-xl mt-4 mb-2">4.1 Listing Standards</h3>
              <p>As a Host, you agree to:</p>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li>Provide accurate descriptions, photos, availability, and pricing</li>
                <li>Maintain property and facilities as advertised</li>
                <li>Disclose all known risks, hazards, or restrictions</li>
                <li>Comply with all local laws, regulations, permits, and licenses</li>
                <li>Maintain appropriate insurance for your property</li>
              </ul>

              <h3 className="font-semibold text-xl mt-4 mb-2">4.2 Equine Safety</h3>
              <p>
                Hosts must ensure horse facilities meet reasonable safety standards. This includes:
              </p>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li>Safe, secure stabling with adequate ventilation</li>
                <li>Proper fencing and secure paddock areas</li>
                <li>Access to clean water and appropriate feed storage</li>
                <li>Safe access routes for horses</li>
              </ul>

              <h3 className="font-semibold text-xl mt-4 mb-2">4.3 Acceptance & Cancellations</h3>
              <p>
                Hosts must respond to booking requests within 24 hours. Frequent cancellations may result in 
                penalties, including lower search rankings or account suspension. See our Cancellation Policy for details.
              </p>

              <h3 className="font-semibold text-xl mt-4 mb-2">4.4 Prohibited Activities</h3>
              <p>Hosts may NOT:</p>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li>Charge guests outside the platform</li>
                <li>Request cash payments or bank transfers</li>
                <li>Discriminate based on race, religion, gender, age, or disability</li>
                <li>Accept bookings for unlicensed or illegal activities</li>
              </ul>
            </section>

            <section>
              <h2 className="font-serif text-3xl font-bold mb-4">5. Guest Obligations</h2>
              
              <h3 className="font-semibold text-xl mt-4 mb-2">5.1 Respectful Behavior</h3>
              <p>As a Guest, you agree to:</p>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li>Treat the property, host, and facilities with respect</li>
                <li>Follow all house rules set by the Host</li>
                <li>Leave the property in a clean, undamaged condition</li>
                <li>Supervise your horses at all times</li>
                <li>Report any issues or damage immediately</li>
              </ul>

              <h3 className="font-semibold text-xl mt-4 mb-2">5.2 Horse Care</h3>
              <p>
                Guests are fully responsible for the care, safety, and behavior of their horses. This includes:
              </p>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li>Ensuring horses are up-to-date on vaccinations</li>
                <li>Providing current passport and health documentation</li>
                <li>Disclosing any behavioral issues or special needs</li>
                <li>Cleaning stables and removing waste (unless arranged with Host)</li>
              </ul>

              <h3 className="font-semibold text-xl mt-4 mb-2">5.3 Property Damage</h3>
              <p>
                Guests are financially responsible for any damage caused to property, equipment, or facilities by 
                themselves, their guests, or their horses. Bridlestay may charge the payment method on file to cover damages.
              </p>
            </section>

            <section>
              <h2 className="font-serif text-3xl font-bold mb-4">6. Payments & Fees</h2>
              
              <h3 className="font-semibold text-xl mt-4 mb-2">6.1 Pricing & Fees</h3>
              <div className="bg-muted p-4 rounded-lg space-y-2 text-sm">
                <p><strong>Guest Service Fee:</strong> 12.5% of booking subtotal (capped at £150) + VAT</p>
                <p><strong>Host Platform Fee:</strong> 2.5% of booking subtotal + VAT</p>
                <p><strong>Instant Payout Fee:</strong> £1.99 per transfer (optional)</p>
              </div>
              <p className="mt-3">
                All fees are clearly displayed before payment. Prices are set by Hosts and may include nightly rates, 
                per-horse fees, cleaning fees, and other charges.
              </p>

              <h3 className="font-semibold text-xl mt-4 mb-2">6.2 Payment Processing</h3>
              <p>
                All payments are processed securely through Stripe. Payment is required at the time of booking. 
                Funds are held in escrow until 24 hours after guest check-in.
              </p>

              <h3 className="font-semibold text-xl mt-4 mb-2">6.3 Refunds & Cancellations</h3>
              <p>
                Refund eligibility depends on the cancellation timing and Host's cancellation policy. 
                See our full Cancellation Policy for details.
              </p>

              <h3 className="font-semibold text-xl mt-4 mb-2">6.4 Taxes</h3>
              <p>
                Hosts are responsible for determining and paying all applicable taxes (income tax, VAT, occupancy tax, etc.). 
                Bridlestay applies VAT to platform fees as required by UK law.
              </p>
            </section>

            <section>
              <h2 className="font-serif text-3xl font-bold mb-4">7. Cancellations & Modifications</h2>
              <p>
                Cancellations must be made through the platform. Refund amounts depend on timing and the Host's cancellation policy. 
                Hosts who cancel confirmed bookings may face penalties. Full details are in our Cancellation Policy.
              </p>
            </section>

            <section>
              <h2 className="font-serif text-3xl font-bold mb-4">8. Reviews & Ratings</h2>
              <p>
                Both Guests and Hosts may leave reviews after a stay. Reviews must be:
              </p>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li>Honest and based on actual experience</li>
                <li>Respectful and non-defamatory</li>
                <li>Relevant to the property or guest behavior</li>
                <li>Submitted within 14 days after checkout</li>
              </ul>
              <p className="mt-3">
                Bridlestay reserves the right to remove reviews that violate these guidelines or our content policy.
              </p>
            </section>

            <section>
              <h2 className="font-serif text-3xl font-bold mb-4">9. Liability & Disclaimer</h2>
              
              <Card className="border-yellow-200 bg-yellow-50 dark:bg-yellow-950 my-4">
                <CardContent className="pt-6">
                  <p className="font-semibold text-yellow-900 dark:text-yellow-100 mb-2">
                    ⚠️ IMPORTANT LIMITATION OF LIABILITY
                  </p>
                  <p className="text-sm text-yellow-900 dark:text-yellow-100">
                    Bridlestay is a marketplace platform connecting Hosts and Guests. We do not own, operate, manage, 
                    or control any properties. We are not responsible for the actions or omissions of Hosts or Guests.
                  </p>
                </CardContent>
              </Card>

              <h3 className="font-semibold text-xl mt-4 mb-2">9.1 Disclaimer of Warranties</h3>
              <p>
                THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND. WE DO NOT GUARANTEE 
                THAT THE SERVICE WILL BE UNINTERRUPTED, SECURE, OR ERROR-FREE.
              </p>

              <h3 className="font-semibold text-xl mt-4 mb-2">9.2 Limitation of Liability</h3>
              <p>
                TO THE MAXIMUM EXTENT PERMITTED BY LAW, BRIDLESTAY SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, 
                SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING BUT NOT LIMITED TO:
              </p>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li>Personal injury or property damage</li>
                <li>Horse injury, illness, or death</li>
                <li>Lost profits or business interruption</li>
                <li>Data loss or corruption</li>
                <li>Third-party claims</li>
              </ul>
              <p className="mt-3">
                Our total liability for any claim shall not exceed the fees you paid to Bridlestay in the 12 months 
                prior to the claim.
              </p>

              <h3 className="font-semibold text-xl mt-4 mb-2">9.3 Indemnification</h3>
              <p>
                You agree to indemnify and hold harmless Bridlestay, its officers, directors, employees, and agents 
                from any claims, damages, losses, or expenses (including legal fees) arising from:
              </p>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li>Your use of the Service</li>
                <li>Your violation of these Terms</li>
                <li>Your violation of any rights of another party</li>
                <li>Your listing content or property condition (for Hosts)</li>
                <li>Your conduct during a stay (for Guests)</li>
              </ul>
            </section>

            <section>
              <h2 className="font-serif text-3xl font-bold mb-4">10. Insurance</h2>
              <p>
                <strong>Hosts:</strong> You are strongly encouraged to maintain appropriate insurance for your property, 
                including liability coverage. Bridlestay does not provide property or liability insurance.
              </p>
              <p className="mt-3">
                <strong>Guests:</strong> You should have appropriate equine and personal liability insurance. You are 
                responsible for any injuries, damages, or losses involving your horses.
              </p>
            </section>

            <section>
              <h2 className="font-serif text-3xl font-bold mb-4">11. Prohibited Conduct</h2>
              <p>You may not:</p>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li>Violate any laws or regulations</li>
                <li>Infringe on intellectual property rights</li>
                <li>Transmit viruses, malware, or harmful code</li>
                <li>Scrape, harvest, or collect user data</li>
                <li>Impersonate another person or entity</li>
                <li>Create multiple accounts to manipulate ratings</li>
                <li>Use the platform for commercial purposes unrelated to accommodation</li>
                <li>Interfere with the proper functioning of the Service</li>
              </ul>
            </section>

            <section>
              <h2 className="font-serif text-3xl font-bold mb-4">12. Intellectual Property</h2>
              <p>
                All content on Bridlestay, including text, graphics, logos, and software, is owned by Bridlestay or 
                its licensors and is protected by copyright and trademark laws.
              </p>
              <p className="mt-3">
                By uploading content (photos, descriptions, reviews), you grant Bridlestay a worldwide, non-exclusive, 
                royalty-free license to use, display, and distribute your content in connection with the Service.
              </p>
            </section>

            <section>
              <h2 className="font-serif text-3xl font-bold mb-4">13. Privacy</h2>
              <p>
                Your use of the Service is also governed by our Privacy Policy, which explains how we collect, use, 
                and protect your personal information.
              </p>
            </section>

            <section>
              <h2 className="font-serif text-3xl font-bold mb-4">14. Dispute Resolution</h2>
              
              <h3 className="font-semibold text-xl mt-4 mb-2">14.1 Internal Resolution</h3>
              <p>
                We encourage users to resolve disputes directly. If issues arise, contact Bridlestay support 
                for mediation assistance.
              </p>

              <h3 className="font-semibold text-xl mt-4 mb-2">14.2 Governing Law</h3>
              <p>
                These Terms are governed by the laws of England and Wales. Any disputes shall be subject to the 
                exclusive jurisdiction of the courts of England and Wales.
              </p>

              <h3 className="font-semibold text-xl mt-4 mb-2">14.3 Arbitration</h3>
              <p>
                For disputes exceeding £5,000, parties agree to attempt good-faith negotiation and, if necessary, 
                binding arbitration before pursuing litigation.
              </p>
            </section>

            <section>
              <h2 className="font-serif text-3xl font-bold mb-4">15. Termination</h2>
              <p>
                We may suspend or terminate your account at any time, with or without notice, for:
              </p>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li>Violation of these Terms</li>
                <li>Fraudulent or illegal activity</li>
                <li>Harm to other users or the platform</li>
                <li>Failure to pay amounts owed</li>
                <li>Extended inactivity</li>
              </ul>
              <p className="mt-3">
                Upon termination, you lose access to your account. Outstanding payments or obligations remain in effect.
              </p>
            </section>

            <section>
              <h2 className="font-serif text-3xl font-bold mb-4">16. Changes to Terms</h2>
              <p>
                We may modify these Terms at any time. We will notify you of material changes via email or platform 
                notification. Continued use of the Service after changes constitutes acceptance of the new Terms.
              </p>
            </section>

            <section>
              <h2 className="font-serif text-3xl font-bold mb-4">17. Severability</h2>
              <p>
                If any provision of these Terms is found to be unenforceable, the remaining provisions will continue 
                in full force and effect.
              </p>
            </section>

            <section>
              <h2 className="font-serif text-3xl font-bold mb-4">18. Contact Information</h2>
              <p>
                For questions about these Terms, please contact us at:
              </p>
              <div className="bg-muted p-4 rounded-lg mt-3 space-y-1 text-sm">
                <p><strong>Email:</strong> legal@bridlestay.co.uk</p>
                <p><strong>Support:</strong> support@bridlestay.co.uk</p>
                <p><strong>Address:</strong> [Your Business Address]</p>
              </div>
            </section>

            <section className="border-t pt-6 mt-8">
              <p className="text-sm text-muted-foreground italic">
                These Terms of Service were last updated on {new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}. 
                By using Bridlestay, you acknowledge that you have read, understood, and agree to be bound by these Terms.
              </p>
            </section>
          </div>
        </div>
      </main>
    </>
  );
}
