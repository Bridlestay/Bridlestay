"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  AlertTriangle, 
  CheckCircle2, 
  XCircle, 
  Loader2,
  MessageSquare,
  Calendar,
  Banknote,
  Image as ImageIcon,
  ExternalLink
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface DamageClaimResponseProps {
  claim: {
    id: string;
    claim_type: string;
    description: string;
    amount_pennies: number;
    evidence_urls: string[];
    status: string;
    created_at: string;
    property: { id: string; name: string };
    host: { id: string; name: string; avatar_url?: string };
    booking: { id: string; start_date: string; end_date: string };
  };
  onResponse?: () => void;
}

export function DamageClaimResponse({ claim, onResponse }: DamageClaimResponseProps) {
  const [response, setResponse] = useState("");
  const [responding, setResponding] = useState(false);
  const [showConfirmAccept, setShowConfirmAccept] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const { toast } = useToast();

  const isPending = claim.status === "pending";
  const amountGBP = (claim.amount_pennies / 100).toFixed(2);

  const handleResponse = async (action: "accept" | "dispute") => {
    if (action === "accept") {
      setShowConfirmAccept(true);
      return;
    }

    await submitResponse(action);
  };

  const submitResponse = async (action: "accept" | "dispute") => {
    setResponding(true);
    setShowConfirmAccept(false);

    try {
      const res = await fetch(`/api/damage-claims/${claim.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          response: response || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to submit response");
      }

      toast({
        title: action === "accept" ? "Claim accepted" : "Claim disputed",
        description: action === "accept" 
          ? "The amount will be charged to your saved payment method."
          : "Cantra will review the claim and make a decision.",
      });

      onResponse?.();
    } catch (error: any) {
      console.error("Error responding to claim:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    } finally {
      setResponding(false);
    }
  };

  const getStatusBadge = () => {
    switch (claim.status) {
      case "pending":
        return <Badge variant="outline" className="bg-amber-50 text-amber-800 border-amber-200">Awaiting Response</Badge>;
      case "guest_accepted":
        return <Badge variant="outline" className="bg-green-50 text-green-800 border-green-200">Accepted</Badge>;
      case "guest_disputed":
        return <Badge variant="outline" className="bg-red-50 text-red-800 border-red-200">Disputed</Badge>;
      case "under_review":
        return <Badge variant="outline" className="bg-blue-50 text-blue-800 border-blue-200">Under Review</Badge>;
      case "approved":
        return <Badge variant="outline" className="bg-green-50 text-green-800 border-green-200">Approved</Badge>;
      case "rejected":
        return <Badge variant="outline" className="bg-gray-50 text-gray-800 border-gray-200">Rejected</Badge>;
      case "paid":
        return <Badge variant="outline" className="bg-green-50 text-green-800 border-green-200">Paid</Badge>;
      default:
        return <Badge variant="outline">{claim.status}</Badge>;
    }
  };

  const getClaimTypeLabel = () => {
    switch (claim.claim_type) {
      case "damage":
        return "Property Damage";
      case "excessive_cleaning":
        return "Excessive Cleaning";
      case "both":
        return "Damage & Cleaning";
      default:
        return claim.claim_type;
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-600" />
                Damage Claim
              </CardTitle>
              <CardDescription className="mt-1">
                For your stay at <strong>{claim.property.name}</strong>
              </CardDescription>
            </div>
            {getStatusBadge()}
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Claim Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10">
                <AvatarImage src={claim.host.avatar_url} />
                <AvatarFallback>{claim.host.name.charAt(0)}</AvatarFallback>
              </Avatar>
              <div>
                <p className="text-sm text-muted-foreground">Submitted by</p>
                <p className="font-medium">{claim.host.name}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                <Calendar className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Stay dates</p>
                <p className="font-medium">
                  {format(new Date(claim.booking.start_date), "MMM d")} - {format(new Date(claim.booking.end_date), "MMM d, yyyy")}
                </p>
              </div>
            </div>
          </div>

          {/* Claim Type & Amount */}
          <div className="flex flex-wrap gap-4 p-4 bg-muted rounded-lg">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">{getClaimTypeLabel()}</span>
            </div>
            <div className="flex items-center gap-2">
              <Banknote className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-semibold">£{amountGBP}</span>
            </div>
            <div className="flex items-center gap-2">
              <ImageIcon className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">{claim.evidence_urls.length} photo(s)</span>
            </div>
          </div>

          {/* Description */}
          <div>
            <h4 className="font-medium mb-2">Description</h4>
            <p className="text-muted-foreground bg-muted/50 p-3 rounded-lg">
              {claim.description}
            </p>
          </div>

          {/* Evidence Photos */}
          <div>
            <h4 className="font-medium mb-2">Evidence Photos</h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {claim.evidence_urls.map((url, index) => (
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

          {/* Response Section (only if pending) */}
          {isPending && (
            <>
              <Alert>
                <MessageSquare className="h-4 w-4" />
                <AlertDescription>
                  Please review the claim and evidence carefully. If you accept, the amount will be 
                  charged to your saved payment method. If you dispute, Cantra will review and make a decision.
                </AlertDescription>
              </Alert>

              <div className="space-y-3">
                <h4 className="font-medium">Your Response (optional)</h4>
                <Textarea
                  placeholder="Add any context or explanation..."
                  value={response}
                  onChange={(e) => setResponse(e.target.value)}
                  rows={3}
                />
              </div>

              <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t">
                <Button
                  onClick={() => handleResponse("accept")}
                  disabled={responding}
                  className="flex-1 bg-green-600 hover:bg-green-700"
                >
                  {responding ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                  )}
                  Accept & Pay £{amountGBP}
                </Button>
                <Button
                  onClick={() => handleResponse("dispute")}
                  disabled={responding}
                  variant="destructive"
                  className="flex-1"
                >
                  {responding ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <XCircle className="h-4 w-4 mr-2" />
                  )}
                  Dispute Claim
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Accept Confirmation Dialog */}
      <Dialog open={showConfirmAccept} onOpenChange={setShowConfirmAccept}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Payment</DialogTitle>
            <DialogDescription>
              Are you sure you want to accept this claim? £{amountGBP} will be charged to your saved payment method.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-3 mt-4">
            <Button variant="outline" onClick={() => setShowConfirmAccept(false)}>
              Cancel
            </Button>
            <Button 
              onClick={() => submitResponse("accept")} 
              disabled={responding}
              className="bg-green-600 hover:bg-green-700"
            >
              {responding ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : null}
              Confirm & Pay
            </Button>
          </div>
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

