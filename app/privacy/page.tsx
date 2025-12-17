import { Header } from "@/components/header";
import { Card, CardContent } from "@/components/ui/card";
import { Shield, Mail, Lock, Eye, Database, Globe } from "lucide-react";

export default function PrivacyPage() {
  return (
    <>
      <Header />
      <main className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-12 max-w-4xl">
          <h1 className="font-serif text-4xl font-bold mb-4">Privacy Policy</h1>
          <p className="text-muted-foreground mb-8">
            Last updated: {new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
          </p>

          <Card className="mb-8 border-blue-200 bg-blue-50 dark:bg-blue-950">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <Shield className="h-6 w-6 text-blue-600 flex-shrink-0 mt-1" />
                <div>
                  <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
                    Your Privacy Matters
                  </h3>
                  <p className="text-sm text-blue-900 dark:text-blue-100">
                    Bridlestay is committed to protecting your personal information. This policy explains what data we 
                    collect, why we collect it, how we use it, and your rights under UK GDPR and Data Protection Act 2018.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="prose prose-lg max-w-none space-y-8">
            <section>
              <h2 className="font-serif text-3xl font-bold mb-4">1. Information We Collect</h2>
              
              <h3 className="font-semibold text-xl mt-4 mb-2">1.1 Information You Provide</h3>
              <p>We collect information you voluntarily provide when you:</p>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li><strong>Create an account:</strong> Name, email, phone number, password</li>
                <li><strong>Complete your profile:</strong> Profile photo, bio, occupation, location preferences</li>
                <li><strong>List a property (Hosts):</strong> Property details, photos, address, amenities, pricing</li>
                <li><strong>Make a booking (Guests):</strong> Travel dates, number of guests/horses, special requests</li>
                <li><strong>Add horse information:</strong> Horse name, breed, age, health details, vaccination records</li>
                <li><strong>Payment information:</strong> Processed securely by Stripe (we do not store card details)</li>
                <li><strong>Communications:</strong> Messages sent through our platform, support requests, reviews</li>
              </ul>

              <h3 className="font-semibold text-xl mt-4 mb-2">1.2 Automatically Collected Information</h3>
              <p>When you use Bridlestay, we automatically collect:</p>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li><strong>Device information:</strong> IP address, browser type, operating system</li>
                <li><strong>Usage data:</strong> Pages visited, features used, search queries, click patterns</li>
                <li><strong>Location data:</strong> General location (city/region) based on IP address</li>
                <li><strong>Cookies:</strong> See Section 8 for details on cookies and tracking</li>
              </ul>

              <h3 className="font-semibold text-xl mt-4 mb-2">1.3 Information from Third Parties</h3>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li><strong>Stripe:</strong> Payment processing information and payout details</li>
                <li><strong>Social login (if enabled):</strong> Public profile information from Google/Facebook</li>
                <li><strong>Identity verification:</strong> ID verification data (if required for certain bookings)</li>
              </ul>
            </section>

            <section>
              <h2 className="font-serif text-3xl font-bold mb-4">2. How We Use Your Information</h2>
              <p>We use your personal data for the following purposes:</p>
              
              <h3 className="font-semibold text-xl mt-4 mb-2">2.1 Service Delivery</h3>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li>Create and manage your account</li>
                <li>Process bookings and payments</li>
                <li>Facilitate communication between Hosts and Guests</li>
                <li>Send booking confirmations, reminders, and updates</li>
                <li>Provide customer support</li>
              </ul>

              <h3 className="font-semibold text-xl mt-4 mb-2">2.2 Platform Safety & Security</h3>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li>Verify user identities and prevent fraud</li>
                <li>Monitor messages for policy violations (threats, harassment, payment circumvention)</li>
                <li>Enforce Terms of Service and community guidelines</li>
                <li>Detect and prevent spam, abuse, and illegal activity</li>
                <li>Resolve disputes between users</li>
              </ul>

              <h3 className="font-semibold text-xl mt-4 mb-2">2.3 Platform Improvement</h3>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li>Analyze usage patterns to improve features</li>
                <li>Personalize search results and recommendations</li>
                <li>Develop new services and features</li>
                <li>Conduct research and analytics</li>
              </ul>

              <h3 className="font-semibold text-xl mt-4 mb-2">2.4 Marketing & Communications</h3>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li>Send promotional emails (you can opt out)</li>
                <li>Share platform updates and feature announcements</li>
                <li>Request feedback and reviews</li>
                <li>Provide relevant content and offers</li>
              </ul>

              <h3 className="font-semibold text-xl mt-4 mb-2">2.5 Legal Compliance</h3>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li>Comply with legal obligations (tax reporting, law enforcement requests)</li>
                <li>Enforce our rights and protect against legal liability</li>
                <li>Respond to regulatory inquiries</li>
              </ul>
            </section>

            <section>
              <h2 className="font-serif text-3xl font-bold mb-4">3. Legal Basis for Processing (GDPR)</h2>
              <p>Under UK GDPR, we process your data based on the following legal grounds:</p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>
                  <strong>Contract Performance:</strong> Processing necessary to fulfill our contract with you 
                  (e.g., booking services, payments)
                </li>
                <li>
                  <strong>Legitimate Interests:</strong> Platform security, fraud prevention, service improvement, 
                  and marketing (where not overridden by your rights)
                </li>
                <li>
                  <strong>Consent:</strong> Marketing emails, optional features, cookies (you can withdraw consent at any time)
                </li>
                <li>
                  <strong>Legal Obligation:</strong> Tax compliance, law enforcement cooperation, regulatory requirements
                </li>
              </ul>
            </section>

            <section>
              <h2 className="font-serif text-3xl font-bold mb-4">4. How We Share Your Information</h2>
              <p>We share your data in the following situations:</p>

              <h3 className="font-semibold text-xl mt-4 mb-2">4.1 With Other Users</h3>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li><strong>Public Profile:</strong> Name, photo, bio, reviews are visible to all users</li>
                <li><strong>After Booking Confirmation:</strong> Hosts see your contact info, horse details; Guests see property address</li>
                <li><strong>Reviews:</strong> Your reviews are public and associated with your profile</li>
              </ul>

              <h3 className="font-semibold text-xl mt-4 mb-2">4.2 With Service Providers</h3>
              <p>We share data with trusted third parties who help us operate the platform:</p>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li><strong>Stripe:</strong> Payment processing and payout management</li>
                <li><strong>Email Service (Resend/SendGrid):</strong> Transactional emails, notifications</li>
                <li><strong>Supabase:</strong> Database and authentication services</li>
                <li><strong>Vercel:</strong> Website hosting and performance</li>
                <li><strong>Analytics Tools:</strong> Anonymized usage analytics</li>
              </ul>
              <p className="text-sm italic mt-2">
                All service providers are contractually bound to protect your data and use it only for specified purposes.
              </p>

              <h3 className="font-semibold text-xl mt-4 mb-2">4.3 For Legal Reasons</h3>
              <p>We may disclose information if required by law or to:</p>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li>Comply with court orders, subpoenas, or legal processes</li>
                <li>Enforce our Terms of Service</li>
                <li>Protect the rights, property, or safety of Bridlestay, our users, or the public</li>
                <li>Respond to claims of illegal activity</li>
              </ul>

              <h3 className="font-semibold text-xl mt-4 mb-2">4.4 Business Transfers</h3>
              <p>
                If Bridlestay is acquired or merged with another company, your information may be transferred as part of that transaction.
              </p>
            </section>

            <section>
              <h2 className="font-serif text-3xl font-bold mb-4">5. Your Rights (UK GDPR)</h2>
              <p>You have the following rights regarding your personal data:</p>

              <Card className="my-4 border-green-200 bg-green-50 dark:bg-green-950">
                <CardContent className="pt-6">
                  <ul className="space-y-3 text-sm text-green-900 dark:text-green-100">
                    <li className="flex items-start gap-2">
                      <Eye className="h-4 w-4 flex-shrink-0 mt-1" />
                      <div>
                        <strong>Right to Access:</strong> Request a copy of all personal data we hold about you
                      </div>
                    </li>
                    <li className="flex items-start gap-2">
                      <Mail className="h-4 w-4 flex-shrink-0 mt-1" />
                      <div>
                        <strong>Right to Rectification:</strong> Correct inaccurate or incomplete information
                      </div>
                    </li>
                    <li className="flex items-start gap-2">
                      <Lock className="h-4 w-4 flex-shrink-0 mt-1" />
                      <div>
                        <strong>Right to Erasure ("Right to be Forgotten"):</strong> Request deletion of your data 
                        (subject to legal obligations)
                      </div>
                    </li>
                    <li className="flex items-start gap-2">
                      <Database className="h-4 w-4 flex-shrink-0 mt-1" />
                      <div>
                        <strong>Right to Data Portability:</strong> Receive your data in a structured, machine-readable format
                      </div>
                    </li>
                    <li className="flex items-start gap-2">
                      <Shield className="h-4 w-4 flex-shrink-0 mt-1" />
                      <div>
                        <strong>Right to Object:</strong> Object to processing based on legitimate interests or marketing
                      </div>
                    </li>
                    <li className="flex items-start gap-2">
                      <Globe className="h-4 w-4 flex-shrink-0 mt-1" />
                      <div>
                        <strong>Right to Restrict Processing:</strong> Limit how we use your data in certain circumstances
                      </div>
                    </li>
                  </ul>
                  <p className="mt-4 text-sm text-green-900 dark:text-green-100 font-semibold">
                    To exercise any of these rights, email us at privacy@bridlestay.co.uk
                  </p>
                </CardContent>
              </Card>

              <p className="text-sm italic">
                Note: Some rights may be limited by legal obligations (e.g., we must retain transaction records for tax purposes). 
                We will respond to requests within 30 days.
              </p>
            </section>

            <section>
              <h2 className="font-serif text-3xl font-bold mb-4">6. Data Retention</h2>
              <p>We retain your information for as long as necessary to provide our services and comply with legal obligations:</p>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li><strong>Active Accounts:</strong> Data retained while your account is active</li>
                <li><strong>Closed Accounts:</strong> Data deleted within 90 days (except as required by law)</li>
                <li><strong>Transaction Records:</strong> Retained for 7 years (UK tax law requirement)</li>
                <li><strong>Safety/Fraud Data:</strong> Retained as needed for platform security</li>
                <li><strong>Marketing Preferences:</strong> Retained until you opt out</li>
              </ul>
            </section>

            <section>
              <h2 className="font-serif text-3xl font-bold mb-4">7. Data Security</h2>
              <p>We implement industry-standard security measures to protect your information:</p>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li>Encryption in transit (HTTPS/TLS) and at rest</li>
                <li>Secure password hashing (bcrypt)</li>
                <li>Two-factor authentication options</li>
                <li>Regular security audits and monitoring</li>
                <li>Limited employee access on a need-to-know basis</li>
                <li>Stripe handles all payment processing (PCI-DSS compliant)</li>
              </ul>
              <p className="mt-3 text-sm italic">
                While we take security seriously, no system is 100% secure. You are responsible for keeping your password confidential.
              </p>
            </section>

            <section>
              <h2 className="font-serif text-3xl font-bold mb-4">8. Cookies & Tracking Technologies</h2>
              
              <h3 className="font-semibold text-xl mt-4 mb-2">8.1 What Are Cookies?</h3>
              <p>
                Cookies are small text files stored on your device. We use cookies and similar technologies (localStorage, sessionStorage) 
                to improve your experience.
              </p>

              <h3 className="font-semibold text-xl mt-4 mb-2">8.2 Types of Cookies We Use</h3>
              <div className="bg-muted p-4 rounded-lg space-y-3 text-sm">
                <div>
                  <p className="font-semibold">🔒 Essential Cookies (Always Active)</p>
                  <p className="text-muted-foreground">Required for authentication, security, and core platform functionality</p>
                </div>
                <div>
                  <p className="font-semibold">📊 Analytics Cookies (Optional)</p>
                  <p className="text-muted-foreground">Help us understand how users interact with the platform</p>
                </div>
                <div>
                  <p className="font-semibold">🎯 Marketing Cookies (Optional)</p>
                  <p className="text-muted-foreground">Used to show relevant ads and measure campaign effectiveness</p>
                </div>
              </div>

              <h3 className="font-semibold text-xl mt-4 mb-2">8.3 Managing Cookies</h3>
              <p>
                You can control cookies through your browser settings or our cookie consent banner. Note that disabling essential 
                cookies may impact platform functionality.
              </p>
            </section>

            <section>
              <h2 className="font-serif text-3xl font-bold mb-4">9. Third-Party Links</h2>
              <p>
                Our platform may contain links to external websites (e.g., Stripe, social media). We are not responsible for 
                the privacy practices of these sites. Please review their privacy policies.
              </p>
            </section>

            <section>
              <h2 className="font-serif text-3xl font-bold mb-4">10. Children's Privacy</h2>
              <p>
                Bridlestay is not intended for users under 18. We do not knowingly collect information from children. 
                If we discover we have collected data from a child, we will delete it promptly.
              </p>
            </section>

            <section>
              <h2 className="font-serif text-3xl font-bold mb-4">11. International Data Transfers</h2>
              <p>
                Your data is primarily stored in the UK/EU. If we transfer data outside the UK/EEA, we ensure adequate safeguards 
                are in place (e.g., Standard Contractual Clauses, adequacy decisions).
              </p>
            </section>

            <section>
              <h2 className="font-serif text-3xl font-bold mb-4">12. Changes to This Policy</h2>
              <p>
                We may update this Privacy Policy from time to time. Material changes will be communicated via email or platform 
                notification. The "Last Updated" date at the top reflects the most recent version.
              </p>
            </section>

            <section>
              <h2 className="font-serif text-3xl font-bold mb-4">13. Contact Us</h2>
              <p>
                For privacy questions, data requests, or complaints, contact us at:
              </p>
              <div className="bg-muted p-4 rounded-lg mt-3 space-y-1 text-sm">
                <p><strong>Email:</strong> privacy@bridlestay.co.uk</p>
                <p><strong>Data Protection Officer:</strong> dpo@bridlestay.co.uk</p>
                <p><strong>Address:</strong> [Your Business Address]</p>
              </div>
              <p className="mt-4 text-sm">
                You also have the right to lodge a complaint with the UK Information Commissioner's Office (ICO) at 
                <a href="https://ico.org.uk" className="text-primary hover:underline ml-1" target="_blank" rel="noopener noreferrer">
                  ico.org.uk
                </a>
              </p>
            </section>

            <section className="border-t pt-6 mt-8">
              <p className="text-sm text-muted-foreground italic">
                This Privacy Policy was last updated on {new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}. 
                By using Bridlestay, you acknowledge that you have read and understood this policy.
              </p>
            </section>
          </div>
        </div>
      </main>
    </>
  );
}
