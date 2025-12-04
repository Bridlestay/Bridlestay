import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { GuestDashboard } from "@/components/dashboard/guest-dashboard";
import { HostDashboard } from "@/components/dashboard/host-dashboard";
import { AdminDashboard } from "@/components/dashboard/admin-dashboard";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Eye, AlertTriangle } from "lucide-react";
import Link from "next/link";

export default async function AdminViewDashboardPage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId } = await params;
  const supabase = await createClient();

  // Check if current user is admin
  const {
    data: { user: currentUser },
  } = await supabase.auth.getUser();

  if (!currentUser) {
    redirect("/login");
  }

  const { data: currentUserData } = await supabase
    .from("users")
    .select("role")
    .eq("id", currentUser.id)
    .single();

  if (!currentUserData || currentUserData.role !== "admin") {
    redirect("/dashboard");
  }

  // Fetch the target user's data
  const { data: targetUser, error } = await supabase
    .from("users")
    .select("*")
    .eq("id", userId)
    .single();

  if (error || !targetUser) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex flex-col items-center gap-4">
              <AlertTriangle className="h-12 w-12 text-yellow-600" />
              <h2 className="text-xl font-semibold">User Not Found</h2>
              <p className="text-muted-foreground text-center">
                The user you&apos;re trying to view doesn&apos;t exist or has been deleted.
              </p>
              <Button asChild>
                <Link href="/dashboard">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to Admin Dashboard
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-4">
      {/* Admin Viewing Banner */}
      <Card className="border-blue-600 bg-blue-50 dark:bg-blue-950">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Eye className="h-5 w-5 text-blue-600" />
              <div>
                <p className="font-semibold text-blue-900 dark:text-blue-100">
                  Admin Viewing Mode
                </p>
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  You are viewing {targetUser.name}&apos;s dashboard ({targetUser.role})
                </p>
              </div>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link href="/dashboard">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Admin Dashboard
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Render appropriate dashboard based on user role */}
      {targetUser.role === "guest" && <GuestDashboard user={targetUser} />}
      {targetUser.role === "host" && <HostDashboard user={targetUser} />}
      {targetUser.role === "admin" && <AdminDashboard user={targetUser} />}
    </div>
  );
}

