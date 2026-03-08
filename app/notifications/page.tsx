import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Header } from "@/components/header";
import { NotificationsFeed } from "@/components/notifications-feed";

export default async function NotificationsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/sign-in");
  }

  return (
    <>
      <Header />
      <main className="bg-background min-h-[calc(100vh-4rem)]">
        <div className="container mx-auto px-4 py-8">
          <NotificationsFeed />
        </div>
      </main>
    </>
  );
}
