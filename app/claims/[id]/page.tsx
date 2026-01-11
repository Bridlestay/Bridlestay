import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import { Header } from "@/components/header";
import { DamageClaimResponse } from "@/components/damage-claims/damage-claim-response";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, AlertTriangle, Calendar, Banknote } from "lucide-react";
import { format } from "date-fns";
import Link from "next/link";

export default async function ClaimDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/sign-in");
  }

  // Fetch the claim with related data
  const { data: claim, error } = await supabase
    .from("property_damage_claims")
    .select(`
      *,
      booking:booking_id (
        id,
        start_date,
        end_date,
        guest_id,
        properties:property_id (
          id,
          name,
          host_id
        )
      )
    `)
    .eq("id", id)
    .single();

  if (error || !claim) {
    notFound();
  }

  // Check if user is authorized to view (host or guest of the booking)
  const isHost = claim.booking?.properties?.host_id === user.id;
  const isGuest = claim.booking?.guest_id === user.id;

  if (!isHost && !isGuest) {
    notFound();
  }

  // Get host and guest info
  const { data: hostData } = await supabase
    .from("users")
    .select("id, name, avatar_url")
    .eq("id", claim.host_id)
    .single();

  const { data: guestData } = await supabase
    .from("users")
    .select("id, name, avatar_url")
    .eq("id", claim.guest_id)
    .single();

  // Format claim for the response component
  const formattedClaim = {
    id: claim.id,
    claim_type: claim.claim_type,
    description: claim.description,
    amount_pennies: claim.amount_pennies,
    evidence_urls: claim.evidence_urls || [],
    status: claim.status,
    created_at: claim.created_at,
    property: {
      id: claim.booking?.properties?.id || "",
      name: claim.booking?.properties?.name || "Property",
    },
    host: {
      id: hostData?.id || "",
      name: hostData?.name || "Host",
      avatar_url: hostData?.avatar_url,
    },
    booking: {
      id: claim.booking?.id || "",
      start_date: claim.booking?.start_date || "",
      end_date: claim.booking?.end_date || "",
    },
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge className="bg-amber-100 text-amber-800">Pending Response</Badge>;
      case "guest_accepted":
        return <Badge className="bg-green-100 text-green-800">Guest Accepted</Badge>;
      case "guest_disputed":
        return <Badge className="bg-red-100 text-red-800">Disputed</Badge>;
      case "under_review":
        return <Badge className="bg-blue-100 text-blue-800">Under Platform Review</Badge>;
      case "approved":
        return <Badge className="bg-green-100 text-green-800">Approved</Badge>;
      case "rejected":
        return <Badge className="bg-gray-100 text-gray-800">Rejected</Badge>;
      case "paid":
        return <Badge className="bg-green-100 text-green-800">Paid</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  return (
    <>
      <Header />
      <main className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          {/* Back link */}
          <Link href="/claims" className="inline-flex items-center text-muted-foreground hover:text-foreground mb-6">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Claims
          </Link>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main content */}
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5" />
                      {claim.claim_type === "damage" ? "Damage Claim" : 
                       claim.claim_type === "excessive_cleaning" ? "Cleaning Claim" : 
                       "Damage & Cleaning Claim"}
                    </CardTitle>
                    {getStatusBadge(claim.status)}
                  </div>
                  <CardDescription>
                    Filed {format(new Date(claim.created_at), "MMMM d, yyyy 'at' h:mm a")}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {isGuest && claim.status === "pending" ? (
                    <DamageClaimResponse claim={formattedClaim} />
                  ) : (
                    <div className="space-y-6">
                      {/* Claim details */}
                      <div>
                        <h3 className="font-medium mb-2">Description</h3>
                        <p className="text-muted-foreground whitespace-pre-wrap">{claim.description}</p>
                      </div>

                      <div className="flex items-center gap-2">
                        <Banknote className="h-5 w-5 text-muted-foreground" />
                        <span className="font-medium">Amount Claimed:</span>
                        <span className="text-lg font-bold">£{(claim.amount_pennies / 100).toFixed(2)}</span>
                      </div>

                      {/* Evidence */}
                      {claim.evidence_urls && claim.evidence_urls.length > 0 && (
                        <div>
                          <h3 className="font-medium mb-2">Evidence Photos</h3>
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                            {claim.evidence_urls.map((url: string, idx: number) => (
                              <a 
                                key={idx} 
                                href={url} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="aspect-square rounded-lg overflow-hidden border hover:opacity-80 transition-opacity"
                              >
                                <img 
                                  src={url} 
                                  alt={`Evidence ${idx + 1}`}
                                  className="w-full h-full object-cover"
                                />
                              </a>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Guest response if any */}
                      {claim.guest_response && (
                        <div className="border-t pt-4">
                          <h3 className="font-medium mb-2">Guest Response</h3>
                          <p className="text-muted-foreground whitespace-pre-wrap">{claim.guest_response}</p>
                        </div>
                      )}

                      {/* Admin decision if any */}
                      {claim.admin_notes && (
                        <div className="border-t pt-4">
                          <h3 className="font-medium mb-2">Platform Decision</h3>
                          <p className="text-muted-foreground whitespace-pre-wrap">{claim.admin_notes}</p>
                          {claim.final_amount_pennies && claim.final_amount_pennies !== claim.amount_pennies && (
                            <p className="mt-2">
                              <span className="font-medium">Adjusted Amount:</span>{" "}
                              <span className="text-lg font-bold">£{(claim.final_amount_pennies / 100).toFixed(2)}</span>
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Sidebar */}
            <div>
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Booking Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Property</p>
                    <p className="font-medium">{formattedClaim.property.name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Stay Dates</p>
                    <p className="font-medium flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      {format(new Date(formattedClaim.booking.start_date), "MMM d")} - {format(new Date(formattedClaim.booking.end_date), "MMM d, yyyy")}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">{isHost ? "Guest" : "Host"}</p>
                    <p className="font-medium">{isHost ? guestData?.name : hostData?.name}</p>
                  </div>
                </CardContent>
              </Card>

              {/* Help info */}
              <Card className="mt-4">
                <CardContent className="pt-6">
                  <p className="text-sm text-muted-foreground">
                    {isGuest ? (
                      <>
                        You can accept or dispute this claim. If you dispute, the platform will review the evidence and make a final decision.
                      </>
                    ) : (
                      <>
                        The guest has been notified of this claim. They can accept or dispute within 48 hours. Disputed claims will be reviewed by our team.
                      </>
                    )}
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}

