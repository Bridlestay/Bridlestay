"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle, XCircle, Eye, Building } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { format } from "date-fns";
import Link from "next/link";

export function AdminDashboard({ user }: { user: any }) {
  const [properties, setProperties] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const supabase = createClient();

    // Fetch unverified properties
    const { data: propsData } = await supabase
      .from("properties")
      .select(`
        *,
        users:host_id (id, name, email, avatar_url)
      `)
      .eq("pending_verification", true)
      .eq("removed", false)
      .order("submitted_for_verification_at", { ascending: true });

    setProperties(propsData || []);
    setLoading(false);
  };

  const handleVerifyProperty = async (propertyId: string, verified: boolean) => {
    try {
      const response = await fetch("/api/admin/verify-property", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ propertyId, verified }),
      });

      if (!response.ok) {
        throw new Error("Failed to verify property");
      }

      toast({
        title: "Success",
        description: `Property ${verified ? "verified" : "rejected"}`,
      });

      fetchData();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="font-serif text-4xl font-bold mb-8">Property Verifications</h1>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building className="h-5 w-5" />
            Properties Awaiting Verification ({properties.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {properties.length === 0 ? (
            <div className="text-center py-12">
              <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
              <p className="text-lg font-medium">All caught up!</p>
              <p className="text-muted-foreground">
                No properties awaiting verification
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Property Name</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Host</TableHead>
                  <TableHead>Submitted</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {properties.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.name}</TableCell>
                    <TableCell>
                      {p.city}, {p.county}
                    </TableCell>
                    <TableCell>
                      <Link href={`/profile/${(p as any).users?.id}`} className="flex items-center gap-2 hover:underline">
                        <Avatar className="h-6 w-6">
                          <AvatarImage src={(p as any).users?.avatar_url} />
                          <AvatarFallback className="text-xs">
                            {(p as any).users?.name?.[0] || "?"}
                          </AvatarFallback>
                        </Avatar>
                        <span>{(p as any).users?.name}</span>
                      </Link>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {p.submitted_for_verification_at 
                        ? format(new Date(p.submitted_for_verification_at), "dd MMM yyyy")
                        : format(new Date(p.created_at), "dd MMM yyyy")}
                    </TableCell>
                    <TableCell>
                      £{(p.nightly_price_pennies / 100).toFixed(0)}/night
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Link href={`/property/${p.id}?admin_preview=true`} target="_blank">
                          <Button size="sm" variant="outline">
                            <Eye className="mr-2 h-4 w-4" />
                            Preview
                          </Button>
                        </Link>
                        <Button
                          size="sm"
                          onClick={() => handleVerifyProperty(p.id, true)}
                        >
                          <CheckCircle className="mr-2 h-4 w-4" />
                          Verify
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleVerifyProperty(p.id, false)}
                        >
                          <XCircle className="mr-2 h-4 w-4" />
                          Reject
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
