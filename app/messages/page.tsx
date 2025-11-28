import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Header } from "@/components/header";
import { MessagesInbox } from "@/components/messaging/messages-inbox";

export default async function MessagesPage() {
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
      <main className="bg-background py-8">
        <div className="container mx-auto px-4 pb-24">
          <div className="mb-6">
            <h1 className="font-serif text-4xl font-bold mb-2">Messages</h1>
            <p className="text-muted-foreground">
              Communicate with hosts and guests
            </p>
          </div>

          <MessagesInbox />
        </div>
      </main>
    </>
  );
}

