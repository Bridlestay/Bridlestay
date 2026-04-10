import { Header } from "@/components/header";
import { Card, CardContent } from "@/components/ui/card";
import { Calendar, Clock, AlertTriangle, CheckCircle } from "lucide-react";

export default function CancellationPolicyPage() {
  return (
    <>
      <Header />
      <main className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-12 max-w-4xl">
          <h1 className="font-serif text-4xl font-bold mb-4">Cancellation Policy</h1>
          <p className="text-muted-foreground mb-8">
            Last updated: {new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
          </p>

          <Card className="mb-8 border-blue-200 bg-blue-50 dark:bg-blue-950">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <Calendar className="h-6 w-6 text-blue-600 flex-shrink-0 mt-1" />
                <div>
                  <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
                    Fair Cancellation Terms
                  </h3>
                  <p className="text-sm text-blue-900 dark:text-blue-100">
                    This policy balances flexibility for guests with protection for hosts. Refund amounts depend on when 
                    you cancel and the host's chosen policy.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="prose prose-lg max-w-none space-y-8">
            <section>
              <h2 className="font-serif text-3xl font-bold mb-4">1. Standard Cancellation Policy</h2>
              <p>
                Unless otherwise specified by the host, all bookings follow padoq's Standard Cancellation Policy.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 my-6">
                <Card className="border-green-200 bg-green-50 dark:bg-green-950">
                  <CardContent className="pt-6">
                    <CheckCircle className="h-8 w-8 text-primary mb-3" />
                    <h3 className="font-semibold text-green-900 dark:text-green-100 mb-2">
                      Full Refund
                    </h3>
                    <p className="text-sm text-green-900 dark:text-green-100">
                      Cancel <strong>7+ days</strong> before check-in
                    </p>
                    <p className="text-xs text-green-700 dark:text-green-300 mt-2">
                      100% refund of booking total (minus service fee)
                    </p>
                  </CardContent>
                </Card>

                <Card className="border-yellow-200 bg-yellow-50 dark:bg-yellow-950">
                  <CardContent className="pt-6">
                    <Clock className="h-8 w-8 text-yellow-600 mb-3" />
                    <h3 className="font-semibold text-yellow-900 dark:text-yellow-100 mb-2">
                      50% Refund
                    </h3>
                    <p className="text-sm text-yellow-900 dark:text-yellow-100">
                      Cancel <strong>3-7 days</strong> before check-in
                    </p>
                    <p className="text-xs text-yellow-700 dark:text-yellow-300 mt-2">
                      50% refund of accommodation fees only
                    </p>
                  </CardContent>
                </Card>

                <Card className="border-red-200 bg-red-50 dark:bg-red-950">
                  <CardContent className="pt-6">
                    <AlertTriangle className="h-8 w-8 text-red-600 mb-3" />
                    <h3 className="font-semibold text-red-900 dark:text-red-100 mb-2">
                      No Refund
                    </h3>
                    <p className="text-sm text-red-900 dark:text-red-100">
                      Cancel <strong>within 3 days</strong> of check-in
                    </p>
                    <p className="text-xs text-red-700 dark:text-red-300 mt-2">
                      No refund issued
                    </p>
                  </CardContent>
                </Card>

                <Card className="border-red-200 bg-red-50 dark:bg-red-950">
                  <CardContent className="pt-6">
                    <AlertTriangle className="h-8 w-8 text-red-600 mb-3" />
                    <h3 className="font-semibold text-red-900 dark:text-red-100 mb-2">
                      No-Show
                    </h3>
                    <p className="text-sm text-red-900 dark:text-red-100">
                      Fail to check-in without cancelling
                    </p>
                    <p className="text-xs text-red-700 dark:text-red-300 mt-2">
                      No refund, full charge applies
                    </p>
                  </CardContent>
                </Card>
              </div>

              <Card className="mt-6 bg-muted">
                <CardContent className="pt-6">
                  <h4 className="font-semibold mb-3">Important Notes:</h4>
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-start gap-2">
                      <span className="text-primary mt-0.5">•</span>
                      <span><strong>Service fees are non-refundable</strong> (except for full refunds 7+ days before)</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary mt-0.5">•</span>
                      <span>Cancellation must be made through the platform, not by contacting the host directly</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary mt-0.5">•</span>
                      <span>Check-in time is typically 3:00 PM (check your booking for specifics)</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary mt-0.5">•</span>
                      <span>Refunds are processed within 5-10 business days</span>
                    </li>
                  </ul>
                </CardContent>
              </Card>
            </section>

            <section>
              <h2 className="font-serif text-3xl font-bold mb-4">2. Alternative Policies</h2>
              <p>
                Hosts may choose from three cancellation policies. The policy applies to your booking and is shown before you confirm.
              </p>

              <h3 className="font-semibold text-xl mt-6 mb-3">2.1 Flexible Policy</h3>
              <div className="bg-muted p-4 rounded-lg space-y-2 text-sm">
                <p><strong>24+ hours before check-in:</strong> Full refund (100%)</p>
                <p><strong>Within 24 hours:</strong> No refund</p>
                <p className="text-xs italic mt-2">Best for guests who value flexibility. Service fees are still non-refundable.</p>
              </div>

              <h3 className="font-semibold text-xl mt-6 mb-3">2.2 Moderate Policy (Standard)</h3>
              <div className="bg-muted p-4 rounded-lg space-y-2 text-sm">
                <p><strong>7+ days before check-in:</strong> Full refund (100%)</p>
                <p><strong>3-7 days before:</strong> 50% refund</p>
                <p><strong>Within 3 days:</strong> No refund</p>
              </div>

              <h3 className="font-semibold text-xl mt-6 mb-3">2.3 Strict Policy</h3>
              <div className="bg-muted p-4 rounded-lg space-y-2 text-sm">
                <p><strong>14+ days before check-in:</strong> Full refund (100%)</p>
                <p><strong>7-14 days before:</strong> 50% refund</p>
                <p><strong>Within 7 days:</strong> No refund</p>
                <p className="text-xs italic mt-2">Common for peak season or high-demand properties.</p>
              </div>
            </section>

            <section>
              <h2 className="font-serif text-3xl font-bold mb-4">3. Extenuating Circumstances</h2>
              <p>
                In rare cases, padoq may provide refunds outside the standard policy for extenuating circumstances:
              </p>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li><strong>Serious illness or injury</strong> (medical documentation required)</li>
                <li><strong>Death of immediate family member</strong> (death certificate required)</li>
                <li><strong>Government travel restrictions</strong> (official restrictions only)</li>
                <li><strong>Natural disasters</strong> affecting property or travel routes</li>
                <li><strong>Property uninhabitable</strong> (host confirms major issue)</li>
              </ul>

              <Card className="mt-4 border-yellow-200 bg-yellow-50 dark:bg-yellow-950">
                <CardContent className="pt-6">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-1" />
                    <div className="text-sm text-yellow-900 dark:text-yellow-100">
                      <p className="font-semibold mb-2">Evidence Required</p>
                      <p>
                        Claims for extenuating circumstances must be submitted within 14 days with supporting documentation. 
                        padoq reviews each case individually. Approval is not guaranteed.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <h3 className="font-semibold text-xl mt-6 mb-2">What is NOT Covered:</h3>
              <ul className="list-disc list-inside space-y-1 ml-4 text-sm">
                <li>Change of plans or scheduling conflicts</li>
                <li>Weather conditions (rain, heat, etc.) unless severe natural disaster</li>
                <li>Transportation issues (missed flights, car breakdown)</li>
                <li>Personal financial difficulties</li>
                <li>Minor illness (cold, flu)</li>
                <li>Work commitments</li>
              </ul>
            </section>

            <section>
              <h2 className="font-serif text-3xl font-bold mb-4">4. Host Cancellations</h2>
              <p>
                If a host cancels your confirmed booking, you receive a full refund and may be eligible for additional compensation.
              </p>

              <h3 className="font-semibold text-xl mt-4 mb-2">4.1 Guest Protection</h3>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li><strong>Full refund</strong> of all fees (including service fees)</li>
                <li><strong>£50-200 credit</strong> toward your next booking (depending on timing)</li>
                <li><strong>Help rebooking:</strong> padoq will assist in finding alternative accommodation</li>
              </ul>

              <h3 className="font-semibold text-xl mt-4 mb-2">4.2 Host Penalties</h3>
              <p>Hosts who cancel face:</p>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li><strong>Automatic 1-star review</strong> visible to all guests</li>
                <li><strong>£50-500 penalty fee</strong> (increases with late cancellations)</li>
                <li><strong>Calendar blocking</strong> of those dates (no rebooking allowed)</li>
                <li><strong>Search ranking penalty</strong> for 12 months</li>
                <li><strong>Account suspension</strong> for repeated cancellations</li>
              </ul>

              <p className="mt-4 text-sm italic bg-muted p-3 rounded-lg">
                <strong>Exception:</strong> Emergency cancellations (family emergency, property damage, safety concerns) 
                may be waived at padoq's discretion with proper documentation.
              </p>
            </section>

            <section>
              <h2 className="font-serif text-3xl font-bold mb-4">5. Booking Modifications</h2>
              
              <h3 className="font-semibold text-xl mt-4 mb-2">5.1 Changing Dates</h3>
              <p>
                You may request to change your booking dates if:
              </p>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li>The host agrees to the new dates</li>
                <li>New dates are available</li>
                <li>Changes are made at least 7 days before original check-in</li>
              </ul>
              <p className="mt-2 text-sm">
                Date changes must be agreed by both parties. If the host declines, the original cancellation policy applies.
              </p>

              <h3 className="font-semibold text-xl mt-4 mb-2">5.2 Reducing Stay Length</h3>
              <p>
                Shortening your stay is treated as a partial cancellation. Refund eligibility depends on:
              </p>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li>The host's cancellation policy</li>
                <li>How far in advance you make the change</li>
                <li>Whether the host can rebook the cancelled nights</li>
              </ul>

              <h3 className="font-semibold text-xl mt-4 mb-2">5.3 Adding Guests/Horses</h3>
              <p>
                Requests to add guests or horses must be approved by the host. Additional charges may apply if you exceed 
                the originally booked numbers.
              </p>
            </section>

            <section>
              <h2 className="font-serif text-3xl font-bold mb-4">6. Disputes & Issues During Stay</h2>
              
              <h3 className="font-semibold text-xl mt-4 mb-2">6.1 Property Not as Described</h3>
              <p>If the property significantly differs from the listing:</p>
              <ol className="list-decimal pl-6 space-y-2">
                <li><strong>Contact the host immediately</strong> to resolve the issue</li>
                <li><strong>Document the problems</strong> with photos and messages</li>
                <li><strong>Contact padoq support</strong> within 24 hours of check-in</li>
                <li><strong>Do not check out</strong> before contacting us (affects refund eligibility)</li>
              </ol>

              <h3 className="font-semibold text-xl mt-4 mb-2">6.2 Safety Concerns</h3>
              <p>
                If you encounter serious safety issues (unsafe horse facilities, hazardous conditions, etc.), 
                contact padoq immediately. We may authorize alternative accommodation and a full refund.
              </p>

              <h3 className="font-semibold text-xl mt-4 mb-2">6.3 Early Checkout</h3>
              <p>
                Checking out early does not entitle you to a refund unless:
              </p>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li>The property has major undisclosed issues</li>
                <li>padoq approves the early checkout</li>
                <li>The host agrees to a partial refund</li>
              </ul>
            </section>

            <section>
              <h2 className="font-serif text-3xl font-bold mb-4">7. How to Cancel a Booking</h2>
              
              <h3 className="font-semibold text-xl mt-4 mb-2">7.1 Cancel as a Guest</h3>
              <ol className="list-decimal pl-6 space-y-2">
                <li>Log in to your padoq account</li>
                <li>Go to "Trips" or "Bookings"</li>
                <li>Select the booking you want to cancel</li>
                <li>Click "Cancel Booking"</li>
                <li>Review the refund amount and confirm</li>
                <li>You'll receive an email confirmation</li>
              </ol>

              <h3 className="font-semibold text-xl mt-4 mb-2">7.2 Refund Processing</h3>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li>Refunds are processed to your original payment method</li>
                <li>Processing time: 5-10 business days</li>
                <li>You'll receive an email when the refund is issued</li>
              </ul>
            </section>

            <section>
              <h2 className="font-serif text-3xl font-bold mb-4">8. Questions or Disputes</h2>
              <p>
                If you have questions about cancellations, refunds, or disputes:
              </p>
              <div className="bg-muted p-4 rounded-lg mt-3 space-y-1 text-sm">
                <p><strong>Email:</strong> support@padoq.com</p>
                <p><strong>Phone:</strong> [Support Number]</p>
                <p><strong>Hours:</strong> Monday-Friday, 9am-6pm GMT</p>
              </div>
              <p className="mt-4 text-sm">
                For urgent issues during your stay, use the "Contact Support" button in your booking details for priority assistance.
              </p>
            </section>

            <section className="border-t pt-6 mt-8">
              <p className="text-sm text-muted-foreground italic">
                This Cancellation Policy was last updated on {new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}. 
                padoq reserves the right to modify this policy at any time. Changes will be communicated to active users.
              </p>
            </section>
          </div>
        </div>
      </main>
    </>
  );
}

