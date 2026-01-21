import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Header } from "@/components/header";
import { FeedbackForm } from "@/components/feedback/feedback-form";

export default async function FeedbackPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: userData } = await supabase
    .from("users")
    .select("*")
    .eq("id", user.id)
    .single();

  return (
    <>
      <Header />
      <main className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8 max-w-3xl">
          <div className="mb-8">
            <h1 className="font-serif text-4xl font-bold mb-2">Send Feedback</h1>
            <p className="text-muted-foreground">
              Help us improve padoq by sharing your thoughts, suggestions, or reporting issues.
            </p>
          </div>

          <FeedbackForm user={userData} />
        </div>
      </main>
    </>
  );
}

