"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  AlertTriangle, 
  Loader2, 
  CheckCircle2,
  XCircle,
  Calendar,
  Banknote,
  Clock,
  Image as ImageIcon,
  ExternalLink,
  User,
  Home,
  MessageSquare
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface Claim {
  id: string;
  claim_type: string;
  description: string;
  amount_pennies: number;
  evidence_urls: string[];
  status: string;
  created_at: string;
  guest_response?: string;
  guest_response_at?: string;
  admin_notes?: string;
  admin_decision_at?: string;
  property: { id: string; name: string };
  booking: { id: string; start_date: string; end_date: string; total_charge_pennies?: number };
  host: { id: string; name: string; avatar_url?: string; email?: string };
  guest: { id: string; name: string; avatar_url?: string; email?: string };
}

export function AdminDamageClaims() {
  const [claims, setClaims] = useState<Claim[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("pending");
  const [selectedClaim, setSelectedClaim] = useState<Claim | null>(null);
  const [reviewNotes, setReviewNotes] = useState("");
  const [adjustedAmount, setAdjustedAmount] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadClaims();
  }, []);

  const loadClaims = async () => {
    setLoading(true);
    try {
      // Use admin API endpoint that uses service role
      const response = await fetch("/api/admin/damage-claims");
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to fetch claims");
      }
      
      const data = await response.json();
      setClaims(data.claims || []);
    } catch (error: any) {
      console.error("Error loading claims:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to load damage claims",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDecision = async (decision: "approved" | "rejected") => {
    if (!selectedClaim) return;
    
    setSubmitting(true);
    try {
      const adjustedAmountPennies = adjustedAmount 
        ? Math.round(parseFloat(adjustedAmount) * 100)
        : undefined;

      const res = await fetch(`/api/damage-claims/${selectedClaim.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          decision,
          notes: reviewNotes || undefined,
          adjustedAmountPennies,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to submit decision");
      }

      toast({
        title: decision === "approved" ? "Claim approved" : "Claim rejected",
        description: decision === "approved"
          ? "The guest will be charged."
          : "Both parties will be notified.",
      });

      setSelectedClaim(null);
      setReviewNotes("");
      setAdjustedAmount("");
      loadClaims();
    } catch (error: any) {
      console.error("Error submitting decision:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="outline" className="bg-amber-50 text-amber-800 border-amber-200">Pending Guest</Badge>;
      case "guest_accepted":
        return <Badge variant="outline" className="bg-green-50 text-green-800 border-green-200">Guest Accepted</Badge>;
      case "guest_disputed":
        return <Badge variant="outline" className="bg-red-50 text-red-800 border-red-200">Needs Review</Badge>;
      case "under_review":
        return <Badge variant="outline" className="bg-blue-50 text-blue-800 border-blue-200">Under Review</Badge>;
      case "approved":
        return <Badge variant="outline" className="bg-green-50 text-green-800 border-green-200">Approved</Badge>;
      case "rejected":
        return <Badge variant="outline" className="bg-gray-50 text-gray-800 border-gray-200">Rejected</Badge>;
      case "paid":
        return <Badge variant="outline" className="bg-green-50 text-green-800 border-green-200">Paid</Badge>;
      case "cancelled":
        return <Badge variant="outline" className="bg-gray-50 text-gray-800 border-gray-200">Cancelled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getClaimTypeLabel = (type: string) => {
    switch (type) {
      case "damage":
        return "Property Damage";
      case "excessive_cleaning":
        return "Excessive Cleaning";
      case "both":
        return "Damage & Cleaning";
      default:
        return type;
    }
  };

  const needsReview = claims.filter(c => c.status === "guest_disputed");
  const pendingGuest = claims.filter(c => c.status === "pending");
  const resolved = claims.filter(c => ["guest_accepted", "approved", "rejected", "paid", "cancelled"].includes(c.status));

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-600" />
            Damage Claims
          </CardTitle>
          <CardDescription>
            Review and manage damage and cleaning claims
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-4">
              <TabsTrigger value="needs_review" className="relative">
                Needs Review
                {needsReview.length > 0 ? (
                  <Badge className="ml-2 h-5 px-1.5 bg-red-500">{needsReview.length}</Badge>
                ) : (
                  <span className="ml-1 text-muted-foreground">(0)</span>
                )}
              </TabsTrigger>
              <TabsTrigger value="pending">
                Awaiting Guest
                {pendingGuest.length > 0 ? (
                  <Badge className="ml-2 h-5 px-1.5 bg-amber-500">{pendingGuest.length}</Badge>
                ) : (
                  <span className="ml-1 text-muted-foreground">(0)</span>
                )}
              </TabsTrigger>
              <TabsTrigger value="resolved">
                Resolved
                <span className="ml-1 text-muted-foreground">({resolved.length})</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="needs_review" className="space-y-3">
              {needsReview.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No claims need review
                </div>
              ) : (
                needsReview.map(claim => (
                  <ClaimRow 
                    key={claim.id} 
                    claim={claim} 
                    getStatusBadge={getStatusBadge}
                    getClaimTypeLabel={getClaimTypeLabel}
                    onReview={() => setSelectedClaim(claim)}
                  />
                ))
              )}
            </TabsContent>

            <TabsContent value="pending" className="space-y-3">
              {pendingGuest.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No claims awaiting guest response
                </div>
              ) : (
                pendingGuest.map(claim => (
                  <ClaimRow 
                    key={claim.id} 
                    claim={claim} 
                    getStatusBadge={getStatusBadge}
                    getClaimTypeLabel={getClaimTypeLabel}
                    onReview={() => setSelectedClaim(claim)}
                  />
                ))
              )}
            </TabsContent>

            <TabsContent value="resolved" className="space-y-3">
              {resolved.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No resolved claims
                </div>
              ) : (
                resolved.map(claim => (
                  <ClaimRow 
                    key={claim.id} 
                    claim={claim} 
                    getStatusBadge={getStatusBadge}
                    getClaimTypeLabel={getClaimTypeLabel}
                    onReview={() => setSelectedClaim(claim)}
                  />
                ))
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Review Dialog */}
      <Dialog open={!!selectedClaim} onOpenChange={() => setSelectedClaim(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {selectedClaim && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-amber-600" />
                  Review Claim
                </DialogTitle>
                <DialogDescription>
                  {selectedClaim.property.name}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-6 py-4">
                {/* Parties */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                    <Avatar>
                      <AvatarImage src={selectedClaim.host.avatar_url} />
                      <AvatarFallback>{selectedClaim.host.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-xs text-muted-foreground">Host</p>
                      <p className="font-medium">{selectedClaim.host.name}</p>
                      <p className="text-xs text-muted-foreground">{selectedClaim.host.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                    <Avatar>
                      <AvatarImage src={selectedClaim.guest.avatar_url} />
                      <AvatarFallback>{selectedClaim.guest.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-xs text-muted-foreground">Guest</p>
                      <p className="font-medium">{selectedClaim.guest.name}</p>
                      <p className="text-xs text-muted-foreground">{selectedClaim.guest.email}</p>
                    </div>
                  </div>
                </div>

                {/* Claim Details */}
                <div className="space-y-3">
                  <div className="flex flex-wrap gap-3">
                    {getStatusBadge(selectedClaim.status)}
                    <Badge variant="secondary">{getClaimTypeLabel(selectedClaim.claim_type)}</Badge>
                    <Badge variant="outline" className="flex items-center gap-1">
                      <Banknote className="h-3 w-3" />
                      £{(selectedClaim.amount_pennies / 100).toFixed(2)}
                    </Badge>
                    <Badge variant="outline" className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {format(new Date(selectedClaim.booking.end_date), "MMM d, yyyy")}
                    </Badge>
                  </div>

                  <div>
                    <h4 className="font-medium mb-1">Host's Description</h4>
                    <p className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
                      {selectedClaim.description}
                    </p>
                  </div>

                  {selectedClaim.guest_response && (
                    <div>
                      <h4 className="font-medium mb-1 flex items-center gap-2">
                        <MessageSquare className="h-4 w-4" />
                        Guest's Response
                      </h4>
                      <p className="text-sm text-muted-foreground bg-red-50 p-3 rounded-lg border border-red-200">
                        {selectedClaim.guest_response}
                      </p>
                    </div>
                  )}
                </div>

                {/* Evidence Photos */}
                <div>
                  <h4 className="font-medium mb-2">Evidence Photos ({selectedClaim.evidence_urls.length})</h4>
                  <div className="grid grid-cols-3 gap-2">
                    {selectedClaim.evidence_urls.map((url, index) => (
                      <button
                        key={index}
                        onClick={() => setSelectedImage(url)}
                        className="aspect-square rounded-lg overflow-hidden border hover:ring-2 ring-primary transition-all"
                      >
                        <img
                          src={url}
                          alt={`Evidence ${index + 1}`}
                          className="object-cover w-full h-full"
                        />
                      </button>
                    ))}
                  </div>
                </div>

                {/* Admin Actions (only for disputed claims) */}
                {selectedClaim.status === "guest_disputed" && (
                  <div className="space-y-4 pt-4 border-t">
                    <div>
                      <h4 className="font-medium mb-2">Adjust Amount (optional)</h4>
                      <div className="flex items-center gap-2">
                        <span className="text-lg">£</span>
                        <Input
                          type="number"
                          step="0.01"
                          placeholder={(selectedClaim.amount_pennies / 100).toFixed(2)}
                          value={adjustedAmount}
                          onChange={(e) => setAdjustedAmount(e.target.value)}
                          className="max-w-[150px]"
                        />
                        <span className="text-sm text-muted-foreground">
                          Original: £{(selectedClaim.amount_pennies / 100).toFixed(2)}
                        </span>
                      </div>
                    </div>

                    <div>
                      <h4 className="font-medium mb-2">Review Notes</h4>
                      <Textarea
                        placeholder="Add notes about your decision..."
                        value={reviewNotes}
                        onChange={(e) => setReviewNotes(e.target.value)}
                        rows={3}
                      />
                    </div>

                    <div className="flex gap-3">
                      <Button
                        onClick={() => handleDecision("approved")}
                        disabled={submitting}
                        className="flex-1 bg-green-600 hover:bg-green-700"
                      >
                        {submitting ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <CheckCircle2 className="h-4 w-4 mr-2" />
                        )}
                        Approve Claim
                      </Button>
                      <Button
                        onClick={() => handleDecision("rejected")}
                        disabled={submitting}
                        variant="destructive"
                        className="flex-1"
                      >
                        {submitting ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <XCircle className="h-4 w-4 mr-2" />
                        )}
                        Reject Claim
                      </Button>
                    </div>
                  </div>
                )}

                {/* Show decision for resolved claims */}
                {selectedClaim.admin_notes && (
                  <div className="pt-4 border-t">
                    <h4 className="font-medium mb-2">Admin Decision Notes</h4>
                    <p className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
                      {selectedClaim.admin_notes}
                    </p>
                    {selectedClaim.admin_decision_at && (
                      <p className="text-xs text-muted-foreground mt-2">
                        Decided {formatDistanceToNow(new Date(selectedClaim.admin_decision_at), { addSuffix: true })}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Image Preview Dialog */}
      <Dialog open={!!selectedImage} onOpenChange={() => setSelectedImage(null)}>
        <DialogContent className="max-w-3xl">
          {selectedImage && (
            <img
              src={selectedImage}
              alt="Evidence"
              className="w-full h-auto rounded-lg"
            />
          )}
          <div className="flex justify-end">
            <Button variant="outline" asChild>
              <a href={selectedImage || ""} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-4 w-4 mr-2" />
                Open Full Size
              </a>
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

// Claim row component
function ClaimRow({ 
  claim, 
  getStatusBadge, 
  getClaimTypeLabel,
  onReview 
}: { 
  claim: Claim; 
  getStatusBadge: (status: string) => React.ReactNode;
  getClaimTypeLabel: (type: string) => string;
  onReview: () => void;
}) {
  return (
    <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
      <div className="flex-1 space-y-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium">{claim.property.name}</span>
          {getStatusBadge(claim.status)}
          <Badge variant="secondary" className="text-xs">
            {getClaimTypeLabel(claim.claim_type)}
          </Badge>
        </div>
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span className="flex items-center gap-1">
            <Banknote className="h-3 w-3" />
            £{(claim.amount_pennies / 100).toFixed(2)}
          </span>
          <span className="flex items-center gap-1">
            <User className="h-3 w-3" />
            {claim.guest.name}
          </span>
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {formatDistanceToNow(new Date(claim.created_at), { addSuffix: true })}
          </span>
        </div>
      </div>
      <Button onClick={onReview} variant="outline" size="sm">
        Review
      </Button>
    </div>
  );
}

