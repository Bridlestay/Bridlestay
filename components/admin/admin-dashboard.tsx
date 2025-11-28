"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle, XCircle, Eye } from "lucide-react";
import Link from "next/link";

export function AdminDashboard({ user }: { user: any }) {
  const [users, setUsers] = useState<any[]>([]);
  const [properties, setProperties] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const supabase = createClient();

    // Fetch unverified users
    const { data: usersData } = await supabase
      .from("users")
      .select("*")
      .eq("admin_verified", false)
      .order("created_at", { ascending: false });

    // Fetch unverified properties
    const { data: propsData } = await supabase
      .from("properties")
      .select(`
        *,
        users:host_id (name, email)
      `)
      .eq("admin_verified", false)
      .eq("published", true)
      .order("created_at", { ascending: false });

    setUsers(usersData || []);
    setProperties(propsData || []);
    setLoading(false);
  };

  const handleVerifyUser = async (userId: string, verified: boolean) => {
    try {
      const response = await fetch("/api/admin/verify-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, verified }),
      });

      if (!response.ok) {
        throw new Error("Failed to verify user");
      }

      toast({
        title: "Success",
        description: `User ${verified ? "verified" : "rejected"}`,
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
      <h1 className="font-serif text-4xl font-bold mb-8">Admin Dashboard</h1>

      <Tabs defaultValue="users" className="space-y-6">
        <TabsList>
          <TabsTrigger value="users">
            Unverified Users ({users.length})
          </TabsTrigger>
          <TabsTrigger value="properties">
            Unverified Properties ({properties.length})
          </TabsTrigger>
        </TabsList>

        {/* Users Tab */}
        <TabsContent value="users">
          <Card>
            <CardHeader>
              <CardTitle>Users Awaiting Verification</CardTitle>
            </CardHeader>
            <CardContent>
              {users.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  No users awaiting verification
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Registered</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((u) => (
                      <TableRow key={u.id}>
                        <TableCell>{u.name}</TableCell>
                        <TableCell>{u.email}</TableCell>
                        <TableCell>
                          <Badge>{u.role}</Badge>
                        </TableCell>
                        <TableCell>
                          {new Date(u.created_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              onClick={() => handleVerifyUser(u.id, true)}
                            >
                              <CheckCircle className="mr-2 h-4 w-4" />
                              Verify
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleVerifyUser(u.id, false)}
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
        </TabsContent>

        {/* Properties Tab */}
        <TabsContent value="properties">
          <Card>
            <CardHeader>
              <CardTitle>Properties Awaiting Verification</CardTitle>
            </CardHeader>
            <CardContent>
              {properties.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  No properties awaiting verification
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Property Name</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Host</TableHead>
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
                        <TableCell>{(p as any).users?.name}</TableCell>
                        <TableCell>
                          £{(p.nightly_price_pennies / 100).toFixed(0)}/night
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Link href={`/property/${p.id}`} target="_blank">
                              <Button size="sm" variant="outline">
                                <Eye className="mr-2 h-4 w-4" />
                                View
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
        </TabsContent>
      </Tabs>
    </div>
  );
}



