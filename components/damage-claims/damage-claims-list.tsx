"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  AlertTriangle, 
  Loader2, 
  ArrowRight,
  Calendar,
  Banknote,
  Clock
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import Link from "next/link";

interface Claim {
  id: string;
  claim_type: string;
  description: string;
  amount_pennies: number;
  status: string;
  created_at: string;
  property: { id: string; name: string };
  booking: { id: string; start_date: string; end_date: string };
  host: { id: string; name: string; avatar_url?: string };
  guest: { id: string; name: string; avatar_url?: string };
}

interface DamageClaimsListProps {
  userId: string;
  role?: "host" | "guest" | "both";
}

export function DamageClaimsList({ userId, role = "both" }: DamageClaimsListProps) {
  const [claims, setClaims] = useState<Claim[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("pending");

  useEffect(() => {
    loadClaims();
  }, [role]);

  const loadClaims = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/damage-claims?role=${role}`);
      const data = await res.json();
      
      if (res.ok) {
        setClaims(data.claims || []);
      }
    } catch (error) {
      console.error("Error loading claims:", error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="outline" className="bg-amber-50 text-amber-800 border-amber-200">Pending</Badge>;
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
      case "cancelled":
        return <Badge variant="outline" className="bg-gray-50 text-gray-800 border-gray-200">Cancelled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getClaimTypeLabel = (type: string) => {
    switch (type) {
      case "damage":
        return "Damage";
      case "excessive_cleaning":
        return "Cleaning";
      case "both":
        return "Damage & Cleaning";
      default:
        return type;
    }
  };

  const pendingClaims = claims.filter(c => ["pending", "guest_disputed", "under_review"].includes(c.status));
  const resolvedClaims = claims.filter(c => ["guest_accepted", "approved", "rejected", "paid", "cancelled"].includes(c.status));

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (claims.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6 text-center">
          <AlertTriangle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">No damage claims found</p>
        </CardContent>
      </Card>
    );
  }

  const renderClaimCard = (claim: Claim) => (
    <Card key={claim.id} className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="font-medium">{claim.property.name}</h4>
              {getStatusBadge(claim.status)}
              <Badge variant="secondary">{getClaimTypeLabel(claim.claim_type)}</Badge>
            </div>
            
            <p className="text-sm text-muted-foreground line-clamp-2">
              {claim.description}
            </p>
            
            <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <Banknote className="h-4 w-4" />
                £{(claim.amount_pennies / 100).toFixed(2)}
              </div>
              <div className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                {format(new Date(claim.booking.end_date), "MMM d, yyyy")}
              </div>
              <div className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                {formatDistanceToNow(new Date(claim.created_at), { addSuffix: true })}
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <div className="flex items-center gap-2">
                <Avatar className="h-6 w-6">
                  <AvatarImage src={claim.host.avatar_url} />
                  <AvatarFallback>{claim.host.name.charAt(0)}</AvatarFallback>
                </Avatar>
                <span className="text-xs text-muted-foreground">Host: {claim.host.name}</span>
              </div>
              <div className="flex items-center gap-2">
                <Avatar className="h-6 w-6">
                  <AvatarImage src={claim.guest.avatar_url} />
                  <AvatarFallback>{claim.guest.name.charAt(0)}</AvatarFallback>
                </Avatar>
                <span className="text-xs text-muted-foreground">Guest: {claim.guest.name}</span>
              </div>
            </div>
          </div>

          <Button variant="ghost" size="sm" asChild>
            <Link href={`/dashboard/claims/${claim.id}`}>
              View
              <ArrowRight className="h-4 w-4 ml-1" />
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-4">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="pending" className="relative">
            Active
            {pendingClaims.length > 0 && (
              <Badge className="ml-2 h-5 w-5 p-0 flex items-center justify-center text-xs">
                {pendingClaims.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="resolved">
            Resolved
            {resolvedClaims.length > 0 && (
              <span className="ml-2 text-muted-foreground">({resolvedClaims.length})</span>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="mt-4 space-y-3">
          {pendingClaims.length === 0 ? (
            <Card>
              <CardContent className="pt-6 text-center">
                <p className="text-muted-foreground">No active claims</p>
              </CardContent>
            </Card>
          ) : (
            pendingClaims.map(renderClaimCard)
          )}
        </TabsContent>

        <TabsContent value="resolved" className="mt-4 space-y-3">
          {resolvedClaims.length === 0 ? (
            <Card>
              <CardContent className="pt-6 text-center">
                <p className="text-muted-foreground">No resolved claims</p>
              </CardContent>
            </Card>
          ) : (
            resolvedClaims.map(renderClaimCard)
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

